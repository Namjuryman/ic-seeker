import { appSqlite } from "../db/app-db.js";
import { backupService } from "./backup.service.js";
import { snapshotService } from "./snapshot.service.js";
import { dataQualityService } from "./data-quality.service.js";

export type MaintenanceJobId = "backup" | "snapshot-core" | "snapshot-full" | "data-quality";

export type MaintenanceJob = {
  id: MaintenanceJobId;
  title: string;
  category: "backup" | "cache" | "quality";
  description: string;
  expectedDuration: string;
  risk: "low" | "medium";
  defaultPayload?: Record<string, unknown>;
};

export type MaintenanceRun = {
  id: number;
  jobId: MaintenanceJobId;
  status: "running" | "success" | "failure";
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  actorUserId: number | null;
  summary: Record<string, unknown> | null;
  error: string | null;
};

const jobs: MaintenanceJob[] = [
  {
    id: "backup",
    title: "Create database restore point",
    category: "backup",
    description: "Create a SQLite online backup plus manifest before imports, deploys, or schema maintenance.",
    expectedDuration: "seconds",
    risk: "low",
    defaultPayload: { label: "admin-maintenance" },
  },
  {
    id: "snapshot-core",
    title: "Refresh core snapshots",
    category: "cache",
    description: "Refresh the most important cached lists: professors, institutions, topics, geo overview, venue matrix, and mentor institutions.",
    expectedDuration: "seconds to minutes",
    risk: "low",
    defaultPayload: { keys: ["profiles:professors:top80", "profiles:institutions:top80", "topics:list", "geo:overall", "venue-matrix", "mentor:institutions"] },
  },
  {
    id: "snapshot-full",
    title: "Refresh full intelligence cache",
    category: "cache",
    description: "Refresh core snapshots plus top profile/topic/geo/mentor detail caches. Run after large imports or alias repair.",
    expectedDuration: "minutes",
    risk: "medium",
    defaultPayload: { keys: ["all"] },
  },
  {
    id: "data-quality",
    title: "Run bounded data-quality scan",
    category: "quality",
    description: "Scan DOI duplicates, weak topics, venue mapping, institution variants, and author ambiguity with bounded sample size.",
    expectedDuration: "seconds",
    risk: "low",
    defaultPayload: { scanLimit: 12000, sampleLimit: 50 },
  },
];

function ensureTables() {
  appSqlite.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      actor_user_id INTEGER,
      payload_json TEXT,
      summary_json TEXT,
      error TEXT,
      started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at TEXT,
      duration_ms INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_maintenance_runs_job_started
      ON maintenance_runs(job_id, started_at DESC);
  `);
}

ensureTables();

function parseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function rowToRun(row: any): MaintenanceRun {
  return {
    id: Number(row.id),
    jobId: row.job_id,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationMs: row.duration_ms == null ? null : Number(row.duration_ms),
    actorUserId: row.actor_user_id == null ? null : Number(row.actor_user_id),
    summary: parseJson(row.summary_json),
    error: row.error,
  };
}

function startRun(jobId: MaintenanceJobId, actorUserId: number | null, payload: Record<string, unknown>) {
  const result = appSqlite.prepare(`
    INSERT INTO maintenance_runs (job_id, status, actor_user_id, payload_json)
    VALUES (?, 'running', ?, ?)
  `).run(jobId, actorUserId, JSON.stringify(payload));
  return Number(result.lastInsertRowid);
}

function finishRun(id: number, status: "success" | "failure", summary: Record<string, unknown> | null, error?: string) {
  appSqlite.prepare(`
    UPDATE maintenance_runs
    SET status = ?,
        summary_json = ?,
        error = ?,
        finished_at = CURRENT_TIMESTAMP,
        duration_ms = CAST((julianday(CURRENT_TIMESTAMP) - julianday(started_at)) * 86400000 AS INTEGER)
    WHERE id = ?
  `).run(status, summary ? JSON.stringify(summary) : null, error || null, id);
}

function summarizeDataQuality(report: ReturnType<typeof dataQualityService.getReport>) {
  return {
    totalPapers: report.totalPapers,
    scannedRows: report.scannedRows,
    duplicateDoiGroups: report.duplicateDoi.length,
    duplicateTitleYearGroups: report.duplicateTitleYear.length,
    unknownVenues: report.unknownVenues.length,
    lowConfidenceTopics: report.lowConfidenceTopics.length,
    institutionVariants: report.institutionVariants.length,
    ambiguousAuthors: report.ambiguousAuthors.length,
    missingAffiliations: report.missingAffiliations,
  };
}

export const maintenanceService = {
  jobs() {
    const recent = this.runs({ limit: 30 });
    return jobs.map((job) => ({
      ...job,
      lastRun: recent.rows.find((run: MaintenanceRun) => run.jobId === job.id) || null,
    }));
  },

  runs(params: { limit?: number; offset?: number; jobId?: string } = {}) {
    const limit = Math.min(Math.max(Number(params.limit || 30), 1), 200);
    const offset = Math.max(Number(params.offset || 0), 0);
    const values: unknown[] = [];
    let where = "";
    if (params.jobId) {
      where = "WHERE job_id = ?";
      values.push(params.jobId);
    }
    const rows = appSqlite.prepare(`
      SELECT id, job_id, status, actor_user_id, summary_json, error, started_at, finished_at, duration_ms
      FROM maintenance_runs
      ${where}
      ORDER BY started_at DESC
      LIMIT ? OFFSET ?
    `).all(...values, limit, offset).map(rowToRun);
    const total = appSqlite.prepare(`SELECT COUNT(*) AS count FROM maintenance_runs ${where}`).get(...values) as { count: number };
    return { rows, total: total.count, limit, offset };
  },

  async run(jobId: MaintenanceJobId, input: { actorUserId?: number; payload?: Record<string, unknown>; actorEmail?: string } = {}) {
    const job = jobs.find((item) => item.id === jobId);
    if (!job) throw new Error(`Unknown maintenance job: ${jobId}`);
    const payload = { ...(job.defaultPayload || {}), ...(input.payload || {}) };
    const runId = startRun(jobId, input.actorUserId ?? null, payload);
    try {
      let summary: Record<string, unknown>;
      if (jobId === "backup") {
        const backup = await backupService.create({
          label: String(payload.label || "maintenance"),
          actor: input.actorEmail || "maintenance",
        });
        summary = { id: backup.id, dbBytes: backup.dbBytes, manifestBytes: backup.manifestBytes };
      } else if (jobId === "snapshot-core" || jobId === "snapshot-full") {
        const keys = Array.isArray(payload.keys) ? payload.keys.map(String) : [String(payload.keys || "all")];
        const result = snapshotService.refresh(keys);
        summary = {
          requested: keys,
          total: result.length,
          ok: result.filter((row) => row.ok).length,
          failed: result.filter((row) => !row.ok).length,
          failures: result.filter((row) => !row.ok).slice(0, 8),
        };
        if (result.some((row) => !row.ok)) throw new Error(`${summary.failed} snapshot refreshes failed`);
      } else {
        const report = dataQualityService.getReport({
          scanLimit: Number(payload.scanLimit || 12000),
          sampleLimit: Number(payload.sampleLimit || 50),
        });
        summary = summarizeDataQuality(report);
      }
      finishRun(runId, "success", summary);
      return this.getRun(runId)!;
    } catch (err) {
      finishRun(runId, "failure", null, (err as Error).message);
      return this.getRun(runId)!;
    }
  },

  getRun(id: number) {
    const row = appSqlite.prepare(`
      SELECT id, job_id, status, actor_user_id, summary_json, error, started_at, finished_at, duration_ms
      FROM maintenance_runs
      WHERE id = ?
    `).get(id);
    return row ? rowToRun(row) : null;
  },
};
