import { backupService } from "./backup.service.js";
import { maintenanceService, type MaintenanceRun } from "./maintenance.service.js";
import { runtimeHealthService } from "./runtime-health.service.js";
import { schedulerService } from "./scheduler.service.js";
import { snapshotService } from "./snapshot.service.js";
import { ingestionJobService } from "./ingestion-job.service.js";

export type OperationLane = "scheduler" | "maintenance" | "backup" | "snapshot" | "quality" | "ingestion";
export type OperationStatus = "ok" | "warning" | "error" | "running" | "idle";

export type OperationTimelineItem = {
  id: string;
  lane: OperationLane;
  title: string;
  status: OperationStatus;
  detail: string;
  at: string | null;
  href: string;
  sourceId?: string | number | null;
};

export type OperationLaneSummary = {
  lane: OperationLane;
  title: string;
  status: OperationStatus;
  metric: string;
  detail: string;
  href: string;
};

type MaintenanceRunResult = {
  rows: MaintenanceRun[];
  total: number;
  limit: number;
  offset: number;
};

function statusFromRun(run?: MaintenanceRun | null): OperationStatus {
  if (!run) return "idle";
  if (run.status === "running") return "running";
  if (run.status === "failure") return "error";
  return "ok";
}

function statusFromText(value?: string | null): OperationStatus {
  if (!value) return "idle";
  if (value === "failure" || value === "error") return "error";
  if (value === "running") return "running";
  if (value === "success" || value === "ok") return "ok";
  return "warning";
}

function timeOrNull(value?: string | null) {
  return value || null;
}

function runDetail(run: MaintenanceRun) {
  if (run.error) return run.error;
  if (!run.summary) return `${run.jobId} 运行状态：${run.status}`;
  const summary = run.summary;
  if (typeof summary.ok === "number" && typeof summary.failed === "number") {
    return `${summary.ok} 项成功，${summary.failed} 项失败`;
  }
  if (typeof summary.dbBytes === "number") {
    return `${Math.round(summary.dbBytes / 1024 / 1024)} MB 恢复点`;
  }
  if (typeof summary.scannedRows === "number") {
    return `扫描 ${summary.scannedRows.toLocaleString()} 行`;
  }
  return `${run.jobId} 运行状态：${run.status}`;
}

export const jobOperationsService = {
  overview() {
    const scheduler = schedulerService.status();
    const maintenanceRuns = maintenanceService.runs({ limit: 30 }) as MaintenanceRunResult;
    const maintenanceJobs = maintenanceService.jobs();
    const backups = backupService.list();
    const snapshots = snapshotService.list() as Array<{ key: string; updatedAt?: string; updated_at?: string; bytes?: number }>;
    const ingestionJobs = ingestionJobService.list({ limit: 20 });
    const runtime = runtimeHealthService.getHealth();

    const latestRun = maintenanceRuns.rows[0] || null;
    const failedRuns = maintenanceRuns.rows.filter((run) => run.status === "failure").length;
    const runningRuns = maintenanceRuns.rows.filter((run) => run.status === "running").length;
    const enabledSchedulerJobs = scheduler.jobs.filter((job) => job.enabled).length;
    const snapshotBytes = snapshots.reduce((sum, row) => sum + Number(row.bytes || 0), 0);
    const activeIngestion = ingestionJobs.rows.filter((job) => job.status === "queued" || job.status === "running").length;
    const failedIngestion = ingestionJobs.rows.filter((job) => job.status === "failed").length;
    const latestSnapshot = snapshots
      .map((row) => row.updatedAt || row.updated_at || null)
      .filter(Boolean)
      .sort()
      .at(-1) || null;

    const lanes: OperationLaneSummary[] = [
      {
        lane: "scheduler",
        title: "计划任务",
        status: scheduler.enabled ? "ok" : "idle",
        metric: scheduler.enabled ? `${enabledSchedulerJobs}/${scheduler.jobs.length} 已启用` : "手动模式",
        detail: scheduler.nextRunAt ? `下次运行 ${scheduler.nextRunAt}` : "冒烟测试通过后，可在服务器启用自动计划任务。",
        href: "/scheduler",
      },
      {
        lane: "maintenance",
        title: "维护任务",
        status: runningRuns ? "running" : failedRuns ? "warning" : statusFromRun(latestRun),
        metric: `${maintenanceRuns.total} 次运行`,
        detail: latestRun ? `${latestRun.jobId}: ${latestRun.status === "success" ? "成功" : latestRun.status === "failure" ? "失败" : "运行中"}` : `已配置 ${maintenanceJobs.length} 个维护任务。`,
        href: "/maintenance",
      },
      {
        lane: "backup",
        title: "备份",
        status: backups.total ? "ok" : "warning",
        metric: `${backups.total} 个备份`,
        detail: backups.rows[0] ? `最近一次 ${backups.rows[0].createdAt}` : "首次公开部署前请先创建恢复点。",
        href: "/backups",
      },
      {
        lane: "snapshot",
        title: "快照",
        status: snapshots.length ? "ok" : "warning",
        metric: `${snapshots.length} 个快照`,
        detail: `缓存 ${Math.round(snapshotBytes / 1024).toLocaleString()} KB；最近更新 ${latestSnapshot || "-"}`,
        href: "/snapshots",
      },
      {
        lane: "quality",
        title: "数据质量",
        status: failedRuns ? "warning" : "idle",
        metric: runtime.status === "ok" ? "正常" : runtime.status === "warn" ? "警告" : "异常",
        detail: runtime.warnings[0] || "可从维护任务中运行有边界的数据质量扫描。",
        href: "/data-quality",
      },
      {
        lane: "ingestion",
        title: "数据导入",
        status: activeIngestion ? "running" : failedIngestion ? "warning" : ingestionJobs.total ? "ok" : "idle",
        metric: ingestionJobs.total ? `${ingestionJobs.total} 个任务` : "准备中",
        detail: activeIngestion
          ? `${activeIngestion} 个导入任务排队或运行中`
          : "IEEE、OpenAlex、Crossref、Semantic Scholar、DBLP、CSV 导入可通过审计任务执行。",
        href: "/journal-ingestion",
      },
    ];

    const timeline: OperationTimelineItem[] = [
      ...maintenanceRuns.rows.map((run) => ({
        id: `maintenance-${run.id}`,
        lane: run.jobId === "backup" ? "backup" as const : run.jobId === "data-quality" ? "quality" as const : "maintenance" as const,
        title: run.jobId,
        status: statusFromRun(run),
        detail: runDetail(run),
        at: timeOrNull(run.startedAt),
        href: "/maintenance",
        sourceId: run.id,
      })),
      ...scheduler.jobs.map((job) => ({
        id: `scheduler-${job.id}`,
        lane: "scheduler" as const,
        title: job.title,
        status: job.enabled ? statusFromText(job.lastStatus) : "idle" as const,
        detail: job.enabled ? `下次运行 ${job.nextRunAt || "-"}` : "手动模式",
        at: timeOrNull(job.lastRunAt || job.updatedAt),
        href: "/scheduler",
        sourceId: job.id,
      })),
      ...backups.rows.slice(0, 8).map((backup) => ({
        id: `backup-${backup.id}`,
        lane: "backup" as const,
        title: backup.label,
        status: "ok" as const,
        detail: `${Math.round(backup.dbBytes / 1024 / 1024)} MB 数据库备份`,
        at: timeOrNull(backup.createdAt),
        href: "/backups",
        sourceId: backup.id,
      })),
      ...ingestionJobs.rows.map((job) => ({
        id: `ingestion-${job.id}`,
        lane: "ingestion" as const,
        title: `${job.provider} ${job.mode}`,
        status: job.status === "failed"
          ? "error" as const
          : job.status === "running" || job.status === "queued"
            ? "running" as const
            : job.status === "review_required"
              ? "warning" as const
              : "ok" as const,
        detail: `新增 ${job.counts.inserted}，更新 ${job.counts.updated}，待复核 ${job.counts.review}`,
        at: timeOrNull(job.updatedAt || job.createdAt),
        href: "/journal-ingestion",
        sourceId: job.id,
      })),
    ].sort((a, b) => String(b.at || "").localeCompare(String(a.at || ""))).slice(0, 60);

    return {
      generatedAt: new Date().toISOString(),
      runtimeStatus: runtime.status,
      lanes,
      timeline,
      nextRunAt: scheduler.nextRunAt,
      counts: {
        schedulerJobs: scheduler.jobs.length,
        enabledSchedulerJobs,
        maintenanceRuns: maintenanceRuns.total,
        failedRuns,
        backups: backups.total,
        snapshots: snapshots.length,
        ingestionJobs: ingestionJobs.total,
        activeIngestion,
      },
      caveat: "这是独立后台的运维台账。元数据导入任务当前在进程内运行，并带单写入保护；大规模公开导入前仍建议先备份，导入后刷新快照和搜索索引。",
    };
  },
};
