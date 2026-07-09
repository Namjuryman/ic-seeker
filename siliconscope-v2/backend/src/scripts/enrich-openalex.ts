/**
 * Enrich existing papers from OpenAlex by DOI.
 *
 * Backfills affiliations, abstract, authors, and citation counts for papers that
 * already exist in the local database, and repairs titles that were truncated at
 * import time (e.g. "AOS" -> "AOS: Adaptive Overwrite Scheme ...").
 *
 * OpenAlex is free, needs no API key, and lets us resolve up to 50 DOIs per
 * request via `filter=doi:A|B|C`. Node's fetch (undici) reaches OpenAlex fine
 * even in environments where PowerShell's Invoke-RestMethod cannot.
 *
 * Existing non-empty fields are preserved by default; use --overwrite to replace
 * them. Citations are always refreshed to the latest value. The FTS row and the
 * quality score are recomputed for every changed paper so search stays in sync.
 *
 * Usage:
 *   npm run enrich:openalex -- --dry-run --limit=200
 *   npm run enrich:openalex
 *   npm run enrich:openalex -- --refresh-citations         # also touch rows that already have aff+abstract
 *   npm run enrich:openalex -- --batch=50 --sleep=150
 */
import Database from "better-sqlite3";
import { pathToFileURL } from "node:url";
import { appConfig } from "../config.js";
import { normalizeDoi, qualityScore, semanticText, inferDomain } from "./paper-import/classify.js";

type Db = InstanceType<typeof Database>;

type PaperRow = {
  id: number;
  doi: string;
  title: string;
  authors: string;
  affiliations: string;
  abstract: string;
  venue: string;
  publication_title: string;
  domain: string;
  domain_hits: number;
  venue_rank: string;
  year: number;
  citation_count: number;
};

type OpenAlexWork = {
  title: string;
  authors: string[];
  affiliations: string[];
  abstract: string;
  citationCount?: number;
  openalexId: string;
};

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && !String(process.argv[index + 1] || "").startsWith("--")) return process.argv[index + 1];
  return undefined;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const USER_AGENT = `SiliconScope/0.2 (${appConfig.crossrefMailto || "local"})`;

function compactText(value: unknown): string {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function invertAbstract(index: Record<string, number[]> | undefined): string {
  if (!index || typeof index !== "object") return "";
  const words: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions || []) words.push([pos, word]);
  }
  return words.sort((a, b) => a[0] - b[0]).map(([, word]) => word).join(" ");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOpenAlexBatch(dois: string[], retries = 3): Promise<Map<string, OpenAlexWork>> {
  const filter = `doi:${dois.join("|")}`;
  const mailto = appConfig.crossrefMailto ? `&mailto=${encodeURIComponent(appConfig.crossrefMailto)}` : "";
  const apiKey = process.env.OPENALEX_API_KEY ? `&api_key=${encodeURIComponent(process.env.OPENALEX_API_KEY)}` : "";
  const url = `https://api.openalex.org/works?filter=${encodeURIComponent(filter)}&per-page=${dois.length}${mailto}${apiKey}`;

  let lastError = "";
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
      if (res.ok) {
        const data: any = await res.json();
        const map = new Map<string, OpenAlexWork>();
        for (const item of data.results || []) {
          const key = normalizeDoi(item.doi);
          if (!key) continue;
          const authorships = Array.isArray(item.authorships) ? item.authorships : [];
          map.set(key, {
            title: compactText(item.title || item.display_name),
            authors: authorships.map((a: any) => compactText(a.author?.display_name)).filter(Boolean),
            affiliations: [...new Set(
              authorships.flatMap((a: any) =>
                Array.isArray(a.institutions) ? a.institutions.map((i: any) => compactText(i.display_name)) : [],
              ).filter(Boolean),
            )] as string[],
            abstract: invertAbstract(item.abstract_inverted_index),
            citationCount: Number.isFinite(item.cited_by_count) ? Number(item.cited_by_count) : undefined,
            openalexId: compactText(item.id),
          });
        }
        return map;
      }
      lastError = `HTTP ${res.status}`;
      if (![429, 500, 502, 503, 504].includes(res.status)) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    if (attempt < retries) await sleep(500 * attempt);
  }
  throw new Error(`OpenAlex batch failed: ${lastError || "unknown error"}`);
}

function isTruncatedTitle(current: string, incoming: string): boolean {
  const cur = current.trim();
  const inc = incoming.trim();
  if (!inc || inc.length <= cur.length) return false;
  // repair only when the current title is clearly a stub or a strict prefix of the fuller title
  const stub = cur.length < 12 || !/\s/.test(cur);
  const prefix = inc.toLowerCase().startsWith(cur.toLowerCase());
  return stub || prefix;
}

function rebuildFts(sqlite: Db, id: number) {
  const row = sqlite.prepare(
    "SELECT id, title, authors, abstract, venue, domain, doi FROM papers WHERE id = ?",
  ).get(id) as any;
  if (!row) return;
  sqlite.prepare("DELETE FROM papers_fts WHERE rowid = ?").run(id);
  sqlite.prepare(
    "INSERT INTO papers_fts (rowid, title, authors, abstract, venue, domain, doi) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(id, row.title || "", row.authors || "", row.abstract || "", row.venue || "", row.domain || "", row.doi || "");
}

async function main() {
  const dryRun = hasFlag("dry-run");
  const overwrite = hasFlag("overwrite");
  const refreshCitations = hasFlag("refresh-citations");
  const batchSize = Math.max(1, Math.min(50, Number(readArg("batch") || 50)));
  const sleepMs = Number(readArg("sleep") || 150);
  const limit = Number(readArg("limit") || 0);

  const sqlite = new Database(appConfig.dbPath);

  // Candidates: papers with a DOI that are missing at least one enrichable field,
  // unless --refresh-citations / --overwrite widens the set to every DOI paper.
  const where = refreshCitations || overwrite
    ? "doi <> ''"
    : "doi <> '' AND (affiliations = '' OR abstract = '' OR authors = '')";
  const limitClause = limit > 0 ? `LIMIT ${limit}` : "";
  const candidates = sqlite.prepare(
    `SELECT id, doi, title, authors, affiliations, abstract, venue, publication_title,
            domain, domain_hits, venue_rank, year, citation_count
     FROM papers WHERE ${where} ORDER BY id ${limitClause}`,
  ).all() as PaperRow[];

  console.log(`[enrich] candidates: ${candidates.length} | batch=${batchSize} | dryRun=${dryRun} | overwrite=${overwrite} | refreshCitations=${refreshCitations}`);
  if (!candidates.length) {
    sqlite.close();
    return;
  }

  const stats = {
    matched: 0, missed: 0,
    affFilled: 0, absFilled: 0, authFilled: 0, titleFixed: 0, citeUpdated: 0, domainFixed: 0,
    rowsChanged: 0, batches: 0,
  };

  const updateStmt = sqlite.prepare(`
    UPDATE papers SET
      title = @title, authors = @authors, affiliations = @affiliations, abstract = @abstract,
      domain = @domain, domain_hits = @domainHits, citation_count = @citationCount,
      quality_score = @qualityScore, semantic_text = @semanticText,
      last_metadata_audit_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `);

  for (let i = 0; i < candidates.length; i += batchSize) {
    const chunk = candidates.slice(i, i + batchSize);
    const byDoi = new Map(chunk.map((p) => [normalizeDoi(p.doi), p]));
    let works: Map<string, OpenAlexWork>;
    try {
      works = await fetchOpenAlexBatch([...byDoi.keys()]);
    } catch (error) {
      console.warn(`[enrich] batch ${stats.batches + 1} failed: ${error instanceof Error ? error.message : error}`);
      await sleep(sleepMs * 4);
      continue;
    }
    stats.batches += 1;

    const apply = sqlite.transaction((rows: PaperRow[]) => {
      for (const p of rows) {
        const w = works.get(normalizeDoi(p.doi));
        if (!w) { stats.missed += 1; continue; }
        stats.matched += 1;

        let title = p.title;
        let authors = p.authors;
        let affiliations = p.affiliations;
        let abstract = p.abstract;
        let domain = p.domain;
        let domainHits = p.domain_hits;
        let citationCount = p.citation_count;
        let changed = false;

        if (w.title && isTruncatedTitle(p.title, w.title)) { title = w.title; stats.titleFixed += 1; changed = true; }
        if (w.authors.length && (overwrite || !p.authors)) {
          const joined = [...new Set(w.authors)].join("; ");
          if (joined && joined !== p.authors) { authors = joined; stats.authFilled += 1; changed = true; }
        }
        if (w.affiliations.length && (overwrite || !p.affiliations)) {
          const joined = w.affiliations.join("; ");
          if (joined && joined !== p.affiliations) { affiliations = joined; stats.affFilled += 1; changed = true; }
        }
        if (w.abstract && (overwrite || !p.abstract)) { abstract = w.abstract; stats.absFilled += 1; changed = true; }

        // re-infer domain only when we just added an abstract and it was the fallback bucket
        if (abstract !== p.abstract && (p.domain === "General IC" || !p.domain)) {
          const inferred = inferDomain({ title, abstract, venue: p.venue, publicationTitle: p.publication_title });
          if (inferred.hits > 0 && inferred.domain !== p.domain) {
            domain = inferred.domain; domainHits = inferred.hits; stats.domainFixed += 1; changed = true;
          }
        }

        if (typeof w.citationCount === "number") {
          const next = Math.max(Number(p.citation_count || 0), w.citationCount);
          if (next !== p.citation_count) { citationCount = next; stats.citeUpdated += 1; changed = true; }
        }

        if (!changed) continue;

        const qScore = qualityScore(p.venue_rank || "Imported", p.year, citationCount);
        const semText = semanticText([title, abstract, domain, p.venue]);
        if (!dryRun) {
          updateStmt.run({
            id: p.id, title, authors, affiliations, abstract,
            domain, domainHits, citationCount, qualityScore: qScore, semanticText: semText,
          });
          rebuildFts(sqlite, p.id);
        }
        stats.rowsChanged += 1;
      }
    });
    apply(chunk);

    if ((stats.batches % 20) === 0 || i + batchSize >= candidates.length) {
      console.log(`[enrich] batch ${stats.batches} | processed ${Math.min(i + batchSize, candidates.length)}/${candidates.length} | changed=${stats.rowsChanged} matched=${stats.matched} missed=${stats.missed}`);
    }
    if (sleepMs > 0 && i + batchSize < candidates.length) await sleep(sleepMs);
  }

  sqlite.close();

  console.log("\n[enrich] done" + (dryRun ? " (dry run — no writes)" : ""));
  console.table([{
    candidates: candidates.length,
    matched: stats.matched,
    missed: stats.missed,
    rowsChanged: stats.rowsChanged,
    affiliationsFilled: stats.affFilled,
    abstractsFilled: stats.absFilled,
    authorsFilled: stats.authFilled,
    titlesRepaired: stats.titleFixed,
    citationsUpdated: stats.citeUpdated,
    domainsReclassified: stats.domainFixed,
  }]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("[enrich] failed", error);
    process.exitCode = 1;
  });
}
