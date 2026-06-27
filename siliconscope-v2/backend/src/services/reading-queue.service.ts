import { db as metadataDb } from "../db/connection.js";
import { appDb } from "../db/app-db.js";
import { papers, readingStatus } from "../db/schema.js";
import { sql, eq, and, inArray } from "drizzle-orm";
import { toPaperRow } from "./paper-row.js";
import { billingService } from "./billing.service.js";

const READING_STATUS_ORDER = [
  "unread",
  "reading",
  "read",
  "important",
  "skip",
  "review_later",
  "use_for_literature_review",
  "use_for_application",
  "use_for_project",
];

const STATUS_LABELS: Record<string, string> = {
  unread: "To Read",
  reading: "Reading",
  read: "Read",
  important: "Important",
  skip: "Skip",
  review_later: "Review Later",
  use_for_literature_review: "Use for Literature Review",
  use_for_application: "Use for Application",
  use_for_project: "Use for Project",
};

export const readingQueueService = {
  getReadingQueue(userId: number) {
    const rows = appDb
      .select({
        paperId: readingStatus.paperId,
        status: readingStatus.status,
        updatedAt: readingStatus.updatedAt,
      })
      .from(readingStatus)
      .where(eq(readingStatus.userId, userId))
      .orderBy(sql`${readingStatus.updatedAt} DESC`)
      .all();

    const paperIds = rows.map((r) => r.paperId);
    const paperMap = new Map<number, Record<string, any>>();

    if (paperIds.length) {
      // better-sqlite3 inArray batch
      const batchSize = 100;
      for (let i = 0; i < paperIds.length; i += batchSize) {
        const batch = paperIds.slice(i, i + batchSize);
        const paperRows = metadataDb
          .select()
          .from(papers)
          .where(inArray(papers.id, batch))
          .all();
        for (const p of paperRows) {
          paperMap.set(p.id, toPaperRow(p) as unknown as Record<string, any>);
        }
      }
    }

    const grouped: Record<
      string,
      Array<{ paper: Record<string, any>; status: string; updatedAt: string | null }>
    > = {};

    for (const row of rows) {
      const status = row.status || "unread";
      const paper = paperMap.get(row.paperId);
      if (!paper) continue;
      grouped[status] = grouped[status] || [];
      grouped[status].push({ paper, status, updatedAt: row.updatedAt });
    }

    // Ensure all known statuses appear in order, even if empty
    const result: Array<{
      status: string;
      label: string;
      count: number;
      papers: Array<{ paper: Record<string, any>; status: string; updatedAt: string | null }>;
    }> = [];

    for (const status of READING_STATUS_ORDER) {
      const items = grouped[status] || [];
      result.push({
        status,
        label: STATUS_LABELS[status] || status,
        count: items.length,
        papers: items,
      });
    }

    return result;
  },

  updateReadingStatus(userId: number, paperId: number, status: string) {
    const allowed = new Set(READING_STATUS_ORDER);
    if (!allowed.has(status)) {
      return { ok: false, error: "Invalid reading status" };
    }

    const exists = metadataDb
      .select({ id: papers.id })
      .from(papers)
      .where(eq(papers.id, paperId))
      .get();
    if (!exists) return { ok: false, error: "Paper not found" };

    const current = appDb
      .select({ status: readingStatus.status })
      .from(readingStatus)
      .where(and(eq(readingStatus.userId, userId), eq(readingStatus.paperId, paperId)))
      .get();

    const wasQueued = current && current.status !== "unread";
    const willQueue = status !== "unread";
    if (!wasQueued && willQueue) {
      const quota = billingService.checkQuota(userId, "readingQueueItems", 1);
      if (!quota.allowed) {
        return { ok: false, error: quota.reason, quota };
      }
    }

    appDb.insert(readingStatus)
      .values({ userId, paperId, status })
      .onConflictDoUpdate({
        target: [readingStatus.userId, readingStatus.paperId],
        set: { status, updatedAt: sql`CURRENT_TIMESTAMP` },
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

    return { ok: true };
  },

  getPaperStatus(userId: number, paperId: number) {
    const row = appDb
      .select({ status: readingStatus.status })
      .from(readingStatus)
      .where(
        and(eq(readingStatus.userId, userId), eq(readingStatus.paperId, paperId))
      )
      .get();
    return row?.status || "unread";
  },
};
