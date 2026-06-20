import { sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import { authorIdentityService } from "./author-identity.service.js";
import { institutionIdentityService } from "./institution-identity.service.js";

type AliasType = "author" | "institution";

type AliasBody = {
  alias?: unknown;
  canonicalName?: unknown;
  institutionHint?: unknown;
  countryCode?: unknown;
  countryName?: unknown;
  city?: unknown;
  source?: unknown;
  confidence?: unknown;
};

function aliasType(value: unknown): AliasType {
  const type = String(value || "").trim();
  if (type !== "author" && type !== "institution") throw new Error("Alias type must be author or institution");
  return type;
}

function cleanText(value: unknown, max = 240): string {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function nullableText(value: unknown, max = 120): string | null {
  const clean = cleanText(value, max);
  return clean ? clean : null;
}

function confidence(value: unknown): number {
  const n = Number(value ?? 100);
  if (!Number.isFinite(n)) return 100;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function source(value: unknown): string {
  const clean = cleanText(value || "manual", 60).toLowerCase();
  return clean || "manual";
}

function normalizedAlias(type: AliasType, alias: string): string {
  return type === "author"
    ? authorIdentityService.normalizeAuthorName(alias)
    : institutionIdentityService.normalizeKey(alias);
}

export const identityAdminService = {
  listAliases(typeValue: unknown, options: { q?: unknown; limit?: unknown; offset?: unknown } = {}) {
    const type = aliasType(typeValue);
    const q = cleanText(options.q, 100);
    const like = `%${q}%`;
    const limit = Math.min(Math.max(Number(options.limit || 80), 1), 200);
    const offset = Math.max(Number(options.offset || 0), 0);

    if (type === "author") {
      return db.all(sql`
        SELECT alias,
               canonical_name AS canonicalName,
               institution_hint AS institutionHint,
               source,
               confidence,
               updated_at AS updatedAt
        FROM author_aliases
        ${q ? sql`WHERE alias LIKE ${like} OR canonical_name LIKE ${like} OR COALESCE(institution_hint, '') LIKE ${like}` : sql``}
        ORDER BY updated_at DESC, canonical_name COLLATE NOCASE ASC, alias COLLATE NOCASE ASC
        LIMIT ${limit} OFFSET ${offset}
      `);
    }

    return db.all(sql`
      SELECT alias,
             canonical_name AS canonicalName,
             country_code AS countryCode,
             country_name AS countryName,
             city,
             source,
             confidence,
             updated_at AS updatedAt
      FROM institution_aliases
      ${q ? sql`WHERE alias LIKE ${like} OR canonical_name LIKE ${like} OR COALESCE(country_name, '') LIKE ${like} OR COALESCE(city, '') LIKE ${like}` : sql``}
      ORDER BY updated_at DESC, canonical_name COLLATE NOCASE ASC, alias COLLATE NOCASE ASC
      LIMIT ${limit} OFFSET ${offset}
    `);
  },

  upsertAlias(typeValue: unknown, body: AliasBody) {
    const type = aliasType(typeValue);
    const rawAlias = cleanText(body.alias, 240);
    const canonicalName = cleanText(body.canonicalName, 240);
    if (!rawAlias) throw new Error("Alias is required");
    if (!canonicalName) throw new Error("Canonical name is required");

    const alias = normalizedAlias(type, rawAlias);
    if (!alias) throw new Error("Alias normalizes to an empty key");

    if (type === "author") {
      db.run(sql`
        INSERT INTO author_aliases (alias, canonical_name, institution_hint, source, confidence, updated_at)
        VALUES (${alias}, ${canonicalName}, ${nullableText(body.institutionHint)}, ${source(body.source)}, ${confidence(body.confidence)}, CURRENT_TIMESTAMP)
        ON CONFLICT(alias) DO UPDATE SET
          canonical_name = excluded.canonical_name,
          institution_hint = excluded.institution_hint,
          source = excluded.source,
          confidence = excluded.confidence,
          updated_at = CURRENT_TIMESTAMP
      `);
      return { type, alias, canonicalName, institutionHint: nullableText(body.institutionHint), source: source(body.source), confidence: confidence(body.confidence) };
    }

    db.run(sql`
      INSERT INTO institution_aliases (alias, canonical_name, country_code, country_name, city, source, confidence, updated_at)
      VALUES (${alias}, ${canonicalName}, ${nullableText(body.countryCode, 16)}, ${nullableText(body.countryName, 80)}, ${nullableText(body.city, 80)}, ${source(body.source)}, ${confidence(body.confidence)}, CURRENT_TIMESTAMP)
      ON CONFLICT(alias) DO UPDATE SET
        canonical_name = excluded.canonical_name,
        country_code = excluded.country_code,
        country_name = excluded.country_name,
        city = excluded.city,
        source = excluded.source,
        confidence = excluded.confidence,
        updated_at = CURRENT_TIMESTAMP
    `);
    return {
      type,
      alias,
      canonicalName,
      countryCode: nullableText(body.countryCode, 16),
      countryName: nullableText(body.countryName, 80),
      city: nullableText(body.city, 80),
      source: source(body.source),
      confidence: confidence(body.confidence),
    };
  },

  deleteAlias(typeValue: unknown, aliasValue: unknown) {
    const type = aliasType(typeValue);
    const rawAlias = cleanText(aliasValue, 240);
    if (!rawAlias) throw new Error("Alias is required");
    const alias = normalizedAlias(type, rawAlias);
    if (type === "author") {
      db.run(sql`DELETE FROM author_aliases WHERE alias = ${alias}`);
    } else {
      db.run(sql`DELETE FROM institution_aliases WHERE alias = ${alias}`);
    }
    return { type, alias, deleted: true };
  },
};
