import { db } from "../db/connection.js";
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
    return db.select().from(authorAliases).where(inArray(authorAliases.alias, keys)).all();
  } catch {
    return [];
  }
}

export const authorIdentityService = {
  normalizeAuthorName,

  canonicalize(rawName: string) {
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
  },

  variantsFor(name: string) {
    const canonical = this.canonicalize(name);
    const variants = new Set([name, canonical.canonicalName]);
    try {
      const rows = db.select().from(authorAliases).where(eq(authorAliases.canonicalName, canonical.canonicalName)).all();
      for (const row of rows) variants.add(row.alias);
    } catch {
      // ignore before migration
    }
    return [...variants].filter(Boolean);
  },

  sameAuthor(candidate: string, requested: string) {
    const requestedKey = this.canonicalize(requested).normalizedKey;
    const candidateKey = this.canonicalize(candidate).normalizedKey;
    return Boolean(requestedKey && candidateKey && requestedKey === candidateKey);
  },
};
