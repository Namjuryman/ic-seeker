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
  if (!run.summary) return `${run.jobId} run ${run.status}`;
  const summary = run.summary;
  if (typeof summary.ok === "number" && typeof summary.failed === "number") {
    return `${summary.ok} ok, ${summary.failed} failed`;
  }
  if (typeof summary.dbBytes === "number") {
    return `${Math.round(summary.dbBytes / 1024 / 1024)} MB restore point`;
  }
  if (typeof summary.scannedRows === "number") {
    return `${summary.scannedRows.toLocaleString()} rows scanned`;
  }
  return `${run.jobId} run ${run.status}`;
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
        title: "Scheduler",
        status: scheduler.enabled ? "ok" : "idle",
        metric: scheduler.enabled ? `${enabledSchedulerJobs}/${scheduler.jobs.length} enabled` : "manual",
        detail: scheduler.nextRunAt ? `Next run ${scheduler.nextRunAt}` : "Public server can enable SCHEDULER_ENABLED=1 after smoke tests.",
        href: "/admin/scheduler",
      },
      {
        lane: "maintenance",
        title: "Maintenance",
        status: runningRuns ? "running" : failedRuns ? "warning" : statusFromRun(latestRun),
        metric: `${maintenanceRuns.total} runs`,
        detail: latestRun ? `${latestRun.jobId}: ${latestRun.status}` : `${maintenanceJobs.length} maintenance jobs configured.`,
        href: "/admin/maintenance",
      },
      {
        lane: "backup",
        title: "Backups",
        status: backups.total ? "ok" : "warning",
        metric: `${backups.total} backups`,
        detail: backups.rows[0] ? `Latest ${backups.rows[0].createdAt}` : "Create a restore point before first public go-live.",
        href: "/admin/backups",
      },
      {
        lane: "snapshot",
        title: "Snapshots",
        status: snapshots.length ? "ok" : "warning",
        metric: `${snapshots.length} snapshots`,
        detail: `${Math.round(snapshotBytes / 1024).toLocaleString()} KB cached; latest ${latestSnapshot || "-"}`,
        href: "/admin/snapshots",
      },
      {
        lane: "quality",
        title: "Data Quality",
        status: failedRuns ? "warning" : "idle",
        metric: runtime.status.toUpperCase(),
        detail: runtime.warnings[0] || "Bounded quality scans are available from maintenance tasks.",
        href: "/admin/data-quality",
      },
      {
        lane: "ingestion",
        title: "Ingestion Pipeline",
        status: activeIngestion ? "running" : failedIngestion ? "warning" : ingestionJobs.total ? "ok" : "idle",
        metric: ingestionJobs.total ? `${ingestionJobs.total} jobs` : "planned",
        detail: activeIngestion
          ? `${activeIngestion} queued/running ingestion jobs`
          : "IEEE/OpenAlex weekly imports can now be registered before workers are connected.",
        href: "/admin/ingestion",
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
        href: "/admin/maintenance",
        sourceId: run.id,
      })),
      ...scheduler.jobs.map((job) => ({
        id: `scheduler-${job.id}`,
        lane: "scheduler" as const,
        title: job.title,
        status: job.enabled ? statusFromText(job.lastStatus) : "idle" as const,
        detail: job.enabled ? `Next run ${job.nextRunAt || "-"}` : "Manual mode",
        at: timeOrNull(job.lastRunAt || job.updatedAt),
        href: "/admin/scheduler",
        sourceId: job.id,
      })),
      ...backups.rows.slice(0, 8).map((backup) => ({
        id: `backup-${backup.id}`,
        lane: "backup" as const,
        title: backup.label,
        status: "ok" as const,
        detail: `${Math.round(backup.dbBytes / 1024 / 1024)} MB database backup`,
        at: timeOrNull(backup.createdAt),
        href: "/admin/backups",
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
        detail: `${job.counts.inserted} inserted, ${job.counts.updated} updated, ${job.counts.review} review`,
        at: timeOrNull(job.updatedAt || job.createdAt),
        href: "/admin/ingestion",
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
      caveat: "This page is the operations ledger for the independent-domain deployment. Import workers are still planned, so ingestion rows are placeholders until IEEE/OpenAlex jobs are connected.",
    };
  },
};
