import { randomUUID } from "node:crypto";
import { sqlite } from "../db/connection.js";
import { fetchConfiguredSources } from "../scripts/paper-import/sources.js";
import { mergePapers } from "../scripts/paper-import/merge.js";
import { upsertPapers } from "../scripts/paper-import/upsert.js";
import { icRelevanceScore } from "../scripts/paper-import/classify.js";
import type { ImportOptions, PaperImportSource } from "../scripts/paper-import/types.js";
import { paperDedupeService } from "./paper-dedupe.service.js";

export type IngestionRunInput = {
  sources?: string[];
  queries?: string[];
  venues?: string[];
  yearFrom?: number;
  yearTo?: number;
  limit?: number;
  dryRun?: boolean;
  includeLowRelevance?: boolean;
};

const allowedSources = new Set(["openalex", "crossref", "semantic-scholar", "dblp", "ieee", "csv", "scholar-csv", "aminer", "aminer-json"]);

function safeJson(value: unknown): string {
  try { return JSON.stringify(value ?? {}); } catch { return "{}"; }
}

function normalizeInput(input: IngestionRunInput = {}): ImportOptions {
  const currentYear = new Date().getFullYear();
  const rawSources = Array.isArray(input.sources) && input.sources.length ? input.sources : ["openalex", "crossref", "semantic-scholar", "dblp"];
  const sources = rawSources
    .map((source) => String(source).trim())
    .map((source) => source === "aminer-json" ? "aminer" : source)
    .filter((source) => allowedSources.has(source)) as PaperImportSource[];
  const queries = Array.isArray(input.queries) && input.queries.length
    ? input.queries.map(String).map((item) => item.trim()).filter(Boolean)
    : ["integrated circuit", "solid-state circuit", "power management IC", "ADC PLL RF mmWave"];
  return {
    sources: sources.length ? sources : ["openalex", "crossref"],
    queries,
    venues: Array.isArray(input.venues) ? input.venues.map(String).map((item) => item.trim()).filter(Boolean) : [],
    yearFrom: Number.isFinite(Number(input.yearFrom)) ? Number(input.yearFrom) : Math.max(2000, currentYear - 3),
    yearTo: Number.isFinite(Number(input.yearTo)) ? Number(input.yearTo) : currentYear,
    limit: Math.max(1, Math.min(500, Number(input.limit || 50))),
    dryRun: Boolean(input.dryRun),
    includeLowRelevance: Boolean(input.includeLowRelevance),
    refreshTopics: false,
  } as ImportOptions;
}

function recordRun(run: Record<string, unknown>) {
  sqlite.prepare(`
    INSERT INTO paper_ingestion_runs (
      id, provider, mode, query_json, status, started_at, finished_at, fetched, inserted,
      updated, deduped, failed, review_required, provenance_json, error, created_at, updated_at
    ) VALUES (
      @id, @provider, @mode, @queryJson, @status, @startedAt, @finishedAt, @fetched, @inserted,
      @updated, @deduped, @failed, @reviewRequired, @provenanceJson, @error, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      finished_at = excluded.finished_at,
      fetched = excluded.fetched,
      inserted = excluded.inserted,
      updated = excluded.updated,
      deduped = excluded.deduped,
      failed = excluded.failed,
      review_required = excluded.review_required,
      provenance_json = excluded.provenance_json,
      error = excluded.error,
      updated_at = CURRENT_TIMESTAMP
  `).run(run);
}

function recordSourceAttempts(runId: string, results: Array<{ source: string; papers: unknown[]; warnings: string[] }>, startedAt: string, finishedAt: string) {
  const stmt = sqlite.prepare(`
    INSERT INTO source_fetch_attempts (
      run_id, source, query, status, attempt, http_status, error, started_at, finished_at, payload_bytes
    ) VALUES (
      @runId, @source, @query, @status, @attempt, @httpStatus, @error, @startedAt, @finishedAt, @payloadBytes
    )
  `);
  const tx = sqlite.transaction((items: Array<{ source: string; papers: unknown[]; warnings: string[] }>) => {
    for (let idx = 0; idx < items.length; idx += 1) {
      const item = items[idx];
      const payload = safeJson({ papers: item.papers.length, warnings: item.warnings });
      stmt.run({
        runId,
        source: item.source,
        query: "multi-query",
        status: item.warnings.length ? "warning" : "succeeded",
        attempt: idx + 1,
        httpStatus: null,
        error: item.warnings.join("\n") || null,
        startedAt,
        finishedAt,
        payloadBytes: Buffer.byteLength(payload),
      });
    }
  });
  tx(results);
}

function mapRun(row: any) {
  let query = {};
  let provenance: any[] = [];
  try { query = JSON.parse(row.query_json || "{}"); } catch {}
  try { provenance = JSON.parse(row.provenance_json || "[]"); } catch {}
  return {
    id: row.id,
    provider: row.provider,
    mode: row.mode,
    status: row.status,
    query,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    fetched: Number(row.fetched || 0),
    inserted: Number(row.inserted || 0),
    updated: Number(row.updated || 0),
    deduped: Number(row.deduped || 0),
    failed: Number(row.failed || 0),
    reviewRequired: Number(row.review_required || 0),
    provenance,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const paperIngestionControlService = {
  plan(input: IngestionRunInput = {}) {
    const options = normalizeInput(input);
    return {
      generatedAt: new Date().toISOString(),
      options,
      compliance: {
        metadataOnly: true,
        noPdfDownload: true,
        retries: Number(process.env.PAPER_IMPORT_RETRY_COUNT || 2),
        provenanceTables: ["paper_sources", "source_fetch_attempts", "paper_metadata_audits"],
        dedupeKeys: ["doi", "external_source_id", "normalized_title_year"],
      },
      requiredSecrets: options.sources.filter((source) => source === "ieee").map(() => "IEEE_API_KEY or IEEE_XPLORE_API_KEY"),
      nextSteps: [
        "Run dry-run against selected sources",
        "Review low metadata-confidence records",
        "Persist trusted/usable records",
        "Refresh topic edges and snapshots",
      ],
    };
  },

  async run(input: IngestionRunInput = {}) {
    const options = normalizeInput(input);
    const runId = `paper-ingest-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const provider = options.sources.join("+") || "manual";
    const startedAt = new Date().toISOString();
    recordRun({
      id: runId,
      provider,
      mode: options.dryRun ? "dry_run" : "metadata_sync",
      queryJson: safeJson(options),
      status: "running",
      startedAt,
      finishedAt: null,
      fetched: 0,
      inserted: 0,
      updated: 0,
      deduped: 0,
      failed: 0,
      reviewRequired: 0,
      provenanceJson: "[]",
      error: null,
    });

    try {
      const sourceResults = await fetchConfiguredSources(options);
      const rawPapers = sourceResults.flatMap((result) => result.papers);
      const mergedAll = mergePapers(rawPapers);
      const merged = options.includeLowRelevance ? mergedAll : mergedAll.filter((paper) => icRelevanceScore(paper) > 0);
      const lowConfidence = merged.filter((paper: any) => Number(paper.metadataConfidence || 0) < 60).length;
      const dedupeScan = paperDedupeService.scan({ limit: 100, persist: !options.dryRun });
      const upsert = options.dryRun ? { inserted: 0, updated: 0, unchanged: 0, skipped: 0, ftsRebuilt: 0, errors: [] as string[] } : upsertPapers(sqlite as any, merged);
      const finishedAt = new Date().toISOString();
      if (!options.dryRun) recordSourceAttempts(runId, sourceResults, startedAt, finishedAt);
      const failed = upsert.errors.length + sourceResults.reduce((sum, item) => sum + item.warnings.length, 0);
      const status = failed ? "review_required" : "succeeded";
      recordRun({
        id: runId,
        provider,
        mode: options.dryRun ? "dry_run" : "metadata_sync",
        queryJson: safeJson(options),
        status,
        startedAt,
        finishedAt,
        fetched: rawPapers.length,
        inserted: upsert.inserted,
        updated: upsert.updated,
        deduped: dedupeScan.total,
        failed,
        reviewRequired: lowConfidence,
        provenanceJson: safeJson(sourceResults.map((result) => ({ source: result.source, papers: result.papers.length, warnings: result.warnings }))),
        error: upsert.errors.slice(0, 5).join("\n") || null,
      });
      return {
        id: runId,
        status,
        dryRun: options.dryRun,
        sources: sourceResults.map((result) => ({ source: result.source, fetched: result.papers.length, warnings: result.warnings })),
        raw: rawPapers.length,
        merged: mergedAll.length,
        kept: merged.length,
        filtered: mergedAll.length - merged.length,
        lowConfidence,
        dedupeCandidates: dedupeScan.total,
        upsert,
        finishedAt,
      };
    } catch (error) {
      const finishedAt = new Date().toISOString();
      recordRun({
        id: runId,
        provider,
        mode: options.dryRun ? "dry_run" : "metadata_sync",
        queryJson: safeJson(options),
        status: "failed",
        startedAt,
        finishedAt,
        fetched: 0,
        inserted: 0,
        updated: 0,
        deduped: 0,
        failed: 1,
        reviewRequired: 0,
        provenanceJson: "[]",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  listRuns(options: { limit?: number; offset?: number; status?: string } = {}) {
    const limit = Math.max(1, Math.min(100, Number(options.limit || 30)));
    const offset = Math.max(0, Number(options.offset || 0));
    const status = String(options.status || "all");
    const where = status === "all" ? "" : "WHERE status = @status";
    const rows = sqlite.prepare(`SELECT * FROM paper_ingestion_runs ${where} ORDER BY updated_at DESC LIMIT @limit OFFSET @offset`).all({ status, limit, offset }).map(mapRun);
    const total = sqlite.prepare(`SELECT COUNT(*) AS n FROM paper_ingestion_runs ${where}`).get({ status }) as { n: number };
    return { rows, total: total?.n || 0, limit, offset };
  },

  sourceAttempts(options: { runId?: string; limit?: number } = {}) {
    const limit = Math.max(1, Math.min(200, Number(options.limit || 100)));
    const where = options.runId ? "WHERE run_id = @runId" : "";
    const rows = sqlite.prepare(`
      SELECT id, run_id AS runId, source, query, status, attempt, http_status AS httpStatus,
             error, started_at AS startedAt, finished_at AS finishedAt, payload_bytes AS payloadBytes
      FROM source_fetch_attempts
      ${where}
      ORDER BY started_at DESC
      LIMIT @limit
    `).all({ runId: options.runId || "", limit });
    return { rows, limit };
  },
};
