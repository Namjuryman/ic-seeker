import { topicService } from "./topic.service.js";
import { learningContentService } from "./learning-content.service.js";
import { appDb } from "../db/app-db.js";
import { companies } from "../db/schema.js";
import { sql } from "drizzle-orm";
import { toPaperRow } from "./paper-row.js";

export const topicReportService = {
  getReport(field: string) {
    const target = String(field || "").trim();
    if (!target) throw new Error("请输入一个研究方向。");

    const detail = topicService.getTopicDetail(target);
    const currentYear = new Date().getFullYear();
    const recentPapers = detail.recentPapers?.length ?? 0;

    // Find related companies by domain matching
    const relatedCompanies = appDb
      .select({
        id: companies.id,
        name: companies.name,
        domains: companies.domainsJson,
        dataConfidence: companies.dataConfidence,
      })
      .from(companies)
      .where(sql`${companies.domainsJson} LIKE ${`%${target}%`}`)
      .limit(8)
      .all()
      .map((c) => ({
        id: c.id,
        name: c.name,
        domains: (() => {
          try {
            return JSON.parse(c.domains || "[]") as string[];
          } catch {
            return [];
          }
        })(),
        confidence: c.dataConfidence,
      }));

    // Find related roadmaps from learning catalog
    const relatedRoadmaps = learningContentService.activeContent().roadmaps
      .filter((r) => {
        const text = [
          r.title,
          r.domain,
          r.description,
          ...r.relatedTopics,
          ...r.relatedSearchQueries,
        ].join(" ").toLowerCase();
        return text.includes(target.toLowerCase());
      })
      .slice(0, 5)
      .map((r) => ({ slug: r.slug, title: r.title }));

    // Suggested searches
    const suggestedSearches = [
      { label: `${target} 近 5 年论文`, params: { q: target, sort: "year", yearFrom: String(currentYear - 4) } },
      { label: `${target} S+ 论文`, params: { q: target, sort: "score", rank: "S+" } },
      { label: `${target} 高引用论文`, params: { q: target, sort: "citations", yearFrom: "2015" } },
      { label: `${target} 综述/调研`, params: { q: `${target} review survey`, sort: "citations" } },
    ];

    return {
      field: target,
      overview: {
        totalPapers: detail.papers,
        recentPapers,
        yearRange: detail.byYear.length
          ? `${detail.byYear[0].year}-${detail.byYear[detail.byYear.length - 1].year}`
          : undefined,
      },
      trend: detail.byYear,
      topVenues: detail.byVenue.slice(0, 10),
      representativePapers: detail.representativePapers
        .slice(0, 10)
        .map((p) => toPaperRow(p as any) as unknown as Record<string, any>),
      activeAuthors: detail.authors.slice(0, 10).map((a) => ({
        name: a.name,
        papers: a.papers,
        scoreSum: a.scoreSum,
        citations: a.citations,
      })),
      strongInstitutions: detail.institutions.slice(0, 10).map((i) => ({
        name: i.name,
        papers: i.papers,
        scoreSum: i.scoreSum,
        citations: i.citations,
      })),
      relatedCompanies,
      relatedRoadmaps,
      suggestedSearches,
      caveat: "本报告基于结构化论文元数据生成，用于方向探索、检索和对比，不代表最终方向排名或学术结论。",
    };
  },
};
