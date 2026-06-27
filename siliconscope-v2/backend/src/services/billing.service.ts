import { eq } from "drizzle-orm";
import { appConfig } from "../config.js";
import { appDb } from "../db/app-db.js";
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

export const billingService = {
  getPlans(): BillingPlan[] {
    return plans;
  },

  getPlan,

  getBillingStatus(userId = 0): BillingStatus {
    const currentPlan = getPlan(getUserPlanId(userId));
    const configured = paymentConfigured();
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
    };
  },

  getAdminBillingOverview() {
    const configured = paymentConfigured();
    return {
      paymentProvider: appConfig.paymentProvider,
      paymentConfigured: configured,
      plans,
      rollout: {
        publicSignup: false,
        checkoutAdapter: configured ? "configured" : "not-configured",
        entitlementEnforcement: "catalog-only",
        notes: [
          "Plan catalog and entitlement metadata are available now.",
          "No external payment provider is called until Stripe/Paddle adapters are implemented.",
          "Current limits are displayed to users but not yet enforced across every feature.",
        ],
      },
    };
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
