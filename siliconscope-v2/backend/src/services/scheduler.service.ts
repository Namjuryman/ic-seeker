import { appConfig } from "../config.js";
import { appSqlite } from "../db/app-db.js";
import { maintenanceService, type MaintenanceJobId } from "./maintenance.service.js";
import { notificationService } from "./notification.service.js";

export type SchedulerJobId = "daily-backup" | "core-snapshots" | "data-quality";

export type SchedulerJob = {
  id: SchedulerJobId;
  title: string;
  description: string;
  maintenanceJobId: MaintenanceJobId;
  intervalMinutes: number;
  enabled: boolean;
  payload: Record<string, unknown>;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastStatus: string | null;
  lastRunId: number | null;
  updatedAt: string;
};

const schedulerSpecs: Array<Omit<SchedulerJob, "enabled" | "lastRunAt" | "nextRunAt" | "lastStatus" | "lastRunId" | "updatedAt"> & { defaultEnabled: boolean }> = [
  {
    id: "daily-backup",
    title: "每日数据库还原点",
    description: "为周度导入和公开演示变更前的回滚准备本地 SQLite 还原点。",
    maintenanceJobId: "backup",
    intervalMinutes: Number(process.env.SCHEDULER_BACKUP_INTERVAL_MINUTES || 24 * 60),
    defaultEnabled: false,
    payload: { label: "scheduled-daily" },
  },
  {
    id: "core-snapshots",
    title: "核心情报快照刷新",
    description: "刷新公开页面使用的热门画像、主题、会议、地域和研究者缓存。",
    maintenanceJobId: "snapshot-core",
    intervalMinutes: Number(process.env.SCHEDULER_SNAPSHOT_INTERVAL_MINUTES || 6 * 60),
    defaultEnabled: false,
    payload: {},
  },
  {
    id: "data-quality",
    title: "每日数据质量扫描",
    description: "运行受控的重复、主题和单位检查，并把问题推送到通知中心。",
    maintenanceJobId: "data-quality",
    intervalMinutes: Number(process.env.SCHEDULER_QUALITY_INTERVAL_MINUTES || 24 * 60),
    defaultEnabled: false,
    payload: { scanLimit: 12000, sampleLimit: 50 },
  },
];

let timer: NodeJS.Timeout | null = null;
const running = new Set<string>();

function nowIso() {
  return new Date().toISOString();
}

function addMinutes(minutes: number, base = new Date()) {
  return new Date(base.getTime() + Math.max(1, minutes) * 60 * 1000).toISOString();
}

function parseJson(value: unknown): Record<string, unknown> {
  if (!value) return {};
  try {
    return JSON.parse(String(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function ensureTables() {
  appSqlite.exec(`
    CREATE TABLE IF NOT EXISTS scheduler_jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      maintenance_job_id TEXT NOT NULL,
      interval_minutes INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT,
      last_run_at TEXT,
      next_run_at TEXT,
      last_status TEXT,
      last_run_id INTEGER,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const insert = appSqlite.prepare(`
    INSERT INTO scheduler_jobs
      (id, title, description, maintenance_job_id, interval_minutes, enabled, payload_json, next_run_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      maintenance_job_id = excluded.maintenance_job_id,
      interval_minutes = CASE WHEN scheduler_jobs.interval_minutes > 0 THEN scheduler_jobs.interval_minutes ELSE excluded.interval_minutes END,
      payload_json = CASE WHEN scheduler_jobs.payload_json IS NOT NULL THEN scheduler_jobs.payload_json ELSE excluded.payload_json END
  `);

  for (const spec of schedulerSpecs) {
    insert.run(
      spec.id,
      spec.title,
      spec.description,
      spec.maintenanceJobId,
      Math.max(1, Math.floor(spec.intervalMinutes || 60)),
      spec.defaultEnabled ? 1 : 0,
      JSON.stringify(spec.payload),
      addMinutes(spec.intervalMinutes || 60)
    );
  }
}

ensureTables();

function rowToJob(row: any): SchedulerJob {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    maintenanceJobId: row.maintenance_job_id,
    intervalMinutes: Number(row.interval_minutes || 60),
    enabled: Number(row.enabled || 0) === 1,
    payload: parseJson(row.payload_json),
    lastRunAt: row.last_run_at || null,
    nextRunAt: row.next_run_at || null,
    lastStatus: row.last_status || null,
    lastRunId: row.last_run_id == null ? null : Number(row.last_run_id),
    updatedAt: row.updated_at,
  };
}

function getJob(id: string) {
  const row = appSqlite.prepare("SELECT * FROM scheduler_jobs WHERE id = ?").get(id);
  return row ? rowToJob(row) : null;
}

function listJobs() {
  return (appSqlite
    .prepare("SELECT * FROM scheduler_jobs ORDER BY enabled DESC, id ASC")
    .all() as any[]).map(rowToJob);
}

async function runScheduledJob(job: SchedulerJob, actor = "scheduler") {
  if (running.has(job.id)) return null;
  running.add(job.id);
  try {
    const run = await maintenanceService.run(job.maintenanceJobId, {
      actorUserId: 0,
      actorEmail: actor,
      payload: job.payload,
    });
    const nextRunAt = addMinutes(job.intervalMinutes);
    appSqlite.prepare(`
      UPDATE scheduler_jobs
      SET last_run_at = CURRENT_TIMESTAMP,
          next_run_at = ?,
          last_status = ?,
          last_run_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nextRunAt, run.status, run.id, job.id);

    notificationService.create({
      userId: 0,
      kind: "scheduler",
      severity: run.status === "failure" ? "critical" : "success",
      title: `${job.title}：${run.status === "failure" ? "失败" : "完成"}`,
      body: run.status === "failure"
        ? `调度任务失败：${run.error || "未知错误"}`
        : `调度任务已完成，用时 ${run.durationMs ?? 0}ms。`,
      href: "/maintenance",
      actionLabel: "查看维护任务",
      metadata: { schedulerJobId: job.id, maintenanceJobId: job.maintenanceJobId, runId: run.id },
    });

    return run;
  } finally {
    running.delete(job.id);
  }
}

export const schedulerService = {
  status() {
    const jobs = listJobs();
    return {
      enabled: appConfig.schedulerEnabled,
      running: Boolean(timer),
      generatedAt: nowIso(),
      jobs,
      nextRunAt: jobs
        .filter((job) => job.enabled && job.nextRunAt)
        .map((job) => job.nextRunAt!)
        .sort()[0] || null,
    };
  },

  update(id: SchedulerJobId, input: { enabled?: boolean; intervalMinutes?: number; payload?: Record<string, unknown> }) {
    const existing = getJob(id);
    if (!existing) throw new Error(`未知调度任务：${id}`);
    const enabled = input.enabled == null ? existing.enabled : Boolean(input.enabled);
    const intervalMinutes = input.intervalMinutes == null
      ? existing.intervalMinutes
      : Math.max(5, Math.min(7 * 24 * 60, Math.floor(Number(input.intervalMinutes) || existing.intervalMinutes)));
    const payload = input.payload || existing.payload;
    const nextRunAt = existing.nextRunAt || addMinutes(intervalMinutes);

    appSqlite.prepare(`
      UPDATE scheduler_jobs
      SET enabled = ?,
          interval_minutes = ?,
          payload_json = ?,
          next_run_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(enabled ? 1 : 0, intervalMinutes, JSON.stringify(payload), nextRunAt, id);

    return getJob(id)!;
  },

  async runNow(id: SchedulerJobId, actor = "admin") {
    const job = getJob(id);
    if (!job) throw new Error(`未知调度任务：${id}`);
    return runScheduledJob(job, actor);
  },

  async runDue() {
    if (!appConfig.schedulerEnabled) return { checked: 0, started: 0 };
    const due = listJobs().filter((job) => job.enabled && (!job.nextRunAt || new Date(job.nextRunAt).getTime() <= Date.now()));
    let started = 0;
    for (const job of due) {
      const run = await runScheduledJob(job);
      if (run) started += 1;
    }
    return { checked: due.length, started };
  },

  start() {
    if (!appConfig.schedulerEnabled || timer) return;
    timer = setInterval(() => {
      this.runDue().catch((err) => {
        console.error("[scheduler] runDue failed", err);
      });
    }, Math.max(10, appConfig.schedulerTickSeconds) * 1000);
    timer.unref?.();
    this.runDue().catch((err) => console.error("[scheduler] initial runDue failed", err));
  },

  stop() {
    if (timer) clearInterval(timer);
    timer = null;
  },
};
