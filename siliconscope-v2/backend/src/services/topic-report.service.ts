import { topicService } from "./topic.service.js";
import { learningRoadmaps } from "../data/learning-catalog.js";
import { db } from "../db/connection.js";
import { companies } from "../db/schema.js";
import { sql, like } from "drizzle-orm";
import { toPaperRow } from "./paper-row.js";

export const topicReportService = {
  getReport(field: string) {
    const target = String(field || "").trim();
    if (!target) throw new Error("Topic field is required");

    const detail = topicService.getTopicDetail(target);
    const currentYear = new Date().getFullYear();
    const recentPapers = detail.recentPapers?.length ?? 0;

    // Find related companies by domain matching
    const relatedCompanies = db
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
    const relatedRoadmaps = learningRoadmaps
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
      { label: `Latest ${target}`, params: { q: target, sort: "year", yearFrom: String(currentYear - 4) } },
      { label: `Top venues in ${target}`, params: { q: target, sort: "score", rank: "S+" } },
      { label: `Highly cited ${target}`, params: { q: target, sort: "citations", yearFrom: "2015" } },
      { label: `${target} review`, params: { q: `${target} review survey`, sort: "citations" } },
    ];

    return {
      field: target,
      overview: {
        totalPapers: detail.papers,
        recentPapers,
        yearRange: detail.byYear.length
          ? `${detail.byYear[0].year}–${detail.byYear[detail.byYear.length - 1].year}`
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
      caveat: "This report is based on structured publication metadata, not AI-generated analysis. It is intended for directional research exploration, not as a definitive topic ranking.",
    };
  },
};
