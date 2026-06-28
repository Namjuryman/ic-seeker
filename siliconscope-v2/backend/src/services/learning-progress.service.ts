import { and, eq, sql } from "drizzle-orm";
import { appDb } from "../db/app-db.js";
import { learningProgress } from "../db/schema.js";
import { learningService } from "./learning.service.js";
import { readingQueueService } from "./reading-queue.service.js";

type LearningTargetType = "roadmap" | "lesson";
type LearningProgressStatus = "not_started" | "in_progress" | "completed" | "review_later";

const VALID_TARGETS = new Set<LearningTargetType>(["roadmap", "lesson"]);
const VALID_STATUSES = new Set<LearningProgressStatus>(["not_started", "in_progress", "completed", "review_later"]);

function normalizeTargetType(value: string): LearningTargetType {
  if (VALID_TARGETS.has(value as LearningTargetType)) return value as LearningTargetType;
  throw new Error("targetType must be roadmap or lesson");
}

function normalizeStatus(value: string): LearningProgressStatus {
  if (VALID_STATUSES.has(value as LearningProgressStatus)) return value as LearningProgressStatus;
  throw new Error("status must be not_started, in_progress, completed, or review_later");
}

function assertTargetExists(targetType: LearningTargetType, targetId: string) {
  const row = targetType === "roadmap" ? learningService.getRoadmap(targetId) : learningService.getLesson(targetId);
  if (!row) throw new Error(`${targetType} not found`);
}

function mapProgress(row: any) {
  return {
    userId: Number(row.userId ?? row.user_id ?? 0),
    targetType: String(row.targetType ?? row.target_type ?? "lesson"),
    targetId: String(row.targetId ?? row.target_id ?? ""),
    status: String(row.status ?? "not_started"),
    lastAction: String(row.lastAction ?? row.last_action ?? ""),
    relatedPapersQueued: Number(row.relatedPapersQueued ?? row.related_papers_queued ?? 0),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ""),
  };
}

export const learningProgressService = {
  list(userId: number) {
    return appDb
      .select({
        userId: learningProgress.userId,
        targetType: learningProgress.targetType,
        targetId: learningProgress.targetId,
        status: learningProgress.status,
        lastAction: learningProgress.lastAction,
        relatedPapersQueued: learningProgress.relatedPapersQueued,
        updatedAt: learningProgress.updatedAt,
      })
      .from(learningProgress)
      .where(eq(learningProgress.userId, userId))
      .orderBy(sql`${learningProgress.updatedAt} DESC`)
      .all()
      .map(mapProgress);
  },

  get(userId: number, targetTypeInput: string, targetId: string) {
    const targetType = normalizeTargetType(targetTypeInput);
    assertTargetExists(targetType, targetId);
    const row = appDb
      .select({
        userId: learningProgress.userId,
        targetType: learningProgress.targetType,
        targetId: learningProgress.targetId,
        status: learningProgress.status,
        lastAction: learningProgress.lastAction,
        relatedPapersQueued: learningProgress.relatedPapersQueued,
        updatedAt: learningProgress.updatedAt,
      })
      .from(learningProgress)
      .where(
        and(
          eq(learningProgress.userId, userId),
          eq(learningProgress.targetType, targetType),
          eq(learningProgress.targetId, targetId),
        ),
      )
      .get();
    return row ? mapProgress(row) : {
      userId,
      targetType,
      targetId,
      status: "not_started",
      lastAction: "",
      relatedPapersQueued: 0,
      updatedAt: null,
    };
  },

  update(userId: number, targetTypeInput: string, targetId: string, statusInput: string) {
    const targetType = normalizeTargetType(targetTypeInput);
    const status = normalizeStatus(statusInput);
    assertTargetExists(targetType, targetId);

    appDb.insert(learningProgress)
      .values({
        userId,
        targetType,
        targetId,
        status,
        lastAction: status,
      })
      .onConflictDoUpdate({
        target: [learningProgress.userId, learningProgress.targetType, learningProgress.targetId],
        set: {
          status,
          lastAction: status,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .run();

    return this.get(userId, targetType, targetId);
  },

  addRelatedPapersToQueue(userId: number, targetTypeInput: string, targetId: string, limit = 5) {
    const targetType = normalizeTargetType(targetTypeInput);
    assertTargetExists(targetType, targetId);
    const cappedLimit = Math.max(1, Math.min(Number.isFinite(limit) ? Math.floor(limit) : 5, 20));
    const result = targetType === "roadmap"
      ? learningService.relatedPapersForRoadmap(targetId, userId, cappedLimit)
      : learningService.relatedPapersForLesson(targetId, userId, cappedLimit);
    if (!result) throw new Error(`${targetType} not found`);

    const queued: number[] = [];
    const errors: Array<{ paperId: number; error: string }> = [];
    for (const paper of result.rows || []) {
      const update = readingQueueService.updateReadingStatus(userId, paper.id, "review_later");
      if (update.ok) queued.push(paper.id);
      else errors.push({ paperId: paper.id, error: update.error || "Failed to queue paper" });
    }

    appDb.insert(learningProgress)
      .values({
        userId,
        targetType,
        targetId,
        status: "review_later",
        lastAction: "add_related_papers_to_queue",
        relatedPapersQueued: queued.length,
      })
      .onConflictDoUpdate({
        target: [learningProgress.userId, learningProgress.targetType, learningProgress.targetId],
        set: {
          status: "review_later",
          lastAction: "add_related_papers_to_queue",
          relatedPapersQueued: sql`${learningProgress.relatedPapersQueued} + ${queued.length}`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .run();

    return {
      ok: errors.length === 0,
      target: this.get(userId, targetType, targetId),
      queuedPaperIds: queued,
      queuedCount: queued.length,
      errors,
    };
  },
};
