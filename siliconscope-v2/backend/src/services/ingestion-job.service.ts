import { appSqlite } from "../db/app-db.js";

export type IngestionJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "review_required";
export type IngestionProvider = "ieee" | "openalex" | "crossref" | "csv" | "pdf" | "manual";
export type IngestionEventType = "created" | "started" | "progress" | "succeeded" | "failed" | "cancelled" | "retry" | "review_required" | "note";

export type IngestionJob = {
  id: number;
  provider: IngestionProvider;
  mode: string;
  status: IngestionJobStatus;
  scope: Record<string, unknown>;
  counts: {
    fetched: number;
    inserted: number;
    updated: number;
    skipped: number;
    review: number;
  };
  error: string | null;
  notes: string | null;
  createdByUserId: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IngestionJobEvent = {
  id: number;
  jobId: number;
  eventType: IngestionEventType;
  message: string | null;
  payload: Record<string, unknown>;
  createdByUserId: number | null;
  createdAt: string;
};

const providers = new Set<IngestionProvider>(["ieee", "openalex", "crossref", "csv", "pdf", "manual"]);
const statuses = new Set<IngestionJobStatus>(["queued", "running", "succeeded", "failed", "cancelled", "review_required"]);

function ensureTables() {
  appSqlite.exec(`
    CREATE TABLE IF NOT EXISTS ingestion_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'metadata_sync',
      status TEXT NOT NULL DEFAULT 'queued',
      scope_json TEXT,
      counts_json TEXT,
      error TEXT,
      notes TEXT,
      created_by_user_id INTEGER,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status_created
      ON ingestion_jobs(status, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_provider_created
      ON ingestion_jobs(provider, created_at DESC);

    CREATE TABLE IF NOT EXISTS ingestion_job_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      message TEXT,
      payload_json TEXT,
      created_by_user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ingestion_job_events_job_created
      ON ingestion_job_events(job_id, created_at DESC);
  `);
}

ensureTables();

function parseJson<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

function rowToJob(row: any): IngestionJob {
  return {
    id: Number(row.id),
    provider: row.provider,
    mode: row.mode,
    status: row.status,
    scope: parseJson(row.scope_json, {}),
    counts: {
      fetched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      review: 0,
      ...parseJson(row.counts_json, {}),
    },
    error: row.error || null,
    notes: row.notes || null,
    createdByUserId: row.created_by_user_id == null ? null : Number(row.created_by_user_id),
    startedAt: row.started_at || null,
    finishedAt: row.finished_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToEvent(row: any): IngestionJobEvent {
  return {
    id: Number(row.id),
    jobId: Number(row.job_id),
    eventType: row.event_type,
    message: row.message || null,
    payload: parseJson(row.payload_json, {}),
    createdByUserId: row.created_by_user_id == null ? null : Number(row.created_by_user_id),
    createdAt: row.created_at,
  };
}

function normalizeProvider(value: unknown): IngestionProvider {
  const provider = String(value || "manual").toLowerCase() as IngestionProvider;
  return providers.has(provider) ? provider : "manual";
}

function normalizeStatus(value: unknown): IngestionJobStatus {
  const status = String(value || "queued") as IngestionJobStatus;
  return statuses.has(status) ? status : "queued";
}

function normalizeCounts(input: unknown): IngestionJob["counts"] {
  const value = typeof input === "object" && input ? input as Record<string, unknown> : {};
  return {
    fetched: Math.max(0, Number(value.fetched || 0)),
    inserted: Math.max(0, Number(value.inserted || 0)),
    updated: Math.max(0, Number(value.updated || 0)),
    skipped: Math.max(0, Number(value.skipped || 0)),
    review: Math.max(0, Number(value.review || 0)),
  };
}

function recordEvent(input: {
  jobId: number;
  eventType: IngestionEventType;
  message?: string | null;
  payload?: Record<string, unknown>;
  createdByUserId?: number | null;
}) {
  const result = appSqlite.prepare(`
    INSERT INTO ingestion_job_events (job_id, event_type, message, payload_json, created_by_user_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    input.jobId,
    input.eventType,
    input.message ? String(input.message).slice(0, 1000) : null,
    JSON.stringify(input.payload || {}),
    input.createdByUserId ?? null
  );
  return thisEvent(Number(result.lastInsertRowid));
}

function thisEvent(id: number) {
  const row = appSqlite.prepare("SELECT * FROM ingestion_job_events WHERE id = ?").get(id);
  return row ? rowToEvent(row) : null;
}

function assertTransition(job: IngestionJob, next: IngestionJobStatus) {
  const current = job.status;
  if (current === next) return;
  if (current === "cancelled" && next !== "queued") throw new Error("Cancelled jobs can only be retried.");
  if (current === "running" && next === "queued") throw new Error("Running jobs cannot be moved back to queued directly.");
  if (current === "succeeded" && next === "running") throw new Error("Succeeded jobs should be retried first.");
}

export const ingestionJobService = {
  list(params: { limit?: number; offset?: number; status?: string; provider?: string } = {}) {
    const limit = Math.min(Math.max(Number(params.limit || 50), 1), 200);
    const offset = Math.max(Number(params.offset || 0), 0);
    const values: unknown[] = [];
    const where: string[] = [];
    if (params.status) {
      where.push("status = ?");
      values.push(normalizeStatus(params.status));
    }
    if (params.provider) {
      where.push("provider = ?");
      values.push(normalizeProvider(params.provider));
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = (appSqlite.prepare(`
      SELECT *
      FROM ingestion_jobs
      ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `).all(...values, limit, offset) as any[]).map(rowToJob);
    const total = appSqlite.prepare(`SELECT COUNT(*) AS count FROM ingestion_jobs ${whereSql}`).get(...values) as { count: number };
    return { rows, total: total.count, limit, offset };
  },

  create(input: {
    provider?: string;
    mode?: string;
    scope?: Record<string, unknown>;
    notes?: string;
    createdByUserId?: number | null;
  }) {
    const provider = normalizeProvider(input.provider);
    const mode = String(input.mode || "metadata_sync").slice(0, 80);
    const scope = input.scope && typeof input.scope === "object" ? input.scope : {};
    const notes = input.notes ? String(input.notes).slice(0, 1000) : null;
    const result = appSqlite.prepare(`
      INSERT INTO ingestion_jobs (provider, mode, status, scope_json, counts_json, notes, created_by_user_id)
      VALUES (?, ?, 'queued', ?, ?, ?, ?)
    `).run(provider, mode, JSON.stringify(scope), JSON.stringify(normalizeCounts({})), notes, input.createdByUserId ?? null);
    const job = this.get(Number(result.lastInsertRowid))!;
    recordEvent({
      jobId: job.id,
      eventType: "created",
      message: "Ingestion job registered from admin console.",
      payload: { provider: job.provider, mode: job.mode, scope: job.scope },
      createdByUserId: input.createdByUserId ?? null,
    });
    return job;
  },

  updateStatus(id: number, input: { status?: string; counts?: Record<string, unknown>; error?: string | null; notes?: string | null; actorUserId?: number | null }) {
    const existing = this.get(id);
    if (!existing) throw new Error(`Unknown ingestion job: ${id}`);
    const status = input.status ? normalizeStatus(input.status) : existing.status;
    assertTransition(existing, status);
    const counts = input.counts ? normalizeCounts(input.counts) : existing.counts;
    const error = input.error === undefined ? existing.error : input.error ? String(input.error).slice(0, 1000) : null;
    const notes = input.notes === undefined ? existing.notes : input.notes ? String(input.notes).slice(0, 1000) : null;
    const startedAt = status === "running" && !existing.startedAt ? "CURRENT_TIMESTAMP" : "started_at";
    const shouldFinish = ["succeeded", "failed", "cancelled", "review_required"].includes(status);
    const finishedAt = shouldFinish && !existing.finishedAt ? "CURRENT_TIMESTAMP" : "finished_at";

    appSqlite.prepare(`
      UPDATE ingestion_jobs
      SET status = ?,
          counts_json = ?,
          error = ?,
          notes = ?,
          started_at = ${startedAt},
          finished_at = ${finishedAt},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, JSON.stringify(counts), error, notes, id);
    const job = this.get(id)!;
    if (status !== existing.status || input.counts || input.error !== undefined || input.notes !== undefined) {
      recordEvent({
        jobId: id,
        eventType: status === "succeeded"
          ? "succeeded"
          : status === "failed"
            ? "failed"
            : status === "cancelled"
              ? "cancelled"
              : status === "review_required"
                ? "review_required"
                : status === "running"
                  ? "started"
                  : "progress",
        message: error || notes || `Job status changed from ${existing.status} to ${status}.`,
        payload: { previousStatus: existing.status, status, counts },
        createdByUserId: input.actorUserId ?? null,
      });
    }
    return job;
  },

  start(id: number, actorUserId?: number | null) {
    const job = this.get(id);
    if (!job) throw new Error(`Unknown ingestion job: ${id}`);
    if (job.status === "running") return job;
    if (job.status !== "queued" && job.status !== "review_required") {
      throw new Error(`Only queued or review_required jobs can be started. Current status: ${job.status}`);
    }
    const updated = this.updateStatus(id, {
      status: "running",
      notes: job.notes || "Worker execution boundary marked as started from admin console.",
      actorUserId: actorUserId ?? null,
    });
    return updated;
  },

  cancel(id: number, actorUserId?: number | null) {
    const job = this.get(id);
    if (!job) throw new Error(`Unknown ingestion job: ${id}`);
    if (job.status === "succeeded") throw new Error("Succeeded jobs cannot be cancelled.");
    if (job.status === "cancelled") return job;
    const updated = this.updateStatus(id, {
      status: "cancelled",
      notes: "Cancelled from admin console.",
      actorUserId: actorUserId ?? null,
    });
    return updated;
  },

  retry(id: number, actorUserId?: number | null) {
    const job = this.get(id);
    if (!job) throw new Error(`Unknown ingestion job: ${id}`);
    if (job.status === "running") throw new Error("Running jobs cannot be retried.");
    const result = appSqlite.prepare(`
      INSERT INTO ingestion_jobs (provider, mode, status, scope_json, counts_json, notes, created_by_user_id)
      VALUES (?, ?, 'queued', ?, ?, ?, ?)
    `).run(
      job.provider,
      job.mode,
      JSON.stringify({ ...job.scope, retryOf: job.id }),
      JSON.stringify(normalizeCounts({})),
      `Retry of ingestion job #${job.id}`,
      actorUserId ?? job.createdByUserId
    );
    const retried = this.get(Number(result.lastInsertRowid))!;
    recordEvent({
      jobId: retried.id,
      eventType: "retry",
      message: `Created retry from ingestion job #${job.id}.`,
      payload: { retryOf: job.id, previousStatus: job.status },
      createdByUserId: actorUserId ?? null,
    });
    recordEvent({
      jobId: job.id,
      eventType: "retry",
      message: `Retry job #${retried.id} was created.`,
      payload: { retryJobId: retried.id },
      createdByUserId: actorUserId ?? null,
    });
    return retried;
  },

  get(id: number) {
    const row = appSqlite.prepare("SELECT * FROM ingestion_jobs WHERE id = ?").get(id);
    return row ? rowToJob(row) : null;
  },

  events(jobId: number, params: { limit?: number; offset?: number } = {}) {
    const limit = Math.min(Math.max(Number(params.limit || 40), 1), 200);
    const offset = Math.max(Number(params.offset || 0), 0);
    const rows = (appSqlite.prepare(`
      SELECT *
      FROM ingestion_job_events
      WHERE job_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `).all(jobId, limit, offset) as any[]).map(rowToEvent);
    const total = appSqlite.prepare("SELECT COUNT(*) AS count FROM ingestion_job_events WHERE job_id = ?").get(jobId) as { count: number };
    return { rows, total: total.count, limit, offset };
  },

  stats() {
    const rows = appSqlite.prepare(`
      SELECT status, COUNT(*) AS count
      FROM ingestion_jobs
      GROUP BY status
    `).all() as Array<{ status: string; count: number }>;
    const providers = appSqlite.prepare(`
      SELECT provider, COUNT(*) AS count
      FROM ingestion_jobs
      GROUP BY provider
    `).all() as Array<{ provider: string; count: number }>;
    return {
      byStatus: rows.map((row) => ({ status: row.status, count: Number(row.count) })),
      byProvider: providers.map((row) => ({ provider: row.provider, count: Number(row.count) })),
    };
  },
};
