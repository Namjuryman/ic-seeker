import { db as metadataDb } from "../db/connection.js";
import { appSqlite } from "../db/app-db.js";
import { papers } from "../db/schema.js";
import { sql } from "drizzle-orm";
import { institutionIdentityService } from "./institution-identity.service.js";
import { authorIdentityService } from "./author-identity.service.js";
import { authorProfileService } from "./author-profile.service.js";

function splitList(value: string): string[] {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);?/gi, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_match, code) => String.fromCodePoint(parseInt(code, 10)))
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isEliteRank(rank: string | null): boolean {
  return ["SSS", "SS+", "S+"].includes(String(rank || ""));
}

function scoreAuthor(item: { scoreSum: number; sPlus: number; s: number; citations: number }): number {
  return Math.round((item.scoreSum + item.sPlus * 5 + item.s * 2 + item.citations / 50) * 10) / 10;
}

function isSeniorAuthorPosition(index: number, total: number): boolean {
  if (total <= 1) return true;
  if (index === total - 1) return true;
  return total >= 5 && index === total - 2;
}

function authorParts(name: string) {
  const tokens = String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length < 2) return null;
  return {
    last: tokens[tokens.length - 1],
    given: tokens.slice(0, -1),
    initials: tokens.slice(0, -1).map((token) => token[0]).join(""),
    tokenCount: tokens.length,
  };
}

function compatibleAuthorVariant(a: string, b: string): boolean {
  if (authorIdentityService.sameAuthor(a, b)) return true;
  const left = authorParts(a);
  const right = authorParts(b);
  if (!left || !right || left.last !== right.last || !left.initials || !right.initials) return false;
  const hasExplicitInitial = [...left.given, ...right.given].some((token) => token.length === 1);
  if (hasExplicitInitial) {
    return left.initials === right.initials || left.initials.startsWith(right.initials) || right.initials.startsWith(left.initials);
  }
  return left.given[0] === right.given[0] && left.given.length !== right.given.length;
}

function authorVariantBucket(name: string): string {
  const parts = authorParts(name);
  if (!parts || !parts.initials) return "";
  return `${parts.last}:${parts.initials[0]}`;
}

function betterDisplayName(current: string, candidate: string) {
  const currentParts = authorParts(current);
  const candidateParts = authorParts(candidate);
  if (!currentParts) return candidate;
  if (!candidateParts) return current;
  if (candidateParts.tokenCount > currentParts.tokenCount) return candidate;
  return current;
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

type RosterVerificationRow = {
  authorName: string;
  normalizedAuthor: string;
  status: string;
  roleTitle: string | null;
  evidenceUrl: string | null;
  confidence: number;
  verifiedAt: string | null;
};

type CompanyIdentity = {
  id: string;
  name: string;
  variants: string[];
};

const BUILTIN_COMPANY_IDENTITIES: CompanyIdentity[] = [
  { id: "builtin-ibm", name: "IBM", variants: ["IBM", "IBM Research", "IBM United States", "IBM Research Thomas J Watson Research", "IBM T. J. Watson Research Center", "IBM Zurich Research Laboratory"] },
  { id: "builtin-imec", name: "imec", variants: ["imec", "Interuniversity Microelectronics Centre", "IMEC Belgium"] },
  { id: "builtin-cea-leti", name: "CEA-Leti", variants: ["CEA", "CEA-Leti", "Leti", "Laboratoire D Electronique Des Technologies De L Information", "Commissariat A L Energie Atomique Et Aux Energies Alternatives", "Cea Grenoble"] },
  { id: "builtin-stmicroelectronics", name: "STMicroelectronics", variants: ["STMicroelectronics France", "STMicroelectronics Italy", "STMicroelectronics", "ST"] },
  { id: "builtin-infineon", name: "Infineon Technologies", variants: ["Infineon Technologies Austria", "Infineon Technologies Germany", "Infineon Technologies", "Infineon"] },
  { id: "builtin-nxp", name: "NXP Semiconductors", variants: ["Nxp Netherlands", "NXP", "NXP Semiconductors"] },
  { id: "builtin-sk", name: "SK hynix", variants: ["Sk Group South Korea", "SK hynix", "Hynix"] },
  { id: "builtin-toshiba", name: "Toshiba", variants: ["Toshiba Japan", "Toshiba", "Toshiba Memory"] },
  { id: "builtin-hitachi", name: "Hitachi", variants: ["Hitachi Japan", "Hitachi"] },
  { id: "builtin-renesas", name: "Renesas Electronics", variants: ["Renesas Electronics Japan", "Renesas", "Renesas Electronics"] },
  { id: "builtin-mediatek", name: "MediaTek", variants: ["Mediatek Taiwan", "MediaTek", "MTK"] },
];

function parseJsonList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function companyIdentities(): CompanyIdentity[] {
  try {
    const rows = appSqlite.prepare(`
      SELECT id, name, legal_name AS legalName, aliases_json AS aliasesJson, country
      FROM companies
    `).all() as Array<{ id: string; name: string; legalName: string | null; aliasesJson: string | null; country: string | null }>;
    return [...BUILTIN_COMPANY_IDENTITIES, ...rows.map((row) => ({
      id: row.id,
      name: row.name,
      variants: [...new Set([
        row.name,
        row.legalName || "",
        ...parseJsonList(row.aliasesJson),
        row.country ? `${row.name} ${row.country}` : "",
        row.country && row.legalName ? `${row.legalName} ${row.country}` : "",
        ...parseJsonList(row.aliasesJson).map((alias) => row.country ? `${alias} ${row.country}` : ""),
      ].map((item) => String(item || "").trim()).filter(Boolean))],
    }))];
  } catch {
    return BUILTIN_COMPANY_IDENTITIES;
  }
}

function companyIdentityForInstitution(name: string): CompanyIdentity | null {
  const target = institutionIdentityService.normalizeKey(name);
  if (!target) return null;
  for (const company of companyIdentities()) {
    const normalizedVariants = company.variants.map((variant) => institutionIdentityService.normalizeKey(variant)).filter(Boolean);
    if (normalizedVariants.includes(target)) return company;
    if (normalizedVariants.some((variant) => target === `${variant} united states` || target === `${variant} taiwan` || target === `${variant} china` || target === `${variant} japan` || target === `${variant} south korea` || target === `${variant} netherlands` || target === `${variant} france` || target === `${variant} italy` || target === `${variant} germany` || target === `${variant} austria`)) {
      return company;
    }
  }
  return null;
}

function companyAffiliationMatches(rawAffiliations: string, company: CompanyIdentity) {
  const value = String(rawAffiliations || "");
  const lower = value.toLowerCase();
  return company.variants.some((variant) => {
    const raw = String(variant || "").trim();
    const normalized = raw.toLowerCase();
    if (normalized.length < 2) return false;
    if (normalized.length <= 3) {
      return new RegExp(`(^|[^a-z0-9])${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(value);
    }
    return lower.includes(normalized);
  });
}

function rosterVerifications(normalizedInstitution: string): Map<string, RosterVerificationRow> {
  try {
    const rows = appSqlite.prepare(`
      SELECT
        author_name AS authorName,
        normalized_author AS normalizedAuthor,
        status,
        role_title AS roleTitle,
        evidence_url AS evidenceUrl,
        confidence,
        verified_at AS verifiedAt
      FROM mentor_roster_verifications
      WHERE normalized_institution = ?
    `).all(normalizedInstitution) as RosterVerificationRow[];
    return new Map(rows.map((row) => [row.normalizedAuthor, row]));
  } catch {
    return new Map();
  }
}

function findRosterVerification(
  rosterMap: Map<string, RosterVerificationRow>,
  authorName: string,
  normalizedKey: string
): RosterVerificationRow | null {
  const canonicalKey = authorIdentityService.canonicalize(authorName).normalizedKey;
  for (const key of [canonicalKey, normalizedKey]) {
    const direct = key ? rosterMap.get(key) : null;
    if (direct) return direct;
  }
  for (const row of rosterMap.values()) {
    if (
      authorIdentityService.sameAuthor(row.authorName, authorName) ||
      authorIdentityService.sameAuthor(row.normalizedAuthor, normalizedKey) ||
      compatibleAuthorVariant(row.authorName, authorName)
    ) {
      return row;
    }
  }
  return null;
}

function verifiedRosterCounts(): Map<string, number> {
  try {
    const rows = appSqlite.prepare(`
      SELECT normalized_institution AS normalizedInstitution, author_name AS authorName
      FROM mentor_roster_verifications
      WHERE status = 'verified_current'
    `).all() as Array<{ normalizedInstitution: string; authorName: string }>;
    const namesByInstitution = new Map<string, string[]>();
    for (const row of rows) {
      const names = namesByInstitution.get(row.normalizedInstitution) || [];
      if (!names.some((name) => compatibleAuthorVariant(name, row.authorName))) {
        names.push(row.authorName);
      }
      namesByInstitution.set(row.normalizedInstitution, names);
    }
    return new Map([...namesByInstitution.entries()].map(([key, names]) => [key, names.length]));
  } catch {
    return new Map();
  }
}

function inferMentorCandidate(summary: {
  papers: number;
  sPlus: number;
  s?: number;
  citations?: number;
  scoreSum: number;
  years: Map<number, number>;
  seniorAuthorPapers?: number;
  firstAuthorPapers?: number;
  recentPapers?: number;
  recentSeniorAuthorPapers?: number;
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
  const seniorAuthorPapers = summary.seniorAuthorPapers ?? 0;
  const firstAuthorPapers = summary.firstAuthorPapers ?? 0;
  const recentPapers = summary.recentPapers ?? 0;
  const recentSeniorAuthorPapers = summary.recentSeniorAuthorPapers ?? 0;
  const firstAuthorShare = summary.papers ? firstAuthorPapers / summary.papers : 0;
  const seniorAuthorShare = summary.papers ? seniorAuthorPapers / summary.papers : 0;
  const currentYear = new Date().getFullYear();
  const currentInstitutionSignal = Boolean(
    lastYear &&
    (
      (lastYear >= currentYear - 2 && recentSeniorAuthorPapers >= 1) ||
      (lastYear >= currentYear - 3 && recentSeniorAuthorPapers >= 3)
    )
  );
  const studentLike = careerSpan <= 6 && summary.papers <= 12 && firstAuthorShare >= 0.45 && seniorAuthorPapers < 2;
  const seniorEnough =
    (seniorAuthorPapers >= 2 && recentSeniorAuthorPapers >= 2) ||
    (summary.sPlus >= 3 && seniorAuthorPapers >= 2 && recentSeniorAuthorPapers >= 1) ||
    (authorScore >= 2500 && seniorAuthorPapers >= 2 && recentSeniorAuthorPapers >= 1);
  const historicalSenior = !currentInstitutionSignal && (seniorAuthorPapers >= 3 || summary.papers >= 20 || authorScore >= 2500);
  const likelyMentor = currentInstitutionSignal && seniorEnough && !studentLike;
  const stage = likelyMentor
    ? summary.papers >= 20 || authorScore >= 2500 || seniorAuthorPapers >= 8
      ? "current-leading-faculty-candidate"
      : "current-faculty-candidate"
    : historicalSenior
      ? "historical-or-stale-senior-author"
    : "likely-student-or-collaborator";
  const mentorConfidence = likelyMentor
    ? Math.min(0.95, Math.round((0.45 + Math.min(0.3, seniorAuthorPapers / 20) + Math.min(0.15, recentSeniorAuthorPapers / 10) + Math.min(0.05, seniorAuthorShare / 2)) * 100) / 100)
    : historicalSenior
      ? 0.35
      : Math.max(0.1, Math.round((0.25 - Math.min(0.15, firstAuthorShare / 4)) * 100) / 100);
  return { likelyMentor, stage, firstYear, lastYear, careerSpan, authorScore, mentorConfidence, historicalSenior, studentLike };
}

type MentorInstitutionSummary = {
  name: string;
  papers: number;
  authorCount: number;
  mentorCount: number;
  mentorCountSource: string;
  institutionScore: number;
  avgScore: number;
  citations: number;
  sPlus: number;
  s: number;
  a: number;
};

let materializedSummaryTableReady = false;
let sourceSignatureCache: { value: string; expiresAt: number } | null = null;

function ensureMaterializedSummaryTable() {
  if (materializedSummaryTableReady) return;
  appSqlite.exec(`
    CREATE TABLE IF NOT EXISTS mentor_institution_summaries (
      normalized_institution TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      papers INTEGER NOT NULL DEFAULT 0,
      author_count INTEGER NOT NULL DEFAULT 0,
      mentor_count INTEGER NOT NULL DEFAULT 0,
      mentor_count_source TEXT NOT NULL DEFAULT 'publication-heuristic',
      institution_score REAL NOT NULL DEFAULT 0,
      avg_score REAL NOT NULL DEFAULT 0,
      citations INTEGER NOT NULL DEFAULT 0,
      s_plus INTEGER NOT NULL DEFAULT 0,
      s INTEGER NOT NULL DEFAULT 0,
      a INTEGER NOT NULL DEFAULT 0,
      source_signature TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_mentor_institution_summaries_score
      ON mentor_institution_summaries(institution_score DESC, s_plus DESC, papers DESC);

    CREATE INDEX IF NOT EXISTS idx_mentor_institution_summaries_name
      ON mentor_institution_summaries(name);
  `);
  materializedSummaryTableReady = true;
}

function mentorInstitutionSourceSignature() {
  const now = Date.now();
  if (sourceSignatureCache && sourceSignatureCache.expiresAt > now) return sourceSignatureCache.value;
  const row = appSqlite.prepare(`
    SELECT
      COUNT(*) AS count,
      COALESCE(MAX(id), 0) AS maxId,
      COALESCE(MAX(last_metadata_audit_at), '') AS maxAudit
    FROM papers
    WHERE affiliations != '' AND COALESCE(venue_rank, '') != 'Hidden'
  `).get() as { count: number; maxId: number; maxAudit: string };
  const roster = appSqlite.prepare(`
    SELECT
      COUNT(*) AS count,
      COALESCE(MAX(updated_at), '') AS maxUpdatedAt
    FROM mentor_roster_verifications
  `).get() as { count: number; maxUpdatedAt: string };
  const value = `${row.count}:${row.maxId}:${row.maxAudit || ""}:${roster.count}:${roster.maxUpdatedAt || ""}`;
  sourceSignatureCache = { value, expiresAt: now + 30_000 };
  return value;
}

function readMaterializedSummaries(params: Record<string, string>) {
  if (params.refresh === "1") return null;
  ensureMaterializedSummaryTable();
  const signature = mentorInstitutionSourceSignature();
  const status = appSqlite.prepare(`
    SELECT COUNT(*) AS count, MIN(source_signature) AS minSignature, MAX(source_signature) AS maxSignature
    FROM mentor_institution_summaries
  `).get() as { count: number; minSignature: string | null; maxSignature: string | null };
  if (!status.count || status.minSignature !== signature || status.maxSignature !== signature) return null;

  const limit = Math.max(0, Math.min(1000, Number(params.limit || 0) || 0));
  const q = String(params.q || "").trim().toLowerCase();
  const rows = appSqlite.prepare(`
    SELECT
      name,
      papers,
      author_count AS authorCount,
      mentor_count AS mentorCount,
      mentor_count_source AS mentorCountSource,
      institution_score AS institutionScore,
      avg_score AS avgScore,
      citations,
      s_plus AS sPlus,
      s,
      a
    FROM mentor_institution_summaries
    WHERE (? = '' OR LOWER(name) LIKE ?)
    ORDER BY institution_score DESC, s_plus DESC, papers DESC
    ${limit ? "LIMIT ?" : ""}
  `);
  const like = `%${q}%`;
  return (limit ? rows.all(q, like, limit) : rows.all(q, like)) as MentorInstitutionSummary[];
}

function writeMaterializedSummaries(rows: MentorInstitutionSummary[]) {
  ensureMaterializedSummaryTable();
  const signature = mentorInstitutionSourceSignature();
  const insert = appSqlite.prepare(`
    INSERT INTO mentor_institution_summaries (
      normalized_institution,
      name,
      papers,
      author_count,
      mentor_count,
      mentor_count_source,
      institution_score,
      avg_score,
      citations,
      s_plus,
      s,
      a,
      source_signature,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  const refresh = appSqlite.transaction((items: MentorInstitutionSummary[]) => {
    appSqlite.prepare(`DELETE FROM mentor_institution_summaries`).run();
    for (const item of items) {
      const normalizedInstitution = institutionIdentityService.canonicalize(item.name).normalizedKey;
      if (!normalizedInstitution) continue;
      insert.run(
        normalizedInstitution,
        item.name,
        item.papers,
        item.authorCount,
        item.mentorCount,
        item.mentorCountSource,
        item.institutionScore,
        item.avgScore,
        item.citations,
        item.sPlus,
        item.s,
        item.a,
        signature,
      );
    }
  });
  refresh(rows);
}

function rowsByAuthorName(name: string) {
  const variants = authorIdentityService.searchTermsFor(name);
  const seen = new Map<number, typeof papers.$inferSelect>();
  for (const variant of variants) {
    const rowsForVariant = metadataDb.select().from(papers)
      .where(sql`${papers.authors} LIKE ${`%${variant}%`} AND COALESCE(${papers.venueRank}, '') != 'Hidden'`)
      .all();
    for (const row of rowsForVariant) seen.set(row.id, row);
  }
  return [...seen.values()]
    .filter((row) => splitList(row.authors).some((author) => authorIdentityService.sameAuthor(author, name)));
}

function summarizeAuthorRowsForMentor(name: string, rows: Array<typeof papers.$inferSelect>) {
  const currentYear = new Date().getFullYear();
  const stats = {
    papers: rows.length,
    scoreSum: 0,
    citations: 0,
    sPlus: 0,
    s: 0,
    a: 0,
    domains: new Map<string, number>(),
    years: new Map<number, number>(),
    firstAuthorPapers: 0,
    seniorAuthorPapers: 0,
    recentSeniorAuthorPapers: 0,
  };

  for (const row of rows) {
    stats.scoreSum += Number(row.qualityScore || 0);
    stats.citations += Number(row.citationCount || 0);
    stats.domains.set(String(row.domain || "General IC"), (stats.domains.get(String(row.domain || "General IC")) || 0) + 1);
    stats.years.set(Number(row.year || 0), (stats.years.get(Number(row.year || 0)) || 0) + 1);
    if (isEliteRank(row.venueRank)) stats.sPlus += 1;
    else if (row.venueRank === "S") stats.s += 1;
    else if (String(row.venueRank || "").startsWith("A")) stats.a += 1;

    const rowAuthors = splitList(row.authors);
    const authorIndex = rowAuthors.findIndex((author) => authorIdentityService.sameAuthor(author, name));
    if (authorIndex === 0) stats.firstAuthorPapers += 1;
    if (authorIndex >= 0 && isSeniorAuthorPosition(authorIndex, rowAuthors.length)) {
      stats.seniorAuthorPapers += 1;
      if (Number(row.year || 0) >= currentYear - 4) stats.recentSeniorAuthorPapers += 1;
    }
  }

  return stats;
}

function buildRosterOnlyMentor(row: RosterVerificationRow) {
  const paperRows = rowsByAuthorName(row.authorName);
  const stats = summarizeAuthorRowsForMentor(row.authorName, paperRows);
  const currentYear = new Date().getFullYear();
  const recentCount = [...stats.years.entries()]
    .filter(([year]) => year >= currentYear - 4)
    .reduce((sum, [, count]) => sum + count, 0);
  const previousCount = [...stats.years.entries()]
    .filter(([year]) => year >= currentYear - 9 && year < currentYear - 4)
    .reduce((sum, [, count]) => sum + count, 0);
  const trendRatio = previousCount ? recentCount / previousCount : recentCount ? 2 : 0;
  const role = inferMentorCandidate({
    papers: stats.papers,
    sPlus: stats.sPlus,
    s: stats.s,
    citations: stats.citations,
    scoreSum: stats.scoreSum,
    years: stats.years,
    seniorAuthorPapers: stats.seniorAuthorPapers,
    firstAuthorPapers: stats.firstAuthorPapers,
    recentPapers: recentCount,
    recentSeniorAuthorPapers: stats.recentSeniorAuthorPapers,
  });

  return {
    name: row.authorName,
    normalizedKey: row.normalizedAuthor || authorIdentityService.canonicalize(row.authorName).normalizedKey,
    papers: stats.papers,
    citations: stats.citations,
    sPlus: stats.sPlus,
    s: stats.s,
    a: stats.a,
    avgScore: Math.round((stats.scoreSum / Math.max(1, stats.papers)) * 10) / 10,
    authorScore: scoreAuthor(stats),
    topDomains: [...stats.domains.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)))
      .slice(0, 3),
    yearlyActivity: [...stats.years.entries()]
      .filter(([year]) => year > 0)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year),
    recentPapers: recentCount,
    trend: trendRatio >= 1.25 ? "rising" : trendRatio <= 0.75 ? "cooling" : "stable",
    roleStage: "verified-current-faculty",
    likelyMentor: true,
    mentorConfidence: Number(row.confidence || 95) / 100,
    rosterVerification: row,
    seniorAuthorPapers: stats.seniorAuthorPapers,
    firstAuthorPapers: stats.firstAuthorPapers,
    recentSeniorAuthorPapers: stats.recentSeniorAuthorPapers,
    firstYear: role.firstYear,
    lastYear: role.lastYear,
    careerSpan: role.careerSpan,
  };
}

export const mentorService = {
  getInstitutionsWithMentors(params: Record<string, string>) {
    const materialized = readMaterializedSummaries(params);
    if (materialized) return materialized;

    // Simplified version: return institutions with high paper counts
    const rows = metadataDb.select({
      authors: papers.authors,
      affiliations: papers.affiliations,
      venueRank: papers.venueRank,
      qualityScore: papers.qualityScore,
      citationCount: papers.citationCount,
      year: papers.year,
    }).from(papers)
      .where(sql`${papers.affiliations} != '' AND COALESCE(${papers.venueRank}, '') != 'Hidden'`)
      .all();

    const currentYear = new Date().getFullYear();

    const byInstitution = new Map<string, {
      name: string;
      papers: number;
      scoreSum: number;
      citations: number;
      sPlus: number;
      s: number;
      a: number;
      authorPapers: Map<string, number>;
      authorSeniorPapers: Map<string, number>;
      authorRecentPapers: Map<string, number>;
      authorRecentSeniorPapers: Map<string, number>;
    }>();

    for (const row of rows) {
      const rowAuthors = splitList(row.authors);
      const rowAuthorIdentities = rowAuthors
        .map((rawAuthor, index) => {
          const author = authorIdentityService.canonicalize(rawAuthor);
          if (!author.normalizedKey || !author.canonicalName) return null;
          return {
            index,
            author,
            bucket: authorVariantBucket(author.canonicalName),
            isSenior: isSeniorAuthorPosition(index, rowAuthors.length),
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
      const isRecentPaper = Number(row.year || 0) >= currentYear - 4;
      const isRecentSeniorPaper = Number(row.year || 0) >= currentYear - 3;

      for (const rawName of splitList(row.affiliations)) {
        const inst = institutionIdentityService.canonicalize(rawName);
        const name = inst.canonicalName;
        if (isGenericInstitutionName(name)) continue;
        if (!name) continue;
        const item = byInstitution.get(inst.normalizedKey) || {
          name,
          papers: 0,
          scoreSum: 0,
          citations: 0,
          sPlus: 0,
          s: 0,
          a: 0,
          authorPapers: new Map(),
          authorSeniorPapers: new Map(),
          authorRecentPapers: new Map(),
          authorRecentSeniorPapers: new Map(),
        };
        item.papers += 1;
        item.scoreSum += Number(row.qualityScore || 0);
        item.citations += Number(row.citationCount || 0);
        for (const rowAuthor of rowAuthorIdentities) {
          const author = rowAuthor.author;
          const authorKey = author.normalizedKey;
          item.authorPapers.set(authorKey, (item.authorPapers.get(authorKey) || 0) + 1);
          if (rowAuthor.isSenior) {
            item.authorSeniorPapers.set(authorKey, (item.authorSeniorPapers.get(authorKey) || 0) + 1);
            if (isRecentSeniorPaper) {
              item.authorRecentSeniorPapers.set(authorKey, (item.authorRecentSeniorPapers.get(authorKey) || 0) + 1);
            }
          }
          if (isRecentPaper) {
            item.authorRecentPapers.set(authorKey, (item.authorRecentPapers.get(authorKey) || 0) + 1);
          }
        }
        if (isEliteRank(row.venueRank)) item.sPlus += 1;
        else if (row.venueRank === "S") item.s += 1;
        else if (String(row.venueRank || "").startsWith("A")) item.a += 1;
        byInstitution.set(inst.normalizedKey, item);
      }
    }

    const verifiedCounts = verifiedRosterCounts();

    const q = String(params.q || "").trim().toLowerCase();
    const limit = Math.max(0, Math.min(1000, Number(params.limit || 0) || 0));
    const result = [...byInstitution.values()]
      .map((item) => {
        const companyIdentity = companyIdentityForInstitution(item.name);
        const normalizedInstitution = institutionIdentityService.canonicalize(item.name).normalizedKey;
        return {
          name: item.name,
          papers: item.papers,
          authorCount: item.authorPapers.size,
          mentorCount: verifiedCounts.get(normalizedInstitution) ?? [...item.authorPapers.entries()].filter(([key, count]) => {
          const seniorCount = item.authorSeniorPapers.get(key) || 0;
          const recentSeniorCount = item.authorRecentSeniorPapers.get(key) || 0;
            return companyIdentity
              ? (count >= 3 || seniorCount >= 1 || (item.authorRecentPapers.get(key) || 0) >= 2)
              : seniorCount >= 2 && recentSeniorCount >= 2 && count >= 3;
          }).length,
          mentorCountSource: verifiedCounts.has(normalizedInstitution) ? "official-roster" : companyIdentity ? "industry-publication-heuristic" : "publication-heuristic",
          institutionScore: scoreAuthor({ scoreSum: item.scoreSum, sPlus: item.sPlus, s: item.s, citations: item.citations }),
          avgScore: Math.round((item.scoreSum / Math.max(1, item.papers)) * 10) / 10,
          citations: item.citations,
          sPlus: item.sPlus,
          s: item.s,
          a: item.a,
        };
      })
      .filter((item) => item.papers >= 2 && !isGenericInstitutionName(item.name))
      .sort((a, b) => b.institutionScore - a.institutionScore || b.sPlus - a.sPlus || b.papers - a.papers);
    writeMaterializedSummaries(result);
    const filtered = q ? result.filter((item) => item.name.toLowerCase().includes(q)) : result;
    return limit ? filtered.slice(0, limit) : filtered;
  },

  getMentorsByInstitution(name: string, _params: Record<string, string>) {
    const ignoreRoster = _params.ignoreRoster === "1";
    const broadCandidateScope = _params.candidateScope === "broad";
    const companyIdentity = companyIdentityForInstitution(name);
    const entityKind = companyIdentity ? "company" : "academic";
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
    const seenRows = new Map<number, typeof papers.$inferSelect>();
    const institutionVariants = [...new Set([
      ...institutionIdentityService.variantsFor(name),
      ...(companyIdentity?.variants || []),
    ].filter((variant) => String(variant || "").trim().length > 3))];
    for (const variant of institutionVariants) {
      const rowsForVariant = metadataDb.select().from(papers)
        .where(sql`${papers.affiliations} LIKE ${`%${variant}%`} AND COALESCE(${papers.venueRank}, '') != 'Hidden'`)
        .all();
      for (const row of rowsForVariant) seenRows.set(row.id, row);
    }
    const rows = [...seenRows.values()]
      .filter((row) => companyIdentity
        ? companyAffiliationMatches(row.affiliations, companyIdentity)
        : institutionIdentityService.canonicalizeList(row.affiliations).some((inst) => inst.normalizedKey === targetIdentity.normalizedKey));

    const byAuthor = new Map<string, {
      name: string;
      normalizedKey: string;
      papers: number;
      scoreSum: number;
      citations: number;
      sPlus: number;
      s: number;
      a: number;
      domains: Map<string, number>;
      years: Map<number, number>;
      firstAuthorPapers: number;
      seniorAuthorPapers: number;
      recentSeniorAuthorPapers: number;
    }>();

    const domains = new Map<string, number>();
    const authorVariantBuckets = new Map<string, string[]>();

    for (const row of rows) {
      const rowAuthors = splitList(row.authors);
      for (const [index, rawName] of rowAuthors.entries()) {
        const authorIdentity = authorIdentityService.canonicalize(rawName);
        const authorName = authorIdentity.canonicalName;
        if (!authorIdentity.normalizedKey) continue;
        let authorKey = authorIdentity.normalizedKey;
        const bucket = authorVariantBucket(authorName);
        for (const existingKey of bucket ? authorVariantBuckets.get(bucket) || [] : []) {
          const existing = byAuthor.get(existingKey);
          if (!existing) continue;
          if (compatibleAuthorVariant(existing.name, authorName)) {
            authorKey = existingKey;
            break;
          }
        }
        const item = byAuthor.get(authorKey) || {
          name: authorName,
          normalizedKey: authorKey,
          papers: 0,
          scoreSum: 0,
          citations: 0,
          sPlus: 0,
          s: 0,
          a: 0,
          domains: new Map(),
          years: new Map(),
          firstAuthorPapers: 0,
          seniorAuthorPapers: 0,
          recentSeniorAuthorPapers: 0,
        };
        item.name = betterDisplayName(item.name, authorName);
        if (bucket && !authorVariantBuckets.get(bucket)?.includes(authorKey)) {
          authorVariantBuckets.set(bucket, [...(authorVariantBuckets.get(bucket) || []), authorKey]);
        }
        item.papers += 1;
        item.scoreSum += Number(row.qualityScore || 0);
        item.citations += Number(row.citationCount || 0);
        item.domains.set(String(row.domain || "General IC"), (item.domains.get(String(row.domain || "General IC")) || 0) + 1);
        item.years.set(Number(row.year || 0), (item.years.get(Number(row.year || 0)) || 0) + 1);
        if (index === 0) item.firstAuthorPapers += 1;
        if (isSeniorAuthorPosition(index, rowAuthors.length)) {
          item.seniorAuthorPapers += 1;
          if (Number(row.year || 0) >= new Date().getFullYear() - 4) item.recentSeniorAuthorPapers += 1;
        }
        if (isEliteRank(row.venueRank)) item.sPlus += 1;
        else if (row.venueRank === "S") item.s += 1;
        else if (String(row.venueRank || "").startsWith("A")) item.a += 1;
        byAuthor.set(authorKey, item);
      }
      const d = String(row.domain || "General IC");
      domains.set(d, (domains.get(d) || 0) + 1);
    }

    const currentYear = new Date().getFullYear();
    const rosterMap = ignoreRoster ? new Map<string, RosterVerificationRow>() : rosterVerifications(targetIdentity.normalizedKey);
    const hasOfficialRoster = [...rosterMap.values()].some((row) => row.status === "verified_current");
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
          seniorAuthorPapers: item.seniorAuthorPapers,
          firstAuthorPapers: item.firstAuthorPapers,
          recentPapers: recentCount,
          recentSeniorAuthorPapers: item.recentSeniorAuthorPapers,
        });
        const rosterVerification = findRosterVerification(rosterMap, item.name, item.normalizedKey);
        return {
          name: item.name,
          normalizedKey: item.normalizedKey,
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
          likelyMentor: rosterVerification ? rosterVerification.status === "verified_current" : role.likelyMentor,
          mentorConfidence: role.mentorConfidence,
          rosterVerification,
          seniorAuthorPapers: item.seniorAuthorPapers,
          firstAuthorPapers: item.firstAuthorPapers,
          recentSeniorAuthorPapers: item.recentSeniorAuthorPapers,
          firstYear: role.firstYear,
          lastYear: role.lastYear,
          careerSpan: role.careerSpan,
        };
      })
      .filter((item) => hasOfficialRoster
        ? item.rosterVerification?.status === "verified_current"
        : broadCandidateScope
          ? item.papers >= 2 || item.seniorAuthorPapers >= 1 || item.recentPapers >= 1
          : companyIdentity
            ? item.papers >= 3 || item.seniorAuthorPapers >= 1 || item.recentPapers >= 2
          : item.likelyMentor)
      .sort((a, b) => b.authorScore - a.authorScore || b.papers - a.papers);

    const existingMentorKeys = new Set(mentors.map((item) => authorIdentityService.canonicalize(item.name).normalizedKey || item.normalizedKey));
    const existingMentorNames = mentors.map((item) => item.name);
    const rosterOnlyMentors = hasOfficialRoster
      ? [...rosterMap.values()]
        .filter((row) => row.status === "verified_current" && !existingMentorKeys.has(row.normalizedAuthor) && !existingMentorNames.some((name) => compatibleAuthorVariant(name, row.authorName)))
        .map((row) => buildRosterOnlyMentor(row))
      : [];
    const displayMentors = [...mentors, ...rosterOnlyMentors]
      .sort((a, b) => b.authorScore - a.authorScore || b.papers - a.papers || a.name.localeCompare(b.name));
    const topMentors = displayMentors.slice(0, broadCandidateScope ? 400 : 120);
    const profiles = authorProfileService.getMapByNormalizedNames(topMentors.flatMap((item) => [
      item.normalizedKey,
      authorIdentityService.canonicalize(item.name).normalizedKey,
      item.rosterVerification?.normalizedAuthor || "",
    ]));

    return {
      institution: name,
      entityKind,
      companyId: companyIdentity?.id || null,
      mentors: topMentors.map((item) => ({
        ...item,
        profile: profiles.get(authorIdentityService.canonicalize(item.name).normalizedKey)
          || profiles.get(item.normalizedKey)
          || (item.rosterVerification?.normalizedAuthor ? profiles.get(item.rosterVerification.normalizedAuthor) : null)
          || null,
      })),
      mentorCandidateCount: displayMentors.length,
      mentorCountSource: hasOfficialRoster ? "official-roster" : companyIdentity ? "industry-publication-heuristic" : "publication-heuristic",
      officialRosterMatchedCount: hasOfficialRoster ? displayMentors.length : 0,
      excludedLikelyStudentCount: [...byAuthor.values()].length - mentors.length,
      historicalSeniorAuthorCount: [...byAuthor.values()].filter((item) => inferMentorCandidate({
        papers: item.papers,
        sPlus: item.sPlus,
        s: item.s,
        citations: item.citations,
        scoreSum: item.scoreSum,
        years: item.years,
        seniorAuthorPapers: item.seniorAuthorPapers,
        firstAuthorPapers: item.firstAuthorPapers,
        recentPapers: [...item.years.entries()].filter(([year]) => year >= currentYear - 4).reduce((sum, [, count]) => sum + count, 0),
        recentSeniorAuthorPapers: item.recentSeniorAuthorPapers,
      }).historicalSenior).length,
      domains: [...domains.entries()].map(([k, v]) => ({ key: k, count: v })).sort((a, b) => b.count - a.count),
    };
  },

  getMentorProfile(name: string, _params: Record<string, string>) {
    // Delegate to profile service for now
    const targetIdentity = authorIdentityService.canonicalize(name);
    const rows = rowsByAuthorName(name);
    const summary = summarizeAuthorRowsForMentor(name, rows);

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
      profile: authorProfileService.getByName(targetIdentity.canonicalName || name),
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
