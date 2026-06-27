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
      },
      operations: [
        {
          id: "runtime",
          title: "生产就绪",
          status: runtime.status === "ok" ? "ready" : runtime.status === "warn" ? "attention" : "needs-refresh",
          metric: runtime.status.toUpperCase(),
          detail: runtime.warnings[0] || `${runtime.checks.length} runtime checks passed`,
          href: "/platform",
          action: "查看拓扑",
        },
        {
          id: "audit-logs",
          title: "审计日志",
          status: auditCount ? "ready" : "planned",
          metric: `${auditCount} events`,
          detail: "admin mutations, actor, resource, status, IP and user-agent",
          href: "/audit-logs",
          action: "查看留痕",
        },
        {
          id: "backups",
          title: "数据库备份",
          status: backups.total ? "ready" : "attention",
          metric: `${backups.total} backups`,
          detail: backups.rows[0] ? `latest ${backups.rows[0].createdAt}` : "No backup has been created yet",
          href: "/backups",
          action: "创建 / 清理",
        },
        {
          id: "notifications",
          title: "通知中心",
          status: notifications.unread ? "attention" : "ready",
          metric: `${notifications.unread} unread`,
          detail: `${notifications.total} total user notifications; weekly digest and job receipts will reuse this channel`,
          href: "/notifications",
          action: "查看通知",
        },
        {
          id: "billing",
          title: "订阅与配额",
          status: billing.paymentConfigured ? "partial" : "planned",
          metric: billing.currentPlan.name,
          detail: billing.checkoutReason,
          href: "/billing",
          action: "查看计划",
        },
        {
          id: "snapshots",
          title: "快照缓存",
          status: snapshots.length ? "ready" : "needs-refresh",
          metric: `${snapshots.length} snapshots`,
          detail: `${Math.round(snapshotBytes / 1024).toLocaleString()} KB cached payload`,
          href: "/snapshots",
          action: "刷新 / 清理",
        },
        {
          id: "moderation",
          title: "审核队列",
          status: moderationOpen ? "attention" : "ready",
          metric: `${moderationOpen} open`,
          detail: `${moderation.totals?.comments || 0} comments, ${moderation.totals?.reviews || 0} reviews, ${moderation.totals?.reports || 0} reports`,
          href: "/moderation",
          action: "处理内容",
        },
        {
          id: "api-keys",
          title: "API Key",
          status: configuredApiKeys ? "partial" : "planned",
          metric: `${configuredApiKeys} configured`,
          detail: "IEEE / OpenAI / AMiner / Crossref credentials",
          href: "/admin",
          action: "查看配置",
        },
        {
          id: "pdf-inbox",
          title: "PDF Inbox",
          status: pdfInbox.count ? "attention" : "ready",
          metric: `${pdfInbox.count} PDFs`,
          detail: pdfInbox.path,
          href: "/admin",
          action: "匹配本地 PDF",
        },
        {
          id: "data-quality",
          title: "数据质量",
          status: "partial",
          metric: `${stats.total.toLocaleString()} papers`,
          detail: "duplicate DOI, topic confidence, aliases, affiliations",
          href: "/data-quality",
          action: "运行检查",
        },
        {
          id: "companies",
          title: "企业数据",
          status: companies.total ? "ready" : "needs-seed",
          metric: `${companies.total} companies`,
          detail: "company aliases, sources, field facts, job signals",
          href: "/admin/companies",
          action: "维护企业",
        },
        {
          id: "identity",
          title: "别名与归一化",
          status: "partial",
          metric: "manual aliases",
          detail: "author and institution disambiguation",
          href: "/identity",
          action: "维护别名",
        },
        {
          id: "journal-filters",
          title: "会议/期刊规则",
          status: "partial",
          metric: `${stats.venues.length} venues`,
          detail: "venue weights, hidden sources, domain rules",
          href: "/venue-matrix",
          action: "查看矩阵",
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
