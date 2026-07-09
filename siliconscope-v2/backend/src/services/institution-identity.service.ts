import { appDb } from "../db/app-db.js";
import { institutionAliases } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";

type BuiltinInstitution = {
  canonicalName: string;
  aliases: string[];
  countryCode?: string;
  countryName?: string;
  city?: string;
};

const BUILTIN_INSTITUTIONS: BuiltinInstitution[] = [
  { canonicalName: "Massachusetts Institute of Technology", aliases: ["mit", "m.i.t.", "massachusetts institute of technology", "microsystems technology laboratories mit", "mit eecs"], countryCode: "US", countryName: "United States", city: "Cambridge" },
  { canonicalName: "Stanford University", aliases: ["stanford", "stanford university"], countryCode: "US", countryName: "United States", city: "Stanford" },
  { canonicalName: "University of California, Berkeley", aliases: ["uc berkeley", "u.c. berkeley", "university of california berkeley", "berkeley"], countryCode: "US", countryName: "United States", city: "Berkeley" },
  { canonicalName: "California Institute of Technology", aliases: ["caltech", "california institute of technology"], countryCode: "US", countryName: "United States", city: "Pasadena" },
  { canonicalName: "University of Michigan", aliases: ["umich", "university of michigan", "u michigan"], countryCode: "US", countryName: "United States", city: "Ann Arbor" },
  { canonicalName: "University of Illinois Urbana-Champaign", aliases: ["uiuc", "university of illinois urbana champaign", "university of illinois at urbana champaign"], countryCode: "US", countryName: "United States", city: "Urbana-Champaign" },
  { canonicalName: "Georgia Institute of Technology", aliases: ["georgia tech", "georgia institute of technology", "gatech"], countryCode: "US", countryName: "United States", city: "Atlanta" },
  { canonicalName: "University of California, Los Angeles", aliases: ["ucla", "university of california los angeles"], countryCode: "US", countryName: "United States", city: "Los Angeles" },
  { canonicalName: "University of Southern California", aliases: ["usc", "university of southern california"], countryCode: "US", countryName: "United States", city: "Los Angeles" },
  { canonicalName: "University of Texas at Austin", aliases: ["ut austin", "university of texas at austin", "the university of texas at austin"], countryCode: "US", countryName: "United States", city: "Austin" },
  { canonicalName: "Cornell University", aliases: ["cornell", "cornell university"], countryCode: "US", countryName: "United States", city: "Ithaca" },
  { canonicalName: "Purdue University", aliases: ["purdue", "purdue university", "purdue university west lafayette"], countryCode: "US", countryName: "United States", city: "West Lafayette" },
  { canonicalName: "Virginia Tech", aliases: ["virginia tech", "virginia technology", "virginia polytechnic institute and state university"], countryCode: "US", countryName: "United States", city: "Blacksburg" },
  { canonicalName: "IBM Research", aliases: ["ibm research", "ibm t j watson research center", "ibm thomas j watson research center"], countryCode: "US", countryName: "United States", city: "Yorktown Heights" },
  { canonicalName: "Intel", aliases: ["intel", "intel corporation", "intel labs", "intel foundry"], countryCode: "US", countryName: "United States", city: "Santa Clara" },
  { canonicalName: "Tsinghua University", aliases: ["tsinghua", "tsinghua university"], countryCode: "CN", countryName: "China", city: "Beijing" },
  { canonicalName: "Peking University", aliases: ["peking university", "pku"], countryCode: "CN", countryName: "China", city: "Beijing" },
  { canonicalName: "Fudan University", aliases: ["fudan", "fudan university"], countryCode: "CN", countryName: "China", city: "Shanghai" },
  { canonicalName: "Shanghai Jiao Tong University", aliases: ["shanghai jiao tong university", "sjtu"], countryCode: "CN", countryName: "China", city: "Shanghai" },
  { canonicalName: "Xi'an Jiaotong University", aliases: ["xi'an jiaotong university", "xian jiaotong university", "xi an jiaotong university"], countryCode: "CN", countryName: "China", city: "Xi'an" },
  { canonicalName: "Zhejiang University", aliases: ["zhejiang university", "zju"], countryCode: "CN", countryName: "China", city: "Hangzhou" },
  { canonicalName: "Harbin Institute of Technology", aliases: ["harbin institute of technology", "harbin technology"], countryCode: "CN", countryName: "China", city: "Harbin" },
  { canonicalName: "Beijing Institute of Technology", aliases: ["beijing institute of technology", "beijing technology"], countryCode: "CN", countryName: "China", city: "Beijing" },
  { canonicalName: "Southeast University", aliases: ["southeast university", "seu"], countryCode: "CN", countryName: "China", city: "Nanjing" },
  { canonicalName: "Xidian University", aliases: ["xidian university", "xdu"], countryCode: "CN", countryName: "China", city: "Xi'an" },
  { canonicalName: "University of Electronic Science and Technology of China", aliases: ["uestc", "university of electronic science and technology of china", "electronic science and technology of china"], countryCode: "CN", countryName: "China", city: "Chengdu" },
  { canonicalName: "Institute of Microelectronics, Chinese Academy of Sciences", aliases: ["ime cas", "imcas", "institute of microelectronics chinese academy of sciences", "institute of microelectronics cas"], countryCode: "CN", countryName: "China", city: "Beijing" },
  { canonicalName: "Chinese Academy of Sciences", aliases: ["cas", "chinese academy of sciences"], countryCode: "CN", countryName: "China", city: "Beijing" },
  { canonicalName: "Institute of Computing Technology, Chinese Academy of Sciences", aliases: ["institute of computing technology", "computing technology", "ict cas"], countryCode: "CN", countryName: "China", city: "Beijing" },
  { canonicalName: "The Chinese University of Hong Kong, Shenzhen", aliases: ["cuhk-shenzhen", "cuhk shenzhen", "cuhk sz", "the chinese university of hong kong shenzhen", "chinese university of hong kong shenzhen"], countryCode: "CN", countryName: "China", city: "Shenzhen" },
  { canonicalName: "The Hong Kong University of Science and Technology", aliases: ["hkust", "hong kong university of science and technology"], countryCode: "HK", countryName: "Hong Kong", city: "Hong Kong" },
  { canonicalName: "The Chinese University of Hong Kong", aliases: ["cuhk", "chinese university of hong kong", "the chinese university of hong kong"], countryCode: "HK", countryName: "Hong Kong", city: "Hong Kong" },
  { canonicalName: "University of Macau", aliases: ["university of macau", "universidade de macau", "um macau", "macao university"], countryCode: "MO", countryName: "Macau", city: "Macau" },
  { canonicalName: "Taiwan Semiconductor Manufacturing Company", aliases: ["tsmc", "taiwan semiconductor manufacturing company", "taiwan semiconductor manufacturing co", "taiwan semiconductor manufacturing company limited"], countryCode: "TW", countryName: "Taiwan", city: "Hsinchu" },
  { canonicalName: "National Taiwan University", aliases: ["ntu taiwan", "national taiwan university"], countryCode: "TW", countryName: "Taiwan", city: "Taipei" },
  { canonicalName: "National Tsing Hua University", aliases: ["nthu", "national tsing hua university"], countryCode: "TW", countryName: "Taiwan", city: "Hsinchu" },
  { canonicalName: "National University of Singapore", aliases: ["nus", "national university of singapore"], countryCode: "SG", countryName: "Singapore", city: "Singapore" },
  { canonicalName: "Nanyang Technological University", aliases: ["ntu singapore", "nanyang technological university"], countryCode: "SG", countryName: "Singapore", city: "Singapore" },
  { canonicalName: "Delft University of Technology", aliases: ["tu delft", "delft university of technology", "delft"], countryCode: "NL", countryName: "Netherlands", city: "Delft" },
  { canonicalName: "imec", aliases: ["imec", "interuniversity microelectronics centre"], countryCode: "BE", countryName: "Belgium", city: "Leuven" },
  { canonicalName: "ETH Zurich", aliases: ["eth", "eth zurich", "swiss federal institute of technology zurich"], countryCode: "CH", countryName: "Switzerland", city: "Zurich" },
  { canonicalName: "EPFL", aliases: ["epfl", "école polytechnique fédérale de lausanne", "ecole polytechnique federale de lausanne"], countryCode: "CH", countryName: "Switzerland", city: "Lausanne" },
  { canonicalName: "KU Leuven", aliases: ["ku leuven", "katholieke universiteit leuven"], countryCode: "BE", countryName: "Belgium", city: "Leuven" },
  { canonicalName: "University of Tokyo", aliases: ["university of tokyo", "the university of tokyo", "tokyo university"], countryCode: "JP", countryName: "Japan", city: "Tokyo" },
  { canonicalName: "Tokyo Institute of Technology", aliases: ["tokyo institute of technology", "tokyo technology"], countryCode: "JP", countryName: "Japan", city: "Tokyo" },
  { canonicalName: "KAIST", aliases: ["kaist", "korea advanced institute of science and technology"], countryCode: "KR", countryName: "South Korea", city: "Daejeon" },
  { canonicalName: "Samsung Electronics", aliases: ["samsung", "samsung electronics", "samsung electronics co"], countryCode: "KR", countryName: "South Korea", city: "Suwon" },
  { canonicalName: "SK hynix", aliases: ["sk hynix", "sk hynix inc", "hynix"], countryCode: "KR", countryName: "South Korea", city: "Icheon" },
];

function normalizeKey(value: string): string {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);?/gi, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_match, code) => String.fromCodePoint(parseInt(code, 10)))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(univ)\b/g, "university")
    .replace(/\b(inst)\b/g, "institute")
    .replace(/\b(tech)\b/g, "technology")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\b(department|dept|school|college|faculty|laboratory|lab|center|centre|institute of|department of|school of|college of|faculty of)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const builtinAliasIndex = new Map<string, BuiltinInstitution>();
for (const inst of BUILTIN_INSTITUTIONS) {
  builtinAliasIndex.set(normalizeKey(inst.canonicalName), inst);
  for (const alias of inst.aliases) builtinAliasIndex.set(normalizeKey(alias), inst);
}

type CanonicalInstitution = ReturnType<typeof buildCanonicalInstitution>;
const canonicalizeCache = new Map<string, CanonicalInstitution>();

const containedBuiltinCandidates = BUILTIN_INSTITUTIONS.flatMap((inst) => [inst.canonicalName, ...inst.aliases].map((alias) => ({
  inst,
  aliasKey: normalizeKey(alias),
}))).filter(({ aliasKey }) => aliasKey.length >= 12 && /\b(university|institute|academy|college|polytechnic|technology)\b/.test(aliasKey));

function containedBuiltin(key: string): BuiltinInstitution | undefined {
  return containedBuiltinCandidates
    .filter(({ aliasKey }) => key.includes(aliasKey))
    .sort((a, b) => b.aliasKey.length - a.aliasKey.length)[0]?.inst;
}

function titleCaseInstitution(value: string): string {
  const keepUpper = new Set(["MIT", "UC", "UCLA", "USC", "NUS", "NTU", "HKUST", "CUHK", "UESTC", "SEU", "XDU", "CAS", "ETH", "EPFL", "KAIST", "TSMC", "IBM", "imec"]);
  const small = new Set(["of", "and", "the", "for", "in"]);
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      const raw = word.replace(/,/g, "");
      const upper = raw.toUpperCase();
      if (keepUpper.has(upper)) return upper;
      if (raw.toLowerCase() === "imec") return "imec";
      if (index > 0 && small.has(raw.toLowerCase())) return raw.toLowerCase();
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    })
    .join(" ");
}

function manualAliasRows(keys: string[]) {
  if (!keys.length) return [];
  try {
    return appDb.select().from(institutionAliases).where(inArray(institutionAliases.alias, keys)).all();
  } catch {
    return [];
  }
}

function buildCanonicalInstitution(raw: string) {
  const original = String(raw || "").trim();
  const key = normalizeKey(original);
  if (!key) return { raw: original, canonicalName: "", normalizedKey: "", confidence: 0, source: "empty" as const };

  const manual = manualAliasRows([key, original.toLowerCase()])[0];
  if (manual) {
    return {
      raw: original,
      canonicalName: manual.canonicalName,
      normalizedKey: normalizeKey(manual.canonicalName),
      countryCode: manual.countryCode || undefined,
      countryName: manual.countryName || undefined,
      city: manual.city || undefined,
      confidence: Number(manual.confidence || 100) / 100,
      source: "manual" as const,
    };
  }

  const builtin = builtinAliasIndex.get(key);
  if (builtin) {
    return {
      raw: original,
      canonicalName: builtin.canonicalName,
      normalizedKey: normalizeKey(builtin.canonicalName),
      countryCode: builtin.countryCode,
      countryName: builtin.countryName,
      city: builtin.city,
      confidence: 0.95,
      source: "builtin" as const,
    };
  }

  const contained = containedBuiltin(key);
  if (contained) {
    return {
      raw: original,
      canonicalName: contained.canonicalName,
      normalizedKey: normalizeKey(contained.canonicalName),
      countryCode: contained.countryCode,
      countryName: contained.countryName,
      city: contained.city,
      confidence: 0.85,
      source: "builtin" as const,
    };
  }

  return {
    raw: original,
    canonicalName: titleCaseInstitution(key),
    normalizedKey: key,
    confidence: 0.45,
    source: "normalized" as const,
  };
}

export const institutionIdentityService = {
  normalizeKey,

  canonicalize(raw: string) {
    const original = String(raw || "").trim();
    const cacheKey = `${normalizeKey(original)}\n${original.toLowerCase()}`;
    const cached = canonicalizeCache.get(cacheKey);
    if (cached) return cached;
    const value = buildCanonicalInstitution(original);
    canonicalizeCache.set(cacheKey, value);
    return value;
  },

  canonicalizeList(rawAffiliations: string) {
    const seen = new Set<string>();
    return String(rawAffiliations || "")
      .replace(/&#x([0-9a-f]+);?/gi, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);?/g, (_match, code) => String.fromCodePoint(parseInt(code, 10)))
      .split(";")
      .map((item) => this.canonicalize(item))
      .filter((item) => {
        if (!item.canonicalName || seen.has(item.normalizedKey)) return false;
        seen.add(item.normalizedKey);
        return true;
      });
  },

  variantsFor(name: string) {
    const canonical = this.canonicalize(name);
    const variants = new Set([name, canonical.canonicalName]);
    const canonicalKey = normalizeKey(canonical.canonicalName || name);
    for (const inst of BUILTIN_INSTITUTIONS) {
      if (normalizeKey(inst.canonicalName) === canonicalKey) {
        variants.add(inst.canonicalName);
        for (const alias of inst.aliases) variants.add(alias);
      }
    }
    try {
      const rows = appDb.select().from(institutionAliases).where(eq(institutionAliases.canonicalName, canonical.canonicalName)).all();
      for (const row of rows) variants.add(row.alias);
    } catch {
      // table may not exist in older dev DBs before startup migration
    }
    return [...variants].filter(Boolean);
  },
};
