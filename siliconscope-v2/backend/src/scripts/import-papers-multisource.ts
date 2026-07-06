import Database from "better-sqlite3";
import { pathToFileURL } from "node:url";
import { appConfig } from "../config.js";
import { topicTaxonomyService } from "../services/topic-taxonomy.service.js";
import { icRelevanceScore } from "./paper-import/classify.js";
import { fetchConfiguredSources } from "./paper-import/sources.js";
import { mergePapers } from "./paper-import/merge.js";
import { upsertPapers } from "./paper-import/upsert.js";
import type { ImportOptions, PaperImportSource, SourceFetchResult, UpsertSummary } from "./paper-import/types.js";

const defaultQueries = [
  "integrated circuit",
  "solid-state circuit",
  "analog mixed signal",
  "RF mmWave integrated circuit",
  "power management IC",
  "ADC DAC PLL SRAM",
];

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];
  return undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function splitList(value: string | undefined): string[] {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function parseYears(): { yearFrom: number; yearTo: number } {
  const years = readArg("years");
  if (years?.includes("-")) {
    const [from, to] = years.split("-").map((value) => Number(value.trim()));
    return { yearFrom: from || 2000, yearTo: to || new Date().getFullYear() };
  }
  return {
    yearFrom: Number(readArg("year-from") || 2000),
    yearTo: Number(readArg("year-to") || new Date().getFullYear()),
  };
}

function parseOptions(): ImportOptions {
  const { yearFrom, yearTo } = parseYears();
  const sources = splitList(readArg("sources")) as PaperImportSource[];
  const queries = splitList(readArg("queries"));
  const singleQuery = readArg("query");
  if (singleQuery) queries.unshift(singleQuery);
  return {
    sources: sources.length ? sources : ["openalex", "crossref", "semantic-scholar", "dblp"],
    queries: queries.length ? queries : defaultQueries,
    venues: splitList(readArg("venues")),
    yearFrom,
    yearTo,
    limit: Number(readArg("limit") || 50),
    dryRun: hasFlag("dry-run"),
    refreshTopics: hasFlag("refresh-topics"),
    includeLowRelevance: hasFlag("include-low-relevance"),
    csvPath: readArg("csv"),
    scholarCsvPath: readArg("scholar-csv"),
    aminerJsonPath: readArg("aminer-json"),
  };
}

function printHelp() {
  console.log(`
SiliconScope multi-source paper importer

Examples:
  npm run import:papers -- --sources=openalex,crossref --query="dc-dc converter" --years=2024-2026 --limit=20 --dry-run
  npm run import:papers -- --sources=ieee,openalex,semantic-scholar,dblp --venues=ISSCC,JSSC --year-from=2000 --year-to=2026 --limit=100
  npm run import:papers -- --sources=scholar-csv,csv --scholar-csv=exports/scholar.csv --csv=exports/manual.csv

Notes:
  - IEEE requires IEEE_API_KEY or IEEE_XPLORE_API_KEY in the backend environment.
  - Semantic Scholar can use SEMANTIC_SCHOLAR_API_KEY but also works in limited anonymous mode.
  - DBLP is metadata-only and does not include affiliations for most records.
  - Google Scholar is supported through CSV/BibTeX-style exports, not direct scraping.
  - AMiner is supported through --aminer-json for exported/licensed data.
  - Low-relevance records are filtered by default; use --include-low-relevance to keep everything.
`);
}

export type PaperImportSummary = {
  options: Omit<ImportOptions, "csvPath" | "scholarCsvPath" | "aminerJsonPath"> & {
    csvPath?: string;
    scholarCsvPath?: string;
    aminerJsonPath?: string;
  };
  sources: Array<{
    source: PaperImportSource;
    fetched: number;
    warnings: string[];
  }>;
  raw: number;
  merged: number;
  kept: number;
  filtered: number;
  lowConfidence: number;
  upsert: UpsertSummary;
  refreshedTopics?: unknown;
  sample: Array<{
    title: string;
    year?: number;
    venue?: string;
    doi?: string;
    domain?: string;
    relevance: number;
    sources: string[];
    metadataConfidence?: number;
    confidenceFlags?: string[];
  }>;
};

function sourceSummary(results: SourceFetchResult[]): PaperImportSummary["sources"] {
  return results.map((result) => ({
    source: result.source,
    fetched: result.papers.length,
    warnings: result.warnings,
  }));
}

export async function runImport(options: ImportOptions): Promise<PaperImportSummary> {
  const sourceResults = await fetchConfiguredSources(options);
  const rawPapers = sourceResults.flatMap((result) => result.papers);
  const mergedAll = mergePapers(rawPapers);
  const merged = options.includeLowRelevance
    ? mergedAll
    : mergedAll.filter((paper) => icRelevanceScore(paper) > 0);
  const lowConfidence = merged.filter((paper) => Number(paper.metadataConfidence || 0) < 60).length;

  const sample = merged.slice(0, 5).map((paper) => ({
    title: paper.title,
    year: paper.year,
    venue: paper.venue,
    doi: paper.doi,
    domain: paper.domain,
    relevance: icRelevanceScore(paper),
    sources: paper.sources,
    metadataConfidence: paper.metadataConfidence,
    confidenceFlags: paper.confidenceFlags,
  }));

  const upsert: UpsertSummary = options.dryRun
    ? { inserted: 0, updated: 0, unchanged: 0, skipped: 0, ftsRebuilt: 0, errors: [] }
    : (() => {
        const sqlite = new Database(appConfig.dbPath);
        try {
          return upsertPapers(sqlite, merged);
        } finally {
          sqlite.close();
        }
      })();

  let refreshedTopics: unknown;
  if (!options.dryRun && options.refreshTopics) {
    refreshedTopics = topicTaxonomyService.refreshPaperTopicEdges({ limit: 100000, reset: true, minConfidence: 45 });
  }

  return {
    options,
    sources: sourceSummary(sourceResults),
    raw: rawPapers.length,
    merged: mergedAll.length,
    kept: merged.length,
    filtered: mergedAll.length - merged.length,
    lowConfidence,
    upsert,
    refreshedTopics,
    sample,
  };
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    printHelp();
    return;
  }

  const options = parseOptions();
  console.log("[paper-import] options", JSON.stringify({
    sources: options.sources,
    queries: options.queries,
    venues: options.venues,
    yearFrom: options.yearFrom,
    yearTo: options.yearTo,
    limit: options.limit,
    dryRun: options.dryRun,
    refreshTopics: options.refreshTopics,
    includeLowRelevance: options.includeLowRelevance,
  }, null, 2));

  const summary = await runImport(options);
  for (const result of summary.sources) {
    console.log(`[paper-import] ${result.source}: ${result.fetched} papers`);
    for (const warning of result.warnings) console.warn(`[paper-import] warning: ${warning}`);
  }
  console.log(`[paper-import] raw=${summary.raw}, merged=${summary.merged}, kept=${summary.kept}, filtered=${summary.filtered}`);
  console.log("[paper-import] sample", JSON.stringify(summary.sample, null, 2));

  if (options.dryRun) {
    console.log("[paper-import] dry run complete; database unchanged.");
    return;
  }

  console.log("[paper-import] upsert", JSON.stringify(summary.upsert, null, 2));

  if (summary.refreshedTopics) {
    console.log("[paper-import] refreshed topic edges", JSON.stringify(summary.refreshedTopics, null, 2));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("[paper-import] failed", error);
    process.exitCode = 1;
  });
}
