import { db as metadataDb } from "../db/connection.js";
import { appDb } from "../db/app-db.js";
import { papers, readingStatus } from "../db/schema.js";
import { sql, eq, and, inArray } from "drizzle-orm";
import { toPaperRow } from "./paper-row.js";
import { billingService } from "./billing.service.js";

const READING_STATES = ["unread", "reading", "read", "review_later", "skip"] as const;
const USE_CASES = ["literature_review", "application", "project"] as const;

type ReadingState = (typeof READING_STATES)[number];
type UseCase = (typeof USE_CASES)[number];

type ReadingQueueInput =
  | string
  | {
      status?: string;
      readingStatus?: string;
      readingState?: string;
      important?: boolean;
      flags?: string[];
      useCases?: string[];
    };

const STATE_LABELS: Record<ReadingState, string> = {
  unread: "未读",
  reading: "正在读",
  read: "已读",
  review_later: "稍后复习",
  skip: "跳过",
};

function parseUseCases(value: unknown): UseCase[] {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map(String).filter((item): item is UseCase => USE_CASES.includes(item as UseCase)))];
  } catch {
    return [];
  }
}

function normalizeLegacyStatus(status: string | null | undefined): {
  readingState: ReadingState;
  important: boolean;
  useCases: UseCase[];
} {
  const value = String(status || "unread");
  if (READING_STATES.includes(value as ReadingState)) {
    return { readingState: value as ReadingState, important: false, useCases: [] };
  }
  if (value === "important") {
    return { readingState: "reading", important: true, useCases: [] };
  }
  if (value === "use_for_literature_review") {
    return { readingState: "reading", important: false, useCases: ["literature_review"] };
  }
  if (value === "use_for_application") {
    return { readingState: "reading", important: false, useCases: ["application"] };
  }
  if (value === "use_for_project") {
    return { readingState: "reading", important: false, useCases: ["project"] };
  }
  return { readingState: "unread", important: false, useCases: [] };
}

function normalizeInput(input: ReadingQueueInput, current?: {
  status?: string | null;
  readingState?: string | null;
  important?: boolean | number | null;
  useCasesJson?: string | null;
}) {
  const currentModel = normalizeLegacyStatus(current?.status);
  const baseState = READING_STATES.includes(current?.readingState as ReadingState)
    ? current?.readingState as ReadingState
    : currentModel.readingState;
  const baseImportant = Boolean(current?.important ?? currentModel.important);
  const baseUseCases = parseUseCases(current?.useCasesJson).length
    ? parseUseCases(current?.useCasesJson)
    : currentModel.useCases;

  if (typeof input === "string") {
    const legacy = normalizeLegacyStatus(input);
    if (input === "important") {
      return { readingState: baseState === "unread" ? "reading" : baseState, important: true, useCases: baseUseCases };
    }
    if (input.startsWith("use_for_")) {
      return {
        readingState: baseState === "unread" ? "reading" : baseState,
        important: baseImportant,
        useCases: [...new Set([...baseUseCases, ...legacy.useCases])] as UseCase[],
      };
    }
    return {
      readingState: legacy.readingState,
      important: legacy.readingState === "unread" ? false : baseImportant,
      useCases: legacy.readingState === "unread" ? [] : baseUseCases,
    };
  }

  const requestedState = String(input.readingStatus || input.readingState || input.status || baseState);
  const readingState = READING_STATES.includes(requestedState as ReadingState)
    ? requestedState as ReadingState
    : normalizeLegacyStatus(requestedState).readingState;
  const flags = Array.isArray(input.flags) ? input.flags.map(String) : [];
  const important = input.important !== undefined ? Boolean(input.important) : flags.includes("important") || baseImportant;
  const useCases = input.useCases !== undefined ? parseUseCases(input.useCases) : baseUseCases;

  return {
    readingState,
    important: readingState === "unread" ? false : important,
    useCases: readingState === "unread" ? [] : useCases,
  };
}

function modelFromRow(row?: {
  status?: string | null;
  readingState?: string | null;
  important?: boolean | number | null;
  useCasesJson?: string | null;
}) {
  const legacy = normalizeLegacyStatus(row?.status);
  const readingState = READING_STATES.includes(row?.readingState as ReadingState)
    ? row?.readingState as ReadingState
    : legacy.readingState;
  const useCases = parseUseCases(row?.useCasesJson);
  const important = Boolean(row?.important ?? legacy.important);
  return {
    status: readingState,
    readingStatus: readingState,
    readingState,
    important,
    flags: important ? ["important"] : [],
    useCases: useCases.length ? useCases : legacy.useCases,
  };
}

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
        for (const p of paperRows) paperMap.set(p.id, toPaperRow(p) as unknown as Record<string, any>);
      }
    }

    const grouped: Record<string, Array<Record<string, any>>> = {};
    for (const row of rows) {
      const paper = paperMap.get(row.paperId);
      if (!paper) continue;
      const model = modelFromRow(row);
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
    if (!exists) return { ok: false, error: "Paper not found" };

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

    const next = normalizeInput(input, current);
    const currentModel = modelFromRow(current);
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
    return modelFromRow(row);
  },
};
