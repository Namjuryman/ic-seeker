import { appDb } from "../db/app-db.js";
import { authorAliases } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";

export function normalizeAuthorName(value: string): string {
  const clean = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (clean.includes(",")) {
    const [family, given] = clean.split(",").map((part) => part.trim()).filter(Boolean);
    return [given, family].filter(Boolean).join(" ").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }

  return clean.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}

function tokensFor(value: string): string[] {
  return normalizeAuthorName(value).split(/\s+/).filter(Boolean);
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function matchKeysForTokens(tokens: string[]): string[] {
  const normalized = tokens.join(" ");
  if (!normalized) return [];
  const keys = new Set([normalized]);
  if (tokens.length < 2) return [...keys];

  const family = tokens[tokens.length - 1];
  const given = tokens.slice(0, -1);
  const compactGiven = given.join("");
  const initials = given.map((token) => token[0]).join("");

  if (compactGiven.length >= 2 && family.length >= 2) keys.add(`${compactGiven} ${family}`);
  if (initials.length >= 2 && family.length >= 2) keys.add(`${initials} ${family}`);

  // Conservatively handles three-part surname-first inputs such as "Zeng Wen Liang".
  const surnameFirstGiven = tokens.slice(1).join("");
  if (tokens.length >= 3 && tokens[0].length >= 2 && surnameFirstGiven.length >= 2) {
    keys.add(`${surnameFirstGiven} ${tokens[0]}`);
  }

  return [...keys];
}

function matchKeysForName(value: string): string[] {
  return matchKeysForTokens(tokensFor(value));
}

function searchTermsForName(value: string): string[] {
  const tokens = tokensFor(value);
  const terms = new Set<string>();
  if (!tokens.length) return [];
  if (tokens.length === 1) {
    if (tokens[0].length >= 2) terms.add(tokens[0]);
    return [...terms];
  }

  const family = tokens[tokens.length - 1];
  if (family.length >= 2) terms.add(family);
  for (const token of tokens) {
    if (token.length >= 4) terms.add(token);
  }
  const compactGiven = tokens.slice(0, -1).join("");
  if (compactGiven.length >= 4) terms.add(compactGiven);
  const surnameFirstGiven = tokens.slice(1).join("");
  if (tokens.length >= 3 && surnameFirstGiven.length >= 4) terms.add(surnameFirstGiven);
  return [...terms];
}

function titleCaseName(value: string): string {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.length === 1 ? part.toUpperCase() + "." : part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function aliasRows(keys: string[]) {
  if (!keys.length) return [];
  try {
    return appDb.select().from(authorAliases).where(inArray(authorAliases.alias, keys)).all();
  } catch {
    return [];
  }
}

type CanonicalAuthor = ReturnType<typeof buildCanonicalAuthor>;
const canonicalizeCache = new Map<string, CanonicalAuthor>();

function buildCanonicalAuthor(rawName: string) {
  const raw = String(rawName || "").trim();
  const key = normalizeAuthorName(raw);
  if (!key) return { raw, canonicalName: "", normalizedKey: "", confidence: 0, source: "empty" as const };

  const manual = aliasRows([key, raw.toLowerCase()])[0];
  if (manual) {
    return {
      raw,
      canonicalName: manual.canonicalName,
      normalizedKey: normalizeAuthorName(manual.canonicalName),
      institutionHint: manual.institutionHint || undefined,
      confidence: Number(manual.confidence || 100) / 100,
      source: "manual" as const,
    };
  }

  return {
    raw,
    canonicalName: titleCaseName(key),
    normalizedKey: key,
    confidence: 0.55,
    source: "normalized" as const,
  };
}

export const authorIdentityService = {
  normalizeAuthorName,

  canonicalize(rawName: string) {
    const raw = String(rawName || "").trim();
    const cacheKey = `${normalizeAuthorName(raw)}\n${raw.toLowerCase()}`;
    const cached = canonicalizeCache.get(cacheKey);
    if (cached) return cached;
    const value = buildCanonicalAuthor(raw);
    canonicalizeCache.set(cacheKey, value);
    return value;
  },

  variantsFor(name: string) {
    const canonical = this.canonicalize(name);
    const variants = new Set([name, canonical.canonicalName]);
    try {
      const rows = appDb.select().from(authorAliases).where(eq(authorAliases.canonicalName, canonical.canonicalName)).all();
      for (const row of rows) variants.add(row.alias);
    } catch {
      // ignore before migration
    }
    return [...variants].filter(Boolean);
  },

  matchKeysFor(name: string) {
    const canonical = this.canonicalize(name);
    return dedupe([
      ...matchKeysForName(name),
      ...matchKeysForName(canonical.canonicalName),
      canonical.normalizedKey,
    ]);
  },

  searchTermsFor(name: string) {
    const canonical = this.canonicalize(name);
    return dedupe([
      ...this.variantsFor(name),
      ...searchTermsForName(name),
      ...searchTermsForName(canonical.canonicalName),
    ]);
  },

  sameAuthor(candidate: string, requested: string) {
    const requestedKeys = new Set(this.matchKeysFor(requested));
    const candidateKeys = this.matchKeysFor(candidate);
    return candidateKeys.some((key) => requestedKeys.has(key));
  },
};
