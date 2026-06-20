import { db } from "../db/connection.js";
import { papers } from "../db/schema.js";
import { sql } from "drizzle-orm";
import { institutionIdentityService } from "./institution-identity.service.js";
import { authorIdentityService } from "./author-identity.service.js";

function splitList(value: string): string[] {
  return String(value || "").split(";").map((item) => item.trim()).filter(Boolean);
}

function isEliteRank(rank: string | null): boolean {
  return ["SSS", "SS+", "S+"].includes(String(rank || ""));
}

function scoreAuthor(item: { scoreSum: number; sPlus: number; s: number; citations: number }): number {
  return Math.round((item.scoreSum + item.sPlus * 5 + item.s * 2 + item.citations / 50) * 10) / 10;
}

function isGenericInstitutionName(name: string): boolean {
  const value = String(name || "").trim().toLowerCase();
  if (!value) return true;
  return [
    "microelectronics",
    "integrated circuits",
    "semiconductor",
    "semiconductors",
    "electrical engineering",
    "electronic engineering",
    "department of electrical engineering",
    "department of electronic engineering",
    "school of microelectronics",
  ].includes(value);
}

function inferMentorCandidate(summary: {
  papers: number;
  sPlus: number;
  s?: number;
  citations?: number;
  scoreSum: number;
  years: Map<number, number>;
}) {
  const years = [...(summary.years || new Map()).keys()].filter((year) => Number(year) > 0);
  const firstYear = years.length ? Math.min(...years) : null;
  const lastYear = years.length ? Math.max(...years) : null;
  const careerSpan = firstYear && lastYear ? lastYear - firstYear + 1 : 0;
  const authorScore = scoreAuthor({
    scoreSum: summary.scoreSum,
    sPlus: summary.sPlus,
    s: summary.s ?? 0,
    citations: summary.citations ?? 0,
  });
  const likelyMentor =
    summary.papers >= 5 ||
    summary.sPlus >= 3 ||
    authorScore >= 550 ||
    (careerSpan >= 4 && summary.papers >= 3);
  const stage = likelyMentor
    ? summary.papers >= 20 || authorScore >= 2500
      ? "senior-or-leading-faculty"
      : "faculty-candidate"
    : "likely-student-or-collaborator";
  return { likelyMentor, stage, firstYear, lastYear, careerSpan, authorScore };
}

export const mentorService = {
  getInstitutionsWithMentors(params: Record<string, string>) {
    // Simplified version: return institutions with high paper counts
    const rows = db.select({
      authors: papers.authors,
      affiliations: papers.affiliations,
      venueRank: papers.venueRank,
      qualityScore: papers.qualityScore,
      citationCount: papers.citationCount,
    }).from(papers)
      .where(sql`${papers.affiliations} != '' AND COALESCE(${papers.venueRank}, '') != 'Hidden'`)
      .all();

    const byInstitution = new Map<string, {
      name: string;
      papers: number;
      scoreSum: number;
      citations: number;
      sPlus: number;
      s: number;
      a: number;
      authors: Set<string>;
      authorPapers: Map<string, number>;
    }>();

    for (const row of rows) {
      for (const rawName of splitList(row.affiliations)) {
        const inst = institutionIdentityService.canonicalize(rawName);
        const name = inst.canonicalName;
        if (isGenericInstitutionName(name)) continue;
        if (!name) continue;
        const item = byInstitution.get(inst.normalizedKey) || { name, papers: 0, scoreSum: 0, citations: 0, sPlus: 0, s: 0, a: 0, authors: new Set(), authorPapers: new Map() };
        item.papers += 1;
        item.scoreSum += Number(row.qualityScore || 0);
        item.citations += Number(row.citationCount || 0);
        for (const a of splitList(row.authors)) {
          const author = authorIdentityService.canonicalize(a);
          if (!author.normalizedKey || !author.canonicalName) continue;
          item.authors.add(author.canonicalName);
          item.authorPapers.set(author.normalizedKey, (item.authorPapers.get(author.normalizedKey) || 0) + 1);
        }
        if (isEliteRank(row.venueRank)) item.sPlus += 1;
        else if (row.venueRank === "S") item.s += 1;
        else if (String(row.venueRank || "").startsWith("A")) item.a += 1;
        byInstitution.set(inst.normalizedKey, item);
      }
    }

    return [...byInstitution.values()]
      .map((item) => ({
        name: item.name,
        papers: item.papers,
        authorCount: item.authors.size,
        mentorCount: Math.max(
          0,
          [...item.authorPapers.values()].filter((count) => count >= 5).length ||
            Math.min(item.authors.size, Math.max(1, Math.round(item.papers / 12)))
        ),
        institutionScore: scoreAuthor({ scoreSum: item.scoreSum, sPlus: item.sPlus, s: item.s, citations: item.citations }),
        avgScore: Math.round((item.scoreSum / Math.max(1, item.papers)) * 10) / 10,
        citations: item.citations,
        sPlus: item.sPlus,
        s: item.s,
        a: item.a,
      }))
      .filter((item) => item.papers >= 2 && !isGenericInstitutionName(item.name))
      .sort((a, b) => b.institutionScore - a.institutionScore || b.sPlus - a.sPlus || b.papers - a.papers);
  },

  getMentorsByInstitution(name: string, _params: Record<string, string>) {
    if (isGenericInstitutionName(name)) {
      return {
        institution: name,
        mentors: [],
        mentorCandidateCount: 0,
        excludedLikelyStudentCount: 0,
        domains: [],
      };
    }
    const targetIdentity = institutionIdentityService.canonicalize(name);
    const rows = db.select().from(papers)
      .where(sql`${papers.affiliations} LIKE ${`%${name}%`} AND COALESCE(${papers.venueRank}, '') != 'Hidden'`)
      .all()
      .filter((row) => institutionIdentityService.canonicalizeList(row.affiliations).some((inst) => inst.normalizedKey === targetIdentity.normalizedKey));

    const byAuthor = new Map<string, {
      name: string;
      papers: number;
      scoreSum: number;
      citations: number;
      sPlus: number;
      s: number;
      a: number;
      domains: Map<string, number>;
      years: Map<number, number>;
    }>();

    const domains = new Map<string, number>();

    for (const row of rows) {
      for (const rawName of splitList(row.authors)) {
        const authorIdentity = authorIdentityService.canonicalize(rawName);
        const authorName = authorIdentity.canonicalName;
        if (!authorIdentity.normalizedKey) continue;
        const item = byAuthor.get(authorIdentity.normalizedKey) || {
          name: authorName,
          papers: 0,
          scoreSum: 0,
          citations: 0,
          sPlus: 0,
          s: 0,
          a: 0,
          domains: new Map(),
          years: new Map(),
        };
        item.papers += 1;
        item.scoreSum += Number(row.qualityScore || 0);
        item.citations += Number(row.citationCount || 0);
        item.domains.set(String(row.domain || "General IC"), (item.domains.get(String(row.domain || "General IC")) || 0) + 1);
        item.years.set(Number(row.year || 0), (item.years.get(Number(row.year || 0)) || 0) + 1);
        if (isEliteRank(row.venueRank)) item.sPlus += 1;
        else if (row.venueRank === "S") item.s += 1;
        else if (String(row.venueRank || "").startsWith("A")) item.a += 1;
        byAuthor.set(authorIdentity.normalizedKey, item);
      }
      const d = String(row.domain || "General IC");
      domains.set(d, (domains.get(d) || 0) + 1);
    }

    const currentYear = new Date().getFullYear();
    const mentors = [...byAuthor.values()]
      .map((item) => {
        const recentCount = [...item.years.entries()]
          .filter(([year]) => year >= currentYear - 4)
          .reduce((sum, [, count]) => sum + count, 0);
        const previousCount = [...item.years.entries()]
          .filter(([year]) => year >= currentYear - 9 && year < currentYear - 4)
          .reduce((sum, [, count]) => sum + count, 0);
        const trendRatio = previousCount ? recentCount / previousCount : recentCount ? 2 : 0;
        const role = inferMentorCandidate({
          papers: item.papers,
          sPlus: item.sPlus,
          s: item.s,
          citations: item.citations,
          scoreSum: item.scoreSum,
          years: item.years,
        });
        return {
          name: item.name,
          papers: item.papers,
          citations: item.citations,
          sPlus: item.sPlus,
          s: item.s,
          a: item.a,
          avgScore: Math.round((item.scoreSum / Math.max(1, item.papers)) * 10) / 10,
          authorScore: scoreAuthor(item),
          topDomains: [...item.domains.entries()]
            .map(([key, count]) => ({ key, count }))
            .sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)))
            .slice(0, 3),
          yearlyActivity: [...item.years.entries()]
            .filter(([year]) => year > 0)
            .map(([year, count]) => ({ year, count }))
            .sort((a, b) => a.year - b.year),
          recentPapers: recentCount,
          trend: trendRatio >= 1.25 ? "rising" : trendRatio <= 0.75 ? "cooling" : "stable",
          roleStage: role.stage,
          likelyMentor: role.likelyMentor,
          firstYear: role.firstYear,
          lastYear: role.lastYear,
          careerSpan: role.careerSpan,
        };
      })
      .filter((item) => item.likelyMentor)
      .sort((a, b) => b.authorScore - a.authorScore || b.papers - a.papers);

    return {
      institution: name,
      mentors: mentors.slice(0, 100),
      mentorCandidateCount: mentors.length,
      excludedLikelyStudentCount: [...byAuthor.values()].length - mentors.length,
      domains: [...domains.entries()].map(([k, v]) => ({ key: k, count: v })).sort((a, b) => b.count - a.count),
    };
  },

  getMentorProfile(name: string, _params: Record<string, string>) {
    // Delegate to profile service for now
    const targetIdentity = authorIdentityService.canonicalize(name);
    const variants = authorIdentityService.variantsFor(name);
    const seen = new Map<number, typeof papers.$inferSelect>();
    for (const variant of variants) {
      const rowsForVariant = db.select().from(papers)
        .where(sql`${papers.authors} LIKE ${`%${variant}%`} AND COALESCE(${papers.venueRank}, '') != 'Hidden'`)
        .all();
      for (const row of rowsForVariant) seen.set(row.id, row);
    }
    const rows = [...seen.values()]
      .filter((row) => splitList(row.authors).some((author) => authorIdentityService.canonicalize(author).normalizedKey === targetIdentity.normalizedKey));

    const summary = {
      papers: rows.length,
      scoreSum: rows.reduce((sum, r) => sum + Number(r.qualityScore || 0), 0),
      sPlus: 0,
      s: 0,
      citations: rows.reduce((sum, r) => sum + Number(r.citationCount || 0), 0),
      years: new Map<number, number>(),
    };

    for (const row of rows) {
      summary.years.set(row.year, (summary.years.get(row.year) || 0) + 1);
      if (isEliteRank(row.venueRank)) summary.sPlus += 1;
      else if (row.venueRank === "S") summary.s++;
    }

    const authorScore = scoreAuthor({ scoreSum: summary.scoreSum, sPlus: summary.sPlus, s: summary.s, citations: summary.citations });
    const role = inferMentorCandidate({
      papers: summary.papers,
      sPlus: summary.sPlus,
      s: summary.s,
      citations: summary.citations,
      scoreSum: summary.scoreSum,
      years: summary.years,
    });

    return {
      name: targetIdentity.canonicalName || name,
      requestedName: name,
      paperCount: summary.papers,
      authorScore,
      roleStage: role.stage,
      likelyMentor: role.likelyMentor,
      firstYear: role.firstYear,
      lastYear: role.lastYear,
      careerSpan: role.careerSpan,
      papers: rows.slice(0, 250).map((row) => ({
        id: row.id,
        title: row.title,
        authors: row.authors,
        affiliations: row.affiliations,
        year: row.year,
        venue: row.venue,
        rank: row.venueRank,
        field: row.domain,
        score: row.qualityScore,
        doi: row.doi,
        citations: row.citationCount,
      })),
    };
  },
};
