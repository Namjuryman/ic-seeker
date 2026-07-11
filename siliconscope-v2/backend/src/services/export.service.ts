import { topicReportService } from "./topic-report.service.js";
import { companyService } from "./company.service.js";
import { institutionCompareService } from "./institution-compare.service.js";
import { authorCompareService } from "./author-compare.service.js";
import { mentorCompareService } from "./mentor-compare.service.js";
import {
  asList,
  compareCsv,
  compareMarkdown,
  nowStamp,
  slug,
  topicCsv,
  topicMarkdown,
} from "./export-format-utils.js";

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
    if (!field) throw new Error("方向字段不能为空。");
    const report = topicReportService.getReport(field);
    return respond("topic-report", format, field, { report }, topicMarkdown(report), topicCsv(report));
  },

  exportCompare(kind: Exclude<ExportKind, "topic-report">, params: Record<string, unknown>, format: ExportFormat): ExportPayload {
    if (kind === "company-compare") {
      const ids = asList(params.ids);
      const result = companyService.compareCompanies(ids);
      return respond(kind, format, ids.join("-"), { result }, compareMarkdown("公司对比", result.companies, result.caveat), compareCsv(result.companies));
    }
    if (kind === "institution-compare") {
      const names = asList(params.names);
      const result = institutionCompareService.compare(names);
      return respond(kind, format, names.join("-"), { result }, compareMarkdown("机构对比", result.institutions, result.caveat), compareCsv(result.institutions));
    }
    if (kind === "author-compare") {
      const names = asList(params.names);
      const result = authorCompareService.compare(names);
      return respond(kind, format, names.join("-"), { result }, compareMarkdown("作者对比", result.authors, result.caveat), compareCsv(result.authors));
    }
    const names = asList(params.names);
    const result = mentorCompareService.compare(names);
    return respond(kind, format, names.join("-"), { result }, compareMarkdown("研究者线索对比", result.mentors, result.caveat), compareCsv(result.mentors));
  },
};
