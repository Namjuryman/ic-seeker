import Database from "better-sqlite3";
import { ftsQuery, semanticText } from "../services/search-query-utils.js";

export type TestDb = InstanceType<typeof Database>;

export type SeedPaper = {
  id?: number;
  title: string;
  authors?: string;
  affiliations?: string;
  abstract?: string;
  year?: number;
  venue?: string;
  publicationTitle?: string;
  venueRank?: string;
  domain?: string;
  qualityScore?: number;
  doi?: string;
  openalexId?: string;
  ieeeArticleNumber?: string;
  citationCount?: number;
};

export function createTestSqlite(): TestDb {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE papers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      authors TEXT NOT NULL DEFAULT '',
      affiliations TEXT NOT NULL DEFAULT '',
      abstract TEXT NOT NULL DEFAULT '',
      year INTEGER NOT NULL DEFAULT 2024,
      venue TEXT NOT NULL DEFAULT '',
      publication_title TEXT NOT NULL DEFAULT '',
      venue_rank TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT 'General IC',
      domain_hits INTEGER NOT NULL DEFAULT 0,
      quality_score REAL NOT NULL DEFAULT 0,
      doi TEXT NOT NULL DEFAULT '',
      pdf_link TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      openalex_id TEXT NOT NULL DEFAULT '',
      ieee_article_number TEXT NOT NULL DEFAULT '',
      collection_method TEXT NOT NULL DEFAULT '',
      download_status TEXT NOT NULL DEFAULT 'metadata_only',
      local_pdf TEXT NOT NULL DEFAULT '',
      citation_count INTEGER NOT NULL DEFAULT 0,
      verification_status TEXT NOT NULL DEFAULT 'unverified',
      user_added INTEGER NOT NULL DEFAULT 0,
      semantic_text TEXT NOT NULL DEFAULT '',
      metadata_confidence INTEGER NOT NULL DEFAULT 0,
      confidence_reasons_json TEXT NOT NULL DEFAULT '[]',
      confidence_flags_json TEXT NOT NULL DEFAULT '[]',
      provenance_json TEXT NOT NULL DEFAULT '[]',
      last_metadata_audit_at TEXT
    );
    CREATE VIRTUAL TABLE papers_fts USING fts5(title, authors, abstract, venue, domain, doi);
    CREATE TABLE import_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return sqlite;
}

export function seedPapers(sqlite: TestDb, rows: SeedPaper[]): number[] {
  const stmt = sqlite.prepare(`
    INSERT INTO papers (
      title, authors, affiliations, abstract, year, venue, publication_title,
      venue_rank, domain, domain_hits, quality_score, doi, source_url,
      openalex_id, ieee_article_number, collection_method, download_status,
      citation_count, verification_status, semantic_text
    ) VALUES (
      @title, @authors, @affiliations, @abstract, @year, @venue, @publicationTitle,
      @venueRank, @domain, @domainHits, @qualityScore, @doi, @sourceUrl,
      @openalexId, @ieeeArticleNumber, @collectionMethod, @downloadStatus,
      @citationCount, @verificationStatus, @semanticText
    )
  `);
  const fts = sqlite.prepare("INSERT INTO papers_fts (rowid, title, authors, abstract, venue, domain, doi) VALUES (?, ?, ?, ?, ?, ?, ?)");
  const ids: number[] = [];
  for (const row of rows) {
    const result = stmt.run({
      title: row.title,
      authors: row.authors || "",
      affiliations: row.affiliations || "",
      abstract: row.abstract || "",
      year: row.year || 2024,
      venue: row.venue || "",
      publicationTitle: row.publicationTitle || row.venue || "",
      venueRank: row.venueRank || "Imported",
      domain: row.domain || "General IC",
      domainHits: row.domain && row.domain !== "General IC" ? 1 : 0,
      qualityScore: row.qualityScore || 0,
      doi: row.doi || "",
      sourceUrl: row.doi ? `https://doi.org/${row.doi}` : "",
      openalexId: row.openalexId || "",
      ieeeArticleNumber: row.ieeeArticleNumber || "",
      collectionMethod: "test_seed",
      downloadStatus: "metadata_only",
      citationCount: row.citationCount || 0,
      verificationStatus: row.doi ? "doi_verified" : "test_seed",
      semanticText: semanticText(`${row.title} ${row.abstract || ""} ${row.domain || ""}`),
    });
    const id = Number(result.lastInsertRowid);
    ids.push(id);
    fts.run(id, row.title, row.authors || "", row.abstract || "", row.venue || "", row.domain || "General IC", row.doi || "");
  }
  return ids;
}

export function searchSeededPapers(sqlite: TestDb, params: {
  q?: string;
  semantic?: boolean;
  venue?: string;
  yearFrom?: number;
  yearTo?: number;
  sort?: "relevance" | "year" | "citations" | "score";
}) {
  const conditions: string[] = ["COALESCE(venue_rank, '') != 'Hidden'"];
  const values: unknown[] = [];
  if (params.venue) {
    conditions.push("venue = ?");
    values.push(params.venue);
  }
  if (params.yearFrom) {
    conditions.push("year >= ?");
    values.push(params.yearFrom);
  }
  if (params.yearTo) {
    conditions.push("year <= ?");
    values.push(params.yearTo);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rawQ = params.q?.trim() || "";
  const expanded = params.semantic ? semanticText(rawQ) : rawQ;
  const query = ftsQuery(expanded, params.semantic ? "OR" : "AND");
  if (query) {
    const order = params.sort === "year"
      ? "p.year DESC, p.quality_score DESC"
      : params.sort === "citations"
      ? "p.citation_count DESC, p.quality_score DESC"
      : "search_rank ASC, p.quality_score DESC, p.year DESC";
    return sqlite.prepare(`
      WITH matched AS (
        SELECT rowid AS id, bm25(papers_fts, 8.0, 2.0, 4.0, 1.5, 1.2, 4.0) AS search_rank
        FROM papers_fts
        WHERE papers_fts MATCH ?
      )
      SELECT p.*, matched.search_rank AS searchRank
      FROM matched
      JOIN papers p ON p.id = matched.id
      ${where}
      ORDER BY ${order}
    `).all(query, ...values) as Array<Record<string, unknown>>;
  }
  const order = params.sort === "year"
    ? "year DESC, quality_score DESC"
    : params.sort === "citations"
    ? "citation_count DESC, quality_score DESC"
    : "quality_score DESC, year DESC";
  return sqlite.prepare(`SELECT * FROM papers ${where} ORDER BY ${order}`).all(...values) as Array<Record<string, unknown>>;
}
