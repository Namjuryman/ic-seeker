import { appConfig } from "../config.js";
import { platformService } from "./platform.service.js";
import { statsService } from "./stats.service.js";
import { snapshotService } from "./snapshot.service.js";
import { moderationService } from "./moderation.service.js";
import { companyService } from "./company.service.js";
import { adminAuditService } from "./admin-audit.service.js";
import { runtimeHealthService } from "./runtime-health.service.js";
import { notificationService } from "./notification.service.js";
import { billingService } from "./billing.service.js";
import { backupService } from "./backup.service.js";
import { maintenanceService } from "./maintenance.service.js";
import { observabilityService } from "./observability.service.js";
import { schedulerService } from "./scheduler.service.js";
import { ingestionJobService } from "./ingestion-job.service.js";
import { siteSettingsService } from "./site-settings.service.js";
import { searchIndexService } from "./search-index.service.js";

function bytesTotal(rows: Array<{ bytes?: number }>) {
  return rows.reduce((sum, row) => sum + Number(row.bytes || 0), 0);
}

export const adminService = {
  async getOverview(userId = 0) {
    const platform = platformService.getOverview();
    const stats = statsService.getStats(userId);
    const snapshots = snapshotService.list() as Array<{ key: string; updatedAt?: string; bytes?: number }>;
    const moderation = moderationService.getQueue({ limit: 5, status: "pending" });
    const apiKeys = statsService.getApiKeys();
    const pdfInbox = await statsService.getPdfInbox();
    const companies = companyService.listCompanies({ limit: "1", offset: "0" });
    const auditCount = adminAuditService.count().count || 0;
    const runtime = runtimeHealthService.getHealth();
    const notifications = notificationService.stats(userId);
    const billing = billingService.getBillingStatus(userId);
    const backups = backupService.list();
    const maintenanceRuns = maintenanceService.runs({ limit: 1 });
    const observability = observabilityService.snapshot();
    const scheduler = schedulerService.status();
    const ingestionJobs = ingestionJobService.list({ limit: 1 });
    const siteSettings = siteSettingsService.summary();
    const searchIndex = await searchIndexService.status();

    const configuredApiKeys = apiKeys.filter((key) => key.masked).length;
    const snapshotBytes = bytesTotal(snapshots);
    const moderationOpen = (moderation.totals?.comments || 0) + (moderation.totals?.reviews || 0) + (moderation.totals?.reports || 0);

    return {
      appName: appConfig.appName,
      generatedAt: new Date().toISOString(),
      health: {
        backend: runtime.status === "error" ? "degraded" : "online",
        authMode: appConfig.authEnabled ? "password" : "local-dev",
        metadataDb: appConfig.dbPath,
        publicDir: appConfig.publicDir,
        runtimeStatus: runtime.status,
        uptimeSeconds: runtime.uptimeSeconds,
      },
      runtime,
      platform,
      summary: {
        papers: stats.total,
        years: stats.years,
        pdfs: stats.pdfs,
        companies: companies.total,
        snapshots: snapshots.length,
        snapshotBytes,
        moderationOpen,
        apiKeys: configuredApiKeys,
        pdfInbox: pdfInbox.count,
        dataQuality: platform.summary.averageMaturity,
        auditLogs: auditCount,
        notifications: notifications.total,
        unreadNotifications: notifications.unread,
        billingPlan: billing.currentPlan.id,
        paymentProvider: billing.paymentProvider,
        backups: backups.total,
        backupBytes: backups.totalBytes,
        maintenanceRuns: maintenanceRuns.total,
        totalRequests: observability.totalRequests,
        errorRate: observability.errorRate,
        schedulerEnabled: scheduler.enabled,
        schedulerJobs: scheduler.jobs.length,
        ingestionJobs: ingestionJobs.total,
        siteSettings: siteSettings.total,
        publicSettings: siteSettings.public,
      },
      operations: [
        {
          id: "site-settings",
          title: "Site Settings",
          status: siteSettings.maintenanceMode ? "attention" : siteSettings.checkoutEnabled ? "partial" : "ready",
          metric: siteSettings.inviteOnlyMode ? "invite-only" : "public",
          detail: `${siteSettings.enabledFlags} flags enabled, ${siteSettings.disabledFlags} disabled; checkout ${siteSettings.checkoutEnabled ? "enabled" : "off"}.`,
          href: "/admin/site-settings",
          action: "Configure flags",
        },
        {
          id: "job-operations",
          title: "Job Operations",
          status: scheduler.enabled || maintenanceRuns.total || ingestionJobs.total ? "ready" : "partial",
          metric: `${maintenanceRuns.total + ingestionJobs.total} runs`,
          detail: "Unified scheduler, maintenance, backup, snapshot, data-quality, and ingestion operations ledger.",
          href: "/admin/job-operations",
          action: "Open ledger",
        },
        {
          id: "runtime",
          title: "Production Readiness",
          status: runtime.status === "ok" ? "ready" : runtime.status === "warn" ? "attention" : "needs-refresh",
          metric: runtime.status.toUpperCase(),
          detail: runtime.warnings[0] || `${runtime.checks.length} runtime checks passed`,
          href: "/platform",
          action: "Inspect topology",
        },
        {
          id: "audit-logs",
          title: "Audit Logs",
          status: auditCount ? "ready" : "planned",
          metric: `${auditCount} events`,
          detail: "Admin mutations, actor, resource, status, IP, and user-agent.",
          href: "/admin/audit-logs",
          action: "View trail",
        },
        {
          id: "observability",
          title: "Runtime Observability",
          status: observability.totalErrors || observability.totalRateLimited ? "attention" : "ready",
          metric: `${observability.totalRequests} req`,
          detail: `${observability.requestsLastMinute}/min, avg ${observability.averageDurationMs}ms, errors ${observability.totalErrors}`,
          href: "/admin/observability",
          action: "Inspect traffic",
        },
        {
          id: "maintenance",
          title: "Maintenance Jobs",
          status: maintenanceRuns.rows[0]?.status === "failure" ? "attention" : "ready",
          metric: `${maintenanceRuns.total} runs`,
          detail: maintenanceRuns.rows[0] ? `${maintenanceRuns.rows[0].jobId} ${maintenanceRuns.rows[0].status}` : "No maintenance jobs have run yet.",
          href: "/admin/maintenance",
          action: "Run task",
        },
        {
          id: "scheduler",
          title: "Scheduled Operations",
          status: scheduler.enabled ? "ready" : "planned",
          metric: scheduler.enabled ? "enabled" : "manual",
          detail: scheduler.nextRunAt ? `next ${scheduler.nextRunAt}` : `${scheduler.jobs.length} jobs configured; scheduler disabled.`,
          href: "/admin/scheduler",
          action: "Configure jobs",
        },
        {
          id: "ingestion-jobs",
          title: "Ingestion Jobs",
          status: ingestionJobs.total ? "partial" : "planned",
          metric: `${ingestionJobs.total} jobs`,
          detail: "Register and run audited IEEE/OpenAlex/Crossref/CSV metadata jobs with single-runner protection.",
          href: "/journal-ingestion",
          action: "Create job",
        },
        {
          id: "backups",
          title: "Database Backups",
          status: backups.total ? "ready" : "attention",
          metric: `${backups.total} backups`,
          detail: backups.rows[0] ? `latest ${backups.rows[0].createdAt}` : "No backup has been created yet.",
          href: "/admin/backups",
          action: "Create / prune",
        },
        {
          id: "notifications",
          title: "Notification Center",
          status: notifications.unread ? "attention" : "ready",
          metric: `${notifications.unread} unread`,
          detail: `${notifications.total} total notifications; weekly digests and job receipts reuse this channel.`,
          href: "/notifications",
          action: "View notifications",
        },
        {
          id: "billing",
          title: "Billing & Quotas",
          status: billing.paymentConfigured ? "partial" : "planned",
          metric: billing.currentPlan.name,
          detail: billing.checkoutReason,
          href: "/billing",
          action: "View plans",
        },
        {
          id: "search-index",
          title: "Search Index",
          status: searchIndex.configured ? searchIndex.reachable ? "partial" : "attention" : "planned",
          metric: searchIndex.configured ? searchIndex.reachable ? "meili online" : "meili offline" : "sqlite",
          detail: searchIndex.configured
            ? `${searchIndex.indexes.map((index: any) => `${index.uid}:${index.documents || 0}`).join(", ")}`
            : "Optional Meilisearch adapter is not configured; SQLite search remains active.",
          href: "/admin/search-index",
          action: "Inspect / rebuild",
        },
        {
          id: "snapshots",
          title: "Snapshot Cache",
          status: snapshots.length ? "ready" : "needs-refresh",
          metric: `${snapshots.length} snapshots`,
          detail: `${Math.round(snapshotBytes / 1024).toLocaleString()} KB cached payload.`,
          href: "/admin/snapshots",
          action: "Refresh / clear",
        },
        {
          id: "moderation",
          title: "Moderation Queue",
          status: moderationOpen ? "attention" : "ready",
          metric: `${moderationOpen} open`,
          detail: `${moderation.totals?.comments || 0} comments, ${moderation.totals?.reviews || 0} reviews, ${moderation.totals?.reports || 0} reports.`,
          href: "/admin/moderation",
          action: "Review content",
        },
        {
          id: "api-keys",
          title: "API Keys",
          status: configuredApiKeys ? "partial" : "planned",
          metric: `${configuredApiKeys} configured`,
          detail: "IEEE / OpenAI / AMiner / Crossref credentials.",
          href: "/admin",
          action: "View config",
        },
        {
          id: "pdf-inbox",
          title: "PDF Inbox",
          status: pdfInbox.count ? "attention" : "ready",
          metric: `${pdfInbox.count} PDFs`,
          detail: pdfInbox.path,
          href: "/admin",
          action: "Match local PDF",
        },
        {
          id: "data-quality",
          title: "Data Quality",
          status: "partial",
          metric: `${stats.total.toLocaleString()} papers`,
          detail: "Duplicate DOI, topic confidence, aliases, and affiliations.",
          href: "/admin/data-quality",
          action: "Run checks",
        },
        {
          id: "companies",
          title: "Company Data",
          status: companies.total ? "ready" : "needs-seed",
          metric: `${companies.total} companies`,
          detail: "Company aliases, sources, field facts, and job signals.",
          href: "/admin/companies",
          action: "Maintain companies",
        },
        {
          id: "identity",
          title: "Identity Aliases",
          status: "partial",
          metric: "manual aliases",
          detail: "Author and institution disambiguation.",
          href: "/admin/identity",
          action: "Maintain aliases",
        },
        {
          id: "journal-filters",
          title: "Venue Rules",
          status: "partial",
          metric: `${stats.venues.length} venues`,
          detail: "Venue weights, hidden sources, and domain rules.",
          href: "/venue-matrix",
          action: "View matrix",
        },
      ],
      apiKeys,
      pdfInbox: {
        path: pdfInbox.path,
        count: pdfInbox.count,
        importCommand: pdfInbox.importCommand,
        samples: pdfInbox.pdfs.slice(0, 5),
      },
      recentModeration: {
        comments: moderation.comments.slice(0, 5),
        reviews: moderation.reviews.slice(0, 5),
        reports: moderation.reports.slice(0, 5),
        totals: moderation.totals,
      },
      recentAuditLogs: adminAuditService.recent(6),
    };
  },
};
