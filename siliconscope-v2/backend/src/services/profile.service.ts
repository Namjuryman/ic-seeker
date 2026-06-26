import { db as metadataDb } from "../db/connection.js";
import { papers, qsRankings } from "../db/schema.js";
import { sql } from "drizzle-orm";
import { institutionIdentityService } from "./institution-identity.service.js";
import { authorIdentityService } from "./author-identity.service.js";

function splitList(value: string): string[] {
  return String(value || "").split(";").map((item) => item.trim()).filter(Boolean);
}

function isEliteRank(rank: string | null): boolean {
  return ["SSS", "SS+", "S+"].includes(String(rank || ""));
}

function scoreAuthor(item: {
  scoreSum: number;
  sPlus: number;
  s: number;
  citations: number;
}): number {
  return Math.round((item.scoreSum + item.sPlus * 5 + item.s * 2 + item.citations / 50) * 10) / 10;
}

function findQsRank(institutionName: string) {
  const canonical = institutionIdentityService.canonicalize(institutionName).canonicalName;
  const target = String(canonical || institutionName || "").trim().toLowerCase();
  const rows = metadataDb.select().from(qsRankings).all();
  for (const r of rows) {
    const names = [r.name, ...r.aliases.split(",")].map((s) => institutionIdentityService.canonicalize(s.trim()).canonicalName.toLowerCase());
    if (names.some((n) => n === target || target.includes(n) || n.includes(target))) {
      return { qs_world_rank: r.qsWorldRank, qs_region_rank: r.qsRegionRank, region: r.region };
    }
  }
  return null;
}

type SummaryResult = {
  papers: number;
  scoreSum: number;
  avgScore: number;
  citations: number;
  ranks: { sPlus: number; s: number; a: number; other: number };
  byYear: Array<{ key: string; count: number }>;
  byVenue: Array<{ key: string; count: number }>;
  byDomain: Array<{ key: string; count: number }>;
};

function summarizePaperRows(rows: Array<typeof papers.$inferSelect>): SummaryResult {
  const years = new Map<string, number>();
  const venues = new Map<string, number>();
  const domains = new Map<string, number>();
  const ranks = { sPlus: 0, s: 0, a: 0, other: 0 };
  let scoreSum = 0;
  let citations = 0;

  for (const row of rows) {
    years.set(String(row.year), (years.get(String(row.year)) || 0) + 1);
    venues.set(row.venue, (venues.get(row.venue) || 0) + 1);
    domains.set(row.domain, (domains.get(row.domain) || 0) + 1);
    scoreSum += Number(row.qualityScore || 0);
    citations += Number(row.citationCount || 0);
    if (isEliteRank(row.venueRank)) ranks.sPlus += 1;
    else if (row.venueRank === "S") ranks.s += 1;
    else if (String(row.venueRank || "").startsWith("A")) ranks.a += 1;
    else ranks.other += 1;
  }

  const sortedEntries = (map: Map<string, number>) =>
    [...map.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)));

  return {
    papers: rows.length,
    scoreSum: Math.round(scoreSum * 10) / 10,
    avgScore: Math.round((scoreSum / Math.max(1, rows.length)) * 10) / 10,
    citations,
    ranks,
    byYear: sortedEntries(years).sort((a, b) => Number(a.key) - Number(b.key)),
    byVenue: sortedEntries(venues),
    byDomain: sortedEntries(domains),
  };
}

function paperListForProfile(rows: Array<typeof papers.$inferSelect>) {
  return rows
    .sort((a, b) => Number(b.year) - Number(a.year) || Number(b.qualityScore) - Number(a.qualityScore))
    .slice(0, 250)
    .map((row) => ({
      id: row.id,
      title: row.title,
      authors: row.authors,
      affiliations: institutionIdentityService.canonicalizeList(row.affiliations).map((item) => item.canonicalName).join("; ") || row.affiliations,
      year: row.year,
      venue: row.venue,
      rank: row.venueRank,
      field: row.domain,
      score: row.qualityScore,
      doi: row.doi,
      citations: row.citationCount,
    }));
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

export const profileService = {
  getProfessors(params: Record<string, string>) {
    const limit = Math.min(Number(params.limit || 80), 300);
    const minPapers = Number(params.minPapers || 2);

    const rows = metadataDb.select({
      authors: papers.authors,
      affiliations: papers.affiliations,
      venueRank: papers.venueRank,
      qualityScore: papers.qualityScore,
      citationCount: papers.citationCount,
    }).from(papers)
      .where(sql`${papers.authors} != '' AND COALESCE(${papers.venueRank}, '') != 'Hidden'`)
      .all();

    const byAuthor = new Map<string, {
      name: string;
      normalizedKey: string;
      aliases: Set<string>;
      papers: number;
      scoreSum: number;
      citations: number;
      sPlus: number;
      s: number;
      a: number;
    }>();

    for (const row of rows) {
      for (const rawName of splitList(row.authors)) {
        const identity = authorIdentityService.canonicalize(rawName);
        if (!identity.normalizedKey) continue;
        const item = byAuthor.get(identity.normalizedKey) || { name: identity.canonicalName, normalizedKey: identity.normalizedKey, aliases: new Set(), papers: 0, scoreSum: 0, citations: 0, sPlus: 0, s: 0, a: 0 };
        item.aliases.add(rawName);
        item.papers += 1;
        item.scoreSum += Number(row.qualityScore || 0);
        item.citations += Number(row.citationCount || 0);
        if (isEliteRank(row.venueRank)) item.sPlus += 1;
        else if (row.venueRank === "S") item.s += 1;
        else if (String(row.venueRank || "").startsWith("A")) item.a += 1;
        byAuthor.set(identity.normalizedKey, item);
      }
    }

    return [...byAuthor.values()]
      .map((item) => ({
        ...item,
        aliases: [...item.aliases].slice(0, 8),
        avgScore: Math.round((item.scoreSum / Math.max(1, item.papers)) * 10) / 10,
        authorScore: scoreAuthor(item),
        identityConfidence: 0.55,
      }))
      .filter((item) => item.papers >= minPapers)
      .sort((a, b) => b.authorScore - a.authorScore || b.papers - a.papers)
      .slice(0, limit);
  },

  getAuthorProfile(name: string) {
    const requestedIdentity = authorIdentityService.canonicalize(name);
    const rows = candidateRowsByAuthor(name)
      .filter((row) => splitList(row.authors).some((author) => authorIdentityService.sameAuthor(author, name)));

    const summary = summarizePaperRows(rows);
    const coauthors = new Map<string, number>();
    const institutions = new Map<string, number>();
    const rawAliases = new Set<string>();

    for (const row of rows) {
      for (const author of splitList(row.authors)) {
        const identity = authorIdentityService.canonicalize(author);
        if (identity.normalizedKey === requestedIdentity.normalizedKey) rawAliases.add(author);
        else if (identity.canonicalName) coauthors.set(identity.canonicalName, (coauthors.get(identity.canonicalName) || 0) + 1);
      }
      for (const institution of institutionIdentityService.canonicalizeList(row.affiliations)) {
        institutions.set(institution.canonicalName, (institutions.get(institution.canonicalName) || 0) + 1);
      }
    }

    const primaryInstitution = [...institutions.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    const authorScore = scoreAuthor({
      scoreSum: summary.scoreSum,
      sPlus: summary.ranks.sPlus,
      s: summary.ranks.s,
      citations: summary.citations,
    });

    return {
      name: requestedIdentity.canonicalName || name,
      requestedName: name,
      paperCount: summary.papers,
      authorScore,
      identity: {
        canonicalName: requestedIdentity.canonicalName || name,
        normalizedKey: requestedIdentity.normalizedKey,
        aliases: [...rawAliases].sort(),
        confidence: requestedIdentity.confidence,
        caveat: "Author identity is normalized and may still need OpenAlex/ORCID/manual merge-split verification.",
      },
      ...summary,
      coauthors: [...coauthors.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 40),
      institutions: [...institutions.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      primaryInstitution,
      qs: findQsRank(primaryInstitution),
      external: {
        googleScholar: `https://scholar.google.com/scholar?q=${encodeURIComponent(name)}`,
        webSearch: `https://www.google.com/search?q=${encodeURIComponent(`${name} professor integrated circuits`)}`,
      },
      papers: paperListForProfile(rows),
    };
  },

  getInstitutions(params: Record<string, string>) {
    const limit = Math.min(Number(params.limit || 80), 300);
    const minPapers = Number(params.minPapers || 2);

    const rows = metadataDb.select({
      affiliations: papers.affiliations,
      venueRank: papers.venueRank,
      qualityScore: papers.qualityScore,
      citationCount: papers.citationCount,
    }).from(papers)
      .where(sql`${papers.affiliations} != '' AND COALESCE(${papers.venueRank}, '') != 'Hidden'`)
      .all();

    const byInstitution = new Map<string, {
      name: string;
      normalizedKey: string;
      aliases: Set<string>;
      papers: number;
      scoreSum: number;
      citations: number;
      sPlus: number;
      s: number;
      a: number;
      identityConfidence: number;
    }>();

    for (const row of rows) {
      for (const rawName of splitList(row.affiliations)) {
        const identity = institutionIdentityService.canonicalize(rawName);
        if (!identity.normalizedKey) continue;
        const item = byInstitution.get(identity.normalizedKey) || { name: identity.canonicalName, normalizedKey: identity.normalizedKey, aliases: new Set(), papers: 0, scoreSum: 0, citations: 0, sPlus: 0, s: 0, a: 0, identityConfidence: identity.confidence };
        item.aliases.add(rawName);
        item.identityConfidence = Math.max(item.identityConfidence, identity.confidence);
        item.papers += 1;
        item.scoreSum += Number(row.qualityScore || 0);
        item.citations += Number(row.citationCount || 0);
        if (isEliteRank(row.venueRank)) item.sPlus += 1;
        else if (row.venueRank === "S") item.s += 1;
        else if (String(row.venueRank || "").startsWith("A")) item.a += 1;
        byInstitution.set(identity.normalizedKey, item);
      }
    }

    return [...byInstitution.values()]
      .map((item) => ({
        ...item,
        aliases: [...item.aliases].slice(0, 8),
        avgScore: Math.round((item.scoreSum / Math.max(1, item.papers)) * 10) / 10,
        institutionScore: scoreAuthor(item),
      }))
      .filter((item) => item.papers >= minPapers)
      .sort((a, b) => b.institutionScore - a.institutionScore || b.papers - a.papers)
      .slice(0, limit);
  },

  getInstitutionProfile(name: string) {
    const requestedIdentity = institutionIdentityService.canonicalize(name);
    const rows = candidateRowsByInstitution(name)
      .filter((row) => institutionIdentityService.canonicalizeList(row.affiliations).some((institution) => institution.normalizedKey === requestedIdentity.normalizedKey));

    const authors = new Map<string, number>();
    const rawAliases = new Set<string>();
    for (const row of rows) {
      for (const author of splitList(row.authors)) {
        const identity = authorIdentityService.canonicalize(author);
        if (identity.canonicalName) authors.set(identity.canonicalName, (authors.get(identity.canonicalName) || 0) + 1);
      }
      for (const institution of splitList(row.affiliations)) {
        const identity = institutionIdentityService.canonicalize(institution);
        if (identity.normalizedKey === requestedIdentity.normalizedKey) rawAliases.add(institution);
      }
    }

    const summary = summarizePaperRows(rows);
    return {
      name: requestedIdentity.canonicalName || name,
      requestedName: name,
      paperCount: summary.papers,
      institutionScore: scoreAuthor({
        scoreSum: summary.scoreSum,
        sPlus: summary.ranks.sPlus,
        s: summary.ranks.s,
        citations: summary.citations,
      }),
      identity: {
        canonicalName: requestedIdentity.canonicalName || name,
        normalizedKey: requestedIdentity.normalizedKey,
        aliases: [...rawAliases].sort(),
        confidence: requestedIdentity.confidence,
        countryCode: requestedIdentity.countryCode,
        countryName: requestedIdentity.countryName,
        city: requestedIdentity.city,
        caveat: "Institution identity uses alias normalization and may still need ROR/OpenAlex/manual verification.",
      },
      ...summary,
      authors: [...authors.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50),
      papers: paperListForProfile(rows),
      qs: findQsRank(requestedIdentity.canonicalName || name),
    };
  },
};
