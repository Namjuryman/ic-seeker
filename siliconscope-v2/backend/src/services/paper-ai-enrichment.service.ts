import { createHash } from "node:crypto";
import { appSqlite } from "../db/app-db.js";
import { topicNodes } from "../data/topic-taxonomy.js";
import { appConfig } from "../config.js";
import { generatePaperAiAnnotation, type PaperAiAnnotationResult } from "./paper-ai-provider.js";

const DEFAULT_PROVIDER = appConfig.aiEnrichmentProvider;
const DEFAULT_MODEL = appConfig.aiEnrichmentModel;
const PROMPT_VERSION = "paper-ai-v1";
const EDGE_METHOD = "ai-cheap-v1";

type PaperRow = {
  id: number;
  title: string;
  abstract: string;
  year: number;
  venue: string;
  publication_title: string;
  domain: string;
  doi: string;
  citation_count: number;
  input_hash?: string | null;
};

export type PaperAiMode = "missing" | "stale" | "weak" | "all";

export type PaperAiRunOptions = {
  mode?: PaperAiMode;
  limit?: number;
  provider?: string;
  model?: string;
  writeTopicEdges?: boolean;
  minTopicConfidence?: number;
  dryRun?: boolean;
};

type AnnotationResult = PaperAiAnnotationResult & {
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

function stableHash(parts: unknown[]) {
  return createHash("sha256").update(parts.map((part) => String(part || "")).join("\n")).digest("hex");
}

function normalize(value: unknown) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.%/+-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inputHash(row: PaperRow, promptVersion = PROMPT_VERSION) {
  return stableHash([row.title, row.abstract, row.venue, row.publication_title, row.year, row.doi, promptVersion]);
}

function phraseHit(text: string, keyword: string) {
  const normalized = normalize(keyword);
  if (normalized.length < 2) return false;
  if (/^[a-z0-9+-]{2,4}$/i.test(normalized)) {
    return new RegExp(`(^|\\s)${escapeRegex(normalized)}(?=\\s|$)`, "i").test(text);
  }
  return text.includes(normalized);
}

function extractMetrics(textRaw: string): Array<{ name: string; value: string; context: string }> {
  const text = String(textRaw || "");
  const patterns: Array<[string, RegExp]> = [
    ["process_node", /\b\d+(?:\.\d+)?\s?(?:nm|um)\b/gi],
    ["frequency", /\b\d+(?:\.\d+)?\s?(?:hz|khz|mhz|ghz|thz)\b/gi],
    ["power", /\b\d+(?:\.\d+)?\s?(?:nw|uw|mw|w)\b/gi],
    ["efficiency", /\b\d+(?:\.\d+)?\s?%\b/g],
    ["energy", /\b\d+(?:\.\d+)?\s?(?:fj|pj|nj|uj)\/?(?:bit|op|step)?\b/gi],
    ["data_rate", /\b\d+(?:\.\d+)?\s?(?:gb\/s|gbps|mb\/s|mbps|gs\/s|ms\/s)\b/gi],
    ["noise_or_gain", /\b-?\d+(?:\.\d+)?\s?(?:db|dbc|dbm|dbv)\b/gi],
    ["jitter", /\b\d+(?:\.\d+)?\s?(?:fs|ps|ns)\b/gi],
    ["compute_density", /\b\d+(?:\.\d+)?\s?(?:tops\/w|gops|tops)\b/gi],
  ];
  const metrics: Array<{ name: string; value: string; context: string }> = [];
  for (const [name, pattern] of patterns) {
    const seen = new Set<string>();
    for (const match of text.matchAll(pattern)) {
      const value = match[0].trim();
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const start = Math.max(0, (match.index || 0) - 50);
      const end = Math.min(text.length, (match.index || 0) + value.length + 70);
      metrics.push({ name, value, context: text.slice(start, end).replace(/\s+/g, " ").trim() });
      if (metrics.length >= 12) return metrics;
    }
  }
  return metrics;
}

function estimateIcRelevance(row: PaperRow) {
  const text = normalize([row.title, row.abstract, row.venue, row.publication_title, row.domain].join(" "));
  const positive = [
    "cmos", "finfet", "fdsoi", "adc", "dac", "pll", "ldo", "pmic", "serdes", "mmwave", "rf", "soc", "asic",
    "sram", "dram", "mram", "rram", "circuit", "integrated circuit", "chip", "transceiver", "amplifier",
    "converter", "bandgap", "oscillator", "jitter", "phase noise", "wireline", "power management",
  ];
  const negative = [
    "chromatography", "oligonucleotide", "mass spectrometry", "separation science", "liquid chromatography",
    "biochemistry", "clinical", "patient", "gene", "protein", "cell culture", "drug delivery",
  ];
  let score = 0;
  for (const keyword of positive) if (phraseHit(text, keyword)) score += 1;
  for (const keyword of negative) if (phraseHit(text, keyword)) score -= 3;
  if (normalize(row.publication_title).includes("journal of separation science")) score -= 8;
  if (normalize(row.publication_title).includes("solid-state circuits")) score += 4;
  if (normalize(row.publication_title).includes("very large scale integration")) score += 3;
  return score;
}

function classifyTopics(row: PaperRow) {
  const relevance = estimateIcRelevance(row);
  if (relevance <= 0) return [];
  const text = normalize([row.title, row.abstract, row.venue, row.publication_title, row.domain].join(" "));
  const domain = normalize(row.domain);
  return topicNodes
    .map((node) => {
      const evidence: string[] = [];
      let score = 0;
      for (const value of [node.label, ...node.aliases]) {
        if (phraseHit(text, value)) {
          evidence.push(value);
          score += 1.6;
        }
      }
      for (const value of node.positiveKeywords) {
        if (phraseHit(text, value)) {
          evidence.push(value);
          score += 2.4;
        }
      }
      for (const value of node.negativeKeywords) {
        if (phraseHit(text, value)) score -= 3.5;
      }
      if (domain && normalize(node.domain) === domain) score += node.parentId ? 1.1 : 0.8;
      const confidence = Math.max(0, Math.min(99, Math.round(score * 14)));
      return { topicId: node.id, label: node.label, confidence, evidence: [...new Set(evidence)] };
    })
    .filter((hit) => hit.confidence >= 35 && hit.evidence.length)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);
}

function summarize(row: PaperRow, topics: AnnotationResult["topics"], metrics: AnnotationResult["metrics"]) {
  const venue = row.venue || row.publication_title || "unknown venue";
  const domain = row.domain || topics[0]?.label || "General IC";
  const metricText = metrics.slice(0, 3).map((metric) => metric.value).join(", ");
  const metricSuffix = metricText ? `; extracted metrics include ${metricText}` : "";
  const sentence = `Metadata summary: this ${row.year || ""} ${venue} paper is likely about ${domain}: ${row.title}${metricSuffix}.`;
  return {
    zh: sentence.replace(/\s+/g, " ").trim(),
    en: sentence.replace(/\s+/g, " ").trim(),
  };
}

function annotateWithRules(row: PaperRow): AnnotationResult {
  const text = [row.title, row.abstract, row.venue, row.publication_title].join(" ");
  const icRelevance = estimateIcRelevance(row);
  const topics = classifyTopics(row);
  const metrics = extractMetrics(text);
  const labels = [...new Set([row.domain, ...topics.map((topic) => topic.label)].filter(Boolean))];
  const confidence = Math.max(
    0.25,
    Math.min(0.96, (topics[0]?.confidence || 20) / 100 + (row.abstract ? 0.16 : 0) + Math.min(metrics.length, 4) * 0.03),
  );
  const summaries = summarize(row, topics, metrics);
  return {
    summaryZh: summaries.zh,
    summaryEn: summaries.en,
    primaryDomain: row.domain || topics[0]?.label || "General IC",
    labels,
    topics,
    entities: {
      venue: row.venue || row.publication_title || "",
      year: row.year || null,
      doi: row.doi || "",
      source: "元数据推断",
    },
    metrics,
    confidence: Math.round(confidence * 100) / 100,
    needsReview: icRelevance <= 0 || !row.abstract || !topics.length || confidence < 0.55 || row.domain === "General IC",
    tokenInput: Math.ceil(text.length / 4),
    tokenOutput: Math.ceil((summaries.zh.length + summaries.en.length) / 4),
    costEstimateUsd: 0,
  };
}

function selectCandidates(options: Required<Pick<PaperAiRunOptions, "mode" | "limit" | "provider" | "model">>) {
  const base = `
    SELECT
      p.id, p.title, p.abstract, p.year, p.venue, p.publication_title, p.domain, p.doi, p.citation_count,
      latest.input_hash
    FROM papers p
    LEFT JOIN paper_ai_annotations latest ON latest.id = (
      SELECT a.id
      FROM paper_ai_annotations a
      WHERE a.paper_id = p.id
        AND a.provider = ?
        AND a.model = ?
        AND a.prompt_version = ?
      ORDER BY a.updated_at DESC, a.id DESC
      LIMIT 1
    )
  `;
  const params: unknown[] = [options.provider, options.model, PROMPT_VERSION];
  const where: string[] = ["p.title != ''"];
  if (options.mode === "missing") where.push("latest.input_hash IS NULL");
  if (options.mode === "weak") {
    where.push(`(
      p.domain = 'General IC'
      OR p.domain_hits <= 0
      OR NOT EXISTS (SELECT 1 FROM paper_topic_edges e WHERE e.paper_id = p.id)
      OR latest.input_hash IS NULL
    )`);
  }
  const rows = appSqlite.prepare(`
    ${base}
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY
      CASE p.venue_rank WHEN 'SSS' THEN 1 WHEN 'SS+' THEN 2 WHEN 'S+' THEN 3 WHEN 'S' THEN 4 WHEN 'A' THEN 5 ELSE 9 END,
      p.year DESC,
      p.citation_count DESC
    LIMIT ?
  `).all(...params, options.limit) as PaperRow[];

  if (options.mode !== "stale") return rows;
  return rows.filter((row) => row.input_hash !== inputHash(row));
}

function latestAnnotationForPaper(paperId: number, provider = DEFAULT_PROVIDER, model = DEFAULT_MODEL) {
  return appSqlite.prepare(`
    SELECT
      a.id, a.paper_id AS paperId, a.provider, a.model, a.prompt_version AS promptVersion,
      a.input_hash AS inputHash, a.language, a.summary_zh AS summaryZh,
      a.summary_en AS summaryEn, a.primary_domain AS primaryDomain,
      a.labels_json AS labelsJson, a.topics_json AS topicsJson,
      a.entities_json AS entitiesJson, a.metrics_json AS metricsJson,
      a.confidence, a.cost_estimate_usd AS costEstimateUsd,
      a.token_input AS tokenInput, a.token_output AS tokenOutput,
      a.needs_review AS needsReview, a.status, a.updated_at AS updatedAt
    FROM paper_ai_annotations a
    WHERE a.paper_id = ?
      AND a.provider = ?
      AND a.model = ?
      AND a.prompt_version = ?
      AND a.status = 'ok'
    ORDER BY a.updated_at DESC, a.id DESC
    LIMIT 1
  `).get(paperId, provider, model, PROMPT_VERSION) as Record<string, unknown> | undefined;
}

function paperRowById(paperId: number) {
  return appSqlite.prepare(`
    SELECT
      id, title, abstract, year, venue, publication_title, domain, doi, citation_count
    FROM papers
    WHERE id = ?
    LIMIT 1
  `).get(paperId) as PaperRow | undefined;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

function annotationPayload(row: Record<string, unknown>, cacheHit: boolean) {
  return {
    cacheHit,
    id: Number(row.id),
    paperId: Number(row.paperId),
    provider: String(row.provider || ""),
    model: String(row.model || ""),
    promptVersion: String(row.promptVersion || ""),
    language: String(row.language || "zh-en"),
    summaryZh: String(row.summaryZh || ""),
    summaryEn: String(row.summaryEn || ""),
    primaryDomain: String(row.primaryDomain || ""),
    labels: parseJson<string[]>(row.labelsJson, []),
    topics: parseJson<Array<{ topicId: string; label: string; confidence: number; evidence: string[] }>>(row.topicsJson, []),
    entities: parseJson<Record<string, unknown>>(row.entitiesJson, {}),
    metrics: parseJson<Array<{ name: string; value: string; context: string }>>(row.metricsJson, []),
    confidence: Number(row.confidence || 0),
    costEstimateUsd: Number(row.costEstimateUsd || 0),
    tokenInput: Number(row.tokenInput || 0),
    tokenOutput: Number(row.tokenOutput || 0),
    needsReview: Number(row.needsReview || 0) === 1,
    updatedAt: String(row.updatedAt || ""),
  };
}

function writeTopicEdges(paperId: number, topics: AnnotationResult["topics"], minConfidence: number) {
  const insert = appSqlite.prepare(`
    INSERT INTO paper_topic_edges (paper_id, topic_id, confidence, method, evidence_json, override_status, updated_at)
    VALUES (?, ?, ?, ?, ?, 'auto', CURRENT_TIMESTAMP)
    ON CONFLICT(paper_id, topic_id) DO UPDATE SET
      confidence = CASE
        WHEN paper_topic_edges.override_status = 'manual' THEN paper_topic_edges.confidence
        ELSE excluded.confidence
      END,
      method = CASE
        WHEN paper_topic_edges.override_status = 'manual' THEN paper_topic_edges.method
        ELSE excluded.method
      END,
      evidence_json = CASE
        WHEN paper_topic_edges.override_status = 'manual' THEN paper_topic_edges.evidence_json
        ELSE excluded.evidence_json
      END,
      updated_at = CURRENT_TIMESTAMP
  `);
  let written = 0;
  for (const topic of topics) {
    if (topic.confidence < minConfidence) continue;
    insert.run(paperId, topic.topicId, topic.confidence, EDGE_METHOD, JSON.stringify({ source: EDGE_METHOD, evidence: topic.evidence, label: topic.label }));
    written += 1;
  }
  return written;
}

function insertAnnotation(row: PaperRow, annotation: AnnotationResult, options: Required<Pick<PaperAiRunOptions, "provider" | "model">>) {
  const result = appSqlite.prepare(`
    INSERT INTO paper_ai_annotations (
      paper_id, provider, model, prompt_version, input_hash, language,
      summary_zh, summary_en, primary_domain, labels_json, topics_json,
      entities_json, metrics_json, confidence, cost_estimate_usd, token_input,
      token_output, needs_review, status, error, updated_at
    ) VALUES (
      @paperId, @provider, @model, @promptVersion, @inputHash, 'zh-en',
      @summaryZh, @summaryEn, @primaryDomain, @labelsJson, @topicsJson,
      @entitiesJson, @metricsJson, @confidence, @costEstimateUsd, @tokenInput,
      @tokenOutput, @needsReview, 'ok', NULL, CURRENT_TIMESTAMP
    )
  `).run({
    paperId: row.id,
    provider: options.provider,
    model: options.model,
    promptVersion: PROMPT_VERSION,
    inputHash: inputHash(row),
    summaryZh: annotation.summaryZh,
    summaryEn: annotation.summaryEn,
    primaryDomain: annotation.primaryDomain,
    labelsJson: JSON.stringify(annotation.labels),
    topicsJson: JSON.stringify(annotation.topics),
    entitiesJson: JSON.stringify(annotation.entities),
    metricsJson: JSON.stringify(annotation.metrics),
    confidence: annotation.confidence,
    costEstimateUsd: annotation.costEstimateUsd,
    tokenInput: annotation.tokenInput,
    tokenOutput: annotation.tokenOutput,
    needsReview: annotation.needsReview ? 1 : 0,
  });
  return Number(result.lastInsertRowid);
}

function jobRow(id: number) {
  return appSqlite.prepare("SELECT * FROM paper_ai_annotation_jobs WHERE id = ?").get(id);
}

export const paperAiEnrichmentService = {
  overview() {
    const total = appSqlite.prepare("SELECT COUNT(*) AS n FROM paper_ai_annotations").get() as { n: number };
    const needsReview = appSqlite.prepare("SELECT COUNT(*) AS n FROM paper_ai_annotations WHERE needs_review = 1").get() as { n: number };
    const latestJob = appSqlite.prepare("SELECT * FROM paper_ai_annotation_jobs ORDER BY id DESC LIMIT 1").get();
    const coverage = appSqlite.prepare(`
      SELECT
        (SELECT COUNT(*) FROM papers) AS papers,
        COUNT(DISTINCT paper_id) AS annotated
      FROM paper_ai_annotations
      WHERE status = 'ok'
    `).get() as { papers: number; annotated: number };
    return {
      annotations: total.n,
      annotatedPapers: coverage.annotated,
      totalPapers: coverage.papers,
      coverage: coverage.papers ? Math.round((coverage.annotated / coverage.papers) * 1000) / 10 : 0,
      needsReview: needsReview.n,
      latestJob,
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_MODEL,
      promptVersion: PROMPT_VERSION,
    };
  },

  listAnnotations(params: { limit?: number; needsReview?: boolean } = {}) {
    const limit = Math.max(1, Math.min(200, Number(params.limit || 50)));
    const where = params.needsReview ? "WHERE a.needs_review = 1" : "";
    const rows = appSqlite.prepare(`
      SELECT a.*, p.title, p.year, p.venue, p.domain
      FROM paper_ai_annotations a
      JOIN papers p ON p.id = a.paper_id
      ${where}
      ORDER BY a.updated_at DESC, a.id DESC
      LIMIT ?
    `).all(limit);
    return { rows, total: rows.length };
  },

  async getOrCreatePaperSummary(paperId: number, input: { provider?: string; model?: string; refresh?: boolean } = {}) {
    const provider = input.provider || DEFAULT_PROVIDER;
    const model = input.model || DEFAULT_MODEL;
    const cached = latestAnnotationForPaper(paperId, provider, model);
    const paper = paperRowById(paperId);
    if (!paper) return null;

    if (cached && !input.refresh && cached.inputHash === inputHash(paper)) {
      return annotationPayload(cached, true);
    }

    const annotation = await generatePaperAiAnnotation({
      row: paper,
      provider,
      model,
      fallback: () => annotateWithRules(paper),
    });

    const insertedId = insertAnnotation(paper, annotation, { provider, model });
    const row = latestAnnotationForPaper(paperId, provider, model) || {
      id: insertedId,
      paperId,
      provider,
      model,
      promptVersion: PROMPT_VERSION,
      inputHash: inputHash(paper),
      language: "zh-en",
      summaryZh: annotation.summaryZh,
      summaryEn: annotation.summaryEn,
      primaryDomain: annotation.primaryDomain,
      labelsJson: JSON.stringify(annotation.labels),
      topicsJson: JSON.stringify(annotation.topics),
      entitiesJson: JSON.stringify(annotation.entities),
      metricsJson: JSON.stringify(annotation.metrics),
      confidence: annotation.confidence,
      costEstimateUsd: annotation.costEstimateUsd,
      tokenInput: annotation.tokenInput,
      tokenOutput: annotation.tokenOutput,
      needsReview: annotation.needsReview ? 1 : 0,
      updatedAt: new Date().toISOString(),
    };
    return annotationPayload(row, false);
  },

  async runBatch(input: PaperAiRunOptions = {}) {
    const options = {
      mode: input.mode || "missing",
      limit: Math.max(1, Math.min(5000, Number(input.limit || 200))),
      provider: input.provider || DEFAULT_PROVIDER,
      model: input.model || DEFAULT_MODEL,
      writeTopicEdges: input.writeTopicEdges !== false,
      minTopicConfidence: Number(input.minTopicConfidence || 55),
      dryRun: Boolean(input.dryRun),
    };
    const candidates = selectCandidates(options);
    const startedAt = new Date().toISOString();
    let jobId = 0;
    if (!options.dryRun) {
      const result = appSqlite.prepare(`
        INSERT INTO paper_ai_annotation_jobs (scope, provider, model, prompt_version, status, queued, options_json, started_at, updated_at)
        VALUES (?, ?, ?, ?, 'running', ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(options.mode, options.provider, options.model, PROMPT_VERSION, candidates.length, JSON.stringify(options), startedAt);
      jobId = Number(result.lastInsertRowid);
    }
    let processed = 0;
    let failed = 0;
    let skipped = 0;
    let topicEdgesWritten = 0;
    let tokenInput = 0;
    let tokenOutput = 0;
    let actualCostUsd = 0;
    const samples: unknown[] = [];
    const errors: string[] = [];
    for (const row of candidates) {
      try {
        const hash = inputHash(row);
        if (options.mode !== "all" && row.input_hash === hash) {
          skipped += 1;
          continue;
        }
        const annotation = await generatePaperAiAnnotation({
          row,
          provider: options.provider,
          model: options.model,
          fallback: () => annotateWithRules(row),
        });
        tokenInput += annotation.tokenInput;
        tokenOutput += annotation.tokenOutput;
        actualCostUsd += annotation.costEstimateUsd;
        if (samples.length < 8) {
          samples.push({ paperId: row.id, title: row.title, confidence: annotation.confidence, topics: annotation.topics.slice(0, 3), needsReview: annotation.needsReview });
        }
        if (!options.dryRun) {
          appSqlite.transaction(() => {
            insertAnnotation(row, annotation, options);
            if (options.writeTopicEdges) topicEdgesWritten += writeTopicEdges(row.id, annotation.topics, options.minTopicConfidence);
          })();
        }
        processed += 1;
      } catch (error) {
        failed += 1;
        errors.push(`${row.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    const finishedAt = new Date().toISOString();
    if (!options.dryRun && jobId) {
      appSqlite.prepare(`
        UPDATE paper_ai_annotation_jobs
        SET status = ?, processed = ?, failed = ?, skipped = ?, actual_cost_usd = ?,
            error = ?, finished_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(failed ? "review_required" : "succeeded", processed, failed, skipped, actualCostUsd, errors.slice(0, 5).join("\n") || null, finishedAt, jobId);
    }
    return {
      ok: failed === 0,
      dryRun: options.dryRun,
      jobId: jobId || null,
      mode: options.mode,
      provider: options.provider,
      model: options.model,
      promptVersion: PROMPT_VERSION,
      queued: candidates.length,
      processed,
      failed,
      skipped,
      topicEdgesWritten,
      tokenInput,
      tokenOutput,
      actualCostUsd,
      samples,
      errors: errors.slice(0, 20),
      job: jobId ? jobRow(jobId) : null,
    };
  },
};
