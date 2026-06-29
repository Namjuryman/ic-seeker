import fs from "node:fs";
import path from "node:path";
import { appConfig } from "../../config.js";
import type { ImportedPaper, ImportOptions, PaperImportSource, SourceFetchContext, SourceFetchResult } from "./types.js";

const USER_AGENT = `SiliconScope/0.2 (${appConfig.crossrefMailto || "local"})`;

function compactText(value: unknown): string {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function numberOrUndefined(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function invertOpenAlexAbstract(index: Record<string, number[]> | undefined): string {
  if (!index || typeof index !== "object") return "";
  const words: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions || []) words.push([pos, word]);
  }
  return words.sort((a, b) => a[0] - b[0]).map(([, word]) => word).join(" ");
}

async function fetchJson(url: string, warnings: string[]): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
    if (!res.ok) {
      warnings.push(`${url} returned HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (error) {
    warnings.push(`${url} failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function contextQuery(ctx: SourceFetchContext): string {
  return [ctx.query, ctx.venue].filter(Boolean).join(" ");
}

export async function fetchOpenAlex(ctx: SourceFetchContext): Promise<SourceFetchResult> {
  const warnings: string[] = [];
  const query = encodeURIComponent(contextQuery(ctx));
  const perPage = Math.max(1, Math.min(200, ctx.limit));
  const filter = encodeURIComponent(`from_publication_date:${ctx.yearFrom}-01-01,to_publication_date:${ctx.yearTo}-12-31`);
  const mailto = appConfig.crossrefMailto ? `&mailto=${encodeURIComponent(appConfig.crossrefMailto)}` : "";
  const url = `https://api.openalex.org/works?search=${query}&filter=${filter}&per-page=${perPage}${mailto}`;
  const data = await fetchJson(url, warnings);
  const results = Array.isArray(data?.results) ? data.results : [];
  const papers: ImportedPaper[] = results.map((item: any) => {
    const authorships = Array.isArray(item.authorships) ? item.authorships : [];
    const authors = authorships.map((a: any) => compactText(a.author?.display_name)).filter(Boolean);
    const affiliations = authorships
      .flatMap((a: any) => Array.isArray(a.institutions) ? a.institutions.map((i: any) => compactText(i.display_name)) : [])
      .filter(Boolean);
    const sourceName = compactText(item.primary_location?.source?.display_name || item.host_venue?.display_name);
    return {
      source: "openalex",
      sourceId: compactText(item.id),
      title: compactText(item.title || item.display_name),
      authors,
      affiliations: [...new Set(affiliations)],
      abstract: invertOpenAlexAbstract(item.abstract_inverted_index),
      year: numberOrUndefined(item.publication_year),
      venue: sourceName,
      publicationTitle: sourceName,
      doi: compactText(item.doi).replace(/^https?:\/\/doi\.org\//i, ""),
      sourceUrl: compactText(item.primary_location?.landing_page_url || item.id),
      pdfLink: compactText(item.primary_location?.pdf_url),
      openalexId: compactText(item.id),
      citationCount: numberOrUndefined(item.cited_by_count),
      raw: item,
    };
  }).filter((paper: ImportedPaper) => paper.title);
  return { source: "openalex", papers, warnings };
}

export async function fetchCrossref(ctx: SourceFetchContext): Promise<SourceFetchResult> {
  const warnings: string[] = [];
  const query = encodeURIComponent(contextQuery(ctx));
  const rows = Math.max(1, Math.min(100, ctx.limit));
  const filter = encodeURIComponent(`from-pub-date:${ctx.yearFrom}-01-01,until-pub-date:${ctx.yearTo}-12-31`);
  const mailto = appConfig.crossrefMailto ? `&mailto=${encodeURIComponent(appConfig.crossrefMailto)}` : "";
  const url = `https://api.crossref.org/works?query.bibliographic=${query}&filter=${filter}&rows=${rows}${mailto}`;
  const data = await fetchJson(url, warnings);
  const items = Array.isArray(data?.message?.items) ? data.message.items : [];
  const papers: ImportedPaper[] = items.map((item: any) => {
    const parts = item.published?.["date-parts"]?.[0] || item.created?.["date-parts"]?.[0] || [];
    const authors = Array.isArray(item.author)
      ? item.author.map((a: any) => compactText([a.given, a.family].filter(Boolean).join(" "))).filter(Boolean)
      : [];
    const venue = compactText(item["container-title"]?.[0] || item.publisher);
    return {
      source: "crossref",
      sourceId: compactText(item.DOI),
      title: compactText(item.title?.[0]),
      authors,
      affiliations: [],
      abstract: compactText(item.abstract),
      year: numberOrUndefined(parts[0]),
      venue,
      publicationTitle: venue,
      doi: compactText(item.DOI),
      sourceUrl: compactText(item.URL),
      citationCount: numberOrUndefined(item["is-referenced-by-count"]),
      raw: item,
    };
  }).filter((paper: ImportedPaper) => paper.title);
  return { source: "crossref", papers, warnings };
}

export async function fetchIeee(ctx: SourceFetchContext): Promise<SourceFetchResult> {
  const warnings: string[] = [];
  const apiKey = process.env.IEEE_API_KEY || process.env.IEEE_XPLORE_API_KEY;
  if (!apiKey) {
    return { source: "ieee", papers: [], warnings: ["IEEE_API_KEY is not set; skipped IEEE Xplore adapter."] };
  }
  const params = new URLSearchParams({
    apikey: apiKey,
    querytext: contextQuery(ctx),
    start_year: String(ctx.yearFrom),
    end_year: String(ctx.yearTo),
    max_records: String(Math.max(1, Math.min(200, ctx.limit))),
    start_record: "1",
    sort_order: "desc",
    sort_field: "publication_year",
  });
  const data = await fetchJson(`https://ieeexploreapi.ieee.org/api/v1/search/articles?${params.toString()}`, warnings);
  const articles = Array.isArray(data?.articles) ? data.articles : [];
  const papers: ImportedPaper[] = articles.map((item: any) => {
    const authorItems = Array.isArray(item.authors?.authors) ? item.authors.authors : [];
    const authors = authorItems.map((a: any) => compactText(a.full_name || a.name)).filter(Boolean);
    const affiliations = authorItems.map((a: any) => compactText(a.affiliation)).filter(Boolean);
    const venue = compactText(item.publication_title || item.publication_title_abbrev);
    return {
      source: "ieee",
      sourceId: compactText(item.article_number),
      title: compactText(item.title),
      authors,
      affiliations: [...new Set(affiliations)],
      abstract: compactText(item.abstract),
      year: numberOrUndefined(item.publication_year),
      venue,
      publicationTitle: venue,
      doi: compactText(item.doi),
      pdfLink: compactText(item.pdf_url),
      sourceUrl: compactText(item.html_url || item.abstract_url),
      ieeeArticleNumber: compactText(item.article_number),
      citationCount: numberOrUndefined(item.citing_paper_count || item.citing_patent_count),
      raw: item,
    };
  }).filter((paper: ImportedPaper) => paper.title);
  return { source: "ieee", papers, warnings };
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values.map((value) => value.trim());
}

export function readCsvSource(source: PaperImportSource, filePath?: string): SourceFetchResult {
  const warnings: string[] = [];
  if (!filePath) return { source, papers: [], warnings: [`${source} path is not provided; skipped.`] };
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) return { source, papers: [], warnings: [`${abs} does not exist; skipped.`] };
  const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { source, papers: [], warnings: [`${abs} has no data rows.`] };
  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const papers = lines.slice(1).map((line) => {
    const row = parseCsvLine(line);
    const get = (...keys: string[]) => {
      for (const key of keys) {
        const index = headers.indexOf(key.toLowerCase());
        if (index >= 0) return row[index] || "";
      }
      return "";
    };
    const authors = get("authors", "author").split(/[;|]/).map((a) => a.trim()).filter(Boolean);
    return {
      source,
      title: compactText(get("title", "paper title")),
      authors,
      affiliations: get("affiliations", "institution", "institutions").split(/[;|]/).map((a) => a.trim()).filter(Boolean),
      abstract: compactText(get("abstract", "summary")),
      year: numberOrUndefined(get("year", "publication year")),
      venue: compactText(get("venue", "journal", "conference", "publication title")),
      publicationTitle: compactText(get("publication_title", "publication title", "journal", "conference")),
      doi: compactText(get("doi")),
      pdfLink: compactText(get("pdf", "pdf_link", "pdf url")),
      sourceUrl: compactText(get("url", "source_url", "link")),
      citationCount: numberOrUndefined(get("citations", "citation_count", "cited by")),
    };
  }).filter((paper: ImportedPaper) => paper.title);
  return { source, papers, warnings };
}

export function readAminerJson(filePath?: string): SourceFetchResult {
  const warnings: string[] = [];
  if (!filePath) return { source: "aminer", papers: [], warnings: ["AMiner JSON path is not provided; skipped."] };
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) return { source: "aminer", papers: [], warnings: [`${abs} does not exist; skipped.`] };
  const data = JSON.parse(fs.readFileSync(abs, "utf8"));
  const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.results) ? data.results : [];
  const papers: ImportedPaper[] = rows.map((item: any) => ({
    source: "aminer",
    sourceId: compactText(item.id || item.paper_id),
    title: compactText(item.title),
    authors: Array.isArray(item.authors) ? item.authors.map((a: any) => compactText(a.name || a)).filter(Boolean) : [],
    affiliations: Array.isArray(item.affiliations) ? item.affiliations.map(compactText).filter(Boolean) : [],
    abstract: compactText(item.abstract),
    year: numberOrUndefined(item.year),
    venue: compactText(item.venue || item.publicationTitle),
    publicationTitle: compactText(item.publicationTitle || item.venue),
    doi: compactText(item.doi),
    sourceUrl: compactText(item.url),
    citationCount: numberOrUndefined(item.citationCount || item.citations),
    raw: item,
  })).filter((paper: ImportedPaper) => paper.title);
  return { source: "aminer", papers, warnings };
}

export async function fetchConfiguredSources(options: ImportOptions): Promise<SourceFetchResult[]> {
  const results: SourceFetchResult[] = [];
  const contexts = options.queries.flatMap((query) => {
    const venues = options.venues.length ? options.venues : [undefined];
    return venues.map((venue) => ({ query, venue, yearFrom: options.yearFrom, yearTo: options.yearTo, limit: options.limit }));
  });

  for (const source of options.sources) {
    if (source === "csv") {
      results.push(readCsvSource("csv", options.csvPath));
      continue;
    }
    if (source === "scholar-csv") {
      results.push(readCsvSource("scholar-csv", options.scholarCsvPath));
      continue;
    }
    if (source === "aminer") {
      results.push(readAminerJson(options.aminerJsonPath));
      continue;
    }
    for (const ctx of contexts) {
      if (source === "openalex") results.push(await fetchOpenAlex(ctx));
      if (source === "crossref") results.push(await fetchCrossref(ctx));
      if (source === "ieee") results.push(await fetchIeee(ctx));
    }
  }
  return results;
}
