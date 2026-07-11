import { sqlite as metadataSqlite } from "../db/connection.js";
import { appSqlite } from "../db/app-db.js";
import { billingService } from "./billing.service.js";
import { learningContentService } from "./learning-content.service.js";
import {
  WATCHLIST_VALID_TYPES,
  canonicalizeWatchlistQueryJson,
  isValidTargetType,
} from "./watchlist-utils.js";

export { WATCHLIST_VALID_TYPES, isValidTargetType };

export const watchlistService = {
  listWatchlistItems(userId: number) {
    const all = appSqlite
      .prepare(
        `SELECT * FROM watchlist_items WHERE user_id = ? ORDER BY target_type, updated_at DESC`
      )
      .all(userId) as Record<string, any>[];

    const toItem = (w: Record<string, any>) => ({
      id: w.id,
      userId: w.user_id,
      targetType: w.target_type,
      targetId: w.target_id,
      queryJson: w.query_json,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
    });

    // Enrich papers with real paper data
    const paperIds = all
      .filter((w) => w.target_type === "paper")
      .map((w) => Number(w.target_id))
      .filter(Number.isFinite);
    const paperRows = paperIds.length
      ? (metadataSqlite
          .prepare(
            `SELECT id, title, venue, year, venue_rank as rank, domain as field, quality_score as score
             FROM papers WHERE id IN (${paperIds.map(() => "?").join(", ")})`
          )
          .all(...paperIds) as Record<string, any>[])
      : [];
    const paperMap = new Map(paperRows.map((r) => [r.id, r]));

    // Enrich companies with real company data
    const companyIds = all
      .filter((w) => w.target_type === "company")
      .map((w) => w.target_id);
    const companyRows = companyIds.length
      ? (metadataSqlite
          .prepare(
            `SELECT id, name, legal_name, company_type, country, city, data_confidence
             FROM companies WHERE id IN (${companyIds.map(() => "?").join(", ")})`
          )
          .all(...companyIds) as Record<string, any>[])
      : [];
    const companyMap = new Map(companyRows.map((r) => [r.id, r]));

    const { roadmaps, lessons } = learningContentService.activeContent();

    // Enrich roadmaps from active learning content
    const roadmapMap = new Map(roadmaps.map((r) => [r.slug, r]));

    // Enrich lessons from active learning content
    const lessonMap = new Map(lessons.map((l) => [l.id, l]));

    return {
      companies: all
        .filter((w) => w.target_type === "company")
        .map((w) => {
          const c = companyMap.get(w.target_id);
          return {
            ...toItem(w),
            title: c?.name || w.target_id,
            subtitle: c?.company_type || "",
            country: c?.country || "",
            city: c?.city || "",
            dataConfidence: c?.data_confidence,
            href: `/companies/${encodeURIComponent(w.target_id)}`,
          };
        }),
      searches: all
        .filter((w) => w.target_type === "search")
        .map((w) => ({
          ...toItem(w),
          queryJsonObj: w.query_json
            ? (() => {
                try {
                  return JSON.parse(w.query_json);
                } catch {
                  return undefined;
                }
              })()
            : undefined,
          href: "/",
        })),
      papers: all
        .filter((w) => w.target_type === "paper")
        .map((w) => {
          const p = paperMap.get(Number(w.target_id));
          return {
            ...toItem(w),
            title: p?.title || `Paper #${w.target_id}`,
            venue: p?.venue || "",
            year: p?.year || null,
            rank: p?.rank || "",
            field: p?.field || "",
            score: p?.score || null,
            href: `/papers/${w.target_id}`,
          };
        }),
      authors: all
        .filter((w) => w.target_type === "author")
        .map((w) => ({
          ...toItem(w),
          title: w.target_id,
          href: `/authors/${encodeURIComponent(w.target_id)}`,
        })),
      institutions: all
        .filter((w) => w.target_type === "institution")
        .map((w) => ({
          ...toItem(w),
          title: w.target_id,
          href: `/institutions/${encodeURIComponent(w.target_id)}`,
        })),
      topics: all
        .filter((w) => w.target_type === "topic")
        .map((w) => ({
          ...toItem(w),
          title: w.target_id,
          href: `/?field=${encodeURIComponent(w.target_id)}`,
        })),
      venues: all
        .filter((w) => w.target_type === "venue")
        .map((w) => ({
          ...toItem(w),
          title: w.target_id,
          href: `/?venue=${encodeURIComponent(w.target_id)}`,
        })),
      roadmaps: all
        .filter((w) => w.target_type === "roadmap")
        .map((w) => {
          const r = roadmapMap.get(w.target_id);
          return {
            ...toItem(w),
            title: r?.title || w.target_id,
            family: r?.family || "",
            href: `/learning/roadmaps/${encodeURIComponent(w.target_id)}`,
          };
        }),
      lessons: all
        .filter((w) => w.target_type === "lesson")
        .map((w) => {
          const l = lessonMap.get(w.target_id);
          return {
            ...toItem(w),
            title: l?.title || w.target_id,
            roadmapSlug: l?.roadmapSlug || "",
            href: `/learning/lessons/${encodeURIComponent(w.target_id)}`,
          };
        }),
    };
  },

  listWatchlistByType(userId: number, type: string) {
    const rows = appSqlite
      .prepare(
        `SELECT * FROM watchlist_items WHERE user_id = ? AND target_type = ? ORDER BY updated_at DESC`
      )
      .all(userId, type) as Record<string, any>[];
    return rows.map((w) => ({
      id: w.id,
      userId: w.user_id,
      targetType: w.target_type,
      targetId: w.target_id,
      queryJson: w.query_json,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
    }));
  },

  addWatchlistItem(
    userId: number,
    targetType: string,
    targetId: string,
    queryJson?: Record<string, unknown> | string
  ) {
    if (!isValidTargetType(targetType)) {
      return { ok: false, error: "关注类型无效。" };
    }
    if (!targetId || targetId.length > 256) {
      return { ok: false, error: "关注目标无效。" };
    }

    let finalQueryJson: string | null = null;
    let finalTargetId = targetId;

    if (queryJson) {
      const result = canonicalizeWatchlistQueryJson(queryJson);
      if ("error" in result) {
        return { ok: false, error: result.error };
      }
      finalQueryJson = result.json;
      // Use hash as target_id for search type to ensure dedup
      if (targetType === "search") {
        finalTargetId = result.hash;
      }
    }

    const existing = appSqlite
      .prepare("SELECT id FROM watchlist_items WHERE user_id = ? AND target_type = ? AND target_id = ?")
      .get(userId, targetType, finalTargetId) as { id: number } | undefined;
    if (existing) {
      return { ok: true, created: false, alreadyExists: true };
    }

    const watchlistQuota = billingService.checkQuota(userId, "watchlistItems", 1);
    if (!watchlistQuota.allowed) {
      return { ok: false, error: watchlistQuota.reason, quota: watchlistQuota };
    }

    if (targetType === "search") {
      const searchQuota = billingService.checkQuota(userId, "savedSearches", 1);
      if (!searchQuota.allowed) {
        return { ok: false, error: searchQuota.reason, quota: searchQuota };
      }
    }

    const now = new Date().toISOString();
    try {
      appSqlite
        .prepare(
          `
          INSERT INTO watchlist_items (user_id, target_type, target_id, query_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `
        )
        .run(userId, targetType, finalTargetId, finalQueryJson, now, now);
      billingService.recordUsageEvent({
        userId,
        metric: targetType === "search" ? "savedSearches" : "watchlistItems",
        source: "watchlist",
        resourceType: targetType,
        resourceId: finalTargetId,
      });
      return { ok: true, created: true };
    } catch (err: any) {
      // UNIQUE constraint violation (ON CONFLICT not used, we catch dup)
      if (err.message?.includes("UNIQUE constraint failed")) {
        return { ok: true, created: false, alreadyExists: true };
      }
      return { ok: false, error: err.message || "保存关注项失败。" };
    }
  },

  deleteWatchlistItem(userId: number, id: number) {
    const row = appSqlite
      .prepare("SELECT id FROM watchlist_items WHERE id = ? AND user_id = ?")
      .get(id, userId) as { id: number } | undefined;
    if (!row) return { ok: false, error: "关注项不存在，或当前用户无权操作。" };
    appSqlite.prepare("DELETE FROM watchlist_items WHERE id = ?").run(id);
    return { ok: true };
  },

  isWatchlistItem(userId: number, targetType: string, targetId: string) {
    const row = appSqlite
      .prepare(
        "SELECT id FROM watchlist_items WHERE user_id = ? AND target_type = ? AND target_id = ?"
      )
      .get(userId, targetType, targetId) as { id: number } | undefined;
    return Boolean(row);
  },
};
