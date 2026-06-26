import { appConfig } from "../config.js";
import { platformService } from "./platform.service.js";
import { statsService } from "./stats.service.js";
import { snapshotService } from "./snapshot.service.js";
import { moderationService } from "./moderation.service.js";
import { companyService } from "./company.service.js";

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

    const configuredApiKeys = apiKeys.filter((key) => key.masked).length;
    const snapshotBytes = bytesTotal(snapshots);
    const moderationOpen = (moderation.totals?.comments || 0) + (moderation.totals?.reviews || 0) + (moderation.totals?.reports || 0);

    return {
      appName: appConfig.appName,
      generatedAt: new Date().toISOString(),
      health: {
        backend: "online",
        authMode: appConfig.authEnabled ? "password" : "local-dev",
        metadataDb: appConfig.dbPath,
        publicDir: appConfig.publicDir,
      },
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
      },
      operations: [
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
    };
  },
};
