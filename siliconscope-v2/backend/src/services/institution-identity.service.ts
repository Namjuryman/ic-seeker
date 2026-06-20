import { db } from "../db/connection.js";
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
  { canonicalName: "Tsinghua University", aliases: ["tsinghua", "tsinghua university"], countryCode: "CN", countryName: "China", city: "Beijing" },
  { canonicalName: "Peking University", aliases: ["peking university", "pku"], countryCode: "CN", countryName: "China", city: "Beijing" },
  { canonicalName: "Fudan University", aliases: ["fudan", "fudan university"], countryCode: "CN", countryName: "China", city: "Shanghai" },
  { canonicalName: "Shanghai Jiao Tong University", aliases: ["shanghai jiao tong university", "sjtu"], countryCode: "CN", countryName: "China", city: "Shanghai" },
  { canonicalName: "Zhejiang University", aliases: ["zhejiang university", "zju"], countryCode: "CN", countryName: "China", city: "Hangzhou" },
  { canonicalName: "University of Electronic Science and Technology of China", aliases: ["uestc", "university of electronic science and technology of china", "electronic science and technology of china"], countryCode: "CN", countryName: "China", city: "Chengdu" },
  { canonicalName: "The Chinese University of Hong Kong, Shenzhen", aliases: ["cuhk-shenzhen", "cuhk shenzhen", "cuhk sz", "the chinese university of hong kong shenzhen", "chinese university of hong kong shenzhen"], countryCode: "CN", countryName: "China", city: "Shenzhen" },
  { canonicalName: "The Hong Kong University of Science and Technology", aliases: ["hkust", "hong kong university of science and technology"], countryCode: "HK", countryName: "Hong Kong", city: "Hong Kong" },
  { canonicalName: "The Chinese University of Hong Kong", aliases: ["cuhk", "chinese university of hong kong", "the chinese university of hong kong"], countryCode: "HK", countryName: "Hong Kong", city: "Hong Kong" },
  { canonicalName: "University of Macau", aliases: ["university of macau", "universidade de macau", "um macau", "macao university"], countryCode: "MO", countryName: "Macau", city: "Macau" },
  { canonicalName: "National University of Singapore", aliases: ["nus", "national university of singapore"], countryCode: "SG", countryName: "Singapore", city: "Singapore" },
  { canonicalName: "Nanyang Technological University", aliases: ["ntu singapore", "nanyang technological university"], countryCode: "SG", countryName: "Singapore", city: "Singapore" },
  { canonicalName: "Delft University of Technology", aliases: ["tu delft", "delft university of technology", "delft"], countryCode: "NL", countryName: "Netherlands", city: "Delft" },
  { canonicalName: "imec", aliases: ["imec", "interuniversity microelectronics centre"], countryCode: "BE", countryName: "Belgium", city: "Leuven" },
  { canonicalName: "ETH Zurich", aliases: ["eth", "eth zurich", "swiss federal institute of technology zurich"], countryCode: "CH", countryName: "Switzerland", city: "Zurich" },
  { canonicalName: "EPFL", aliases: ["epfl", "école polytechnique fédérale de lausanne", "ecole polytechnique federale de lausanne"], countryCode: "CH", countryName: "Switzerland", city: "Lausanne" },
  { canonicalName: "KU Leuven", aliases: ["ku leuven", "katholieke universiteit leuven"], countryCode: "BE", countryName: "Belgium", city: "Leuven" },
  { canonicalName: "University of Tokyo", aliases: ["university of tokyo", "the university of tokyo", "tokyo university"], countryCode: "JP", countryName: "Japan", city: "Tokyo" },
  { canonicalName: "KAIST", aliases: ["kaist", "korea advanced institute of science and technology"], countryCode: "KR", countryName: "South Korea", city: "Daejeon" },
];

function normalizeKey(value: string): string {
  return String(value || "")
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

function titleCaseInstitution(value: string): string {
  const keepUpper = new Set(["MIT", "UC", "UCLA", "USC", "NUS", "NTU", "HKUST", "CUHK", "UESTC", "ETH", "EPFL", "KAIST", "imec"]);
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
    return db.select().from(institutionAliases).where(inArray(institutionAliases.alias, keys)).all();
  } catch {
    return [];
  }
}

export const institutionIdentityService = {
  normalizeKey,

  canonicalize(raw: string) {
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

    return {
      raw: original,
      canonicalName: titleCaseInstitution(key),
      normalizedKey: key,
      confidence: 0.45,
      source: "normalized" as const,
    };
  },

  canonicalizeList(rawAffiliations: string) {
    const seen = new Set<string>();
    return String(rawAffiliations || "")
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
      const rows = db.select().from(institutionAliases).where(eq(institutionAliases.canonicalName, canonical.canonicalName)).all();
      for (const row of rows) variants.add(row.alias);
    } catch {
      // table may not exist in older dev DBs before startup migration
    }
    return [...variants].filter(Boolean);
  },
};
