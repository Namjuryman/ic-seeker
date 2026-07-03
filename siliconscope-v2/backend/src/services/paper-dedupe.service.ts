import { createHash } from "node:crypto";
import { sqlite } from "../db/connection.js";

export type DedupeStatus = "open" | "ignored" | "merged" | "reviewed";

export type PaperDedupeCandidate = {
  id: string;
  candidateKey: string;
  candidateType: "doi" | "title_year" | "source_id";
  paperIds: number[];
  doiValues: string[];
  titleValues: string[];
  sourceValues: string[];
  confidence: number;
  status: DedupeStatus;
  reasons: string[];
  createdAt?: string;
  updatedAt?: string;
};

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeDoi(value: unknown): string {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .replace(/[\s.,;]+$/g, "")
    .toLowerCase();
}

export function normalizeTitleKey(value: unknown): string {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\b(a|an|the|of|for|and|with|using|based|toward|towards|in|on)\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniq<T>(values: T[]): T[] {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && String(value).trim() !== ""))];
}

function parseJsonArray(value: unknown): any[] {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapRow(row: any): PaperDedupeCandidate {
  return {
    id: row.id,
    candidateKey: row.candidate_key,
    candidateType: row.candidate_type,
    paperIds: parseJsonArray(row.paper_ids_json).map(Number).filter(Number.isFinite),
    doiValues: parseJsonArray(row.doi_values_json).map(String),
    titleValues: parseJsonArray(row.title_values_json).map(String),
    sourceValues: parseJsonArray(row.source_values_json).map(String),
    confidence: Number(row.confidence || 0),
    status: row.status,
    reasons: parseJsonArray(row.reasons_json).map(String),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function writeCandidate(candidate: PaperDedupeCandidate): PaperDedupeCandidate {
  sqlite.prepare(`
    INSERT INTO paper_dedupe_candidates (
      id, candidate_key, candidate_type, paper_ids_json, doi_values_json, title_values_json,
      source_values_json, confidence, status, reasons_json, created_at, updated_at
    ) VALUES (
      @id, @candidateKey, @candidateType, @paperIdsJson, @doiValuesJson, @titleValuesJson,
      @sourceValuesJson, @confidence, @status, @reasonsJson, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT(candidate_type, candidate_key) DO UPDATE SET
      paper_ids_json = excluded.paper_ids_json,
      doi_values_json = excluded.doi_values_json,
      title_values_json = excluded.title_values_json,
      source_values_json = excluded.source_values_json,
      confidence = MAX(paper_dedupe_candidates.confidence, excluded.confidence),
      reasons_json = excluded.reasons_json,
      updated_at = CURRENT_TIMESTAMP
  `).run({
    id: candidate.id,
    candidateKey: candidate.candidateKey,
    candidateType: candidate.candidateType,
    paperIdsJson: JSON.stringify(candidate.paperIds),
    doiValuesJson: JSON.stringify(candidate.doiValues),
    titleValuesJson: JSON.stringify(candidate.titleValues),
    sourceValuesJson: JSON.stringify(candidate.sourceValues),
    confidence: candidate.confidence,
    status: candidate.status,
    reasonsJson: JSON.stringify(candidate.reasons),
  });
  return candidate;
}

function doiCandidates(limit: number): PaperDedupeCandidate[] {
  const rows = sqlite.prepare(`
    SELECT LOWER(doi) AS key, COUNT(*) AS count,
           json_group_array(id) AS ids,
           json_group_array(title) AS titles,
           json_group_array(doi) AS dois,
           json_group_array(collection_method) AS sources
    FROM papers
    WHERE COALESCE(doi, '') != ''
    GROUP BY LOWER(doi)
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT ?
  `).all(limit) as any[];
  return rows.map((row) => ({
    id: sha(`doi|${row.key}`),
    candidateKey: row.key,
    candidateType: "doi" as const,
    paperIds: parseJsonArray(row.ids).map(Number),
    doiValues: uniq(parseJsonArray(row.dois).map(normalizeDoi)),
    titleValues: uniq(parseJsonArray(row.titles).map(String)).slice(0, 12),
    sourceValues: uniq(parseJsonArray(row.sources).map(String)).slice(0, 12),
    confidence: 98,
    status: "open" as const,
    reasons: ["same_normalized_doi", `${row.count}_papers`],
  }));
}

function titleYearCandidates(limit: number): PaperDedupeCandidate[] {
  const rows = sqlite.prepare(`
    SELECT year, title, id, doi, collection_method
    FROM papers
    WHERE COALESCE(title, '') != ''
    ORDER BY year DESC, id DESC
    LIMIT ?
  `).all(Math.max(limit * 40, 1000)) as any[];
  const groups = new Map<string, any[]>();
  for (const row of rows) {
    const titleKey = normalizeTitleKey(row.title);
    if (titleKey.length < 24) continue;
    const key = `${row.year || 0}|${titleKey}`;
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .filter(([, rows]) => rows.length > 1)
    .slice(0, limit)
    .map(([key, rows]) => ({
      id: sha(`title_year|${key}`),
      candidateKey: key,
      candidateType: "title_year" as const,
      paperIds: rows.map((row) => Number(row.id)),
      doiValues: uniq(rows.map((row) => normalizeDoi(row.doi))).filter(Boolean),
      titleValues: uniq(rows.map((row) => String(row.title))).slice(0, 12),
      sourceValues: uniq(rows.map((row) => String(row.collection_method || ""))).slice(0, 12),
      confidence: rows.some((row) => normalizeDoi(row.doi)) ? 92 : 80,
      status: "open" as const,
      reasons: ["same_normalized_title_and_year", `${rows.length}_papers`],
    }));
}

function sourceIdCandidates(limit: number): PaperDedupeCandidate[] {
  const rows = sqlite.prepare(`
    SELECT source || ':' || source_id AS key,
           COUNT(DISTINCT paper_id) AS count,
           json_group_array(DISTINCT paper_id) AS ids,
           json_group_array(DISTINCT title) AS titles,
           json_group_array(DISTINCT doi) AS dois,
           json_group_array(DISTINCT source) AS sources
    FROM paper_sources
    WHERE COALESCE(source_id, '') != ''
    GROUP BY source, source_id
    HAVING COUNT(DISTINCT paper_id) > 1
    ORDER BY count DESC
    LIMIT ?
  `).all(limit) as any[];
  return rows.map((row) => ({
    id: sha(`source_id|${row.key}`),
    candidateKey: row.key,
    candidateType: "source_id" as const,
    paperIds: parseJsonArray(row.ids).map(Number),
    doiValues: uniq(parseJsonArray(row.dois).map(normalizeDoi)),
    titleValues: uniq(parseJsonArray(row.titles).map(String)).slice(0, 12),
    sourceValues: uniq(parseJsonArray(row.sources).map(String)).slice(0, 12),
    confidence: 96,
    status: "open" as const,
    reasons: ["same_external_source_id", `${row.count}_paper_ids`],
  }));
}

export const paperDedupeService = {
  scan(options: { limit?: number; persist?: boolean } = {}) {
    const limit = Math.max(1, Math.min(500, Number(options.limit || 100)));
    const candidates = [...doiCandidates(limit), ...sourceIdCandidates(limit), ...titleYearCandidates(limit)]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
    if (options.persist) {
      const tx = sqlite.transaction((items: PaperDedupeCandidate[]) => items.map(writeCandidate));
      tx(candidates);
    }
    return {
      generatedAt: new Date().toISOString(),
      persisted: Boolean(options.persist),
      total: candidates.length,
      candidates,
    };
  },

  list(options: { status?: string; limit?: number; offset?: number } = {}) {
    const limit = Math.max(1, Math.min(200, Number(options.limit || 50)));
    const offset = Math.max(0, Number(options.offset || 0));
    const status = String(options.status || "open");
    const where = status === "all" ? "" : "WHERE status = @status";
    const rows = sqlite.prepare(`
      SELECT * FROM paper_dedupe_candidates
      ${where}
      ORDER BY confidence DESC, updated_at DESC
      LIMIT @limit OFFSET @offset
    `).all({ status, limit, offset }).map(mapRow);
    const total = sqlite.prepare(`SELECT COUNT(*) AS n FROM paper_dedupe_candidates ${where}`).get({ status }) as { n: number };
    return { rows, total: total?.n || 0, limit, offset };
  },

  updateStatus(id: string, status: DedupeStatus) {
    if (!["open", "ignored", "merged", "reviewed"].includes(status)) throw new Error("Invalid dedupe status");
    sqlite.prepare("UPDATE paper_dedupe_candidates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);
    const row = sqlite.prepare("SELECT * FROM paper_dedupe_candidates WHERE id = ?").get(id);
    if (!row) throw new Error("Dedupe candidate not found");
    return mapRow(row);
  },
};
