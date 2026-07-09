/**
 * Backfill missing papers for a venue + year using an authoritative table of
 * contents, so per-venue/per-year counts become complete.
 *
 * The original database was built from keyword-style API searches, which do not
 * guarantee the full proceedings/issue set — flagship papers go missing. This
 * script instead enumerates the authoritative list and inserts whatever is not
 * already present (matched by DOI):
 *   - Conferences (ISSCC, VLSI, CICC, DAC, ICCAD, DATE, IEDM, ASSCC, ESSCIRC,
 *     ESSERC): DBLP proceedings TOC via `stream:conf/<key>:<year>` (paginated).
 *   - Journals (JSSC, TCAS-I/II, TCAD, TVLSI, SSC-L, TPEL): OpenAlex by source ISSN + year.
 * Full metadata (authors/affiliations/abstract/citations) for the missing DOIs
 * is fetched from OpenAlex in batches of 50. Rows are inserted with the correct
 * venue, venue_rank, inferred domain, quality score, and an FTS row.
 *
 * Default is a dry-run report. Pass --apply to insert.
 *
 * Usage:
 *   npm run backfill:venue -- --venue=ISSCC --year=2024
 *   npm run backfill:venue -- --venue=ISSCC --year=2024 --apply
 *   npm run backfill:venue -- --venue=DAC --years=2023-2024 --apply
 *   npm run backfill:venue -- --venue=JSSC --years=2020-2024 --apply
 */
import Database from "better-sqlite3";
import { pathToFileURL } from "node:url";
import { appConfig } from "../config.js";
import { normalizeDoi, qualityScore, semanticText, inferDomain, inferVenueRank } from "./paper-import/classify.js";

type Db = InstanceType<typeof Database>;

const UA = `SiliconScope/0.2 (${appConfig.crossrefMailto || "local"})`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readArg(name: string): string | undefined {
  const p = `--${name}=`;
  const f = process.argv.slice(2).find((a) => a.startsWith(p));
  if (f) return f.slice(p.length);
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && !String(process.argv[i + 1] || "").startsWith("--")) return process.argv[i + 1];
  return undefined;
}
const hasFlag = (n: string) => process.argv.includes(`--${n}`);

function compact(v: unknown): string {
  return String(v || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function invertAbstract(index: Record<string, number[]> | undefined): string {
  if (!index || typeof index !== "object") return "";
  const words: Array<[number, string]> = [];
  for (const [w, ps] of Object.entries(index)) for (const p of ps || []) words.push([p, w]);
  return words.sort((a, b) => a[0] - b[0]).map(([, w]) => w).join(" ");
}

// canonical venue label in the DB -> DBLP conference stream key
const DBLP_CONF: Record<string, string> = {
  ISSCC: "conf/isscc", CICC: "conf/cicc", DAC: "conf/dac", ICCAD: "conf/iccad",
  DATE: "conf/date", IEDM: "conf/iedm", ASSCC: "conf/asscc", ESSCIRC: "conf/esscirc",
  ESSERC: "conf/esscirc", "VLSI Symposium": "conf/vlsic",
};

// canonical venue label -> OpenAlex ISSN (print preferred)
const JOURNAL_ISSN: Record<string, string> = {
  JSSC: "0018-9200",
  "TCAS-I": "1057-7122",
  "TCAS-II": "1549-7747",
  TCAD: "0278-0070",
  TVLSI: "1063-8210",
  "SSC-L": "2573-9603",
  TPEL: "0885-8993",
};

async function fetchJson(url: string, headers: Record<string, string> = {}, retries = 5): Promise<any | null> {
  let last = "";
  for (let a = 1; a <= retries; a++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA, ...headers } });
      if (r.ok) return await r.json();
      last = `HTTP ${r.status}`;
      if (r.status === 429) {
        if (a >= 2) { console.warn(`[backfill] OpenAlex 429 persistent, aborting retries`); break; }
        console.warn(`[backfill] rate-limited (429), waiting 3s before retry ${a}/2`);
        await sleep(3000);
        continue;
      }
      if (![500, 502, 503, 504].includes(r.status)) break;
    } catch (e) { last = e instanceof Error ? e.message : String(e); }
    if (a < retries) await sleep(3000 * a);
  }
  console.warn(`[backfill] fetch failed: ${url} (${last})`);
  return null;
}

type TocEntry = { doi: string; title: string; authors: string[]; year: number };

async function dblpToc(confKey: string, year: number): Promise<TocEntry[]> {
  const out: TocEntry[] = [];
  for (let f = 0; f < 1200; f += 100) {
    const d = await fetchJson(`https://dblp.org/search/publ/api?q=stream:${encodeURIComponent(confKey)}:${year}&format=json&h=100&f=${f}`);
    const hits = d?.result?.hits?.hit || [];
    for (const h of hits) {
      const info = h.info || {};
      const doi = normalizeDoi(info.doi);
      const authors = Array.isArray(info.authors?.author)
        ? info.authors.author.map((a: any) => compact(typeof a === "string" ? a : a?.text)).filter(Boolean)
        : info.authors?.author ? [compact(info.authors.author.text || info.authors.author)] : [];
      if (doi) out.push({ doi, title: compact(info.title), authors, year: Number(info.year) || year });
    }
    if (hits.length < 100) break;
    await sleep(500);
  }
  return out;
}

async function crossrefJournalToc(issn: string, year: number): Promise<TocEntry[]> {
  const out: TocEntry[] = [];
  let offset = 0;
  const mailto = appConfig.crossrefMailto ? `&mailto=${encodeURIComponent(appConfig.crossrefMailto)}` : "&mailto=siliconscope@example.com";
  while (true) {
    const url = `https://api.crossref.org/works?filter=issn:${issn},from-pub-date:${year},until-pub-date:${year}&rows=1000&offset=${offset}${mailto}`;
    const data = await fetchJson(url, {}, 5);
    const items = data?.message?.items || [];
    for (const item of items) {
      const doi = normalizeDoi(item.DOI);
      if (doi) {
        const title = Array.isArray(item.title) ? item.title[0] : item.title;
        out.push({ doi, title: compact(title), authors: [], year });
      }
    }
    const total = data?.message?.["total-results"] || 0;
    offset += items.length;
    if (items.length < 1000 || offset >= total) break;
    await sleep(2000);
  }
  return out;
}

async function openAlexJournalToc(issn: string, year: number): Promise<TocEntry[]> {
  // 1. Resolve source ID from ISSN
  const source = await fetchJson(`https://api.openalex.org/sources/issn:${issn}`);
  if (!source) {
    console.warn(`[backfill] OpenAlex source query failed for ISSN ${issn}, falling back to Crossref`);
    return crossrefJournalToc(issn, year);
  }
  const sourceId = source?.id; // e.g. https://openalex.org/S4210192596
  if (!sourceId) {
    console.warn(`[backfill] no OpenAlex source for ISSN ${issn}, falling back to Crossref`);
    return crossrefJournalToc(issn, year);
  }
  const shortSourceId = String(sourceId).replace("https://openalex.org/", "");
  console.log(`[backfill] OpenAlex source ${shortSourceId} for ISSN ${issn}`);

  // 2. Paginate works by source.id + publication_year
  const out: TocEntry[] = [];
  let cursor = "*";
  const mailto = appConfig.crossrefMailto ? `&mailto=${encodeURIComponent(appConfig.crossrefMailto)}` : "&mailto=siliconscope@example.com";
  while (true) {
    const url = `https://api.openalex.org/works?filter=primary_location.source.id:${shortSourceId},publication_year:${year}&per-page=200&cursor=${encodeURIComponent(cursor)}${mailto}`;
    const data = await fetchJson(url, {}, 5);
    const results = data?.results || [];
    for (const w of results) {
      const doi = normalizeDoi(w.doi);
      if (doi) {
        out.push({
          doi,
          title: compact(w.display_name || w.title),
          authors: [],
          year: Number(w.publication_year) || year,
        });
      }
    }
    const nextCursor = data?.meta?.next_cursor;
    if (!nextCursor || results.length < 200) break;
    cursor = nextCursor;
    await sleep(2500);
  }
  if (out.length === 0) {
    console.warn(`[backfill] OpenAlex returned 0 papers for ${issn} ${year}, falling back to Crossref`);
    return crossrefJournalToc(issn, year);
  }
  return out;
}

async function crossrefByDois(dois: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  for (let i = 0; i < dois.length; i += 50) {
    const chunk = dois.slice(i, i + 50);
    const filter = chunk.map(d => `doi:${d}`).join(",");
    const mailto = appConfig.crossrefMailto ? `&mailto=${encodeURIComponent(appConfig.crossrefMailto)}` : "&mailto=siliconscope@example.com";
    const d = await fetchJson(`https://api.crossref.org/works?filter=${encodeURIComponent(filter)}&rows=50${mailto}`, {}, 5);
    for (const item of d?.message?.items || []) {
      const key = normalizeDoi(item.DOI);
      if (key) map.set(key, item);
    }
    await sleep(2000);
  }
  return map;
}

async function openAlexByDois(dois: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  for (let i = 0; i < dois.length; i += 50) {
    const chunk = dois.slice(i, i + 50);
    const filter = `doi:${chunk.join("|")}`;
    const mailto = appConfig.crossrefMailto ? `&mailto=${encodeURIComponent(appConfig.crossrefMailto)}` : "&mailto=siliconscope@example.com";
    const d = await fetchJson(`https://api.openalex.org/works?filter=${encodeURIComponent(filter)}&per-page=50${mailto}`, {}, 5);
    for (const w of d?.results || []) {
      const key = normalizeDoi(w.doi);
      if (key) map.set(key, w);
    }
    await sleep(2500);
  }
  if (map.size === 0 && dois.length > 0) {
    console.warn(`[backfill] OpenAlex by-DOI returned 0 results, falling back to Crossref`);
    return crossrefByDois(dois);
  }
  return map;
}

// paratext / non-paper filter for TOC titles
const PARATEXT = /^(welcome|committee|committees|preface|foreword|front matter|back matter|copyright|index|contents|table of contents|message from|list of reviewers|author index|keynote|plenary session|opening|closing|reception|sponsor|advance program|information for authors|corrections|comments|errata|corrigendum|editorial|retrospective|obituary|memoriam|anniversary|50th anniversary)\b/i;
const isProceedingsHeader = (doi: string) => /\/[a-z]*\d*\.\d{4}$/.test(doi); // DOI with no article suffix

function ensureFts(sqlite: Db) {
  const row = sqlite.prepare("SELECT name FROM sqlite_master WHERE name='papers_fts'").get();
  if (!row) sqlite.exec(`CREATE VIRTUAL TABLE papers_fts USING fts5(title, authors, abstract, venue, domain, doi);`);
}
function insertFts(sqlite: Db, id: number, r: { title: string; authors: string; abstract: string; venue: string; domain: string; doi: string }) {
  sqlite.prepare("DELETE FROM papers_fts WHERE rowid=?").run(id);
  sqlite.prepare("INSERT INTO papers_fts (rowid,title,authors,abstract,venue,domain,doi) VALUES (?,?,?,?,?,?,?)")
    .run(id, r.title, r.authors, r.abstract, r.venue, r.domain, r.doi);
}

function parseYears(): number[] {
  const one = readArg("year");
  if (one) return [Number(one)];
  const range = readArg("years");
  if (range?.includes("-")) {
    const [a, b] = range.split("-").map((x) => Number(x.trim()));
    const ys: number[] = [];
    for (let y = a; y <= b; y++) ys.push(y);
    return ys;
  }
  if (range) return [Number(range)];
  return [];
}

async function main() {
  const venue = readArg("venue");
  const years = parseYears();
  const apply = hasFlag("apply");
  const crossrefOnly = hasFlag("crossref-only");
  if (!venue || !years.length) {
    console.log("usage: --venue=ISSCC --year=2024 [--years=2022-2024] [--apply] [--crossref-only]");
    console.log("Known conferences:", Object.keys(DBLP_CONF).join(", "));
    console.log("Known journals:", Object.keys(JOURNAL_ISSN).join(", "));
    return;
  }
  const confKey = DBLP_CONF[venue];
  const journalIssn = JOURNAL_ISSN[venue];
  if (!confKey && !journalIssn) {
    console.log(`[backfill] no mapping for venue "${venue}". Known conferences: ${Object.keys(DBLP_CONF).join(", ")}. Known journals: ${Object.keys(JOURNAL_ISSN).join(", ")}.`);
    return;
  }
  const isJournal = !!journalIssn;

  const sqlite = new Database(appConfig.dbPath);
  ensureFts(sqlite);
  const globalDoi = new Set(
    (sqlite.prepare("SELECT doi FROM papers WHERE doi<>''").all() as Array<{ doi: string }>).map((r) => normalizeDoi(r.doi)),
  );

  let grandInserted = 0;
  for (const year of years) {
    const toc = isJournal
      ? (crossrefOnly ? await crossrefJournalToc(journalIssn!, year) : await openAlexJournalToc(journalIssn!, year))
      : await dblpToc(confKey!, year);
    const realToc = toc.filter((e) => e.doi && !isProceedingsHeader(e.doi) && !PARATEXT.test(e.title));
    const dbCount = (sqlite.prepare("SELECT COUNT(*) c FROM papers WHERE venue=? AND year=?").get(venue, year) as any).c;
    const missing = realToc.filter((e) => !globalDoi.has(e.doi));
    console.log(`\n[backfill] ${venue} ${year}: TOC real=${realToc.length}, DB rows=${dbCount}, missing DOIs=${missing.length}`);
    if (!missing.length) continue;

    const meta = crossrefOnly
      ? await crossrefByDois(missing.map((m) => m.doi))
      : await openAlexByDois(missing.map((m) => m.doi));
    console.log(`[backfill] OpenAlex metadata resolved for ${meta.size}/${missing.length} missing DOIs`);

    const rank = inferVenueRank(venue);
    const insert = sqlite.prepare(`
      INSERT INTO papers (title, authors, affiliations, abstract, year, venue, publication_title,
        venue_rank, domain, domain_hits, quality_score, doi, source_url, openalex_id,
        collection_method, download_status, citation_count, verification_status, user_added,
        semantic_text, metadata_confidence, last_metadata_audit_at)
      VALUES (@title,@authors,@affiliations,@abstract,@year,@venue,@publicationTitle,
        @venueRank,@domain,@domainHits,@qualityScore,@doi,@sourceUrl,@openalexId,
        @collectionMethod,@downloadStatus,@citationCount,@verificationStatus,0,
        @semanticText,@metadataConfidence,CURRENT_TIMESTAMP)`);

    const run = sqlite.transaction((items: TocEntry[]) => {
      for (const e of items) {
        const w = meta.get(e.doi);
        // Detect Crossref vs OpenAlex schema
        const isCrossref = w && (w.DOI || w.URL) && !w.id;
        const authorships = w && !isCrossref && Array.isArray(w.authorships) ? w.authorships : [];
        const crossrefAuthors = w && isCrossref && Array.isArray(w.author) ? w.author : [];
        const authors = authorships.length
          ? authorships.map((a: any) => compact(a.author?.display_name)).filter(Boolean)
          : crossrefAuthors.length
            ? crossrefAuthors.map((a: any) => compact((a.given || "") + " " + (a.family || "")).trim()).filter(Boolean)
            : e.authors;
        const affiliations = isCrossref
          ? [...new Set(crossrefAuthors.flatMap((a: any) =>
              Array.isArray(a.affiliation) ? a.affiliation.map((i: any) => compact(i.name)) : []).filter(Boolean))]
          : [...new Set(authorships.flatMap((a: any) =>
              Array.isArray(a.institutions) ? a.institutions.map((i: any) => compact(i.display_name)) : []).filter(Boolean))];
        const abstractRaw = isCrossref
          ? (w.abstract || "").replace(/<[^>]+>/g, " ")
          : (w ? invertAbstract(w.abstract_inverted_index) : "");
        const abstract = compact(abstractRaw);
        const title = isCrossref
          ? compact(Array.isArray(w.title) ? w.title[0] : w.title)
          : compact(w?.display_name || w?.title || e.title);
        const citation = isCrossref
          ? (Number.isFinite(w["is-referenced-by-count"]) ? Number(w["is-referenced-by-count"]) : 0)
          : (w && Number.isFinite(w.cited_by_count) ? Number(w.cited_by_count) : 0);
        const domainInfo = inferDomain({ title, abstract, venue, publicationTitle: venue });
        const rowData = {
          title,
          authors: authors.join("; "),
          affiliations: affiliations.join("; "),
          abstract,
          year: e.year,
          venue,
          publicationTitle: venue,
          venueRank: rank,
          domain: domainInfo.domain,
          domainHits: domainInfo.hits,
          qualityScore: qualityScore(rank, e.year, citation),
          doi: e.doi,
          sourceUrl: isCrossref ? (w.URL || `https://doi.org/${e.doi}`) : (w ? compact(w.primary_location?.landing_page_url || w.id) : `https://doi.org/${e.doi}`),
          openalexId: isCrossref ? "" : (w ? compact(w.id) : ""),
          collectionMethod: isJournal ? `backfill:openalex-issn` : `backfill:dblp+openalex`,
          downloadStatus: "metadata_only",
          citationCount: citation,
          verificationStatus: "doi_format_verified",
          semanticText: semanticText([title, abstract, domainInfo.domain, venue]),
          metadataConfidence: w ? 70 : 45,
        };
        if (apply) {
          const res = insert.run(rowData);
          insertFts(sqlite, Number(res.lastInsertRowid), {
            title, authors: rowData.authors, abstract, venue, domain: domainInfo.domain, doi: e.doi,
          });
        }
        globalDoi.add(e.doi);
        grandInserted += 1;
      }
    });
    run(missing);

    console.log("[backfill] sample of missing papers:");
    for (const e of missing.slice(0, 8)) console.log(`   ${e.doi}  ${e.title.slice(0, 60)}`);
  }

  console.log(`\n[backfill] ${apply ? "inserted" : "would insert"} ${grandInserted} paper(s).`);
  if (!apply) console.log("[backfill] DRY RUN — re-run with --apply to insert.");
  sqlite.close();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error("[backfill] failed", e); process.exitCode = 1; });
}
