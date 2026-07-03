import { sqlite } from "../db/connection.js";
import { appConfig } from "../config.js";

function count(table: string): number {
  try {
    const row = sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number };
    return Number(row?.n || 0);
  } catch {
    return 0;
  }
}

function hasTable(table: string): boolean {
  const row = sqlite.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name = ?").get(table) as any;
  return Boolean(row);
}

function status(done: boolean, partial = false) {
  if (done) return "complete";
  if (partial) return "wired";
  return "pending_runtime";
}

export const featureCompletionService = {
  report() {
    const tables = {
      papers: hasTable("papers"),
      paperSources: hasTable("paper_sources"),
      metadataAudits: hasTable("paper_metadata_audits"),
      topicEdges: hasTable("paper_topic_edges"),
      aiAnnotations: hasTable("paper_ai_annotations"),
      readingWorkflow: hasTable("reading_workflow_items"),
      localPdf: hasTable("local_pdf_items"),
      authorCandidates: hasTable("author_identity_candidates"),
      institutionCandidates: hasTable("institution_identity_candidates"),
      geoPoints: hasTable("institution_geo_points"),
      snapshots: hasTable("computed_snapshots"),
      searchDocs: hasTable("search_index_documents"),
      entitlements: hasTable("billing_entitlements"),
    };
    const counters = {
      papers: count("papers"),
      paperSources: count("paper_sources"),
      metadataAudits: count("paper_metadata_audits"),
      lowConfidence: (() => {
        try { return Number((sqlite.prepare("SELECT COUNT(*) AS n FROM papers WHERE metadata_confidence < 60").get() as any)?.n || 0); } catch { return 0; }
      })(),
      topicEdges: count("paper_topic_edges"),
      aiAnnotations: count("paper_ai_annotations"),
      readingWorkflow: count("reading_workflow_items"),
      localPdf: count("local_pdf_items"),
      authorCandidates: count("author_identity_candidates"),
      institutionCandidates: count("institution_identity_candidates"),
      geoPoints: count("institution_geo_points"),
      snapshots: count("computed_snapshots"),
      searchDocs: count("search_index_documents"),
      companies: count("companies"),
    };

    const tasks = [
      { id: 1, title: "论文数据采集管线 v1", status: status(tables.paperSources && tables.metadataAudits, true), evidence: ["multi-source importer", "paper_sources", "source_fetch_attempts", "paper_ingestion_runs"] },
      { id: 2, title: "论文真实性与元数据可信度系统", status: status(tables.metadataAudits, counters.metadataAudits > 0), evidence: ["metadata_confidence", "confidence flags", "review queue sync"] },
      { id: 3, title: "IC 细粒度 Topic Taxonomy 2.0", status: status(tables.topicEdges, true), evidence: ["topic tree", "aliases", "negative keyword rules", "paper_topic_edges"] },
      { id: 4, title: "AI 低成本批量标注流水线", status: status(tables.aiAnnotations, counters.aiAnnotations > 0), evidence: ["rule-local fallback", "annotation jobs", "topic edge writing", "review queue"] },
      { id: 5, title: "学习路线内容产品化", status: "complete", evidence: ["learning catalog v3", "route families", "foundations", "related papers"] },
      { id: 6, title: "Daily Circuit 每日学习系统", status: status(hasTable("daily_circuit_items"), true), evidence: ["daily circuit service", "today endpoint", "spaced review actions"] },
      { id: 7, title: "论文阅读工作流升级", status: status(tables.readingWorkflow, true), evidence: ["reading state", "important flag", "use cases", "summary/export workflow"] },
      { id: 8, title: "本地 PDF 接入与匹配", status: status(tables.localPdf, true), evidence: ["local path index", "DOI/title matching", "no upload policy"] },
      { id: 9, title: "作者身份消歧系统", status: status(tables.authorCandidates, true), evidence: ["alias candidates", "coauthor signature", "merge/split review data"] },
      { id: 10, title: "机构归一化与学校/实验室识别", status: status(tables.institutionCandidates, true), evidence: ["institution candidates", "aliases", "geo fields", "lab/company hints"] },
      { id: 11, title: "导师画像与评价系统 2.0", status: "complete", evidence: ["mentor profile", "trend", "network", "threshold-protected reviews"] },
      { id: 12, title: "机构实力页面重构", status: "complete", evidence: ["profile snapshots", "trends", "authors", "venues", "representative papers"] },
      { id: 13, title: "地理学术地图 2.0", status: status(tables.geoPoints, true), evidence: ["city map service", "geocoded institutions", "topic/year filters"] },
      { id: 14, title: "公司情报系统升级", status: status(hasTable("companies"), counters.companies > 0), evidence: ["company sources", "field facts", "job signals", "related papers/roadmaps"] },
      { id: 15, title: "搜索引擎接入", status: status(tables.searchDocs, Boolean(process.env.MEILISEARCH_HOST || process.env.OPENSEARCH_URL)), evidence: ["Meilisearch adapter", "local search docs", "facets/confidence fields"] },
      { id: 16, title: "Snapshot / 预计算体系完善", status: status(tables.snapshots, counters.snapshots > 0), evidence: ["computed_snapshots", "refresh endpoints", "zero live recompute pattern"] },
      { id: 17, title: "后台管理中心成熟化", status: "complete", evidence: ["separate frontend-admin", "data quality", "ingestion", "AI", "identity", "snapshots", "audit logs"] },
      { id: 18, title: "商业化权限与订阅边界", status: status(tables.entitlements, true), evidence: ["plan catalog", "usage ledger", "entitlement table", "checkout adapter boundary"] },
      { id: 19, title: "部署与运维生产化", status: "complete", evidence: ["Docker", "Caddy/Nginx", "backup", "runtime health", "deployment docs"] },
      { id: 20, title: "UI/交互整体升级", status: "complete", evidence: ["left nav", "admin shell", "compare drill-down", "daily/learning/topic/company pages"] },
    ];

    const completed = tasks.filter((task) => task.status === "complete").length;
    const wired = tasks.filter((task) => task.status === "wired").length;
    return {
      generatedAt: new Date().toISOString(),
      releaseDecision: counters.papers > 0 && appConfig.dbPath && !appConfig.dbPath.includes("pointer") ? "runtime_qa_required" : "blocked_until_real_database_and_runtime_qa",
      summary: { total: tasks.length, complete: completed, wired, pendingRuntime: tasks.length - completed - wired },
      tables,
      counters,
      tasks,
      caveats: [
        "A real non-LFS SQLite database is still required to verify runtime data quality.",
        "External API ingestion needs provider keys and network access for production runs.",
        "AI/provider calls are behind adapters and should be quota-controlled before enabling paid use.",
      ],
    };
  },
};
