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

function operationRunStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    success: "成功",
    succeeded: "成功",
    completed: "完成",
    running: "运行中",
    failure: "失败",
    failed: "失败",
    cancelled: "已取消",
  };
  return labels[String(status || "")] || String(status || "未知");
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
          title: "站点配置",
          status: siteSettings.maintenanceMode ? "attention" : siteSettings.checkoutEnabled ? "partial" : "ready",
          metric: siteSettings.inviteOnlyMode ? "邀请制" : "公开访问",
          detail: `${siteSettings.enabledFlags} 项已开启，${siteSettings.disabledFlags} 项已关闭；付费入口${siteSettings.checkoutEnabled ? "已开启" : "未开启"}。`,
          href: "/site-settings",
          action: "配置开关",
        },
        {
          id: "job-operations",
          title: "任务台账",
          status: scheduler.enabled || maintenanceRuns.total || ingestionJobs.total ? "ready" : "partial",
          metric: `${maintenanceRuns.total + ingestionJobs.total} 次运行`,
          detail: "统一查看计划任务、维护任务、备份、快照、数据质量和导入任务。",
          href: "/job-operations",
          action: "打开台账",
        },
        {
          id: "runtime",
          title: "运行健康",
          status: runtime.status === "ok" ? "ready" : runtime.status === "warn" ? "attention" : "needs-refresh",
          metric: runtime.status === "ok" ? "正常" : runtime.status === "warn" ? "警告" : "异常",
          detail: runtime.warnings[0] || `${runtime.checks.length} 项运行检查通过`,
          href: "/platform",
          action: "查看拓扑",
        },
        {
          id: "audit-logs",
          title: "审计日志",
          status: auditCount ? "ready" : "planned",
          metric: `${auditCount} 条事件`,
          detail: "记录后台变更、操作者、资源、状态、IP 与浏览器信息。",
          href: "/audit-logs",
          action: "查看日志",
        },
        {
          id: "observability",
          title: "运行观测",
          status: observability.totalErrors || observability.totalRateLimited ? "attention" : "ready",
          metric: `${observability.totalRequests} 次请求`,
          detail: `${observability.requestsLastMinute}/分钟，平均 ${observability.averageDurationMs}ms，错误 ${observability.totalErrors}`,
          href: "/observability",
          action: "查看流量",
        },
        {
          id: "maintenance",
          title: "维护任务",
          status: maintenanceRuns.rows[0]?.status === "failure" ? "attention" : "ready",
          metric: `${maintenanceRuns.total} 次运行`,
          detail: maintenanceRuns.rows[0] ? `${maintenanceRuns.rows[0].jobId} ${operationRunStatusLabel(maintenanceRuns.rows[0].status)}` : "还没有维护任务运行记录。",
          href: "/maintenance",
          action: "执行任务",
        },
        {
          id: "scheduler",
          title: "计划任务",
          status: scheduler.enabled ? "ready" : "planned",
          metric: scheduler.enabled ? "已启用" : "手动模式",
          detail: scheduler.nextRunAt ? `下次运行 ${scheduler.nextRunAt}` : `已配置 ${scheduler.jobs.length} 个任务；当前为手动运行。`,
          href: "/scheduler",
          action: "配置任务",
        },
        {
          id: "ingestion-jobs",
          title: "数据导入任务",
          status: ingestionJobs.total ? "partial" : "planned",
          metric: `${ingestionJobs.total} 个任务`,
          detail: "登记并运行带审计记录的 IEEE、OpenAlex、Crossref、CSV 元数据导入任务。",
          href: "/journal-ingestion",
          action: "创建任务",
        },
        {
          id: "backups",
          title: "数据库备份",
          status: backups.total ? "ready" : "attention",
          metric: `${backups.total} 个备份`,
          detail: backups.rows[0] ? `最近一次 ${backups.rows[0].createdAt}` : "尚未创建备份。",
          href: "/backups",
          action: "创建 / 清理",
        },
        {
          id: "notifications",
          title: "通知中心",
          status: notifications.unread ? "attention" : "ready",
          metric: `${notifications.unread} 条未读`,
          detail: `共 ${notifications.total} 条通知；周报和任务回执共用这个通道。`,
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
          id: "search-index",
          title: "搜索索引",
          status: searchIndex.configured ? searchIndex.reachable ? "partial" : "attention" : "planned",
          metric: searchIndex.configured ? searchIndex.reachable ? "外部索引在线" : "外部索引离线" : "本地索引",
          detail: searchIndex.configured
            ? `${searchIndex.indexes.map((index: any) => `${index.label || index.uid} ${index.documents || 0} 条`).join("，")}`
            : "外部搜索适配未配置；当前仍由本地全文索引提供检索。",
          href: "/search-index",
          action: "检查 / 重建",
        },
        {
          id: "snapshots",
          title: "快照缓存",
          status: snapshots.length ? "ready" : "needs-refresh",
          metric: `${snapshots.length} 个快照`,
          detail: `缓存体积 ${Math.round(snapshotBytes / 1024).toLocaleString()} KB。`,
          href: "/snapshots",
          action: "刷新 / 清理",
        },
        {
          id: "moderation",
          title: "审核队列",
          status: moderationOpen ? "attention" : "ready",
          metric: `${moderationOpen} 条待处理`,
          detail: `${moderation.totals?.comments || 0} 条评论，${moderation.totals?.reviews || 0} 条评价，${moderation.totals?.reports || 0} 条举报。`,
          href: "/moderation",
          action: "处理内容",
        },
        {
          id: "api-keys",
          title: "API 密钥",
          status: configuredApiKeys ? "partial" : "planned",
          metric: `${configuredApiKeys} 个已配置`,
          detail: "IEEE / OpenAI / AMiner / Crossref 等凭据。",
          href: "/",
          action: "查看配置",
        },
        {
          id: "pdf-inbox",
          title: "PDF 待匹配目录",
          status: pdfInbox.count ? "attention" : "ready",
          metric: `${pdfInbox.count} 个 PDF`,
          detail: pdfInbox.path,
          href: "/",
          action: "匹配本地 PDF",
        },
        {
          id: "data-quality",
          title: "数据质量",
          status: "partial",
          metric: `${stats.total.toLocaleString()} 篇论文`,
          detail: "检查 DOI 重复、主题置信度、别名和机构归一。",
          href: "/data-quality",
          action: "运行检查",
        },
        {
          id: "companies",
          title: "企业数据",
          status: companies.total ? "ready" : "needs-seed",
          metric: `${companies.total} 家企业`,
          detail: "维护企业别名、来源、领域事实和招聘线索。",
          href: "/companies",
          action: "维护企业",
        },
        {
          id: "identity",
          title: "实体别名",
          status: "partial",
          metric: "人工别名",
          detail: "作者与机构消歧、合并和拆分。",
          href: "/identity",
          action: "维护别名",
        },
        {
          id: "journal-filters",
          title: "会议期刊规则",
          status: "partial",
          metric: `${stats.venues.length} 个来源`,
          detail: "维护来源权重、隐藏规则和领域规则。",
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
