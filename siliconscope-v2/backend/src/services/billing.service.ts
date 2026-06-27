import { eq } from "drizzle-orm";
import { appConfig } from "../config.js";
import { appDb, appSqlite } from "../db/app-db.js";
import { users } from "../db/schema.js";

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
    name: "Free Preview",
    audience: "Public demo users",
    priceMonthlyUsd: 0,
    badge: "Demo",
    description: "Public metadata search, DOI/source links, and a small personal workflow for trying SiliconScope.",
    features: ["Paper metadata search", "Topic and institution exploration", "DOI/source redirects", "Limited watchlist"],
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
    name: "Research Pro",
    audience: "Students, IC engineers, and independent researchers",
    priceMonthlyUsd: 19,
    badge: "Individual",
    description: "Higher personal limits for reading management, alerts, exports, and future AI paper assistance.",
    features: ["Unlimited metadata search", "Large watchlist and reading queue", "Weekly topic alerts", "Export center", "Future AI reading credits"],
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
    name: "Lab",
    audience: "Research groups and small IC teams",
    priceMonthlyUsd: 99,
    badge: "Team",
    description: "Shared workspace plan for labs that need team-level collections, imports, and internal evaluation workflows.",
    features: ["Team watchlists", "Shared reading queues", "Professor/institution tracking", "Admin-reviewed imports", "Priority snapshot refresh"],
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
    name: "Enterprise",
    audience: "Companies, institutes, and paid private deployments",
    priceMonthlyUsd: null,
    badge: "Custom",
    description: "Custom deployment with private data, API integrations, security review, and ingestion jobs.",
    features: ["Private deployment", "Custom crawler/API policy", "SLA and backups", "Object storage integration", "SSO/OAuth roadmap"],
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
    name: "Internal Admin",
    audience: "Owner and local operator",
    priceMonthlyUsd: null,
    badge: "Owner",
    description: "Internal operating mode for local development, admin maintenance, and private database curation.",
    features: ["Admin console", "All private MVP workflows", "Data import operations", "Runtime and audit tools"],
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
  if (value < 0) return "Unlimited";
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
        ? "Checkout adapter is configured."
        : "Payment provider is disabled or missing credentials. This page is a commercial scaffold until Stripe/Paddle is wired.",
      currentPlan,
      plans,
      entitlementSummary: [
        { label: "Watchlist", value: formatLimit(currentPlan.limits.watchlistItems), detail: "Companies, papers, searches, mentors, and topic monitors." },
        { label: "Reading queue", value: formatLimit(currentPlan.limits.readingQueueItems), detail: "Personal or future team reading workflow." },
        { label: "AI reading", value: formatLimit(currentPlan.limits.aiSummariesPerMonth, "/month"), detail: "Reserved for future OpenAI-powered paper reading." },
        { label: "Exports", value: formatLimit(currentPlan.limits.exportsPerMonth, "/month"), detail: "CSV, BibTeX, and future report exports." },
        { label: "Alerts", value: formatLimit(currentPlan.limits.alerts), detail: "Saved searches, topic digests, and journal update monitors." },
        { label: "Private PDFs", value: formatLimit(currentPlan.limits.privatePdfStorageGb, " GB"), detail: "Reserved for private deployments with object storage." },
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
        usageItem(userId, plan, "savedSearches", "Saved searches", start, end, true),
        usageItem(userId, plan, "watchlistItems", "Watchlist items", start, end, true),
        usageItem(userId, plan, "readingQueueItems", "Reading queue", start, end, true),
        usageItem(userId, plan, "aiSummariesPerMonth", "AI summaries", start, end, false),
        usageItem(userId, plan, "exportsPerMonth", "Exports", start, end, false),
        usageItem(userId, plan, "alerts", "Alerts", start, end, false),
        usageItem(userId, plan, "apiRequestsPerMonth", "API requests", start, end, false),
      ],
    };
  },

  checkQuota(userId: number, metric: UsageMetric, increment = 1) {
    const plan = getPlan(getUserPlanId(userId));
    const limit = plan.limits[metric];
    if (limit < 0) return { allowed: true, used: 0, limit, remaining: null };
    const { start, end } = monthWindow();
    const used = usageForMetric(userId, metric, start, end);
    const remaining = Math.max(0, limit - used);
    return {
      allowed: used + increment <= limit,
      used,
      limit,
      remaining,
      reason: used + increment <= limit ? undefined : `${metric} quota exceeded for ${plan.name}`,
    };
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
        checkoutAdapter: configured ? "configured" : "not-configured",
        entitlementEnforcement: "partial-watchlist-reading-queue",
        notes: [
          "Plan catalog and entitlement metadata are available now.",
          "Usage events are recorded for quota-ready workflows.",
          "No external payment provider is called until Stripe/Paddle adapters are implemented.",
          "Current limits are enforced first on watchlist and reading queue, then later on exports, alerts, AI reading, and API access.",
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
    if (!existing) throw new Error("User not found");
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
        ? "Checkout adapter boundary exists, but provider-specific session creation has not been implemented yet."
        : "Payment provider is disabled or credentials are missing.",
    };
  },
};
