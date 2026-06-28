import { topicReportService } from "./topic-report.service.js";
import { companyService } from "./company.service.js";
import { institutionCompareService } from "./institution-compare.service.js";
import { authorCompareService } from "./author-compare.service.js";
import { mentorCompareService } from "./mentor-compare.service.js";

export type ExportKind = "topic-report" | "company-compare" | "institution-compare" | "author-compare" | "mentor-compare";
export type ExportFormat = "json" | "markdown" | "csv";

export type ExportPayload = {
  kind: ExportKind;
  format: ExportFormat;
  filename: string;
  contentType: string;
  content: string;
  source: Record<string, unknown>;
};

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function slug(value: string) {
  return String(value || "export")
    .trim()
    .replace(/[^\w\u4e00-\u9fa5.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "export";
}

function escapeCsv(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function asList(value: unknown) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

function topicMarkdown(report: any) {
  const lines = [
    `# ${report.field} Topic Report`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Overview",
    "",
    `- Total papers: ${report.overview.totalPapers}`,
    `- Recent papers: ${report.overview.recentPapers}`,
    `- Year range: ${report.overview.yearRange || "-"}`,
    "",
    "## Top Venues",
    "",
    ...report.topVenues.map((row: any) => `- ${row.key}: ${row.count}`),
    "",
    "## Representative Papers",
    "",
    ...report.representativePapers.map((paper: any) => `- ${paper.title} (${paper.year}, ${paper.venue}) ${paper.doi ? `DOI: ${paper.doi}` : ""}`),
    "",
    "## Active Authors",
    "",
    ...report.activeAuthors.map((row: any) => `- ${row.name}: ${row.papers} papers, score ${row.scoreSum}`),
    "",
    "## Strong Institutions",
    "",
    ...report.strongInstitutions.map((row: any) => `- ${row.name}: ${row.papers} papers, score ${row.scoreSum}`),
    "",
    "## Caveat",
    "",
    report.caveat,
  ];
  return lines.join("\n");
}

function topicCsv(report: any) {
  const rows = [
    ["overview", "totalPapers", report.overview.totalPapers, "", "", "", ""],
    ["overview", "recentPapers", report.overview.recentPapers, "", "", "", ""],
    ...report.topVenues.map((row: any) => ["venue", row.key, row.count, "", "", "", ""]),
    ...report.activeAuthors.map((row: any) => ["author", row.name, row.papers, row.scoreSum, row.citations, "", ""]),
    ...report.strongInstitutions.map((row: any) => ["institution", row.name, row.papers, row.scoreSum, row.citations, "", ""]),
    ...paperRows(report.representativePapers),
  ];
  return csv(["section", "name", "metric1", "metric2", "metric3", "metric4", "metric5"], rows);
}

function compareMarkdown(title: string, items: any[], caveat: string) {
  const lines = [
    `# ${title}`,
    "",
    `Generated: ${new Date().toISOString()}`,
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

function compareCsv(items: any[]) {
  return csv(
    ["name", "type", "country", "papers", "recentPapers", "avgScore", "citations", "confidence"],
    items.map((item) => [
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

function respond(kind: ExportKind, format: ExportFormat, name: string, source: Record<string, unknown>, markdown: string, csvText: string): ExportPayload {
  const filename = `siliconscope-${kind}-${slug(name)}-${nowStamp()}.${format === "markdown" ? "md" : format}`;
  if (format === "json") {
    return {
      kind,
      format,
      filename,
      contentType: "application/json; charset=utf-8",
      content: JSON.stringify({ generatedAt: new Date().toISOString(), kind, ...source }, null, 2),
      source,
    };
  }
  if (format === "csv") {
    return { kind, format, filename, contentType: "text/csv; charset=utf-8", content: csvText, source };
  }
  return { kind, format, filename, contentType: "text/markdown; charset=utf-8", content: markdown, source };
}

export const exportService = {
  exportTopicReport(params: Record<string, unknown>, format: ExportFormat): ExportPayload {
    const field = String(params.field || "").trim();
    if (!field) throw new Error("field is required");
    const report = topicReportService.getReport(field);
    return respond("topic-report", format, field, { report }, topicMarkdown(report), topicCsv(report));
  },

  exportCompare(kind: Exclude<ExportKind, "topic-report">, params: Record<string, unknown>, format: ExportFormat): ExportPayload {
    if (kind === "company-compare") {
      const ids = asList(params.ids);
      const result = companyService.compareCompanies(ids);
      return respond(kind, format, ids.join("-"), { result }, compareMarkdown("Company Compare", result.companies, result.caveat), compareCsv(result.companies));
    }
    if (kind === "institution-compare") {
      const names = asList(params.names);
      const result = institutionCompareService.compare(names);
      return respond(kind, format, names.join("-"), { result }, compareMarkdown("Institution Compare", result.institutions, result.caveat), compareCsv(result.institutions));
    }
    if (kind === "author-compare") {
      const names = asList(params.names);
      const result = authorCompareService.compare(names);
      return respond(kind, format, names.join("-"), { result }, compareMarkdown("Author Compare", result.authors, result.caveat), compareCsv(result.authors));
    }
    const names = asList(params.names);
    const result = mentorCompareService.compare(names);
    return respond(kind, format, names.join("-"), { result }, compareMarkdown("Mentor Compare", result.mentors, result.caveat), compareCsv(result.mentors));
  },
};
