import { db as metadataDb } from "../db/connection.js";
import { papers } from "../db/schema.js";
import { sql } from "drizzle-orm";
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

interface CityPoint {
  city: string;
  countryCode: string;
  countryName: string;
  lat: number;
  lon: number;
  aliases: string[];
}

const cityPoints: CityPoint[] = [
  { city: "Cambridge", countryCode: "US", countryName: "United States", lat: 42.3736, lon: -71.1097, aliases: ["cambridge", "mit", "harvard"] },
  { city: "Stanford", countryCode: "US", countryName: "United States", lat: 37.4275, lon: -122.1697, aliases: ["stanford"] },
  { city: "Berkeley", countryCode: "US", countryName: "United States", lat: 37.8715, lon: -122.273, aliases: ["berkeley", "uc berkeley"] },
  { city: "Pasadena", countryCode: "US", countryName: "United States", lat: 34.1478, lon: -118.1445, aliases: ["pasadena", "caltech"] },
  { city: "Los Angeles", countryCode: "US", countryName: "United States", lat: 34.0522, lon: -118.2437, aliases: ["los angeles", "ucla", "usc"] },
  { city: "Austin", countryCode: "US", countryName: "United States", lat: 30.2672, lon: -97.7431, aliases: ["austin", "university of texas"] },
  { city: "Atlanta", countryCode: "US", countryName: "United States", lat: 33.749, lon: -84.388, aliases: ["atlanta", "georgia tech"] },
  { city: "Santa Clara", countryCode: "US", countryName: "United States", lat: 37.3541, lon: -121.9552, aliases: ["santa clara", "intel"] },
  { city: "Yorktown Heights", countryCode: "US", countryName: "United States", lat: 41.2709, lon: -73.7776, aliases: ["yorktown heights", "ibm"] },
  { city: "Toronto", countryCode: "CA", countryName: "Canada", lat: 43.6532, lon: -79.3832, aliases: ["toronto"] },
  { city: "Waterloo", countryCode: "CA", countryName: "Canada", lat: 43.4643, lon: -80.5204, aliases: ["waterloo"] },
  { city: "Montreal", countryCode: "CA", countryName: "Canada", lat: 45.5019, lon: -73.5674, aliases: ["montreal", "mcgill"] },
  { city: "Beijing", countryCode: "CN", countryName: "China", lat: 39.9042, lon: 116.4074, aliases: ["beijing", "tsinghua", "peking university", "chinese academy", "institute of microelectronics"] },
  { city: "Shanghai", countryCode: "CN", countryName: "China", lat: 31.2304, lon: 121.4737, aliases: ["shanghai", "fudan", "shanghai jiao tong"] },
  { city: "Hangzhou", countryCode: "CN", countryName: "China", lat: 30.2741, lon: 120.1551, aliases: ["hangzhou", "zhejiang university"] },
  { city: "Nanjing", countryCode: "CN", countryName: "China", lat: 32.0603, lon: 118.7969, aliases: ["nanjing", "southeast university"] },
  { city: "Chengdu", countryCode: "CN", countryName: "China", lat: 30.5728, lon: 104.0668, aliases: ["chengdu", "uestc", "electronic science and technology"] },
  { city: "Xi'an", countryCode: "CN", countryName: "China", lat: 34.3416, lon: 108.9398, aliases: ["xi'an", "xian", "xidian", "jiaotong"] },
  { city: "Harbin", countryCode: "CN", countryName: "China", lat: 45.8038, lon: 126.535, aliases: ["harbin"] },
  { city: "Shenzhen", countryCode: "CN", countryName: "China", lat: 22.5431, lon: 114.0579, aliases: ["shenzhen"] },
  { city: "Hong Kong", countryCode: "HK", countryName: "Hong Kong", lat: 22.3193, lon: 114.1694, aliases: ["hong kong", "hkust", "cuhk", "polyu"] },
  { city: "Macau", countryCode: "MO", countryName: "Macau", lat: 22.1987, lon: 113.5439, aliases: ["macau", "macao"] },
  { city: "Hsinchu", countryCode: "TW", countryName: "Taiwan", lat: 24.8138, lon: 120.9675, aliases: ["hsinchu", "tsmc", "national tsing hua"] },
  { city: "Taipei", countryCode: "TW", countryName: "Taiwan", lat: 25.033, lon: 121.5654, aliases: ["taipei", "national taiwan university"] },
  { city: "Daejeon", countryCode: "KR", countryName: "South Korea", lat: 36.3504, lon: 127.3845, aliases: ["daejeon", "kaist"] },
  { city: "Seoul", countryCode: "KR", countryName: "South Korea", lat: 37.5665, lon: 126.978, aliases: ["seoul", "yonsei", "seoul national"] },
  { city: "Suwon", countryCode: "KR", countryName: "South Korea", lat: 37.2636, lon: 127.0286, aliases: ["suwon", "samsung"] },
  { city: "Icheon", countryCode: "KR", countryName: "South Korea", lat: 37.2792, lon: 127.4425, aliases: ["icheon", "hynix"] },
  { city: "Tokyo", countryCode: "JP", countryName: "Japan", lat: 35.6762, lon: 139.6503, aliases: ["tokyo"] },
  { city: "Kyoto", countryCode: "JP", countryName: "Japan", lat: 35.0116, lon: 135.7681, aliases: ["kyoto"] },
  { city: "Osaka", countryCode: "JP", countryName: "Japan", lat: 34.6937, lon: 135.5023, aliases: ["osaka"] },
  { city: "Singapore", countryCode: "SG", countryName: "Singapore", lat: 1.3521, lon: 103.8198, aliases: ["singapore", "nus", "nanyang"] },
  { city: "Bangalore", countryCode: "IN", countryName: "India", lat: 12.9716, lon: 77.5946, aliases: ["bangalore", "bengaluru", "iisc"] },
  { city: "Delhi", countryCode: "IN", countryName: "India", lat: 28.7041, lon: 77.1025, aliases: ["delhi"] },
  { city: "Mumbai", countryCode: "IN", countryName: "India", lat: 19.076, lon: 72.8777, aliases: ["mumbai"] },
  { city: "Sydney", countryCode: "AU", countryName: "Australia", lat: -33.8688, lon: 151.2093, aliases: ["sydney", "unsw"] },
  { city: "Melbourne", countryCode: "AU", countryName: "Australia", lat: -37.8136, lon: 144.9631, aliases: ["melbourne", "monash"] },
  { city: "Delft", countryCode: "NL", countryName: "Netherlands", lat: 52.0116, lon: 4.3571, aliases: ["delft"] },
  { city: "Eindhoven", countryCode: "NL", countryName: "Netherlands", lat: 51.4416, lon: 5.4697, aliases: ["eindhoven"] },
  { city: "Leuven", countryCode: "BE", countryName: "Belgium", lat: 50.8798, lon: 4.7005, aliases: ["leuven", "imec"] },
  { city: "Zurich", countryCode: "CH", countryName: "Switzerland", lat: 47.3769, lon: 8.5417, aliases: ["zurich", "eth"] },
  { city: "Lausanne", countryCode: "CH", countryName: "Switzerland", lat: 46.5197, lon: 6.6323, aliases: ["lausanne", "epfl"] },
  { city: "Munich", countryCode: "DE", countryName: "Germany", lat: 48.1351, lon: 11.582, aliases: ["munich", "münchen", "tu munich"] },
  { city: "Karlsruhe", countryCode: "DE", countryName: "Germany", lat: 49.0069, lon: 8.4037, aliases: ["karlsruhe"] },
  { city: "Aachen", countryCode: "DE", countryName: "Germany", lat: 50.7753, lon: 6.0839, aliases: ["aachen", "rwth"] },
  { city: "Grenoble", countryCode: "FR", countryName: "France", lat: 45.1885, lon: 5.7245, aliases: ["grenoble", "cea-leti", "leti"] },
  { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lon: 2.3522, aliases: ["paris", "sorbonne", "telecom paris"] },
  { city: "Cambridge", countryCode: "UK", countryName: "United Kingdom", lat: 52.2053, lon: 0.1218, aliases: ["cambridge"] },
  { city: "Oxford", countryCode: "UK", countryName: "United Kingdom", lat: 51.752, lon: -1.2577, aliases: ["oxford"] },
  { city: "London", countryCode: "UK", countryName: "United Kingdom", lat: 51.5072, lon: -0.1276, aliases: ["london", "imperial college", "university college london"] },
  { city: "Milan", countryCode: "IT", countryName: "Italy", lat: 45.4642, lon: 9.19, aliases: ["milan", "milano", "politecnico di milano"] },
  { city: "Pavia", countryCode: "IT", countryName: "Italy", lat: 45.1847, lon: 9.1582, aliases: ["pavia"] },
  { city: "Bologna", countryCode: "IT", countryName: "Italy", lat: 44.4949, lon: 11.3426, aliases: ["bologna"] },
];

const cityByCountry = new Map<string, CityPoint[]>();
for (const city of cityPoints) {
  if (!cityByCountry.has(city.countryCode)) cityByCountry.set(city.countryCode, []);
  cityByCountry.get(city.countryCode)!.push(city);
}

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

function cityForInstitution(value: string, country: CountryPattern | null, identity = institutionIdentityService.canonicalize(value)) {
  if (!country) return null;
  if (Number.isFinite(identity.latitude) && Number.isFinite(identity.longitude)) {
    return {
      city: identity.city || "",
      lat: Number(identity.latitude),
      lon: Number(identity.longitude),
      confidence: identity.confidence,
      source: identity.source,
    };
  }
  const identityCity = identity.city || "";
  if (identityCity) {
    const matched = (cityByCountry.get(country.code) || []).find((city) => normalize(city.city) === normalize(identityCity));
    return {
      city: identityCity,
      lat: matched?.lat ?? null,
      lon: matched?.lon ?? null,
      confidence: matched ? identity.confidence : Math.min(identity.confidence, 0.72),
      source: identity.source,
    };
  }

  const hay = ` ${normalize(`${value} ${identity.canonicalName || ""}`)} `;
  const matched = (cityByCountry.get(country.code) || []).find((city) =>
    city.aliases.some((alias) => hay.includes(` ${normalize(alias)} `) || hay.includes(normalize(alias)))
  );
  if (!matched) return null;
  return {
    city: matched.city,
    lat: matched.lat,
    lon: matched.lon,
    confidence: 0.72,
    source: "city-keyword",
  };
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

interface GeoInstitution {
  name: string;
  count: number;
  byYear: Array<{ year: number; papers: number }>;
  city: string | null;
  countryCode: string;
  countryName: string;
  lat: number | null;
  lon: number | null;
  confidence: number;
  source: string;
  cityMapped: boolean;
}

interface InstitutionAggregate extends GeoInstitution {
  rawAliases: Set<string>;
  yearCounts: Map<number, number>;
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
  institutionCount: number;
  cityMappedInstitutions: number;
  countryOnlyInstitutions: number;
  topInstitutions: GeoInstitution[];
  byField: Array<{ key: string; count: number }>;
  byYear: Array<{ year: number; papers: number; score: number }>;
}

interface GeoResult {
  generatedAt: string;
  field: string | null;
  fields: string[];
  skippedWithoutCountry: number;
  totalRows: number;
  institutionSummary: {
    affiliationMentions: number;
    distinctRawAffiliations: number;
    distinctCanonicalInstitutions: number;
    mappedInstitutions: number;
    cityMappedInstitutions: number;
    countryOnlyInstitutions: number;
    unmappedInstitutions: number;
  };
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

  const fields = metadataDb.all<{ domain: string }>(sql`
    SELECT DISTINCT domain FROM papers
    WHERE domain IS NOT NULL AND domain != '' AND COALESCE(venue_rank, '') != 'Hidden'
    ORDER BY domain
  `).map((r) => r.domain);

  const where = requestedField
    ? sql`${papers.domain} = ${requestedField} AND COALESCE(${papers.venueRank}, '') != 'Hidden'`
    : sql`COALESCE(${papers.venueRank}, '') != 'Hidden'`;

  const rows = metadataDb.select().from(papers).where(where)
    .orderBy(sql`${papers.year} DESC, ${papers.qualityScore} DESC`)
    .all();

  const byCountry = new Map<string, GeoCountry>();
  const countryFieldMaps = new Map<string, Map<string, number>>();
  const countryInstitutionMaps = new Map<string, Map<string, InstitutionAggregate>>();
  const countryYearMaps = new Map<string, Map<number, { year: number; papers: number; score: number }>>();
  const byRegionYear = new Map<string, { region: string; year: number; papers: number; score: number }>();
  const rawAffiliations = new Set<string>();
  const canonicalInstitutions = new Set<string>();
  const mappedInstitutions = new Set<string>();
  const cityMappedInstitutions = new Set<string>();
  const countryOnlyInstitutions = new Set<string>();
  const unmappedInstitutions = new Set<string>();
  let affiliationMentions = 0;
  let skipped = 0;

  for (const row of rows) {
    const affiliations = splitList(row.affiliations);
    for (const affiliation of affiliations) {
      const identity = institutionIdentityService.canonicalize(affiliation);
      rawAffiliations.add(affiliation);
      affiliationMentions += 1;
      if (identity.normalizedKey) canonicalInstitutions.add(identity.normalizedKey);
    }
    const affiliationCountryPairs = affiliations
      .map((affiliation) => {
        const identity = institutionIdentityService.canonicalize(affiliation);
        const country = countryForAffiliation(affiliation);
        const city = cityForInstitution(affiliation, country, identity);
        if (identity.normalizedKey) {
          if (country) mappedInstitutions.add(identity.normalizedKey);
          else unmappedInstitutions.add(identity.normalizedKey);
          if (country && city) cityMappedInstitutions.add(identity.normalizedKey);
          else if (country) countryOnlyInstitutions.add(identity.normalizedKey);
        }
        return { affiliation, identity, country, city };
      })
      .filter((item): item is { affiliation: string; identity: ReturnType<typeof institutionIdentityService.canonicalize>; country: CountryPattern; city: ReturnType<typeof cityForInstitution> } => Boolean(item.country));

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
          institutionCount: 0,
          cityMappedInstitutions: 0,
          countryOnlyInstitutions: 0,
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
        if (pair.country.code !== country.code) continue;
        const name = pair.identity.canonicalName || pair.affiliation;
        const key = pair.identity.normalizedKey || normalize(name);
        const instMap = countryInstitutionMaps.get(country.code)!;
        const existing = instMap.get(key) || {
          name,
          count: 0,
          byYear: [],
          city: pair.city?.city || null,
          countryCode: country.code,
          countryName: country.name,
          lat: pair.city?.lat ?? null,
          lon: pair.city?.lon ?? null,
          confidence: Math.round(((pair.city?.confidence ?? pair.identity.confidence ?? 0.45) || 0.45) * 100),
          source: pair.city?.source || pair.identity.source,
          cityMapped: Boolean(pair.city),
          rawAliases: new Set<string>(),
          yearCounts: new Map<number, number>(),
        };
        existing.count += 1;
        if (year) existing.yearCounts.set(year, (existing.yearCounts.get(year) || 0) + 1);
        existing.rawAliases.add(pair.affiliation);
        if (!existing.city && pair.city?.city) {
          existing.city = pair.city.city;
          existing.lat = pair.city.lat ?? null;
          existing.lon = pair.city.lon ?? null;
          existing.cityMapped = true;
        }
        existing.confidence = Math.max(existing.confidence, Math.round(((pair.city?.confidence ?? pair.identity.confidence ?? 0.45) || 0.45) * 100));
        instMap.set(key, existing);
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
      const institutionRows = [...(countryInstitutionMaps.get(item.code) || new Map()).values()]
        .sort((a, b) => b.count - a.count || b.confidence - a.confidence || a.name.localeCompare(b.name));
      const topInstitutions = institutionRows.slice(0, 80).map(({ rawAliases, yearCounts, ...row }) => ({
        ...row,
        byYear: [...yearCounts.entries()].map(([year, papers]) => ({ year, papers })).sort((a, b) => a.year - b.year),
      }));
      const byYear = [...(countryYearMaps.get(item.code) || new Map()).values()]
        .sort((a, b) => a.year - b.year)
        .map((row) => ({ ...row, score: Math.round(row.score * 10) / 10 }));
      return {
        ...item,
        topField: byField[0]?.key || "-",
        byField,
        institutionCount: institutionRows.length,
        cityMappedInstitutions: institutionRows.filter((row) => row.cityMapped).length,
        countryOnlyInstitutions: institutionRows.filter((row) => !row.cityMapped).length,
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
    institutionSummary: {
      affiliationMentions,
      distinctRawAffiliations: rawAffiliations.size,
      distinctCanonicalInstitutions: canonicalInstitutions.size,
      mappedInstitutions: mappedInstitutions.size,
      cityMappedInstitutions: cityMappedInstitutions.size,
      countryOnlyInstitutions: countryOnlyInstitutions.size,
      unmappedInstitutions: [...canonicalInstitutions].filter((key) => !mappedInstitutions.has(key)).length,
    },
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
