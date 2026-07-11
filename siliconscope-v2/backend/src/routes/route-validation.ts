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

const fieldLabels: Record<string, string> = {
  action: "操作",
  actionLabel: "操作按钮文案",
  body: "正文",
  counts: "计数",
  dryRun: "试运行",
  error: "错误信息",
  href: "链接",
  key: "快照键",
  keys: "快照键列表",
  keep: "保留数量",
  kind: "类型",
  label: "标签",
  limit: "数量上限",
  metadata: "元数据",
  minTopicConfidence: "最低主题置信度",
  mode: "模式",
  model: "模型",
  notes: "备注",
  payloadJson: "内容 JSON",
  persist: "写入候选",
  planId: "方案",
  prefix: "前缀",
  provider: "服务提供方",
  reason: "原因",
  refresh: "刷新",
  sampleLimit: "每类样本数",
  scanLimit: "扫描行数",
  scope: "范围",
  severity: "级别",
  status: "状态",
  target: "索引目标",
  title: "标题",
  userId: "用户 ID",
  value: "配置值",
  writeTopicEdges: "写入主题边",
};

function hasChinese(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

function pathLabel(path: Array<string | number>) {
  if (!path.length) return "";
  return path.map((part) => fieldLabels[String(part)] || String(part)).join(".");
}

function formatValues(values: unknown[]) {
  return values.map((value) => String(value)).join("、");
}

function issueMessage(issue: z.ZodIssue) {
  const row = issue as z.ZodIssue & Record<string, any>;
  if (hasChinese(issue.message)) return issue.message;

  switch (issue.code) {
    case "unrecognized_keys":
      return `不支持字段：${formatValues(row.keys || [])}`;
    case "invalid_enum_value":
      return `取值无效，允许：${formatValues(row.options || [])}`;
    case "too_big": {
      const maximum = row.maximum;
      if (row.type === "string") return `长度不能超过 ${maximum} 个字符`;
      if (row.type === "array") return `最多只能包含 ${maximum} 项`;
      return `数值不能超过 ${maximum}`;
    }
    case "too_small": {
      const minimum = row.minimum;
      if (row.type === "string") return Number(minimum) <= 1 ? "不能为空" : `长度不能少于 ${minimum} 个字符`;
      if (row.type === "array") return `至少需要 ${minimum} 项`;
      return `数值不能小于 ${minimum}`;
    }
    case "invalid_type":
      if (row.received === "undefined") return "不能为空";
      return `类型不正确，应为 ${row.expected}`;
    case "invalid_union":
      return "格式不符合要求";
    case "invalid_string":
      return "字符串格式无效";
    case "not_multiple_of":
      return `必须是 ${row.multipleOf} 的倍数`;
    case "custom":
      return issue.message || "格式不符合要求";
    default:
      return "格式不符合要求";
  }
}

export function zodErrorMessage(error: z.ZodError) {
  return error.issues.map((issue) => {
    const path = pathLabel(issue.path);
    const message = issueMessage(issue);
    return path ? `${path}: ${message}` : message;
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
  doi: z.string({ required_error: "DOI 不能为空。" }).trim().min(1, "DOI 不能为空。").max(500),
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
  message: "key 和 keys 只能提供其中一个。",
});

export const snapshotClearBodySchema = z.object({
  key: snapshotKey.optional(),
  prefix: snapshotKey.optional(),
}).strict().refine((body) => !(body.key && body.prefix), {
  message: "key 和 prefix 只能提供其中一个。",
});
