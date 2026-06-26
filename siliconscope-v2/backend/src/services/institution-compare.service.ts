import { db as metadataDb } from "../db/connection.js";
import { papers, qsRankings } from "../db/schema.js";
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

function candidateRowsByInstitution(name: string) {
  const variants = institutionIdentityService.variantsFor(name);
  const seen = new Map<number, typeof papers.$inferSelect>();
  for (const variant of variants) {
    const rows = metadataDb.select().from(papers)
      .where(sql`${papers.affiliations} LIKE ${`%${variant}%`} AND COALESCE(${papers.venueRank}, '') != 'Hidden'`)
      .all();
    for (const row of rows) seen.set(row.id, row);
  }
  return [...seen.values()];
}

function findQsRank(institutionName: string) {
  const canonical = institutionIdentityService.canonicalize(institutionName).canonicalName;
  const target = String(canonical || institutionName || "").trim().toLowerCase();
  const rows = metadataDb.select().from(qsRankings).all();
  for (const r of rows) {
    const names = [r.name, ...r.aliases.split(",")].map((s) => institutionIdentityService.canonicalize(s.trim()).canonicalName.toLowerCase());
    if (names.some((n) => n === target || target.includes(n) || n.includes(target))) {
      return { qsWorldRank: r.qsWorldRank, qsRegionRank: r.qsRegionRank, region: r.region };
    }
  }
  return null;
}

export const institutionCompareService = {
  compare(names: string[]) {
    const unique = [...new Set(names)].slice(0, 4);
    if (unique.length < 2) throw new Error("At least 2 institutions are required");

    const currentYear = new Date().getFullYear();

    const institutions = unique.map((name) => {
      const identity = institutionIdentityService.canonicalize(name);
      const rows = candidateRowsByInstitution(name)
        .filter((row) => institutionIdentityService.canonicalizeList(row.affiliations).some((inst) => inst.normalizedKey === identity.normalizedKey));

      const summary = summarizeRows(rows);
      const recentPapers = rows.filter((r) => Number(r.year) >= currentYear - 4).length;

      const authors = new Map<string, number>();
      for (const row of rows) {
        for (const author of splitList(row.authors)) {
          const a = authorIdentityService.canonicalize(author);
          if (a.canonicalName) authors.set(a.canonicalName, (authors.get(a.canonicalName) || 0) + 1);
        }
      }

      const activeAuthors = [...authors.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const representativePapers = rows
        .sort((a, b) => Number(b.year) - Number(a.year) || Number(b.qualityScore) - Number(a.qualityScore))
        .slice(0, 8)
        .map((row) => toPaperRow(row) as unknown as Record<string, any>);

      return {
        name: identity.canonicalName || name,
        requestedName: name,
        canonicalName: identity.canonicalName,
        country: identity.countryName || identity.countryCode || undefined,
        city: identity.city || undefined,
        totalPapers: summary.papers,
        recentPapers,
        avgScore: summary.avgScore,
        citations: summary.citations,
        yearlyTrend: summary.byYear,
        topFields: summary.byDomain,
        topVenues: summary.byVenue,
        venueRankDistribution: summary.byRank,
        activeAuthors,
        representativePapers,
        qs: findQsRank(identity.canonicalName || name),
        metadataConfidence: identity.confidence,
        normalizationCaveat: "Institution identity uses alias normalization and may still need ROR/OpenAlex/manual verification.",
      };
    });

    return {
      institutions,
      caveat: "This comparison is based on available publication metadata and institution name normalization. It is not a final ranking of academic strength.",
    };
  },
};
