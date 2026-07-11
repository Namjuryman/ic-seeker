import { appConfig } from "../config.js";
import { getDataLayerTopology } from "../db/topology.js";

type ModuleStatus = "ready" | "partial" | "planned";
type ModuleTrack = "research" | "learning" | "business" | "operations" | "community" | "commercial";

export type PlatformModule = {
  id: string;
  name: string;
  track: ModuleTrack;
  status: ModuleStatus;
  maturity: number;
  summary: string;
  shipped: string[];
  next: string[];
};

const modules: PlatformModule[] = [
  {
    id: "paper-search",
    name: "论文搜索工作台",
    track: "research",
    status: "ready",
    maturity: 82,
    summary: "已支持结构化论文搜索、详情侧栏、阅读状态、笔记、标签以及 DOI/PDF 来源链接。",
    shipped: ["SQLite 全文检索", "轻量语义扩展", "论文详情侧栏", "阅读状态"],
    next: ["Meilisearch/OpenSearch 索引", "IEEE 采集适配器", "本地 PDF 匹配"],
  },
  {
    id: "profiles",
    name: "学者与机构画像",
    track: "research",
    status: "partial",
    maturity: 64,
    summary: "作者和机构页面已可用于探索，但身份消歧仍需要更多官方主页和机构来源校验。",
    shipped: ["作者画像", "机构画像", "生涯/活跃度图表", "别名管理"],
    next: ["ORCID/IEEE 单位合并", "研究者主页核验", "头像/Logo 对象存储"],
  },
  {
    id: "mentor-intelligence",
    name: "研究者情报",
    track: "community",
    status: "partial",
    maturity: 52,
    summary: "研究者候选和评价链路已接入阈值保护、官网名单核验和内容审核流程，适合作为研究者/课题组体验线索。",
    shipped: ["研究者机构", "研究者画像", "匿名评价", "带阈值的对比"],
    next: ["已验证评价者流程", "滥用举报", "生涯时间线补全"],
  },
  {
    id: "company-intelligence",
    name: "企业情报",
    track: "business",
    status: "partial",
    maturity: 58,
    summary: "企业数据库已可搜索，并已连接相关论文、学习路线和关注列表。",
    shipped: ["企业基础数据", "企业搜索", "关注列表", "企业对比"],
    next: ["岗位信号采集", "企业别名复核", "融资/新闻/事件时间线"],
  },
  {
    id: "learning",
    name: "学习路线与每日电路",
    track: "learning",
    status: "ready",
    maturity: 78,
    summary: "路线库、每日课程和数据库内容台账已就绪，可支撑 IC 自学和移动端风格学习。",
    shipped: ["路线族群", "通用基础", "每日课程", "相关论文", "管理端内容同步"],
    next: ["结构化内容编辑器", "学习进度追踪", "间隔复习", "阅读队列联动"],
  },
  {
    id: "geo-venue",
    name: "地域、方向与会议情报",
    track: "research",
    status: "partial",
    maturity: 61,
    summary: "地域地图、方向报告和会议矩阵已可用。主题分类和论文-主题关联已预计算，地理编码与复核流程还需继续加固。",
    shipped: ["地域地图", "方向报告", "会议矩阵", "期刊筛选评估"],
    next: ["城市级地理编码", "会议权重审计", "论文-主题复核界面"],
  },
  {
    id: "content-quality",
    name: "内容质量与知识图谱",
    track: "operations",
    status: "planned",
    maturity: 28,
    summary: "内容能力把原始元数据沉淀为有来源支撑的方向、实体结论、周度差异和可复用报告模板。",
    shipped: ["内容扩展计划", "内容成熟度分层", "周度刷新模型"],
    next: ["论文-主题人工修正", "内容质量问题队列", "带来源的实体结论库", "报告模板"],
  },
  {
    id: "data-ops",
    name: "数据运营",
    track: "operations",
    status: "partial",
    maturity: 55,
    summary: "快照、数据质量、身份别名和采集管理页已覆盖周度维护场景。",
    shipped: ["快照管理", "数据质量报告", "别名管理", "期刊采集页"],
    next: ["周度定时任务", "快照差异报告", "导入来源复核"],
  },
  {
    id: "commercial-stack",
    name: "商业化基础",
    track: "commercial",
    status: "partial",
    maturity: 47,
    summary: "独立域名部署、通知中心、订阅方案、用量账本、部分配额约束、管理端方案调整、本地备份和维护记录已经具备；支付和基础设施适配处于受控开放边界内。",
    shipped: ["appDb 适配器", "cacheDb 适配器", "基础设施 compose", "独立域名模板", "通知中心", "订阅方案目录", "用量账本", "管理端方案调整", "备份操作", "维护任务中心"],
    next: ["Stripe/Paddle 支付适配器", "支付回调校验", "PostgreSQL 应用库", "Redis 缓存/队列", "对象存储", "邮件/OAuth", "可观测性"],
  },
];

function trackScore(track: ModuleTrack) {
  const items = modules.filter((item) => item.track === track);
  if (!items.length) return 0;
  return Math.round(items.reduce((sum, item) => sum + item.maturity, 0) / items.length);
}

export const platformService = {
  getOverview() {
    const topology = getDataLayerTopology();
    const tracks: Array<{ id: ModuleTrack; name: string; score: number; modules: number }> = [
      { id: "research", name: "研究情报", score: trackScore("research"), modules: modules.filter((m) => m.track === "research").length },
      { id: "learning", name: "学习产品", score: trackScore("learning"), modules: modules.filter((m) => m.track === "learning").length },
      { id: "business", name: "产业情报", score: trackScore("business"), modules: modules.filter((m) => m.track === "business").length },
      { id: "community", name: "社区评价", score: trackScore("community"), modules: modules.filter((m) => m.track === "community").length },
      { id: "operations", name: "运营工具", score: trackScore("operations"), modules: modules.filter((m) => m.track === "operations").length },
      { id: "commercial", name: "商业化基础", score: trackScore("commercial"), modules: modules.filter((m) => m.track === "commercial").length },
    ];

    return {
      appName: appConfig.appName,
      generatedAt: new Date().toISOString(),
      topology,
      summary: {
        modules: modules.length,
        ready: modules.filter((m) => m.status === "ready").length,
        partial: modules.filter((m) => m.status === "partial").length,
        planned: modules.filter((m) => m.status === "planned").length,
        averageMaturity: Math.round(modules.reduce((sum, item) => sum + item.maturity, 0) / modules.length),
      },
      tracks,
      modules,
      nextMilestones: [
        "让周度采集任务具备幂等能力，并在运营页可追踪。",
        "在现有 appDb 边界后接入 PostgreSQL，承载应用和产业数据表。",
        "将计算快照迁移到 Redis 或快照注册表，并保持 cacheDb 边界清晰。",
        "为论文、作者、机构、企业、学习路线和会议接入 Meilisearch。",
        "补充内容质量图谱，覆盖方向层级、有来源的实体结论和周度内容差异。",
        "接入对象存储，用于 PDF、头像、机构 Logo、企业 Logo 和上传附件。",
        "在元数据政策、访问控制和公开演示边界稳定后，再接入 Stripe/Paddle 支付。",
      ],
    };
  },
};
