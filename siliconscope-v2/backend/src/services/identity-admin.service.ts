import { sql } from "drizzle-orm";
import { appDb } from "../db/app-db.js";
import { sqlite } from "../db/connection.js";
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
      return appDb.all(sql`
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

    return appDb.all(sql`
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
      appDb.run(sql`
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

    appDb.run(sql`
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


  listCandidates(typeValue: unknown, options: { status?: unknown; limit?: unknown; offset?: unknown } = {}) {
    const type = aliasType(typeValue);
    const status = cleanText(options.status || "pending", 80);
    const limit = Math.min(Math.max(Number(options.limit || 80), 1), 200);
    const offset = Math.max(Number(options.offset || 0), 0);
    const table = type === "author" ? "author_identity_candidates" : "institution_identity_candidates";
    const where = status === "all" ? "" : "WHERE review_status = @status";
    const rows = sqlite.prepare(`
      SELECT * FROM ${table}
      ${where}
      ORDER BY confidence ASC, paper_count DESC, updated_at DESC
      LIMIT @limit OFFSET @offset
    `).all({ status, limit, offset }).map((row: any) => {
      const parse = (value: string, fallback: any) => { try { return JSON.parse(value || ""); } catch { return fallback; } };
      return type === "author" ? {
        id: row.id,
        type,
        normalizedKey: row.normalized_key,
        canonicalName: row.canonical_name,
        aliases: parse(row.alias_json, []),
        externalIds: parse(row.external_ids_json, {}),
        institutionHistory: parse(row.institution_history_json, []),
        coauthorSignature: parse(row.coauthor_signature_json, []),
        paperCount: row.paper_count,
        confidence: row.confidence,
        reviewStatus: row.review_status,
        evidence: parse(row.evidence_json, {}),
        updatedAt: row.updated_at,
      } : {
        id: row.id,
        type,
        normalizedKey: row.normalized_key,
        canonicalName: row.canonical_name,
        aliases: parse(row.aliases_json, []),
        countryCode: row.country_code,
        countryName: row.country_name,
        city: row.city,
        parentInstitution: row.parent_institution,
        labOrSchool: row.lab_or_school,
        companyAffiliation: row.company_affiliation,
        paperCount: row.paper_count,
        confidence: row.confidence,
        reviewStatus: row.review_status,
        evidence: parse(row.evidence_json, {}),
        updatedAt: row.updated_at,
      };
    });
    const total = sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table} ${where}`).get({ status }) as { n: number };
    return { rows, total: total?.n || 0, limit, offset };
  },

  updateCandidateStatus(typeValue: unknown, id: unknown, statusValue: unknown) {
    const type = aliasType(typeValue);
    const candidateId = cleanText(id, 240);
    const status = cleanText(statusValue, 80);
    if (!["pending", "approved", "rejected", "merged", "split_required"].includes(status)) throw new Error("Invalid candidate status");
    const table = type === "author" ? "author_identity_candidates" : "institution_identity_candidates";
    sqlite.prepare(`UPDATE ${table} SET review_status = @status, updated_at = CURRENT_TIMESTAMP WHERE id = @id`).run({ id: candidateId, status });
    return { type, id: candidateId, status };
  },

  deleteAlias(typeValue: unknown, aliasValue: unknown) {
    const type = aliasType(typeValue);
    const rawAlias = cleanText(aliasValue, 240);
    if (!rawAlias) throw new Error("Alias is required");
    const alias = normalizedAlias(type, rawAlias);
    if (type === "author") {
      appDb.run(sql`DELETE FROM author_aliases WHERE alias = ${alias}`);
    } else {
      appDb.run(sql`DELETE FROM institution_aliases WHERE alias = ${alias}`);
    }
    return { type, alias, deleted: true };
  },
};
