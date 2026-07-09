import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

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
