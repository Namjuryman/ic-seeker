export type ExportKindName = "topic-report" | "company-compare" | "institution-compare" | "author-compare" | "mentor-compare";
export type ExportFormatName = "json" | "markdown" | "csv";
export type CitationFormatName = "ieee" | "apa" | "bibtex";

export type CitationPaper = {
  title?: string | null;
  authors?: string | null;
  year?: number | string | null;
  venue?: string | null;
  publicationTitle?: string | null;
  doi?: string | null;
};

export function nowStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function slug(value: string) {
  return String(value || "export")
    .trim()
    .replace(/[^\w\u4e00-\u9fa5.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "export";
}

export function escapeCsv(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export function asList(value: unknown) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function authorList(value: unknown) {
  return String(value || "")
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function bibtexKey(paper: CitationPaper) {
  const firstAuthor = authorList(paper.authors)[0]?.split(/\s+/).at(-1) || "paper";
  return slug(`${firstAuthor}${paper.year || "nd"}${paper.title || ""}`).replace(/-/g, "").slice(0, 40) || "paper";
}

export function paperCitation(paper: CitationPaper, format: CitationFormatName): string {
  const title = String(paper.title || "Untitled paper").trim();
  const authors = authorList(paper.authors);
  const authorText = authors.join(", ") || "Unknown author";
  const year = String(paper.year || "n.d.");
  const venue = String(paper.publicationTitle || paper.venue || "").trim();
  const doi = String(paper.doi || "").trim();

  if (format === "bibtex") {
    const fields = [
      `  title={${title}}`,
      `  author={${authors.join(" and ") || "Unknown author"}}`,
      `  year={${year}}`,
      venue ? `  journal={${venue}}` : "",
      doi ? `  doi={${doi}}` : "",
    ].filter(Boolean);
    return `@article{${bibtexKey(paper)},\n${fields.join(",\n")}\n}`;
  }
  if (format === "apa") {
    return `${authorText} (${year}). ${title}.${venue ? ` ${venue}.` : ""}${doi ? ` https://doi.org/${doi}` : ""}`;
  }
  return `${authorText}, "${title},"${venue ? ` ${venue},` : ""} ${year}.${doi ? ` doi: ${doi}.` : ""}`;
}

function paperRows(papers: Array<Record<string, any>>) {
  return papers.map((paper) => [
    "paper",
    paper.title,
    paper.year,
    paper.venue,
    paper.venueRank || paper.rank,
    paper.domain || paper.field,
    paper.doi,
  ]);
}

export function topicMarkdown(report: any, generatedAt = new Date().toISOString()) {
  const lines = [
    `# ${report.field} Topic Report`,
    "",
    `Generated: ${generatedAt}`,
    "",
    "Generated from SiliconScope metadata and user-selected inputs. Verify papers, companies, institutions, and mentor-related information manually before making decisions.",
    "",
    "## Filters",
    "",
    `- field: ${report.field}`,
    "",
    "## Overview",
    "",
    `- Total papers: ${report.overview.totalPapers}`,
    `- Recent papers: ${report.overview.recentPapers}`,
    `- Year range: ${report.overview.yearRange || "-"}`,
    "",
    "## Yearly Trend",
    "",
    ...(report.trend || []).map((row: any) => `- ${row.year}: ${row.count}`),
    "",
    "## Top Venues",
    "",
    ...(report.topVenues || []).map((row: any) => `- ${row.key}: ${row.count}`),
    "",
    "## Representative Papers",
    "",
    ...(report.representativePapers || []).map((paper: any) => `- ${paper.title} (${paper.year || "n.d."}, ${paper.venue || "unknown venue"}) ${paper.doi ? `DOI: ${paper.doi}` : ""}`),
    "",
    "## Active Authors",
    "",
    ...(report.activeAuthors || []).map((row: any) => `- ${row.name}: ${row.papers} papers, score ${row.scoreSum}, citations ${row.citations}`),
    "",
    "## Strong Institutions",
    "",
    ...(report.strongInstitutions || []).map((row: any) => `- ${row.name}: ${row.papers} papers, score ${row.scoreSum}, citations ${row.citations}`),
    "",
    "## Related Companies",
    "",
    ...(report.relatedCompanies || []).map((row: any) => `- ${row.name}: confidence ${row.confidence ?? "unknown"}`),
    "",
    "## Related Learning Roadmaps",
    "",
    ...(report.relatedRoadmaps || []).map((row: any) => `- ${row.title} (${row.slug})`),
    "",
    "## Caveat",
    "",
    report.caveat,
  ];
  return lines.join("\n");
}

export function topicCsv(report: any, generatedAt = new Date().toISOString()) {
  const rows = [
    ["meta", "generatedAt", generatedAt, "", "", "", ""],
    ["filter", "field", report.field, "", "", "", ""],
    ["caveat", "caveat", report.caveat, "", "", "", ""],
    ["overview", "totalPapers", report.overview.totalPapers, "", "", "", ""],
    ["overview", "recentPapers", report.overview.recentPapers, "", "", "", ""],
    ...((report.trend || []).map((row: any) => ["trend", row.year, row.count, "", "", "", ""])),
    ...((report.topVenues || []).map((row: any) => ["venue", row.key, row.count, "", "", "", ""])),
    ...((report.activeAuthors || []).map((row: any) => ["author", row.name, row.papers, row.scoreSum, row.citations, "", ""])),
    ...((report.strongInstitutions || []).map((row: any) => ["institution", row.name, row.papers, row.scoreSum, row.citations, "", ""])),
    ...((report.relatedCompanies || []).map((row: any) => ["company", row.name, row.id, row.confidence, "", "", ""])),
    ...((report.relatedRoadmaps || []).map((row: any) => ["roadmap", row.title, row.slug, "", "", "", ""])),
    ...paperRows(report.representativePapers || []),
  ];
  return csv(["section", "name", "metric1", "metric2", "metric3", "metric4", "metric5"], rows);
}

export function compareMarkdown(title: string, items: any[], caveat: string, generatedAt = new Date().toISOString()) {
  const lines = [
    `# ${title}`,
    "",
    `Generated: ${generatedAt}`,
    "",
    "Metadata-based indicator only. Verify source completeness before using this for decisions.",
    "",
    ...items.flatMap((item) => [
      `## ${item.name || item.title || item.legalName}`,
      "",
      `- Papers: ${item.totalPapers ?? item.paperCount ?? item.papers ?? "-"}`,
      `- Recent papers: ${item.recentPapers ?? "-"}`,
      `- Average score: ${item.avgScore ?? "-"}`,
      `- Citations: ${item.citations ?? "-"}`,
      `- Country: ${item.country || "-"}`,
      `- Type: ${item.companyType || item.visibilityLevel || "-"}`,
      "",
    ]),
    "## Caveat",
    "",
    caveat,
  ];
  return lines.join("\n");
}

export function compareCsv(items: any[], generatedAt = new Date().toISOString()) {
  return csv(
    ["generatedAt", "name", "type", "country", "papers", "recentPapers", "avgScore", "citations", "confidence"],
    items.map((item) => [
      generatedAt,
      item.name || item.title || item.legalName,
      item.companyType || item.visibilityLevel || "",
      item.country || "",
      item.totalPapers ?? item.paperCount ?? item.papers ?? "",
      item.recentPapers ?? "",
      item.avgScore ?? "",
      item.citations ?? "",
      item.metadataConfidence ?? item.dataConfidence ?? "",
    ]),
  );
}
