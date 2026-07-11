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
  const title = String(paper.title || "未命名论文").trim();
  const authors = authorList(paper.authors);
  const authorText = authors.join(", ") || "作者待补全";
  const year = String(paper.year || "n.d.");
  const venue = String(paper.publicationTitle || paper.venue || "").trim();
  const doi = String(paper.doi || "").trim();

  if (format === "bibtex") {
    const fields = [
      `  title={${title}}`,
      `  author={${authors.join(" and ") || "作者待补全"}}`,
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
    "论文",
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
    `# ${report.field} 方向报告`,
    "",
    `生成时间：${generatedAt}`,
    "",
    "本报告由 SiliconScope 元数据和用户输入生成。用于决策前，请人工复核论文、企业、机构和研究者相关信息。",
    "",
    "## 筛选条件",
    "",
    `- 方向：${report.field}`,
    "",
    "## 概览",
    "",
    `- 论文总数：${report.overview.totalPapers}`,
    `- 近年论文：${report.overview.recentPapers}`,
    `- 年份范围：${report.overview.yearRange || "-"}`,
    "",
    "## 年度趋势",
    "",
    ...(report.trend || []).map((row: any) => `- ${row.year}: ${row.count}`),
    "",
    "## 主要会议/期刊",
    "",
    ...(report.topVenues || []).map((row: any) => `- ${row.key}: ${row.count}`),
    "",
    "## 代表论文",
    "",
    ...(report.representativePapers || []).map((paper: any) => `- ${paper.title} (${paper.year || "n.d."}, ${paper.venue || "会议/期刊待补全"}) ${paper.doi ? `DOI: ${paper.doi}` : ""}`),
    "",
    "## 作者线索",
    "",
    ...(report.activeAuthors || []).map((row: any) => `- ${row.name}: ${row.papers} 篇论文，元数据信号 ${row.scoreSum}，引用 ${row.citations}`),
    "",
    "## 机构线索",
    "",
    ...(report.strongInstitutions || []).map((row: any) => `- ${row.name}: ${row.papers} 篇论文，元数据信号 ${row.scoreSum}，引用 ${row.citations}`),
    "",
    "## 相关企业",
    "",
    ...(report.relatedCompanies || []).map((row: any) => `- ${row.name}: 可信度 ${row.confidence ?? "待补全"}`),
    "",
    "## 相关学习路线",
    "",
    ...(report.relatedRoadmaps || []).map((row: any) => `- ${row.title} (${row.slug})`),
    "",
    "## 使用提示",
    "",
    report.caveat,
  ];
  return lines.join("\n");
}

export function topicCsv(report: any, generatedAt = new Date().toISOString()) {
  const rows = [
    ["元信息", "生成时间", generatedAt, "", "", "", ""],
    ["筛选条件", "方向", report.field, "", "", "", ""],
    ["使用提示", "说明", report.caveat, "", "", "", ""],
    ["概览", "论文总数", report.overview.totalPapers, "", "", "", ""],
    ["概览", "近年论文", report.overview.recentPapers, "", "", "", ""],
    ...((report.trend || []).map((row: any) => ["年度趋势", row.year, row.count, "", "", "", ""])),
    ...((report.topVenues || []).map((row: any) => ["主要会议/期刊", row.key, row.count, "", "", "", ""])),
    ...((report.activeAuthors || []).map((row: any) => ["作者线索", row.name, row.papers, row.scoreSum, row.citations, "", ""])),
    ...((report.strongInstitutions || []).map((row: any) => ["机构线索", row.name, row.papers, row.scoreSum, row.citations, "", ""])),
    ...((report.relatedCompanies || []).map((row: any) => ["相关企业", row.name, row.id, row.confidence, "", "", ""])),
    ...((report.relatedRoadmaps || []).map((row: any) => ["相关学习路线", row.title, row.slug, "", "", "", ""])),
    ...paperRows(report.representativePapers || []),
  ];
  return csv(["分区", "名称", "指标一", "指标二", "指标三", "指标四", "指标五"], rows);
}

export function compareMarkdown(title: string, items: any[], caveat: string, generatedAt = new Date().toISOString()) {
  const lines = [
    `# ${title}`,
    "",
    `生成时间：${generatedAt}`,
    "",
    "仅作为基于元数据的指标参考。用于决策前，请复核来源完整性。",
    "",
    ...items.flatMap((item) => [
      `## ${item.name || item.title || item.legalName}`,
      "",
      `- 论文数：${item.totalPapers ?? item.paperCount ?? item.papers ?? "-"}`,
      `- 近年论文：${item.recentPapers ?? "-"}`,
      `- 元数据信号均值：${item.avgScore ?? "-"}`,
      `- 引用：${item.citations ?? "-"}`,
      `- 国家/地区：${item.country || "-"}`,
      `- 类型：${item.companyType || item.visibilityLevel || "-"}`,
      "",
    ]),
    "## 使用提示",
    "",
    caveat,
  ];
  return lines.join("\n");
}

export function compareCsv(items: any[], generatedAt = new Date().toISOString()) {
  return csv(
    ["生成时间", "名称", "类型", "国家/地区", "论文数", "近年论文", "元数据信号均值", "引用", "来源可信度"],
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
