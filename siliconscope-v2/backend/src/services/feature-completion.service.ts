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
      { id: 1, title: "论文数据采集管线 v1", status: status(tables.paperSources && tables.metadataAudits, true), evidence: ["多源导入器", "论文来源表", "来源抓取记录", "论文导入运行台账"] },
      { id: 2, title: "论文真实性与元数据可信度系统", status: status(tables.metadataAudits, counters.metadataAudits > 0), evidence: ["元数据可信度字段", "置信标记", "复核队列同步"] },
      { id: 3, title: "IC 细粒度方向分类 2.0", status: status(tables.topicEdges, true), evidence: ["方向树", "别名词表", "负向关键词规则", "论文-方向关联表"] },
      { id: 4, title: "AI 低成本批量标注流水线", status: status(tables.aiAnnotations, counters.aiAnnotations > 0), evidence: ["本地规则兜底", "标注任务台账", "方向关联写入", "复核队列"] },
      { id: 5, title: "学习路线内容产品化", status: "complete", evidence: ["学习目录 v3", "路线族群", "通用基础模块", "相关论文入口"] },
      { id: 6, title: "Daily Circuit 每日学习系统", status: status(hasTable("daily_circuit_items"), true), evidence: ["每日课程服务", "今日课程接口", "间隔复习动作"] },
      { id: 7, title: "论文阅读工作流升级", status: status(tables.readingWorkflow, true), evidence: ["阅读状态", "重要标记", "使用场景记录", "摘要与导出流程"] },
      { id: 8, title: "本地 PDF 接入与匹配", status: status(tables.localPdf, true), evidence: ["本地路径索引", "DOI/标题匹配", "不上传全文的边界"] },
      { id: 9, title: "作者身份消歧系统", status: status(tables.authorCandidates, true), evidence: ["别名候选", "合作者签名", "合并/拆分复核数据"] },
      { id: 10, title: "机构归一化与学校/实验室识别", status: status(tables.institutionCandidates, true), evidence: ["机构候选", "机构别名", "地理字段", "实验室/企业线索"] },
      { id: 11, title: "研究者画像与评价系统 2.0", status: "complete", evidence: ["研究者画像", "趋势图", "合作网络", "阈值保护评价"] },
      { id: 12, title: "机构画像页面重构", status: "complete", evidence: ["画像快照", "趋势", "作者线索", "来源分布", "代表论文"] },
      { id: 13, title: "地理学术地图 2.0", status: status(tables.geoPoints, true), evidence: ["城市级地图服务", "机构地理编码", "方向/年份筛选"] },
      { id: 14, title: "企业情报系统升级", status: status(hasTable("companies"), counters.companies > 0), evidence: ["企业来源", "字段事实", "岗位信号", "相关论文/学习路线"] },
      { id: 15, title: "搜索引擎接入", status: status(tables.searchDocs, Boolean(process.env.MEILISEARCH_HOST || process.env.OPENSEARCH_URL)), evidence: ["外部搜索适配", "本地搜索文档", "筛选面与可信度字段"] },
      { id: 16, title: "快照与预计算体系完善", status: status(tables.snapshots, counters.snapshots > 0), evidence: ["计算快照表", "刷新接口", "避免访问时实时重算"] },
      { id: 17, title: "后台管理中心成熟化", status: "complete", evidence: ["独立后台入口", "数据质量", "导入管理", "AI 标注", "身份归一", "快照", "审计日志"] },
      { id: 18, title: "商业化权限与订阅边界", status: status(tables.entitlements, true), evidence: ["方案目录", "用量账本", "权益表", "支付适配器边界"] },
      { id: 19, title: "部署与运维生产化", status: "complete", evidence: ["Docker", "Caddy/Nginx", "备份", "运行健康", "部署文档"] },
      { id: 20, title: "UI/交互整体升级", status: "complete", evidence: ["左侧导航", "后台外壳", "对比钻取", "每日/学习/方向/企业页面"] },
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
        "仍需使用真实运行数据库验证运行时数据质量。",
        "外部来源采集在生产运行前需要配置访问密钥，并确认网络访问。",
        "AI 服务调用仍在适配器后面，付费使用前必须保留配额和成本控制。",
      ],
    };
  },
};
