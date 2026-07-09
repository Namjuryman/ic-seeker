import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);
const jsonObject = z.record(z.string(), z.unknown());
const booleanLikeSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

export function zodErrorMessage(error: z.ZodError) {
  return error.issues.map((issue) => {
    const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  }).join("; ");
}

export function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    throw new Error(zodErrorMessage(parsed.error));
  }
  return parsed.data;
}

export const contentQualitySyncBodySchema = z.object({
  scanLimit: z.coerce.number().int().min(100).max(100_000).optional(),
  sampleLimit: z.coerce.number().int().min(1).max(1_000).optional(),
}).strict();

export const contentQualityStatusBodySchema = z.object({
  status: z.enum(["open", "ignored", "resolved"]),
}).strict();

export const moderationActionBodySchema = z.object({
  action: z.enum(["restore", "hide", "remove", "keep_pending", "approved", "rejected", "pending"]),
  reason: z.string().trim().max(1_000).optional().default(""),
}).strict();

export const billingPlanUpdateBodySchema = z.object({
  planId: z.enum(["free", "pro", "lab", "enterprise", "internal"]),
  reason: z.string().trim().max(500).optional().default(""),
}).strict();

export const billingCheckoutBodySchema = z.object({
  planId: z.enum(["free", "pro", "lab", "enterprise", "internal"]),
}).strict();

export const searchIndexRebuildBodySchema = z.object({
  target: z.enum(["all", "papers", "companies", "learning_routes"]).optional().default("all"),
}).strict();

export const paperAiSummaryBodySchema = z.object({
  provider: z.string().trim().max(80).optional(),
  model: z.string().trim().max(160).optional(),
  refresh: booleanLikeSchema.optional().default(false),
}).strict();

export const importDoiBodySchema = z.object({
  doi: z.string({ required_error: "doi is required" }).trim().min(1, "doi is required").max(500),
}).strict();

export const siteSettingUpdateBodySchema = z.object({
  value: z.union([z.boolean(), z.string().max(2_000), z.number().finite()]),
}).strict();

export const accessRequestUpdateBodySchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "invited"]).optional(),
  notes: z.string().trim().max(2_000).nullable().optional(),
}).strict();

const ingestionProviderSchema = z.enum([
  "ieee",
  "openalex",
  "crossref",
  "semantic-scholar",
  "dblp",
  "csv",
  "scholar-csv",
  "aminer",
  "pdf",
  "manual",
]);

const ingestionStatusSchema = z.enum(["queued", "running", "succeeded", "failed", "cancelled", "review_required"]);

const ingestionCountsSchema = z.object({
  fetched: z.coerce.number().int().min(0).optional(),
  inserted: z.coerce.number().int().min(0).optional(),
  updated: z.coerce.number().int().min(0).optional(),
  skipped: z.coerce.number().int().min(0).optional(),
  review: z.coerce.number().int().min(0).optional(),
}).strict();

export const ingestionJobCreateBodySchema = z.object({
  provider: ingestionProviderSchema.optional(),
  mode: nonEmptyString.max(80).optional(),
  scope: jsonObject.optional(),
  notes: z.string().trim().max(1_000).optional(),
}).strict();

export const ingestionJobUpdateBodySchema = z.object({
  status: ingestionStatusSchema.optional(),
  counts: ingestionCountsSchema.optional(),
  error: z.string().trim().max(1_000).nullable().optional(),
  notes: z.string().trim().max(1_000).nullable().optional(),
}).strict();

export const backupCreateBodySchema = z.object({
  label: z.string().trim().min(1).max(80).optional().default("admin"),
}).strict();

export const backupPruneBodySchema = z.object({
  keep: z.coerce.number().int().min(1).max(100).optional().default(10),
}).strict();

export const notificationCreateBodySchema = z.object({
  userId: z.coerce.number().int().min(0).optional(),
  kind: z.string().trim().min(1).max(40).optional(),
  severity: z.enum(["info", "success", "warning", "critical"]).optional(),
  title: nonEmptyString.max(180),
  body: z.string().trim().max(2_000).optional(),
  href: z.string().trim().max(500).optional(),
  actionLabel: z.string().trim().max(80).optional(),
  metadata: jsonObject.optional(),
}).strict();

export const paperDedupeScanBodySchema = z.object({
  limit: z.coerce.number().int().min(1).max(2_000).optional(),
  persist: z.boolean().optional(),
}).strict();

export const paperDedupeStatusBodySchema = z.object({
  status: z.enum(["open", "ignored", "merged", "reviewed"]),
}).strict();

export const aiEnrichmentRunBodySchema = z.object({
  mode: z.enum(["missing", "stale", "weak", "all"]).optional(),
  limit: z.coerce.number().int().min(1).max(5_000).optional(),
  provider: nonEmptyString.max(80).optional(),
  model: nonEmptyString.max(120).optional(),
  dryRun: z.boolean().optional(),
  writeTopicEdges: z.boolean().optional(),
  minTopicConfidence: z.coerce.number().int().min(0).max(100).optional(),
}).strict();

export const learningContentUpdateBodySchema = z.object({
  status: z.enum(["published", "draft", "archived"]).optional(),
  title: z.string().trim().min(1).max(300).optional(),
  payloadJson: z.string().min(2).max(1_500_000).optional(),
}).strict();

const snapshotKey = z.string().trim().min(1).max(200);

export const snapshotRefreshBodySchema = z.object({
  key: snapshotKey.optional(),
  keys: z.array(snapshotKey).max(200).optional(),
}).strict().refine((body) => !(body.key && body.keys?.length), {
  message: "Provide either key or keys, not both",
});

export const snapshotClearBodySchema = z.object({
  key: snapshotKey.optional(),
  prefix: snapshotKey.optional(),
}).strict().refine((body) => !(body.key && body.prefix), {
  message: "Provide either key or prefix, not both",
});
