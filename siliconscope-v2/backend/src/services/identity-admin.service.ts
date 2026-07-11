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

type CandidateAction = "apply" | "reject" | "undo" | "split-required";

function aliasType(value: unknown): AliasType {
  const type = String(value || "").trim();
  if (type !== "author" && type !== "institution") throw new Error("别名类型必须是 author 或 institution。");
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

function parseJson(value: unknown, fallback: any) {
  try {
    return JSON.parse(String(value || ""));
  } catch {
    return fallback;
  }
}

function candidateTable(type: AliasType): string {
  return type === "author" ? "author_identity_candidates" : "institution_identity_candidates";
}

function candidateAction(value: unknown): CandidateAction {
  const action = cleanText(value, 80).replace(/_/g, "-") as CandidateAction;
  if (!["apply", "reject", "undo", "split-required"].includes(action)) {
    throw new Error("候选操作必须是 apply、reject、undo 或 split-required。");
  }
  return action;
}

function candidateAliases(type: AliasType, row: any): string[] {
  const aliases = type === "author"
    ? parseJson(row.alias_json, [])
    : parseJson(row.aliases_json, []);
  return [...new Set([row.canonical_name, ...(Array.isArray(aliases) ? aliases : [])]
    .map((item) => cleanText(item, 240))
    .filter(Boolean))];
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
    if (!rawAlias) throw new Error("别名不能为空。");
    if (!canonicalName) throw new Error("标准名称不能为空。");

    const alias = normalizedAlias(type, rawAlias);
    if (!alias) throw new Error("别名归一化后为空，无法保存。");

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
    if (!["pending", "approved", "rejected", "merged", "split_required"].includes(status)) throw new Error("候选状态无效。");
    const table = type === "author" ? "author_identity_candidates" : "institution_identity_candidates";
    sqlite.prepare(`UPDATE ${table} SET review_status = @status, updated_at = CURRENT_TIMESTAMP WHERE id = @id`).run({ id: candidateId, status });
    return { type, id: candidateId, status };
  },

  reviewCandidate(typeValue: unknown, id: unknown, actionValue: unknown) {
    const type = aliasType(typeValue);
    const action = candidateAction(actionValue);
    const candidateId = cleanText(id, 240);
    if (!candidateId) throw new Error("候选 ID 不能为空。");

    const table = candidateTable(type);
    const row = sqlite.prepare(`SELECT * FROM ${table} WHERE id = @id`).get({ id: candidateId }) as any;
    if (!row) throw new Error("身份候选项不存在。");

    const canonicalName = cleanText(row.canonical_name, 240);
    if (!canonicalName) throw new Error("候选项标准名称为空。");

    const aliases = candidateAliases(type, row);
    const candidateConfidence = confidence(row.confidence);
    const sourceName = "candidate-review";

    if (action === "reject" || action === "split-required") {
      const status = action === "reject" ? "rejected" : "split_required";
      sqlite.prepare(`UPDATE ${table} SET review_status = @status, updated_at = CURRENT_TIMESTAMP WHERE id = @id`).run({ id: candidateId, status });
      return { type, id: candidateId, action, status, aliasesWritten: 0, aliasesDeleted: 0 };
    }

    if (action === "undo") {
      let deleted = 0;
      const deleteAuthor = sqlite.prepare(`
        DELETE FROM author_aliases
        WHERE alias = @alias AND canonical_name = @canonicalName AND source = @source
      `);
      const deleteInstitution = sqlite.prepare(`
        DELETE FROM institution_aliases
        WHERE alias = @alias AND canonical_name = @canonicalName AND source = @source
      `);
      const tx = sqlite.transaction(() => {
        for (const raw of aliases) {
          const alias = normalizedAlias(type, raw);
          if (!alias) continue;
          const info = type === "author"
            ? deleteAuthor.run({ alias, canonicalName, source: sourceName })
            : deleteInstitution.run({ alias, canonicalName, source: sourceName });
          deleted += Number(info.changes || 0);
        }
        sqlite.prepare(`UPDATE ${table} SET review_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = @id`).run({ id: candidateId });
      });
      tx();
      return { type, id: candidateId, action, status: "pending", aliasesWritten: 0, aliasesDeleted: deleted };
    }

    let written = 0;
    const insertAuthor = sqlite.prepare(`
      INSERT INTO author_aliases (alias, canonical_name, institution_hint, source, confidence, updated_at)
      VALUES (@alias, @canonicalName, @institutionHint, @source, @confidence, CURRENT_TIMESTAMP)
      ON CONFLICT(alias) DO UPDATE SET
        canonical_name = excluded.canonical_name,
        institution_hint = COALESCE(excluded.institution_hint, author_aliases.institution_hint),
        source = excluded.source,
        confidence = excluded.confidence,
        updated_at = CURRENT_TIMESTAMP
    `);
    const insertInstitution = sqlite.prepare(`
      INSERT INTO institution_aliases (alias, canonical_name, country_code, country_name, city, source, confidence, updated_at)
      VALUES (@alias, @canonicalName, @countryCode, @countryName, @city, @source, @confidence, CURRENT_TIMESTAMP)
      ON CONFLICT(alias) DO UPDATE SET
        canonical_name = excluded.canonical_name,
        country_code = COALESCE(excluded.country_code, institution_aliases.country_code),
        country_name = COALESCE(excluded.country_name, institution_aliases.country_name),
        city = COALESCE(excluded.city, institution_aliases.city),
        source = excluded.source,
        confidence = excluded.confidence,
        updated_at = CURRENT_TIMESTAMP
    `);
    const tx = sqlite.transaction(() => {
      for (const raw of aliases) {
        const alias = normalizedAlias(type, raw);
        if (!alias) continue;
        if (type === "author") {
          insertAuthor.run({
            alias,
            canonicalName,
            institutionHint: cleanText((parseJson(row.institution_history_json, []) || [])[0], 160) || null,
            source: sourceName,
            confidence: candidateConfidence,
          });
        } else {
          insertInstitution.run({
            alias,
            canonicalName,
            countryCode: row.country_code || null,
            countryName: row.country_name || null,
            city: row.city || null,
            source: sourceName,
            confidence: candidateConfidence,
          });
        }
        written += 1;
      }
      sqlite.prepare(`UPDATE ${table} SET review_status = 'merged', updated_at = CURRENT_TIMESTAMP WHERE id = @id`).run({ id: candidateId });
    });
    tx();

    return { type, id: candidateId, action, status: "merged", aliasesWritten: written, aliasesDeleted: 0, canonicalName };
  },

  deleteAlias(typeValue: unknown, aliasValue: unknown) {
    const type = aliasType(typeValue);
    const rawAlias = cleanText(aliasValue, 240);
    if (!rawAlias) throw new Error("别名不能为空。");
    const alias = normalizedAlias(type, rawAlias);
    if (type === "author") {
      appDb.run(sql`DELETE FROM author_aliases WHERE alias = ${alias}`);
    } else {
      appDb.run(sql`DELETE FROM institution_aliases WHERE alias = ${alias}`);
    }
    return { type, alias, deleted: true };
  },
};
