/**
 * Remove non-article "front matter" rows from the papers table.
 *
 * Proceedings and journals deposit DOIs for administrative pages — committees,
 * welcome messages, indexes, copyright pages, "Information for authors", society
 * ads, keynote/plenary listings — which were ingested as if they were papers.
 * They pollute counts, search, and author/institution profiles.
 *
 * Deletion is intentionally conservative and should be run AFTER enrich:openalex,
 * because enrichment fills authors/affiliations/abstract for real papers from
 * OpenAlex, leaving only genuine junk without a real affiliation. A row is deleted
 * only when:
 *   Rule A — it has no scholarly signal at all: no authors, no abstract, zero
 *            citations, or
 *   Rule B — its title is an administrative phrase or a journal masthead
 *            (committees, welcome message, information for authors, "IEEE
 *            Transactions on ...", ...) AND it has no affiliations.
 * A real paper's title is never the journal's own name, and after enrichment a
 * real paper almost always carries an affiliation — so requiring affiliations=''
 * in Rule B preserves real papers whose titles merely contain a word like "Index".
 *
 * Default is a dry-run report. Pass --apply to delete. Referencing rows in FTS,
 * provenance, user data, topic edges, and AI tables are cascaded.
 *
 * Usage:
 *   npm run clean:frontmatter                 # report only
 *   npm run clean:frontmatter -- --apply
 *   npm run clean:frontmatter -- --apply --limit=50   # cap deletions (safety)
 */
import Database from "better-sqlite3";
import { pathToFileURL } from "node:url";
import { appConfig } from "../config.js";

type Db = InstanceType<typeof Database>;

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

// Curated administrative titles. Matched against a normalized title (lowercased,
// punctuation stripped, whitespace collapsed, a leading venue/year prefix removed).
const ADMIN_PHRASES = [
  "committee", "committees", "committee list", "committee page", "steering committee",
  "program committee", "organizing committee", "technical program committee",
  "welcome", "welcome message", "welcome from the committee", "welcome from the general chair",
  "message from the chair", "message from the general chair", "message from the editor",
  "preface", "foreword", "editorial", "editorial board", "editorial note",
  "index", "author index", "subject index", "keyword index", "table of contents", "contents",
  "copyright", "copyright page", "copyright notice", "title page", "front matter", "back matter",
  "cover", "front cover", "back cover", "blank page", "list of reviewers", "list of authors",
  "information for authors", "information for author", "call for papers",
  "keynote", "keynotes", "keynote speaker", "keynote speakers", "keynote address",
  "plenary", "plenary speaker", "plenary speakers", "invited speakers",
  "reviewers", "acknowledgment", "acknowledgement", "acknowledgment to reviewers",
  "ieee open access", "ieee open access publishing", "introducing ieee collabratec",
  "ieee women in engineering", "ieee membership", "ieee xplore",
  "information", "society information", "publication information", "general information",
  "advertisement", "advertisers index", "instructions for authors",
  "session overview", "program", "conference program", "technical program",
];

function normTitle(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    // drop a leading venue/year prefix such as "a-sscc 2018 " or "cicc 2019 " or "2023 ieee ..."
    .replace(/^\s*[a-z-]{2,12}\s*\d{4}\s+/i, "")
    .replace(/^\s*\d{4}\s+ieee\s+/i, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const ADMIN_SET = new Set(ADMIN_PHRASES.map((p) => normTitle(p)));

// Titles that are NEVER a real paper: the journal's own masthead name, or an
// unambiguous administrative phrase. These are deleted regardless of whether
// enrichment happened to attach an affiliation/abstract/citation to them.
const STRICT_ADMIN = new Set([
  "new associate editor", "new associate editors", "editorial new associate editor",
  "editorial new associate editors", "information for authors", "information for author",
  "instructions for authors", "introducing ieee collabratec", "call for papers",
  "table of contents", "author index", "subject index", "index to authors",
  "editorial board", "program committee", "organizing committee", "steering committee",
  "technical program committee", "executive committee", "committee", "committees",
  "welcome message", "welcome from the committee", "front matter", "back matter",
  "copyright page", "list of reviewers", "message from the chair",
  "message from the general chair", "message from the editor in chief",
  "preface", "foreword", "keynote speakers", "plenary speakers", "advance program",
  "techrxiv share your preprint research with the world",
].map(normTitle));

function isStrictJunkTitle(title: string): boolean {
  const n = normTitle(title);
  if (!n) return true;
  if (STRICT_ADMIN.has(n)) return true;
  // journal masthead used as a "paper" title, e.g. "IEEE Transactions on Computer-Aided Design ..."
  if (/^ieee (transactions on|journal of|open access|circuits and systems society|women in engineering|membership|xplore|potentials)\b/.test(n) && n.length <= 110) return true;
  return false;
}

function isAdminTitle(title: string): boolean {
  const n = normTitle(title);
  if (!n) return true; // empty title after normalization is not a real paper
  if (ADMIN_SET.has(n)) return true;
  // very short titles that start with an admin phrase, e.g. "committee list 2022"
  if (n.length <= 40) {
    for (const phrase of ADMIN_SET) {
      if (phrase.length >= 5 && (n === phrase || n.startsWith(phrase + " ") || n.endsWith(" " + phrase))) return true;
    }
  }
  // society boilerplate: long "IEEE Transactions on ... Information/Publication" mastheads
  if (/^ieee (transactions|journal|circuits and systems|open access)/.test(n) && n.length <= 90) return true;
  return false;
}

const REFERENCING_TABLES = [
  "paper_sources", "paper_metadata_audits", "local_pdf_items",
  "favorites", "reading_status", "notes", "paper_tags", "paper_comments",
  "paper_topic_edges", "paper_ai_annotations", "paper_ai_annotation_reviews",
];

function tableExists(sqlite: Db, name: string): boolean {
  return !!sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
}

async function main() {
  const apply = hasFlag("apply");
  const limit = Number(readArg("limit") || 0);
  const sqlite = new Database(appConfig.dbPath);

  const rows = sqlite.prepare(
    `SELECT id, venue, year, title, authors, affiliations, abstract, citation_count
     FROM papers`,
  ).all() as Array<{ id: number; venue: string; year: number; title: string; authors: string; affiliations: string; abstract: string; citation_count: number }>;

  const doomed: typeof rows = [];
  for (const r of rows) {
    const noAuthors = !r.authors || !r.authors.trim();
    const noAffiliations = !r.affiliations || !r.affiliations.trim();
    const ruleA = noAuthors && !r.abstract && r.citation_count === 0;
    const ruleB = isAdminTitle(r.title) && noAffiliations;
    const ruleC = isStrictJunkTitle(r.title);
    if (ruleA || ruleB || ruleC) doomed.push(r);
  }
  const targets = limit > 0 ? doomed.slice(0, limit) : doomed;

  console.log(`[clean] scanned ${rows.length} papers`);
  console.log(`[clean] junk identified: ${doomed.length}${limit > 0 ? ` (capped to ${targets.length})` : ""}`);
  console.log("[clean] sample of what will be deleted:");
  console.table(targets.slice(0, 25).map((r) => ({ id: r.id, venue: r.venue, year: r.year, hasAuthors: !!r.authors.trim(), title: r.title.slice(0, 50) })));

  const byVenue = new Map<string, number>();
  for (const r of targets) byVenue.set(r.venue, (byVenue.get(r.venue) || 0) + 1);
  console.log("[clean] by venue:");
  console.table([...byVenue.entries()].sort((a, b) => b[1] - a[1]).map(([venue, count]) => ({ venue, count })));

  if (!apply) {
    console.log("\n[clean] DRY RUN — no rows deleted. Re-run with --apply to delete.");
    sqlite.close();
    return;
  }

  const ids = targets.map((r) => r.id);
  const del = sqlite.transaction((paperIds: number[]) => {
    const chunkSize = 500;
    for (let i = 0; i < paperIds.length; i += chunkSize) {
      const chunk = paperIds.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => "?").join(",");
      sqlite.prepare(`DELETE FROM papers_fts WHERE rowid IN (${placeholders})`).run(...chunk);
      for (const table of REFERENCING_TABLES) {
        if (tableExists(sqlite, table)) {
          sqlite.prepare(`DELETE FROM ${table} WHERE paper_id IN (${placeholders})`).run(...chunk);
        }
      }
      sqlite.prepare(`DELETE FROM papers WHERE id IN (${placeholders})`).run(...chunk);
    }
  });
  del(ids);

  console.log(`\n[clean] deleted ${ids.length} junk rows and cascaded references.`);
  console.log("[clean] remaining papers:", (sqlite.prepare("SELECT COUNT(*) c FROM papers").get() as any).c);
  sqlite.close();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("[clean] failed", error);
    process.exitCode = 1;
  });
}
