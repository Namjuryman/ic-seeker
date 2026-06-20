import { db } from "../db/connection.js";
import { papers, qsRankings } from "../db/schema.js";
import { sql, not } from "drizzle-orm";
import { institutionIdentityService } from "./institution-identity.service.js";

interface CountryPattern {
  code: string;
  name: string;
  region: string;
  x: number;
  y: number;
  patterns: string[];
}

const countryPatterns: CountryPattern[] = [
  { code: "US", name: "United States", region: "North America", x: 24, y: 42, patterns: ["united states", "usa", "u.s.a", "california", "stanford", "mit", "massachusetts institute", "berkeley", "ucla", "uc san", "university of california", "caltech", "princeton", "cornell", "columbia university", "georgia tech", "university of texas", "texas instruments", "intel labs", "analog devices"] },
  { code: "CA", name: "Canada", region: "North America", x: 21, y: 26, patterns: ["canada", "toronto", "waterloo", "british columbia", "ubc", "mcgill", "montreal"] },
  { code: "CN", name: "China", region: "East Asia", x: 72, y: 45, patterns: ["china", "tsinghua", "peking university", "fudan", "shanghai jiao tong", "zhejiang university", "ustc", "university of science and technology of china", "chinese academy", "southeast university", "xidian", "tianjin university", "beihang", "harbin institute", "nanjing university"] },
  { code: "HK", name: "Hong Kong", region: "East Asia", x: 73, y: 51, patterns: ["hong kong", "hkust", "cuhk", "city university of hong kong", "university of hong kong", "polyu"] },
  { code: "MO", name: "Macau", region: "East Asia", x: 72, y: 53, patterns: ["macau", "macao", "university of macau"] },
  { code: "TW", name: "Taiwan", region: "East Asia", x: 77, y: 51, patterns: ["taiwan", "national taiwan", "tsmc", "mediatek", "national tsing hua", "national chiao tung", "nycu"] },
  { code: "KR", name: "South Korea", region: "East Asia", x: 79, y: 42, patterns: ["korea", "kaist", "seoul national", "postech", "samsung", "yonsei"] },
  { code: "JP", name: "Japan", region: "East Asia", x: 84, y: 44, patterns: ["japan", "tokyo institute", "university of tokyo", "kyoto university", "osaka university", "tohoku university", "sony", "renesas"] },
  { code: "SG", name: "Singapore", region: "Southeast Asia", x: 70, y: 65, patterns: ["singapore", "national university of singapore", "nus", "ntu singapore", "nanyang technological", "a*star"] },
  { code: "IN", name: "India", region: "South Asia", x: 62, y: 56, patterns: ["india", "iit ", "indian institute", "iisc", "bangalore"] },
  { code: "AU", name: "Australia", region: "Oceania", x: 82, y: 78, patterns: ["australia", "melbourne", "sydney", "unsw", "monash", "anu"] },
  { code: "NL", name: "Netherlands", region: "Europe", x: 48, y: 34, patterns: ["netherlands", "delft", "eindhoven", "university of twente"] },
  { code: "BE", name: "Belgium", region: "Europe", x: 47, y: 37, patterns: ["belgium", "ku leuven", "imec"] },
  { code: "CH", name: "Switzerland", region: "Europe", x: 49, y: 40, patterns: ["switzerland", "eth zurich", "epfl"] },
  { code: "DE", name: "Germany", region: "Europe", x: 50, y: 36, patterns: ["germany", "tu munich", "rwth", "fraunhofer", "karlsruhe"] },
  { code: "FR", name: "France", region: "Europe", x: 46, y: 40, patterns: ["france", "cea-leti", "leti", "grenoble", "sorbonne", "telecom paris"] },
  { code: "UK", name: "United Kingdom", region: "Europe", x: 44, y: 33, patterns: ["united kingdom", "u.k.", "uk ", "imperial college", "cambridge", "oxford", "university college london"] },
  { code: "IT", name: "Italy", region: "Europe", x: 50, y: 43, patterns: ["italy", "politecnico di milano", "university of pavia", "university of bologna"] },
];

const countryByCode = new Map(countryPatterns.map((country) => [country.code, country]));

const cacheTtlMs = 10 * 60 * 1000;
const affiliationCountryCache = new Map<string, CountryPattern | null>();

function splitList(value: string): string[] {
  return String(value || "").split(";").map((item) => item.trim()).filter(Boolean);
}

function normalize(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countryForAffiliation(value: string): CountryPattern | null {
  const identity = institutionIdentityService.canonicalize(value);
  const cacheKey = identity.normalizedKey || normalize(value);
  if (affiliationCountryCache.has(cacheKey)) return affiliationCountryCache.get(cacheKey)!;

  if (identity.countryCode && countryByCode.has(identity.countryCode)) {
    const country = countryByCode.get(identity.countryCode)!;
    affiliationCountryCache.set(cacheKey, country);
    return country;
  }

  const hay = ` ${normalize(`${value} ${identity.canonicalName || ""}`)} `;
  const country = countryPatterns.find((item) =>
    item.patterns.some((pattern) => hay.includes(` ${normalize(pattern)} `) || hay.includes(normalize(pattern)))
  ) || null;
  affiliationCountryCache.set(cacheKey, country);
  return country;
}

function inferCountries(affiliations: string): CountryPattern[] {
  const countries = new Map<string, CountryPattern>();
  for (const item of splitList(affiliations)) {
    const country = countryForAffiliation(item);
    if (country) countries.set(country.code, country);
  }
  return [...countries.values()];
}

function rankIncrement(rank: string | null): "sPlus" | "s" | "a" | "other" {
  if (["SSS", "SS+", "S+"].includes(String(rank || ""))) return "sPlus";
  if (rank === "S") return "s";
  if (String(rank || "").startsWith("A")) return "a";
  return "other";
}

function scoreEntity(item: { scoreSum: number; sPlus: number; s: number; citations: number }): number {
  return Math.round((item.scoreSum + item.sPlus * 5 + item.s * 2 + item.citations / 50) * 10) / 10;
}

function sortedCounts(map: Map<string, number>, key = "key") {
  return [...map.entries()]
    .map(([name, count]) => ({ [key]: name, count }))
    .sort((a, b) => b.count - a.count || String(a[key as keyof typeof a]).localeCompare(String(b[key as keyof typeof b])));
}

function rowPreview(row: typeof papers.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    authors: row.authors,
    year: row.year,
    venue: row.venue,
    rank: row.venueRank,
    field: row.domain,
    score: row.qualityScore,
    doi: row.doi,
  };
}

interface GeoCountry {
  code: string;
  name: string;
  region: string;
  x: number;
  y: number;
  papers: number;
  score: number;
  recentScore: number;
  avgScore: number;
  citations: number;
  ranks: { sPlus: number; s: number; a: number; other: number };
  topField: string;
  topInstitutions: Array<{ name: string; count: number }>;
  byField: Array<{ key: string; count: number }>;
  byYear: Array<{ year: number; papers: number; score: number }>;
}

interface GeoResult {
  generatedAt: string;
  field: string | null;
  fields: string[];
  skippedWithoutCountry: number;
  totalRows: number;
  countries: GeoCountry[];
  regionTrends: Array<{ region: string; year: number; papers: number; score: number }>;
  topPapers: ReturnType<typeof rowPreview>[];
}

const cache = new Map<string, { createdAt: number; value: GeoResult }>();

function addCount(map: Map<string, number>, key: string, amount = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + amount);
}

function topCounts(map: Map<string, number>, key = "key", limit = 12) {
  return [...map.entries()]
    .map(([name, count]) => ({ [key]: name, count }))
    .sort((a, b) => b.count - a.count || String(a[key as keyof typeof a]).localeCompare(String(b[key as keyof typeof b])))
    .slice(0, limit);
}

function buildGeo(requestedField: string | null): GeoResult {
  const recentCutoff = new Date().getFullYear() - 9;

  const fields = db.all<{ domain: string }>(sql`
    SELECT DISTINCT domain FROM papers
    WHERE domain IS NOT NULL AND domain != '' AND COALESCE(venue_rank, '') != 'Hidden'
    ORDER BY domain
  `).map((r) => r.domain);

  const where = requestedField
    ? sql`${papers.domain} = ${requestedField} AND COALESCE(${papers.venueRank}, '') != 'Hidden'`
    : sql`COALESCE(${papers.venueRank}, '') != 'Hidden'`;

  const rows = db.select().from(papers).where(where)
    .orderBy(sql`${papers.year} DESC, ${papers.qualityScore} DESC`)
    .all();

  const byCountry = new Map<string, GeoCountry>();
  const countryFieldMaps = new Map<string, Map<string, number>>();
  const countryInstitutionMaps = new Map<string, Map<string, number>>();
  const countryYearMaps = new Map<string, Map<number, { year: number; papers: number; score: number }>>();
  const byRegionYear = new Map<string, { region: string; year: number; papers: number; score: number }>();
  let skipped = 0;

  for (const row of rows) {
    const affiliations = splitList(row.affiliations);
    const affiliationCountryPairs = affiliations
      .map((affiliation) => ({ affiliation, country: countryForAffiliation(affiliation) }))
      .filter((item): item is { affiliation: string; country: CountryPattern } => Boolean(item.country));

    const countries = new Map<string, CountryPattern>();
    for (const pair of affiliationCountryPairs) countries.set(pair.country.code, pair.country);

    if (!countries.size) {
      skipped += 1;
      continue;
    }

    for (const country of countries.values()) {
      if (!byCountry.has(country.code)) {
        byCountry.set(country.code, {
          code: country.code,
          name: country.name,
          region: country.region,
          x: country.x,
          y: country.y,
          papers: 0,
          score: 0,
          recentScore: 0,
          avgScore: 0,
          citations: 0,
          ranks: { sPlus: 0, s: 0, a: 0, other: 0 },
          topField: "-",
          topInstitutions: [],
          byField: [],
          byYear: [],
        });
      }
      if (!countryFieldMaps.has(country.code)) countryFieldMaps.set(country.code, new Map());
      if (!countryInstitutionMaps.has(country.code)) countryInstitutionMaps.set(country.code, new Map());
      if (!countryYearMaps.has(country.code)) countryYearMaps.set(country.code, new Map());

      const item = byCountry.get(country.code)!;
      const score = Number(row.qualityScore || 0);
      const year = Number(row.year || 0);
      item.papers += 1;
      item.score += score;
      item.citations += Number(row.citationCount || 0);
      item.ranks[rankIncrement(row.venueRank)] += 1;
      if (year >= recentCutoff) item.recentScore += score;

      addCount(countryFieldMaps.get(country.code)!, row.domain || "General IC");
      for (const pair of affiliationCountryPairs) {
        if (pair.country.code === country.code) addCount(countryInstitutionMaps.get(country.code)!, institutionIdentityService.canonicalize(pair.affiliation).canonicalName || pair.affiliation);
      }

      if (year) {
        const yearMap = countryYearMaps.get(country.code)!;
        const existing = yearMap.get(year) || { year, papers: 0, score: 0 };
        existing.papers += 1;
        existing.score += score;
        yearMap.set(year, existing);

        const regionKey = `${country.region}:${year}`;
        const regionRow = byRegionYear.get(regionKey) || { region: country.region, year, papers: 0, score: 0 };
        regionRow.papers += 1;
        regionRow.score += score;
        byRegionYear.set(regionKey, regionRow);
      }
    }
  }

  const countries = [...byCountry.values()]
    .map((item) => {
      const byField = topCounts(countryFieldMaps.get(item.code) || new Map(), "key", 8) as Array<{ key: string; count: number }>;
      const topInstitutions = topCounts(countryInstitutionMaps.get(item.code) || new Map(), "name", 10) as Array<{ name: string; count: number }>;
      const byYear = [...(countryYearMaps.get(item.code) || new Map()).values()]
        .sort((a, b) => a.year - b.year)
        .map((row) => ({ ...row, score: Math.round(row.score * 10) / 10 }));
      return {
        ...item,
        topField: byField[0]?.key || "-",
        byField,
        topInstitutions,
        byYear,
        score: scoreEntity({
          scoreSum: item.score,
          sPlus: item.ranks.sPlus,
          s: item.ranks.s,
          citations: item.citations,
        }),
        recentScore: Math.round((item.recentScore + item.papers * 1.5) * 10) / 10,
        avgScore: Math.round((item.score / Math.max(1, item.papers)) * 10) / 10,
      };
    })
    .sort((a, b) => b.score - a.score || b.papers - a.papers);

  return {
    generatedAt: new Date().toISOString(),
    field: requestedField,
    fields,
    skippedWithoutCountry: skipped,
    totalRows: rows.length,
    countries,
    regionTrends: [...byRegionYear.values()].sort((a, b) => a.region.localeCompare(b.region) || a.year - b.year),
    topPapers: rows.slice(0, 80).map(rowPreview),
  };
}

export const geoService = {
  getGeo(params: Record<string, string>) {
    const requestedField = params.field || null;
    const key = requestedField || "__all__";
    const cached = cache.get(key);
    if (cached && Date.now() - cached.createdAt < cacheTtlMs) {
      return { ...cached.value, cached: true };
    }
    const value = buildGeo(requestedField);
    cache.set(key, { createdAt: Date.now(), value });
    return { ...value, cached: false };
  },

  prewarm(fields: string[] = ["", "Power Management"]) {
    setTimeout(() => {
      for (const field of fields) {
        try {
          const key = field || "__all__";
          if (!cache.has(key)) {
            cache.set(key, { createdAt: Date.now(), value: buildGeo(field || null) });
          }
        } catch {
          // ignore
        }
      }
    }, 250);
  },
};
