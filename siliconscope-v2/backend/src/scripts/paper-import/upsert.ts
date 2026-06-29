import Database from "better-sqlite3";
import { qualityScore, semanticText } from "./classify.js";
import type { MergedPaper, UpsertSummary } from "./types.js";

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
};

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
  const result = sqlite.prepare(`
    INSERT INTO papers (
      title, authors, affiliations, abstract, year, venue, publication_title,
      venue_rank, domain, domain_hits, quality_score, doi, pdf_link, source_url,
      openalex_id, ieee_article_number, collection_method, download_status,
      local_pdf, citation_count, verification_status, user_added, semantic_text
    ) VALUES (
      @title, @authors, @affiliations, @abstract, @year, @venue, @publicationTitle,
      @venueRank, @domain, @domainHits, @qualityScore, @doi, @pdfLink, @sourceUrl,
      @openalexId, @ieeeArticleNumber, @collectionMethod, @downloadStatus,
      '', @citationCount, @verificationStatus, 0, @semanticText
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
    openalexId: paper.openalexId || "",
    ieeeArticleNumber: paper.ieeeArticleNumber || "",
    collectionMethod: `multisource:${paper.sources.join("+")}`,
    downloadStatus: paper.pdfLink ? "publisher_pdf_requires_session" : "metadata_only",
    citationCount: paper.citationCount || 0,
    verificationStatus: paper.doi ? "doi_verified" : "metadata_imported",
    semanticText: semanticText([paper.title, paper.abstract, paper.domain, paper.venue]),
  });
  return Number(result.lastInsertRowid);
}

function updatePaper(sqlite: Db, existing: ExistingPaper, paper: MergedPaper): boolean {
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
    verificationStatus: existing.verification_status === "doi_verified" || paper.doi ? "doi_verified" : existing.verification_status || "metadata_imported",
    semanticText: semanticText([paper.title || existing.title, paper.abstract || existing.abstract, paper.domain || existing.domain, paper.venue || existing.venue]),
    id: existing.id,
  };
  const changed = Object.entries(next).some(([key, value]) => key !== "id" && String((existing as any)[key] ?? "") !== String(value ?? ""));
  if (!changed) return false;
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
      semantic_text = @semanticText
    WHERE id = @id
  `).run(next);
  return true;
}

export function upsertPapers(sqlite: Db, papers: MergedPaper[]): UpsertSummary {
  ensureFts(sqlite);
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
