import { z } from "zod";
import { appConfig } from "../config.js";
import { topicNodes } from "../data/topic-taxonomy.js";

export type PaperAiProviderPaper = {
  id: number;
  title: string;
  abstract: string;
  year: number;
  venue: string;
  publication_title: string;
  domain: string;
  doi: string;
  citation_count: number;
};

export type PaperAiAnnotationResult = {
  summaryZh: string;
  summaryEn: string;
  primaryDomain: string;
  labels: string[];
  topics: Array<{ topicId: string; label: string; confidence: number; evidence: string[] }>;
  entities: Record<string, unknown>;
  metrics: Array<{ name: string; value: string; context: string }>;
  confidence: number;
  needsReview: boolean;
  tokenInput: number;
  tokenOutput: number;
  costEstimateUsd: number;
};

const metricSchema = z.object({
  name: z.string().min(1).max(80),
  value: z.string().min(1).max(120),
  context: z.string().max(400).default(""),
});

const topicSchema = z.object({
  topicId: z.string().min(1).max(120),
  label: z.string().min(1).max(160),
  confidence: z.number().min(0).max(99),
  evidence: z.array(z.string().max(160)).max(8).default([]),
});

const providerPayloadSchema = z.object({
  summaryZh: z.string().min(1).max(900),
  summaryEn: z.string().min(1).max(900),
  primaryDomain: z.string().min(1).max(160),
  labels: z.array(z.string().min(1).max(120)).max(12).default([]),
  topics: z.array(topicSchema).max(8).default([]),
  entities: z.record(z.unknown()).default({}),
  metrics: z.array(metricSchema).max(16).default([]),
  confidence: z.number().min(0).max(1),
  needsReview: z.boolean().default(false),
});

type ProviderPayload = z.infer<typeof providerPayloadSchema>;

const topicById = new Map(topicNodes.map((topic) => [topic.id, topic]));
const topicByLabel = new Map(topicNodes.map((topic) => [topic.label.toLowerCase(), topic]));

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function parseJsonObject(value: string): unknown {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}

function normalizePayload(payload: ProviderPayload, usage?: { prompt_tokens?: number; completion_tokens?: number }): PaperAiAnnotationResult {
  const topics = payload.topics
    .map((topic) => {
      const canonical = topicById.get(topic.topicId) || topicByLabel.get(topic.label.toLowerCase());
      if (!canonical) return null;
      return {
        topicId: canonical.id,
        label: canonical.label,
        confidence: Math.max(0, Math.min(99, Math.round(topic.confidence))),
        evidence: [...new Set(topic.evidence.filter(Boolean))].slice(0, 8),
      };
    })
    .filter((topic): topic is PaperAiAnnotationResult["topics"][number] => Boolean(topic))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);

  return {
    summaryZh: payload.summaryZh.trim(),
    summaryEn: payload.summaryEn.trim(),
    primaryDomain: payload.primaryDomain.trim(),
    labels: [...new Set(payload.labels.map((item) => item.trim()).filter(Boolean))].slice(0, 12),
    topics,
    entities: payload.entities,
    metrics: payload.metrics,
    confidence: Math.round(payload.confidence * 100) / 100,
    needsReview: payload.needsReview || topics.length === 0 || payload.confidence < 0.65,
    tokenInput: usage?.prompt_tokens || 0,
    tokenOutput: usage?.completion_tokens || 0,
    costEstimateUsd: 0,
  };
}

function buildPrompt(row: PaperAiProviderPaper) {
  const legalTopics = topicNodes.map((topic) => ({ id: topic.id, label: topic.label, domain: topic.domain }));
  return [
    "You are SiliconScope's IC paper annotation worker.",
    "Use only the paper metadata supplied below. Do not invent measurements, claims, authors, institutions, or conclusions.",
    "Return one JSON object only, matching these keys: summaryZh, summaryEn, primaryDomain, labels, topics, entities, metrics, confidence, needsReview.",
    "summaryZh and summaryEn should each be 2-3 concise sentences.",
    "topics must use topicId values from the allowed topic list. If unsure, return fewer topics and set needsReview=true.",
    "metrics should contain explicit numeric IC specs only when present in title or abstract.",
    "",
    `Allowed topics: ${JSON.stringify(legalTopics)}`,
    "",
    `Paper metadata: ${JSON.stringify({
      title: row.title,
      abstract: row.abstract,
      year: row.year,
      venue: row.venue,
      publicationTitle: row.publication_title,
      domain: row.domain,
      doi: row.doi,
      citations: row.citation_count,
    })}`,
  ].join("\n");
}

async function callOpenAiCompatible(row: PaperAiProviderPaper, provider: string, model: string) {
  if (!appConfig.aiEnrichmentApiKey) {
    throw new Error(`AI enrichment provider '${provider}' requires AI_ENRICHMENT_API_KEY or OPENAI_API_KEY.`);
  }

  const prompt = buildPrompt(row);
  const endpoint = `${appConfig.aiEnrichmentBaseUrl.replace(/\/+$/, "")}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${appConfig.aiEnrichmentApiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: appConfig.aiEnrichmentMaxOutputTokens,
      messages: [
        { role: "system", content: "You produce strict JSON for IC paper metadata annotation." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI enrichment provider failed (${response.status}): ${text.slice(0, 500)}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI enrichment provider returned no message content.");
  const parsed = providerPayloadSchema.parse(parseJsonObject(content));
  const normalized = normalizePayload(parsed, data.usage);
  return {
    ...normalized,
    tokenInput: normalized.tokenInput || data.usage?.prompt_tokens || estimateTokens(prompt),
    tokenOutput: normalized.tokenOutput || data.usage?.completion_tokens || estimateTokens(content),
  };
}

export async function generatePaperAiAnnotation(input: {
  row: PaperAiProviderPaper;
  provider: string;
  model: string;
  fallback: () => PaperAiAnnotationResult;
}) {
  const provider = input.provider.toLowerCase();
  if (provider === "rule-local" || provider === "local" || provider === "heuristic") {
    return input.fallback();
  }
  if (provider === "openai-compatible" || provider === "openai") {
    return callOpenAiCompatible(input.row, provider, input.model);
  }
  throw new Error(`Unsupported AI enrichment provider '${input.provider}'. Use rule-local or openai-compatible.`);
}

