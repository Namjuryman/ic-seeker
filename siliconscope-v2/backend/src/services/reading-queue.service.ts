import { db as metadataDb } from "../db/connection.js";
import { appDb } from "../db/app-db.js";
import { papers, readingStatus } from "../db/schema.js";
import { sql, eq, and, inArray } from "drizzle-orm";
import { toPaperRow } from "./paper-row.js";
import { billingService } from "./billing.service.js";
import {
  READING_STATES,
  STATE_LABELS,
  type ReadingQueueInput,
  normalizeReadingQueueInput,
  readingQueueModelFromRow,
} from "./reading-queue-utils.js";

export const readingQueueService = {
  getReadingQueue(userId: number) {
    const rows = appDb
      .select({
        paperId: readingStatus.paperId,
        status: readingStatus.status,
        readingState: readingStatus.readingState,
        important: readingStatus.important,
        useCasesJson: readingStatus.useCasesJson,
        updatedAt: readingStatus.updatedAt,
      })
      .from(readingStatus)
      .where(eq(readingStatus.userId, userId))
      .orderBy(sql`${readingStatus.updatedAt} DESC`)
      .all();

    const paperIds = rows.map((r) => r.paperId);
    const paperMap = new Map<number, Record<string, any>>();

    if (paperIds.length) {
      const batchSize = 100;
      for (let i = 0; i < paperIds.length; i += batchSize) {
        const batch = paperIds.slice(i, i + batchSize);
        const paperRows = metadataDb.select().from(papers).where(inArray(papers.id, batch)).all();
        for (const paper of paperRows) {
          paperMap.set(paper.id, toPaperRow(paper) as unknown as Record<string, any>);
        }
      }
    }

    const grouped: Record<string, Array<Record<string, any>>> = {};
    for (const row of rows) {
      const paper = paperMap.get(row.paperId);
      if (!paper) continue;
      const model = readingQueueModelFromRow(row);
      if (model.readingState === "unread") continue;
      grouped[model.readingState] = grouped[model.readingState] || [];
      grouped[model.readingState].push({ paper, ...model, updatedAt: row.updatedAt });
    }

    return READING_STATES.filter((state) => state !== "unread").map((status) => {
      const items = grouped[status] || [];
      return {
        status,
        readingStatus: status,
        label: STATE_LABELS[status],
        count: items.length,
        papers: items,
      };
    });
  },

  updateReadingStatus(userId: number, paperId: number, input: ReadingQueueInput) {
    const exists = metadataDb.select({ id: papers.id }).from(papers).where(eq(papers.id, paperId)).get();
    if (!exists) return { ok: false, error: "论文不存在。" };

    const current = appDb
      .select({
        status: readingStatus.status,
        readingState: readingStatus.readingState,
        important: readingStatus.important,
        useCasesJson: readingStatus.useCasesJson,
      })
      .from(readingStatus)
      .where(and(eq(readingStatus.userId, userId), eq(readingStatus.paperId, paperId)))
      .get();

    const next = normalizeReadingQueueInput(input, current);
    const currentModel = readingQueueModelFromRow(current);
    const wasQueued = Boolean(current) && currentModel.readingState !== "unread";
    const willQueue = next.readingState !== "unread";

    if (!wasQueued && willQueue) {
      const quota = billingService.checkQuota(userId, "readingQueueItems", 1);
      if (!quota.allowed) return { ok: false, error: quota.reason, quota };
    }

    appDb
      .insert(readingStatus)
      .values({
        userId,
        paperId,
        status: next.readingState,
        readingState: next.readingState,
        important: next.important,
        useCasesJson: next.useCases.length ? JSON.stringify(next.useCases) : null,
      })
      .onConflictDoUpdate({
        target: [readingStatus.userId, readingStatus.paperId],
        set: {
          status: next.readingState,
          readingState: next.readingState,
          important: next.important,
          useCasesJson: next.useCases.length ? JSON.stringify(next.useCases) : null,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .run();

    if (!wasQueued && willQueue) {
      billingService.recordUsageEvent({
        userId,
        metric: "readingQueueItems",
        source: "reading-queue",
        resourceType: "paper",
        resourceId: paperId,
      });
    }

    return { ok: true, ...next };
  },

  getPaperStatus(userId: number, paperId: number) {
    const row = appDb
      .select({
        status: readingStatus.status,
        readingState: readingStatus.readingState,
        important: readingStatus.important,
        useCasesJson: readingStatus.useCasesJson,
      })
      .from(readingStatus)
      .where(and(eq(readingStatus.userId, userId), eq(readingStatus.paperId, paperId)))
      .get();
    return readingQueueModelFromRow(row);
  },
};
