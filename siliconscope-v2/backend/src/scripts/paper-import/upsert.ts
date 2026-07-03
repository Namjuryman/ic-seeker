import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { ensurePaperIntelligenceTables } from "../paper-intelligence-schema.js";
import { qualityScore, semanticText } from "./classify.js";
import { computeMetadataConfidence, stableEvidenceHash } from "../../services/paper-metadata-confidence.js";
import type { MergedPaper, UpsertSummary, ImportedPaper } from "./types.js";

type Db = InstanceType<typeof Database>;

type ExistingPaper = {
  id: number;
  title: string;
  authors: string;
  affiliations: string;
  abstract: string;
  year: number;
  venue: string;
  publication_title: string;
  venue_rank: string;
  domain: string;
  domain_hits: number;
  quality_score: number;
  doi: string;
  pdf_link: string;
  source_url: string;
  openalex_id: string;
  ieee_article_number: string;
  collection_method: string;
  download_status: string;
  citation_count: number;
  verification_status: string;
  metadata_confidence?: number;
};

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeJson(value: unknown, maxBytes = 70_000): string {
  try {
    const json = JSON.stringify(value ?? null);
    if (json.length <= maxBytes) return json;
    return JSON.stringify({ truncated: true, hash: stableEvidenceHash(value), bytes: json.length });
  } catch {
    return JSON.stringify({ error: "unserializable" });
  }
}

function ensureFts(sqlite: Db) {
  const row = sqlite.prepare("SELECT name FROM sqlite_master WHERE name = 'papers_fts'").get();
  if (!row) {
    sqlite.exec(`
      CREATE VIRTUAL TABLE papers_fts USING fts5(
        title,
        authors,
        abstract,
        venue,
        domain,
        doi
      );
    `);
  }
}

function findExisting(sqlite: Db, paper: MergedPaper): ExistingPaper | undefined {
  if (paper.doi) {
    const row = sqlite.prepare("SELECT * FROM papers WHERE LOWER(doi) = LOWER(?) LIMIT 1").get(paper.doi) as ExistingPaper | undefined;
    if (row) return row;
  }
  if (paper.openalexId) {
    const row = sqlite.prepare("SELECT * FROM papers WHERE openalex_id = ? LIMIT 1").get(paper.openalexId) as ExistingPaper | undefined;
    if (row) return row;
  }
  if (paper.ieeeArticleNumber) {
    const row = sqlite.prepare("SELECT * FROM papers WHERE ieee_article_number = ? LIMIT 1").get(paper.ieeeArticleNumber) as ExistingPaper | undefined;
    if (row) return row;
  }
  return sqlite.prepare(`
    SELECT * FROM papers
    WHERE LOWER(title) = LOWER(?) AND year = ?
    LIMIT 1
  `).get(paper.title, paper.year || 0) as ExistingPaper | undefined;
}

function mergeText(existing: string | undefined, incoming: string | undefined): string {
  const current = String(existing || "");
  const next = String(incoming || "");
  if (!next) return current;
  if (!current) return next;
  return next.length > current.length ? next : current;
}

function joinList(values?: string[]): string {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))].join("; ");
}

function splitList(value: string | undefined): string[] {
  return String(value || "").split(";").map((item) => item.trim()).filter(Boolean);
}

function confidenceFor(paper: MergedPaper) {
  return computeMetadataConfidence({
    title: paper.title,
    doi: paper.doi,
    venue: paper.venue,
    publicationTitle: paper.publicationTitle,
    year: paper.year,
    authors: paper.authors,
    affiliations: paper.affiliations,
    sourceRecords: paper.sourceRecords.map((record) => ({
      source: record.source,
      sourceId: record.sourceId,
      sourceUrl: record.sourceUrl,
      doi: record.doi,
      title: record.title,
      venue: record.venue,
      publicationTitle: record.publicationTitle,
      year: record.year,
      authors: record.authors,
      affiliations: record.affiliations,
      rawHash: record.rawHash,
    })),
  });
}

function ftsRebuild(sqlite: Db, paperId: number) {
  const row = sqlite.prepare(`
    SELECT id, title, authors, abstract, venue, domain, doi
    FROM papers WHERE id = ?
  `).get(paperId) as { id: number; title: string; authors: string; abstract: string; venue: string; domain: string; doi: string } | undefined;
  if (!row) return;
  sqlite.prepare("DELETE FROM papers_fts WHERE rowid = ?").run(paperId);
  sqlite.prepare("INSERT INTO papers_fts (rowid, title, authors, abstract, venue, domain, doi) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(row.id, row.title || "", row.authors || "", row.abstract || "", row.venue || "", row.domain || "", row.doi || "");
}

function insertPaper(sqlite: Db, paper: MergedPaper): number {
  const rank = paper.venueRank || "Imported";
  const domainHits = paper.domain && paper.domain !== "General IC" ? 1 : 0;
  const confidence = confidenceFor(paper);
  const result = sqlite.prepare(`
    INSERT INTO papers (
      title, authors, affiliations, abstract, year, venue, publication_title,
      venue_rank, domain, domain_hits, quality_score, doi, pdf_link, source_url,
      openalex_id, ieee_article_number, collection_method, download_status,
      local_pdf, citation_count, verification_status, user_added, semantic_text,
      metadata_confidence, confidence_reasons_json, confidence_flags_json, provenance_json, last_metadata_audit_at
    ) VALUES (
      @title, @authors, @affiliations, @abstract, @year, @venue, @publicationTitle,
      @venueRank, @domain, @domainHits, @qualityScore, @doi, @pdfLink, @sourceUrl,
      @openalexId, @ieeeArticleNumber, @collectionMethod, @downloadStatus,
      '', @citationCount, @verificationStatus, 0, @semanticText,
      @metadataConfidence, @confidenceReasonsJson, @confidenceFlagsJson, @provenanceJson, CURRENT_TIMESTAMP
    )
  `).run({
    title: paper.title,
    authors: joinList(paper.authors),
    affiliations: joinList(paper.affiliations),
    abstract: paper.abstract || "",
    year: paper.year || new Date().getFullYear(),
    venue: paper.venue || paper.publicationTitle || "Imported",
    publicationTitle: paper.publicationTitle || paper.venue || "Imported",
    venueRank: rank,
    domain: paper.domain || "General IC",
    domainHits,
    qualityScore: qualityScore(rank, paper.year, paper.citationCount),
    doi: paper.doi || "",
    pdfLink: paper.pdfLink || "",
    sourceUrl: paper.sourceUrl || "",
    openAlexId: paper.openalexId || "",
    openalexId: paper.openalexId || "",
    ieeeArticleNumber: paper.ieeeArticleNumber || "",
    collectionMethod: `multisource:${paper.sources.join("+")}`,
    downloadStatus: paper.pdfLink ? "publisher_pdf_requires_session" : "metadata_only",
    citationCount: paper.citationCount || 0,
    verificationStatus: confidence.status === "trusted" ? "metadata_trusted" : paper.doi ? "doi_format_verified" : "metadata_imported",
    semanticText: semanticText([paper.title, paper.abstract, paper.domain, paper.venue]),
    metadataConfidence: confidence.score,
    confidenceReasonsJson: safeJson(confidence.reasons),
    confidenceFlagsJson: safeJson(confidence.flags),
    provenanceJson: safeJson(paper.sourceRecords.map((record) => ({ source: record.source, sourceId: record.sourceId, rawHash: record.rawHash }))),
  });
  const paperId = Number(result.lastInsertRowid);
  writeProvenance(sqlite, paperId, paper, confidence);
  return paperId;
}

function updatePaper(sqlite: Db, existing: ExistingPaper, paper: MergedPaper): boolean {
  const confidence = confidenceFor(paper);
  const next = {
    title: mergeText(existing.title, paper.title),
    authors: mergeText(existing.authors, joinList(paper.authors)),
    affiliations: mergeText(existing.affiliations, joinList(paper.affiliations)),
    abstract: mergeText(existing.abstract, paper.abstract),
    year: existing.year || paper.year || new Date().getFullYear(),
    venue: existing.venue || paper.venue || paper.publicationTitle || "",
    publicationTitle: existing.publication_title || paper.publicationTitle || paper.venue || "",
    venueRank: existing.venue_rank || paper.venueRank || "Imported",
    domain: existing.domain || paper.domain || "General IC",
    domainHits: existing.domain_hits || (paper.domain && paper.domain !== "General IC" ? 1 : 0),
    qualityScore: Math.max(Number(existing.quality_score || 0), qualityScore(paper.venueRank || existing.venue_rank || "Imported", paper.year || existing.year, paper.citationCount || existing.citation_count)),
    doi: existing.doi || paper.doi || "",
    pdfLink: existing.pdf_link || paper.pdfLink || "",
    sourceUrl: existing.source_url || paper.sourceUrl || "",
    openalexId: existing.openalex_id || paper.openalexId || "",
    ieeeArticleNumber: existing.ieee_article_number || paper.ieeeArticleNumber || "",
    collectionMethod: [...new Set([...(existing.collection_method || "").split("+"), ...paper.sources].map((s) => s.replace(/^multisource:/, "").trim()).filter(Boolean))].join("+"),
    downloadStatus: existing.download_status || (paper.pdfLink ? "publisher_pdf_requires_session" : "metadata_only"),
    citationCount: Math.max(Number(existing.citation_count || 0), Number(paper.citationCount || 0)),
    verificationStatus: confidence.status === "trusted" ? "metadata_trusted" : existing.verification_status === "metadata_trusted" ? "metadata_trusted" : paper.doi ? "doi_format_verified" : existing.verification_status || "metadata_imported",
    semanticText: semanticText([paper.title || existing.title, paper.abstract || existing.abstract, paper.domain || existing.domain, paper.venue || existing.venue]),
    metadataConfidence: Math.max(Number(existing.metadata_confidence || 0), confidence.score),
    confidenceReasonsJson: safeJson(confidence.reasons),
    confidenceFlagsJson: safeJson(confidence.flags),
    provenanceJson: safeJson(paper.sourceRecords.map((record) => ({ source: record.source, sourceId: record.sourceId, rawHash: record.rawHash }))),
    id: existing.id,
  };
  const changed = Object.entries(next).some(([key, value]) => key !== "id" && String((existing as any)[key] ?? "") !== String(value ?? ""));
  if (changed) {
    sqlite.prepare(`
      UPDATE papers SET
        title = @title,
        authors = @authors,
        affiliations = @affiliations,
        abstract = @abstract,
        year = @year,
        venue = @venue,
        publication_title = @publicationTitle,
        venue_rank = @venueRank,
        domain = @domain,
        domain_hits = @domainHits,
        quality_score = @qualityScore,
        doi = @doi,
        pdf_link = @pdfLink,
        source_url = @sourceUrl,
        openalex_id = @openalexId,
        ieee_article_number = @ieeeArticleNumber,
        collection_method = @collectionMethod,
        download_status = @downloadStatus,
        citation_count = @citationCount,
        verification_status = @verificationStatus,
        semantic_text = @semanticText,
        metadata_confidence = @metadataConfidence,
        confidence_reasons_json = @confidenceReasonsJson,
        confidence_flags_json = @confidenceFlagsJson,
        provenance_json = @provenanceJson,
        last_metadata_audit_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run(next);
  }
  writeProvenance(sqlite, existing.id, paper, confidence);
  return changed;
}

function sourceRecordId(paperId: number, record: ImportedPaper): string {
  return sha([paperId, record.source, record.sourceId || record.rawHash || record.doi || record.title].join("|"));
}

function writeProvenance(sqlite: Db, paperId: number, paper: MergedPaper, confidence = confidenceFor(paper)) {
  const stmt = sqlite.prepare(`
    INSERT INTO paper_sources (
      id, paper_id, source, source_id, source_url, doi, title, venue, year,
      authors_json, affiliations_json, raw_hash, payload_json, confidence, fetched_at, created_at, updated_at
    ) VALUES (
      @id, @paperId, @source, @sourceId, @sourceUrl, @doi, @title, @venue, @year,
      @authorsJson, @affiliationsJson, @rawHash, @payloadJson, @confidence, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT(id) DO UPDATE SET
      source_url = excluded.source_url,
      doi = excluded.doi,
      title = excluded.title,
      venue = excluded.venue,
      year = excluded.year,
      authors_json = excluded.authors_json,
      affiliations_json = excluded.affiliations_json,
      raw_hash = excluded.raw_hash,
      payload_json = excluded.payload_json,
      confidence = excluded.confidence,
      fetched_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `);
  for (const record of paper.sourceRecords) {
    stmt.run({
      id: sourceRecordId(paperId, record),
      paperId,
      source: record.source,
      sourceId: record.sourceId || "",
      sourceUrl: record.sourceUrl || "",
      doi: record.doi || "",
      title: record.title || paper.title,
      venue: record.venue || record.publicationTitle || "",
      year: record.year || null,
      authorsJson: safeJson(record.authors || []),
      affiliationsJson: safeJson(record.affiliations || []),
      rawHash: record.rawHash || stableEvidenceHash(record.raw || null),
      payloadJson: safeJson(record.raw ?? record, 45_000),
      confidence: confidence.score,
    });
  }

  sqlite.prepare(`
    INSERT INTO paper_metadata_audits (
      id, paper_id, metadata_confidence, status, source_count, provenance_score,
      flags_json, reasons_json, audit_method, audited_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'metadata-confidence-v1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(
    sha([paperId, Date.now(), confidence.score, confidence.flags.join(",")].join("|")),
    paperId,
    confidence.score,
    confidence.status,
    confidence.sourceCount,
    confidence.provenanceScore,
    safeJson(confidence.flags),
    safeJson(confidence.reasons),
  );
}

export function upsertPapers(sqlite: Db, papers: MergedPaper[]): UpsertSummary {
  ensureFts(sqlite);
  ensurePaperIntelligenceTables(sqlite);
  const summary: UpsertSummary = { inserted: 0, updated: 0, unchanged: 0, skipped: 0, ftsRebuilt: 0, errors: [] };
  const transaction = sqlite.transaction((items: MergedPaper[]) => {
    for (const paper of items) {
      try {
        if (!paper.title?.trim()) {
          summary.skipped += 1;
          continue;
        }
        const existing = findExisting(sqlite, paper);
        if (!existing) {
          const id = insertPaper(sqlite, paper);
          ftsRebuild(sqlite, id);
          summary.inserted += 1;
          summary.ftsRebuilt += 1;
          continue;
        }
        const changed = updatePaper(sqlite, existing, paper);
        if (changed) {
          ftsRebuild(sqlite, existing.id);
          summary.updated += 1;
          summary.ftsRebuilt += 1;
        } else {
          summary.unchanged += 1;
        }
      } catch (error) {
        summary.errors.push(`${paper.title}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    sqlite.prepare("INSERT INTO import_log (source, status, message) VALUES (?, ?, ?)")
      .run("multisource_paper_import", summary.errors.length ? "partial" : "ok", JSON.stringify({
        inserted: summary.inserted,
        updated: summary.updated,
        unchanged: summary.unchanged,
        skipped: summary.skipped,
        errors: summary.errors.slice(0, 5),
      }));
  });
  transaction(papers);
  return summary;
}
