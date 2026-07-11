import { db as metadataDb } from "../db/connection.js";
import { papers } from "../db/schema.js";
import { sql } from "drizzle-orm";
import { institutionIdentityService } from "./institution-identity.service.js";
import { authorIdentityService } from "./author-identity.service.js";
import { toPaperRow } from "./paper-row.js";

function splitList(value: string): string[] {
  return String(value || "").split(";").map((item) => item.trim()).filter(Boolean);
}

function isEliteRank(rank: string | null): boolean {
  return ["SSS", "SS+", "S+"].includes(String(rank || ""));
}

function summarizeRows(rows: Array<typeof papers.$inferSelect>) {
  const years = new Map<number, number>();
  const venues = new Map<string, number>();
  const domains = new Map<string, number>();
  const ranks = new Map<string, number>();
  let scoreSum = 0;
  let citations = 0;

  for (const row of rows) {
    years.set(Number(row.year), (years.get(Number(row.year)) || 0) + 1);
    venues.set(row.venue, (venues.get(row.venue) || 0) + 1);
    domains.set(row.domain, (domains.get(row.domain) || 0) + 1);
    scoreSum += Number(row.qualityScore || 0);
    citations += Number(row.citationCount || 0);
    const r = row.venueRank || "Other";
    if (isEliteRank(r)) ranks.set("S+", (ranks.get("S+") || 0) + 1);
    else if (r === "S") ranks.set("S", (ranks.get("S") || 0) + 1);
    else if (String(r || "").startsWith("A")) ranks.set("A", (ranks.get("A") || 0) + 1);
    else ranks.set("Other", (ranks.get("Other") || 0) + 1);
  }

  const sortedEntries = (map: Map<string | number, number>) =>
    [...map.entries()]
      .map(([key, count]) => ({ key: String(key), count }))
      .sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)));

  return {
    papers: rows.length,
    scoreSum: Math.round(scoreSum * 10) / 10,
    avgScore: Math.round((scoreSum / Math.max(1, rows.length)) * 10) / 10,
    citations,
    byYear: [...years.entries()].map(([year, count]) => ({ year: Number(year), count })).sort((a, b) => a.year - b.year),
    byVenue: sortedEntries(venues).slice(0, 10),
    byDomain: sortedEntries(domains).slice(0, 10),
    byRank: sortedEntries(ranks),
  };
}

function candidateRowsByAuthor(name: string) {
  const variants = authorIdentityService.variantsFor(name);
  const seen = new Map<number, typeof papers.$inferSelect>();
  for (const variant of variants) {
    const rows = metadataDb.select().from(papers)
      .where(sql`${papers.authors} LIKE ${`%${variant}%`} AND COALESCE(${papers.venueRank}, '') != 'Hidden'`)
      .all();
    for (const row of rows) seen.set(row.id, row);
  }
  return [...seen.values()];
}

export const authorCompareService = {
  compare(names: string[]) {
    const unique = [...new Set(names)].slice(0, 4);
    if (unique.length < 2) throw new Error("请至少输入 2 位作者再进行对比。");

    const currentYear = new Date().getFullYear();

    const authors = unique.map((name) => {
      const identity = authorIdentityService.canonicalize(name);
      const rows = candidateRowsByAuthor(name)
        .filter((row) => splitList(row.authors).some((author) => authorIdentityService.sameAuthor(author, name)));

      const summary = summarizeRows(rows);
      const recentPapers = rows.filter((r) => Number(r.year) >= currentYear - 4).length;

      const coauthors = new Map<string, number>();
      const institutions = new Map<string, number>();
      const rawAliases = new Set<string>();

      for (const row of rows) {
        for (const author of splitList(row.authors)) {
          const a = authorIdentityService.canonicalize(author);
          if (a.normalizedKey === identity.normalizedKey) rawAliases.add(author);
          else if (a.canonicalName) coauthors.set(a.canonicalName, (coauthors.get(a.canonicalName) || 0) + 1);
        }
        for (const institution of institutionIdentityService.canonicalizeList(row.affiliations)) {
          institutions.set(institution.canonicalName, (institutions.get(institution.canonicalName) || 0) + 1);
        }
      }

      const representativePapers = rows
        .sort((a, b) => Number(b.year) - Number(a.year) || Number(b.qualityScore) - Number(a.qualityScore))
        .slice(0, 8)
        .map((row) => toPaperRow(row) as unknown as Record<string, any>);

      return {
        name: identity.canonicalName || name,
        requestedName: name,
        canonicalName: identity.canonicalName,
        aliases: [...rawAliases].sort(),
        totalPapers: summary.papers,
        recentPapers,
        avgScore: summary.avgScore,
        citations: summary.citations,
        yearlyTrend: summary.byYear,
        topFields: summary.byDomain,
        topVenues: summary.byVenue,
        venueRankDistribution: summary.byRank,
        institutions: [...institutions.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
        coauthors: [...coauthors.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
        representativePapers,
        metadataConfidence: identity.confidence,
        normalizationCaveat: "作者身份经过别名归一，但仍可能需要 OpenAlex、ORCID 或人工合并/拆分复核。",
      };
    });

    return {
      authors,
      caveat: "作者对比基于论文元数据和姓名归一结果，只适合作为研究线索，不代表对学术水平或研究者质量的完整判断。",
    };
  },
};
