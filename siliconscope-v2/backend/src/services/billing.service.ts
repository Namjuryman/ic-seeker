import { eq } from "drizzle-orm";
import { appConfig } from "../config.js";
import { appDb, appSqlite } from "../db/app-db.js";
import { users } from "../db/schema.js";
import { evaluateQuota } from "./billing-utils.js";

export type BillingPlanId = "free" | "pro" | "lab" | "enterprise" | "internal";

export type BillingLimits = {
  savedSearches: number;
  watchlistItems: number;
  readingQueueItems: number;
  aiSummariesPerMonth: number;
  exportsPerMonth: number;
  alerts: number;
  apiRequestsPerMonth: number;
  teamSeats: number;
  privatePdfStorageGb: number;
};

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  audience: string;
  priceMonthlyUsd: number | null;
  badge: string;
  description: string;
  features: string[];
  limits: BillingLimits;
  recommended?: boolean;
  publicSignupEnabled: boolean;
};

export type BillingStatus = {
  paymentProvider: string;
  paymentConfigured: boolean;
  checkoutAvailable: boolean;
  checkoutReason: string;
  currentPlan: BillingPlan;
  plans: BillingPlan[];
  entitlementSummary: Array<{ label: string; value: string; detail: string }>;
  usage: BillingUsageSummary;
};

export type BillingUserRow = {
  id: number;
  email: string;
  nickname: string | null;
  roleHint: string;
  verificationLevel: string;
  subscriptionPlan: BillingPlanId;
  planName: string;
  createdAt: string;
  usage: BillingUsageSummary;
};

export type UsageMetric = "savedSearches" | "watchlistItems" | "readingQueueItems" | "aiSummariesPerMonth" | "exportsPerMonth" | "alerts" | "apiRequestsPerMonth" | "privatePdfStorageGb";

export type BillingUsageItem = {
  metric: UsageMetric;
  label: string;
  used: number;
  limit: number;
  remaining: number | null;
  resetAt: string | null;
  enforced: boolean;
};

export type BillingUsageSummary = {
  periodStart: string;
  periodEnd: string;
  items: BillingUsageItem[];
};

const unlimited = -1;

const plans: BillingPlan[] = [
  {
    id: "free",
    name: "免费预览",
    audience: "公开演示和轻量试用用户",
    priceMonthlyUsd: 0,
    badge: "演示",
    description: "用于体验 SiliconScope 的公开元数据检索、DOI/来源链接和轻量个人工作流。",
    features: ["论文元数据检索", "方向与机构画像浏览", "DOI/来源链接跳转", "有限关注列表"],
    limits: {
      savedSearches: 3,
      watchlistItems: 30,
      readingQueueItems: 50,
      aiSummariesPerMonth: 0,
      exportsPerMonth: 3,
      alerts: 1,
      apiRequestsPerMonth: 0,
      teamSeats: 1,
      privatePdfStorageGb: 0,
    },
    publicSignupEnabled: false,
  },
  {
    id: "pro",
    name: "研究者 Pro",
    audience: "学生、IC 工程师和独立研究者",
    priceMonthlyUsd: 19,
    badge: "个人",
    description: "提高个人阅读管理、提醒、导出和 AI 论文辅助的使用额度。",
    features: ["不限量元数据检索", "更大的关注列表和阅读队列", "每周方向提醒", "导出中心", "AI 阅读辅助额度"],
    limits: {
      savedSearches: 50,
      watchlistItems: 500,
      readingQueueItems: 1000,
      aiSummariesPerMonth: 200,
      exportsPerMonth: 100,
      alerts: 20,
      apiRequestsPerMonth: 1000,
      teamSeats: 1,
      privatePdfStorageGb: 2,
    },
    recommended: true,
    publicSignupEnabled: false,
  },
  {
    id: "lab",
    name: "课题组",
    audience: "研究组和小型 IC 团队",
    priceMonthlyUsd: 99,
    badge: "团队",
    description: "面向需要团队级收藏、导入和内部评估流程的实验室共享工作区方案。",
    features: ["团队关注列表", "共享阅读队列", "研究者/机构跟踪", "管理员复核导入", "优先快照刷新"],
    limits: {
      savedSearches: 500,
      watchlistItems: 5000,
      readingQueueItems: 10000,
      aiSummariesPerMonth: 2000,
      exportsPerMonth: 1000,
      alerts: 200,
      apiRequestsPerMonth: 20000,
      teamSeats: 10,
      privatePdfStorageGb: 50,
    },
    publicSignupEnabled: false,
  },
  {
    id: "enterprise",
    name: "企业/机构",
    audience: "企业、研究院和付费私有部署",
    priceMonthlyUsd: null,
    badge: "定制",
    description: "支持私有数据、API 集成、安全审查和采集任务的定制部署。",
    features: ["私有部署", "定制爬虫/API 策略", "SLA 与备份", "对象存储集成", "SSO/OAuth 路线图"],
    limits: {
      savedSearches: unlimited,
      watchlistItems: unlimited,
      readingQueueItems: unlimited,
      aiSummariesPerMonth: unlimited,
      exportsPerMonth: unlimited,
      alerts: unlimited,
      apiRequestsPerMonth: unlimited,
      teamSeats: unlimited,
      privatePdfStorageGb: unlimited,
    },
    publicSignupEnabled: false,
  },
  {
    id: "internal",
    name: "内部管理",
    audience: "站点所有者和本地运营者",
    priceMonthlyUsd: null,
    badge: "所有者",
    description: "用于本地开发、后台维护和私有数据库整理的内部运营模式。",
    features: ["管理控制台", "全部私有 MVP 工作流", "数据导入操作", "运行时与审计工具"],
    limits: {
      savedSearches: unlimited,
      watchlistItems: unlimited,
      readingQueueItems: unlimited,
      aiSummariesPerMonth: unlimited,
      exportsPerMonth: unlimited,
      alerts: unlimited,
      apiRequestsPerMonth: unlimited,
      teamSeats: unlimited,
      privatePdfStorageGb: unlimited,
    },
    publicSignupEnabled: false,
  },
];

function normalizePlanId(value?: string | null): BillingPlanId {
  const id = String(value || "free").toLowerCase();
  if (["free", "pro", "lab", "enterprise", "internal"].includes(id)) return id as BillingPlanId;
  return "free";
}

function getPlan(planId?: string | null): BillingPlan {
  return plans.find((plan) => plan.id === normalizePlanId(planId)) || plans[0];
}

function formatLimit(value: number, suffix = "") {
  if (value < 0) return "不限";
  return `${value.toLocaleString()}${suffix}`;
}

function paymentConfigured() {
  if (appConfig.paymentProvider === "stripe") return Boolean(appConfig.stripeSecretKey);
  if (appConfig.paymentProvider === "paddle") return Boolean(appConfig.paddleApiKey);
  return false;
}

function getUserPlanId(userId: number): BillingPlanId {
  if (userId === 0) return appConfig.localAdminEnabled ? "internal" : "free";
  const row = appDb
    .select({ subscriptionPlan: users.subscriptionPlan, verificationLevel: users.verificationLevel })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  if (row?.verificationLevel === "admin") return "internal";
  return normalizePlanId(row?.subscriptionPlan);
}

function monthWindow(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return { start: start.toISOString(), end: end.toISOString() };
}

function countScalar(sql: string, params: Array<string | number> = []) {
  const row = appSqlite.prepare(sql).get(...params) as { count?: number } | undefined;
  return Number(row?.count || 0);
}

function monthlyUsage(userId: number, metric: UsageMetric, start: string, end: string) {
  const row = appSqlite
    .prepare(
      `
      SELECT COALESCE(SUM(quantity), 0) as count
      FROM usage_events
      WHERE user_id = ? AND metric = ? AND created_at >= ? AND created_at < ?
    `
    )
    .get(userId, metric, start, end) as { count?: number } | undefined;
  return Number(row?.count || 0);
}

function usageForMetric(userId: number, metric: UsageMetric, start: string, end: string) {
  switch (metric) {
    case "savedSearches":
      return countScalar("SELECT COUNT(*) as count FROM watchlist_items WHERE user_id = ? AND target_type = 'search'", [userId]);
    case "watchlistItems":
      return countScalar("SELECT COUNT(*) as count FROM watchlist_items WHERE user_id = ?", [userId]);
    case "readingQueueItems":
      return countScalar("SELECT COUNT(*) as count FROM reading_status WHERE user_id = ? AND status <> 'unread'", [userId]);
    case "aiSummariesPerMonth":
    case "exportsPerMonth":
    case "alerts":
    case "apiRequestsPerMonth":
      return monthlyUsage(userId, metric, start, end);
    case "privatePdfStorageGb":
      return 0;
  }
}

function usageItem(
  userId: number,
  plan: BillingPlan,
  metric: UsageMetric,
  label: string,
  periodStart: string,
  periodEnd: string,
  enforced: boolean
): BillingUsageItem {
  const limit = plan.limits[metric];
  const used = usageForMetric(userId, metric, periodStart, periodEnd);
  return {
    metric,
    label,
    used,
    limit,
    remaining: limit < 0 ? null : Math.max(0, limit - used),
    resetAt: metric.endsWith("PerMonth") ? periodEnd : null,
    enforced,
  };
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function activeSubscription(userId: number) {
  return appSqlite
    .prepare(
      `
      SELECT id, user_id, plan_id, status, provider, provider_customer_id, provider_subscription_id,
             current_period_start, current_period_end, cancel_at_period_end, metadata_json, created_at, updated_at
      FROM subscriptions
      WHERE user_id = ? AND status IN ('active', 'trialing', 'manual')
      ORDER BY updated_at DESC
      LIMIT 1
    `
    )
    .get(userId) as Record<string, unknown> | undefined;
}

export const billingService = {
  getPlans(): BillingPlan[] {
    return plans;
  },

  getPlan,

  getBillingStatus(userId = 0): BillingStatus {
    const currentPlan = getPlan(getUserPlanId(userId));
    const configured = paymentConfigured();
    const usage = this.getUsageSummary(userId);
    return {
      paymentProvider: appConfig.paymentProvider,
      paymentConfigured: configured,
      checkoutAvailable: configured,
      checkoutReason: configured
        ? "支付通道已配置。"
        : "支付通道暂未启用；当前页面仅展示方案、配额和用量，不会发起真实扣款。",
      currentPlan,
      plans,
      entitlementSummary: [
        { label: "关注列表", value: formatLimit(currentPlan.limits.watchlistItems), detail: "企业、论文、搜索、研究者和方向监控。" },
        { label: "阅读队列", value: formatLimit(currentPlan.limits.readingQueueItems), detail: "个人阅读流，也可衔接团队协作场景。" },
        { label: "AI 阅读", value: formatLimit(currentPlan.limits.aiSummariesPerMonth, "/月"), detail: "用于论文摘要、阅读提示和报告辅助。" },
        { label: "导出", value: formatLimit(currentPlan.limits.exportsPerMonth, "/月"), detail: "CSV、BibTeX 和研究组合导出。" },
        { label: "提醒", value: formatLimit(currentPlan.limits.alerts), detail: "已保存搜索、方向摘要和期刊更新监控。" },
        { label: "私有 PDF", value: formatLimit(currentPlan.limits.privatePdfStorageGb, " GB"), detail: "用于私有部署中的本地或对象存储索引。" },
      ],
      usage,
    };
  },

  getUsageSummary(userId = 0): BillingUsageSummary {
    const plan = getPlan(getUserPlanId(userId));
    const { start, end } = monthWindow();
    return {
      periodStart: start,
      periodEnd: end,
      items: [
        usageItem(userId, plan, "savedSearches", "已保存搜索", start, end, true),
        usageItem(userId, plan, "watchlistItems", "关注项目", start, end, true),
        usageItem(userId, plan, "readingQueueItems", "阅读队列", start, end, true),
        usageItem(userId, plan, "aiSummariesPerMonth", "AI 摘要", start, end, false),
        usageItem(userId, plan, "exportsPerMonth", "导出", start, end, false),
        usageItem(userId, plan, "alerts", "提醒", start, end, false),
        usageItem(userId, plan, "apiRequestsPerMonth", "API 请求", start, end, false),
      ],
    };
  },

  checkQuota(userId: number, metric: UsageMetric, increment = 1) {
    const plan = getPlan(getUserPlanId(userId));
    const limit = plan.limits[metric];
    const { start, end } = monthWindow();
    const used = usageForMetric(userId, metric, start, end);
    return evaluateQuota({
      metric,
      planName: plan.name,
      used,
      limit,
      increment,
    });
  },

  recordUsageEvent(input: {
    userId: number;
    metric: UsageMetric;
    quantity?: number;
    source?: string;
    resourceType?: string;
    resourceId?: string | number;
    metadata?: Record<string, unknown>;
  }) {
    const now = new Date().toISOString();
    const result = appSqlite
      .prepare(
        `
        INSERT INTO usage_events (user_id, metric, quantity, source, resource_type, resource_id, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        input.userId,
        input.metric,
        input.quantity ?? 1,
        input.source || "app",
        input.resourceType || null,
        input.resourceId === undefined ? null : String(input.resourceId),
        input.metadata ? JSON.stringify(input.metadata) : null,
        now
      );
    return { id: Number(result.lastInsertRowid), createdAt: now };
  },

  getAdminBillingOverview() {
    const configured = paymentConfigured();
    return {
      paymentProvider: appConfig.paymentProvider,
      paymentConfigured: configured,
      plans,
      totals: {
        users: countScalar("SELECT COUNT(*) as count FROM users"),
        subscriptions: countScalar("SELECT COUNT(*) as count FROM subscriptions"),
        usageEvents: countScalar("SELECT COUNT(*) as count FROM usage_events"),
        billingEvents: countScalar("SELECT COUNT(*) as count FROM billing_events"),
      },
      rollout: {
        publicSignup: false,
        checkoutAdapter: configured ? "已配置" : "未配置",
        entitlementEnforcement: "部分接入：关注列表与阅读队列",
        notes: [
          "方案目录和权益元数据已可用。",
          "已对具备配额能力的工作流记录用量事件。",
          "支付通道未启用前，不会调用外部支付服务。",
          "当前优先约束关注列表和阅读队列，导出、提醒、AI 阅读和 API 访问会逐步接入配额。",
        ],
      },
    };
  },

  listBillingUsers(params: Record<string, unknown> = {}) {
    const limit = Math.min(100, Math.max(1, Number(params.limit || 40)));
    const offset = Math.max(0, Number(params.offset || 0));
    const q = String(params.q || "").trim().toLowerCase();
    const plan = String(params.plan || "").trim().toLowerCase();
    const where: string[] = [];
    const values: Array<string | number> = [];

    if (q) {
      where.push("(LOWER(email) LIKE ? OR LOWER(COALESCE(nickname, '')) LIKE ?)");
      values.push(`%${q}%`, `%${q}%`);
    }
    if (plan) {
      where.push("LOWER(subscription_plan) = ?");
      values.push(plan);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const total = countScalar(`SELECT COUNT(*) as count FROM users ${whereSql}`, values);
    const rows = appSqlite
      .prepare(
        `
        SELECT id, email, nickname, verification_level, subscription_plan, created_at
        FROM users
        ${whereSql}
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(...values, limit, offset) as Array<{
        id: number;
        email: string;
        nickname: string | null;
        verification_level: string;
        subscription_plan: string;
        created_at: string;
      }>;

    return {
      rows: rows.map((row): BillingUserRow => {
        const subscriptionPlan = normalizePlanId(row.subscription_plan);
        return {
          id: row.id,
          email: row.email,
          nickname: row.nickname,
          roleHint: row.verification_level === "admin" ? "admin" : "user",
          verificationLevel: row.verification_level,
          subscriptionPlan,
          planName: getPlan(subscriptionPlan).name,
          createdAt: row.created_at,
          usage: this.getUsageSummary(row.id),
        };
      }),
      total,
      limit,
      offset,
      plans,
    };
  },

  getBillingUser(userId: number) {
    const row = appSqlite
      .prepare(
        `
        SELECT id, email, nickname, verification_level, subscription_plan, created_at
        FROM users
        WHERE id = ?
      `
      )
      .get(userId) as {
        id: number;
        email: string;
        nickname: string | null;
        verification_level: string;
        subscription_plan: string;
        created_at: string;
      } | undefined;
    if (!row) return null;
    const subscriptionPlan = normalizePlanId(row.subscription_plan);
    return {
      id: row.id,
      email: row.email,
      nickname: row.nickname,
      roleHint: row.verification_level === "admin" ? "admin" : "user",
      verificationLevel: row.verification_level,
      subscriptionPlan,
      planName: getPlan(subscriptionPlan).name,
      createdAt: row.created_at,
      usage: this.getUsageSummary(row.id),
      subscription: activeSubscription(row.id) || null,
    };
  },

  updateUserPlan(input: {
    userId: number;
    planId: string;
    actorUserId?: number;
    reason?: string;
  }) {
    const plan = getPlan(input.planId);
    const existing = this.getBillingUser(input.userId);
    if (!existing) throw new Error("用户不存在。");
    const now = new Date().toISOString();
    const subscriptionId = makeId("sub_manual");

    appSqlite.transaction(() => {
      appSqlite
        .prepare("UPDATE users SET subscription_plan = ? WHERE id = ?")
        .run(plan.id, input.userId);
      appSqlite
        .prepare("UPDATE subscriptions SET status = 'replaced', updated_at = ? WHERE user_id = ? AND status IN ('active', 'trialing', 'manual')")
        .run(now, input.userId);
      appSqlite
        .prepare(
          `
          INSERT INTO subscriptions (id, user_id, plan_id, status, provider, current_period_start, metadata_json, created_at, updated_at)
          VALUES (?, ?, ?, 'manual', 'manual', ?, ?, ?, ?)
        `
        )
        .run(
          subscriptionId,
          input.userId,
          plan.id,
          now,
          JSON.stringify({ reason: input.reason || "manual admin update", actorUserId: input.actorUserId ?? null }),
          now,
          now
        );
      appSqlite
        .prepare(
          `
          INSERT INTO billing_events (user_id, provider, event_type, plan_id, status, payload_json, created_at)
          VALUES (?, 'manual', 'subscription.plan_changed', ?, 'recorded', ?, ?)
        `
        )
        .run(
          input.userId,
          plan.id,
          JSON.stringify({ from: existing.subscriptionPlan, to: plan.id, reason: input.reason || "", actorUserId: input.actorUserId ?? null }),
          now
        );
    })();

    return this.getBillingUser(input.userId);
  },

  createCheckoutSession(userId: number, planId: string) {
    const plan = getPlan(planId);
    const configured = paymentConfigured();
    return {
      ok: false,
      userId,
      plan,
      provider: appConfig.paymentProvider,
      checkoutAvailable: configured,
      reason: configured
        ? "支付适配边界已就绪，但当前环境未开放在线支付会话。"
        : "支付通道未启用或缺少凭据。",
    };
  },
};
