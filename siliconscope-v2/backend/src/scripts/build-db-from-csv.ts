import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { appConfig } from "../config.js";
import { qualityScore, semanticText } from "./paper-import/classify.js";

type CsvRow = Record<string, string>;
type SqliteDb = InstanceType<typeof Database>;

type Options = {
  csvPath: string;
  outPath: string;
  force: boolean;
  limit: number;
};

const DEFAULT_BATCH_SIZE = 1000;

function parseArgs(argv: string[]): Options {
  const options: Options = {
    csvPath: appConfig.csvPath,
    outPath: appConfig.dbPath,
    force: false,
    limit: 0,
  };
  for (const arg of argv) {
    if (arg === "--force") options.force = true;
    else if (arg.startsWith("--csv=")) options.csvPath = path.resolve(arg.slice("--csv=".length));
    else if (arg.startsWith("--out=")) options.outPath = path.resolve(arg.slice("--out=".length));
    else if (arg.startsWith("--limit=")) options.limit = Number(arg.slice("--limit=".length)) || 0;
  }
  return options;
}

function inspectExistingFile(filePath: string): "missing" | "lfs-pointer" | "sqlite" | "other" {
  if (!fs.existsSync(filePath)) return "missing";
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) return "other";
  const fd = fs.openSync(filePath, "r");
  try {
    const sample = Buffer.alloc(Math.min(256, stat.size));
    fs.readSync(fd, sample, 0, sample.length, 0);
    const text = sample.toString("utf8");
    if (stat.size < 5000 && text.startsWith("version https://git-lfs.github.com/spec/v1")) return "lfs-pointer";
    if (sample.subarray(0, 16).toString("utf8") === "SQLite format 3\0") return "sqlite";
    return "other";
  } finally {
    fs.closeSync(fd);
  }
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let i = 0;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === "\"") {
        if (text[i + 1] === "\"") {
          cell += "\"";
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      cell += char;
      i += 1;
      continue;
    }
    if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
    i += 1;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((items) => items.some((item) => item.trim() !== ""));
}

function toObjects(rows: string[][]): CsvRow[] {
  const [header, ...body] = rows;
  if (!header) return [];
  const columns = header.map((name) => name.trim());
  return body.map((items) => {
    const row: CsvRow = {};
    columns.forEach((column, index) => {
      row[column] = items[index] ?? "";
    });
    return row;
  });
}

function intValue(value: string, fallback = 0): number {
  const parsed = Number(String(value || "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function realValue(value: string, fallback = 0): number {
  const parsed = Number(String(value || "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createSchema(sqlite: SqliteDb) {
  sqlite.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA temp_store = MEMORY;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS papers (
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
      quality_score INTEGER NOT NULL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS paper_sources (
      id TEXT PRIMARY KEY,
      paper_id INTEGER NOT NULL,
      source TEXT NOT NULL,
      source_id TEXT,
      source_url TEXT,
      doi TEXT,
      title TEXT NOT NULL DEFAULT '',
      venue TEXT NOT NULL DEFAULT '',
      year INTEGER,
      authors_json TEXT NOT NULL DEFAULT '[]',
      affiliations_json TEXT NOT NULL DEFAULT '[]',
      raw_hash TEXT,
      payload_json TEXT,
      confidence INTEGER NOT NULL DEFAULT 0,
      fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS paper_metadata_audits (
      id TEXT PRIMARY KEY,
      paper_id INTEGER NOT NULL,
      metadata_confidence INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'needs_review',
      source_count INTEGER NOT NULL DEFAULT 0,
      provenance_score INTEGER NOT NULL DEFAULT 0,
      flags_json TEXT NOT NULL DEFAULT '[]',
      reasons_json TEXT NOT NULL DEFAULT '[]',
      audit_method TEXT NOT NULL DEFAULT 'csv-build',
      audited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favorites (user_id INTEGER NOT NULL DEFAULT 0, paper_id INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, paper_id));
    CREATE TABLE IF NOT EXISTS reading_status (user_id INTEGER NOT NULL DEFAULT 0, paper_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'unread', reading_state TEXT NOT NULL DEFAULT 'unread', important INTEGER NOT NULL DEFAULT 0, use_cases_json TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, paper_id));
    CREATE TABLE IF NOT EXISTS notes (user_id INTEGER NOT NULL DEFAULT 0, paper_id INTEGER NOT NULL, body TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, paper_id));
    CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, color TEXT NOT NULL DEFAULT '#1d6fb8', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS paper_tags (user_id INTEGER NOT NULL DEFAULT 0, paper_id INTEGER NOT NULL, tag_id INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, paper_id, tag_id));
    CREATE TABLE IF NOT EXISTS api_keys (provider TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS import_log (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, status TEXT NOT NULL, message TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, nickname TEXT, verification_status TEXT NOT NULL DEFAULT 'unverified', verification_level TEXT NOT NULL DEFAULT 'none', subscription_plan TEXT NOT NULL DEFAULT 'free', token_version INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS paper_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, paper_id INTEGER NOT NULL, user_id INTEGER NOT NULL, comment_type TEXT NOT NULL DEFAULT 'Technical Note', body TEXT NOT NULL DEFAULT '', moderation_status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS mentor_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, professor_id TEXT NOT NULL, user_id INTEGER NOT NULL, public_alias TEXT NOT NULL DEFAULT 'Anonymous Verified Reviewer', is_verified_review INTEGER NOT NULL DEFAULT 0, relationship_type TEXT, structured_scores_json TEXT, strengths_text TEXT, cautions_text TEXT, fit_text TEXT, moderation_status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS content_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, target_type TEXT NOT NULL, target_id INTEGER NOT NULL, reporter_user_id INTEGER, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS moderation_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, target_type TEXT NOT NULL, target_id INTEGER NOT NULL, moderator_id INTEGER, action TEXT NOT NULL, reason TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS qs_rankings (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, aliases TEXT NOT NULL DEFAULT '', qs_world_rank INTEGER, qs_region_rank INTEGER, region TEXT);
    CREATE TABLE IF NOT EXISTS institution_aliases (alias TEXT PRIMARY KEY, canonical_name TEXT NOT NULL, country_code TEXT, country_name TEXT, city TEXT, source TEXT NOT NULL DEFAULT 'manual', confidence INTEGER NOT NULL DEFAULT 100, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS author_aliases (alias TEXT PRIMARY KEY, canonical_name TEXT NOT NULL, institution_hint TEXT, source TEXT NOT NULL DEFAULT 'manual', confidence INTEGER NOT NULL DEFAULT 100, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS subscriptions (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 0, plan_id TEXT NOT NULL DEFAULT 'free', status TEXT NOT NULL DEFAULT 'active', provider TEXT NOT NULL DEFAULT 'manual', provider_customer_id TEXT, provider_subscription_id TEXT, current_period_start TEXT, current_period_end TEXT, cancel_at_period_end INTEGER NOT NULL DEFAULT 0, metadata_json TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS payment_customers (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 0, provider TEXT NOT NULL DEFAULT 'manual', provider_customer_id TEXT NOT NULL DEFAULT '', email TEXT, metadata_json TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS billing_events (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL DEFAULT 0, provider TEXT NOT NULL DEFAULT 'manual', event_type TEXT NOT NULL, provider_event_id TEXT, plan_id TEXT, status TEXT NOT NULL DEFAULT 'recorded', payload_json TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS usage_events (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL DEFAULT 0, metric TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, source TEXT NOT NULL DEFAULT 'app', resource_type TEXT, resource_id TEXT, metadata_json TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS local_pdf_items (id TEXT PRIMARY KEY, paper_id INTEGER, file_path TEXT NOT NULL, file_hash TEXT, file_size INTEGER NOT NULL DEFAULT 0, title_guess TEXT NOT NULL DEFAULT '', doi_guess TEXT NOT NULL DEFAULT '', match_status TEXT NOT NULL DEFAULT 'unmatched', match_confidence INTEGER NOT NULL DEFAULT 0, page_count INTEGER, ocr_status TEXT NOT NULL DEFAULT 'not_started', extracted_text_hash TEXT, last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

    CREATE VIRTUAL TABLE IF NOT EXISTS papers_fts USING fts5(title, authors, abstract, venue, domain, doi);
  `);
}

function createIndexes(sqlite: SqliteDb) {
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_papers_year_score ON papers(year DESC, quality_score DESC);
    CREATE INDEX IF NOT EXISTS idx_papers_score_year ON papers(quality_score DESC, year DESC);
    CREATE INDEX IF NOT EXISTS idx_papers_citations_score ON papers(citation_count DESC, quality_score DESC);
    CREATE INDEX IF NOT EXISTS idx_papers_venue ON papers(venue);
    CREATE INDEX IF NOT EXISTS idx_papers_domain ON papers(domain);
    CREATE INDEX IF NOT EXISTS idx_papers_venue_rank ON papers(venue_rank);
    CREATE INDEX IF NOT EXISTS idx_papers_doi ON papers(doi);
    CREATE INDEX IF NOT EXISTS idx_papers_openalex_id ON papers(openalex_id);
    CREATE INDEX IF NOT EXISTS idx_papers_local_pdf ON papers(local_pdf);
    CREATE INDEX IF NOT EXISTS idx_favorites_user_paper ON favorites(user_id, paper_id);
    CREATE INDEX IF NOT EXISTS idx_paper_tags_user_paper ON paper_tags(user_id, paper_id);
    CREATE INDEX IF NOT EXISTS idx_paper_tags_user_tag ON paper_tags(user_id, tag_id);
    CREATE INDEX IF NOT EXISTS idx_reading_status_user_status ON reading_status(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_reading_status_user_state ON reading_status(user_id, reading_state);
    CREATE INDEX IF NOT EXISTS idx_notes_user_paper ON notes(user_id, paper_id);
    CREATE INDEX IF NOT EXISTS idx_paper_comments_paper_status_created ON paper_comments(paper_id, moderation_status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_paper_comments_status_created ON paper_comments(moderation_status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_mentor_reviews_prof_status_created ON mentor_reviews(professor_id, moderation_status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_mentor_reviews_status_created ON mentor_reviews(moderation_status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_content_reports_status_created ON content_reports(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_moderation_logs_created ON moderation_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_billing_events_user_created ON billing_events(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_billing_events_provider_event ON billing_events(provider, provider_event_id);
    CREATE INDEX IF NOT EXISTS idx_usage_events_user_metric_created ON usage_events(user_id, metric, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_institution_aliases_canonical ON institution_aliases(canonical_name);
    CREATE INDEX IF NOT EXISTS idx_author_aliases_canonical ON author_aliases(canonical_name);
  `);
}

function insertRows(sqlite: SqliteDb, rows: CsvRow[]) {
  const insertPaper = sqlite.prepare(`
    INSERT INTO papers (
      title, authors, affiliations, abstract, year, venue, publication_title,
      venue_rank, domain, domain_hits, quality_score, doi, pdf_link, source_url,
      ieee_article_number, collection_method, download_status, citation_count,
      verification_status, semantic_text, metadata_confidence, confidence_reasons_json,
      confidence_flags_json, provenance_json, last_metadata_audit_at
    ) VALUES (
      @title, @authors, @affiliations, @abstract, @year, @venue, @publicationTitle,
      @venueRank, @domain, @domainHits, @qualityScore, @doi, @pdfLink, @sourceUrl,
      @ieeeArticleNumber, @collectionMethod, @downloadStatus, @citationCount,
      @verificationStatus, @semanticText, @metadataConfidence, @confidenceReasonsJson,
      @confidenceFlagsJson, @provenanceJson, CURRENT_TIMESTAMP
    )
  `);
  const tx = sqlite.transaction((items: CsvRow[]) => {
    for (const row of items) {
      const venueRank = row["Venue Rank"] || "Imported";
      const year = intValue(row["Publication Year"], new Date().getFullYear());
      const citationCount = intValue(row["Article Citation Count"]);
      const storedQuality = realValue(row["Quality Score"]);
      const quality = storedQuality > 0 ? storedQuality : qualityScore(venueRank, year, citationCount);
      const title = row["Document Title"] || "";
      const authors = row["Authors"] || "";
      const affiliations = row["Author Affiliations"] || "";
      const abstract = row["Abstract"] || "";
      const venue = row["Venue Key"] || row["Publication Title"] || "";
      const domain = row["IC Domain"] || "General IC";
      const info = {
        title,
        authors,
        affiliations,
        abstract,
        year,
        venue,
        publicationTitle: row["Publication Title"] || venue,
        venueRank,
        domain,
        domainHits: domain && domain !== "General IC" ? 1 : 0,
        qualityScore: quality,
        doi: row["DOI"] || "",
        pdfLink: row["PDF Link"] || "",
        sourceUrl: row["Source URL"] || "",
        ieeeArticleNumber: row["IEEE Article Number"] || "",
        collectionMethod: row["Collection Method"] || "csv_seed",
        downloadStatus: row["Download Status"] || "metadata_only",
        citationCount,
        verificationStatus: row["DOI"] ? "doi_format_verified" : "metadata_imported",
        semanticText: semanticText([title, abstract, domain, venue]),
        metadataConfidence: row["DOI"] ? 75 : 55,
        confidenceReasonsJson: JSON.stringify(["seeded_from_chip_seeker_csv"]),
        confidenceFlagsJson: "[]",
        provenanceJson: JSON.stringify([{ source: "ic_chipseeker_csv", sourceUrl: row["Source URL"] || "", doi: row["DOI"] || "" }]),
      };
      insertPaper.run(info);
    }
  });

  for (let index = 0; index < rows.length; index += DEFAULT_BATCH_SIZE) {
    tx(rows.slice(index, index + DEFAULT_BATCH_SIZE));
  }
}

function rebuildFts(sqlite: SqliteDb) {
  sqlite.exec(`
    DELETE FROM papers_fts;
    INSERT INTO papers_fts (rowid, title, authors, abstract, venue, domain, doi)
      SELECT id, title, authors, abstract, venue, domain, doi FROM papers;
  `);
}

function assertSafeTarget(options: Options) {
  const existing = inspectExistingFile(options.outPath);
  if ((existing === "sqlite" || existing === "other") && !options.force) {
    throw new Error(`Refusing to overwrite existing ${existing} file at ${options.outPath}. Pass --force to rebuild it.`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(options.csvPath)) throw new Error(`CSV file not found: ${options.csvPath}`);
  assertSafeTarget(options);
  fs.mkdirSync(path.dirname(options.outPath), { recursive: true });
  if (fs.existsSync(options.outPath)) fs.rmSync(options.outPath, { force: true });
  for (const suffix of ["-wal", "-shm"]) {
    if (fs.existsSync(`${options.outPath}${suffix}`)) fs.rmSync(`${options.outPath}${suffix}`, { force: true });
  }

  const raw = fs.readFileSync(options.csvPath, "utf8");
  const objects = toObjects(parseCsv(raw));
  const rows = options.limit > 0 ? objects.slice(0, options.limit) : objects;
  const sqlite = new Database(options.outPath);
  try {
    createSchema(sqlite);
    insertRows(sqlite, rows);
    rebuildFts(sqlite);
    createIndexes(sqlite);
    sqlite.prepare("INSERT INTO import_log (source, status, message) VALUES ('csv_build', 'ok', ?)").run(JSON.stringify({ csvPath: options.csvPath, rows: rows.length }));
    sqlite.exec("PRAGMA optimize");
    sqlite.pragma("wal_checkpoint(TRUNCATE)");
    const count = sqlite.prepare("SELECT COUNT(*) AS count FROM papers").get() as { count: number };
    const ftsCount = sqlite.prepare("SELECT COUNT(*) AS count FROM papers_fts WHERE papers_fts MATCH 'buck OR pmic'").get() as { count: number };
    console.log(JSON.stringify({
      outPath: options.outPath,
      csvPath: options.csvPath,
      rows: count.count,
      buckOrPmicMatches: ftsCount.count,
      bytes: fs.statSync(options.outPath).size,
    }, null, 2));
  } finally {
    sqlite.close();
  }
}

main();
