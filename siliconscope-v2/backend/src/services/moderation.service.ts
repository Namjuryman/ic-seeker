import { and, eq, sql } from "drizzle-orm";
import { appDb } from "../db/app-db.js";
import { contentReports, moderationLogs, mentorReviews, paperComments } from "../db/schema.js";

const allowedTargets = new Set(["paper_comment", "mentor_review"]);
const actionToStatus: Record<string, "approved" | "rejected" | "pending"> = {
  restore: "approved",
  hide: "rejected",
  remove: "rejected",
  keep_pending: "pending",
  approved: "approved",
  rejected: "rejected",
  pending: "pending",
};

function normalizeAction(action: string) {
  const clean = String(action || "").trim();
  const status = actionToStatus[clean];
  if (!status) throw new Error("Invalid action");
  return { action: clean, status };
}

export const moderationService = {
  getQueue(options: { limit?: number; offset?: number; status?: string } = {}) {
    const limit = Math.min(Math.max(Number(options.limit || 25), 1), 100);
    const offset = Math.max(Number(options.offset || 0), 0);
    const rawStatus = String(options.status || "pending").trim().toLowerCase();
    const allowedStatuses = new Set(["pending", "reported", "visible", "hidden", "removed"]);
    const status = allowedStatuses.has(rawStatus) ? rawStatus : "pending";

    const statusMap: Record<string, "pending" | "approved" | "rejected"> = {
      pending: "pending",
      visible: "approved",
      hidden: "rejected",
      removed: "rejected",
      reported: "approved",
    };

    const commentStatus = statusMap[status] || "pending";
    const isReported = status === "reported";

    let comments;
    if (isReported) {
      comments = appDb.all(sql`
        SELECT c.id, c.paper_id, c.user_id, c.comment_type, c.body, c.moderation_status, c.created_at,
               p.title AS paper_title,
               u.nickname, u.verification_status
        FROM paper_comments c
        LEFT JOIN papers p ON p.id = c.paper_id
        LEFT JOIN users u ON u.id = c.user_id
        INNER JOIN content_reports r ON r.target_type = 'paper_comment' AND r.target_id = c.id AND r.status = 'open'
        WHERE c.moderation_status = 'approved'
        ORDER BY c.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
    } else {
      comments = appDb.all(sql`
        SELECT c.id, c.paper_id, c.user_id, c.comment_type, c.body, c.moderation_status, c.created_at,
               p.title AS paper_title,
               u.nickname, u.verification_status
        FROM paper_comments c
        LEFT JOIN papers p ON p.id = c.paper_id
        LEFT JOIN users u ON u.id = c.user_id
        WHERE c.moderation_status = ${commentStatus}
        ORDER BY c.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
    }

    const reviewStatus = statusMap[status] || "pending";
    const reviews = appDb.all(sql`
      SELECT r.id, r.professor_id, r.user_id, r.public_alias, r.is_verified_review,
             r.relationship_type, r.structured_scores_json, r.strengths_text, r.cautions_text,
             r.fit_text, r.moderation_status, r.created_at
      FROM mentor_reviews r
      WHERE r.moderation_status = ${reviewStatus}
      ORDER BY r.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const reports = appDb.all(sql`
      SELECT id, target_type, target_id, reporter_user_id, reason, status, created_at
      FROM content_reports
      WHERE status = 'open'
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const logs = appDb.all(sql`
      SELECT id, target_type, target_id, moderator_id, action, reason, created_at
      FROM moderation_logs
      ORDER BY created_at DESC
      LIMIT ${Math.min(limit, 50)} OFFSET ${offset}
    `);

    const commentCount = isReported
      ? appDb.get<{ n: number }>(sql`SELECT COUNT(DISTINCT c.id) AS n FROM paper_comments c INNER JOIN content_reports r ON r.target_type = 'paper_comment' AND r.target_id = c.id AND r.status = 'open' WHERE c.moderation_status = 'approved'`)?.n ?? 0
      : appDb.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM paper_comments WHERE moderation_status = ${commentStatus}`)?.n ?? 0;

    const totals = {
      comments: commentCount,
      reviews: appDb.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM mentor_reviews WHERE moderation_status = ${reviewStatus}`)?.n ?? 0,
      reports: appDb.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM content_reports WHERE status = 'open'`)?.n ?? 0,
      logs: appDb.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM moderation_logs`)?.n ?? 0,
    };

    return { comments, reviews, reports, logs, totals, limit, offset };
  },

  report(targetType: string, targetId: number, reporterUserId: number | null, reason: string) {
    if (!allowedTargets.has(targetType)) throw new Error("Invalid target type");
    if (!Number.isFinite(targetId) || targetId <= 0) throw new Error("Invalid target id");
    const cleanReason = String(reason || "").trim().slice(0, 1000);
    if (!cleanReason) throw new Error("Report reason is required");
    const row = appDb.insert(contentReports).values({
      targetType,
      targetId,
      reporterUserId,
      reason: cleanReason,
      status: "open",
    }).returning({ id: contentReports.id }).get();
    return { id: row.id, targetType, targetId, status: "open" };
  },

  moderate(targetType: string, targetId: number, action: string, moderatorId: number | null, reason = "") {
    if (!allowedTargets.has(targetType)) throw new Error("Invalid target type");
    const normalized = normalizeAction(action);
    if (!Number.isFinite(targetId) || targetId <= 0) throw new Error("Invalid target id");

    if (targetType === "paper_comment") {
      appDb.update(paperComments).set({ moderationStatus: normalized.status }).where(eq(paperComments.id, targetId)).run();
    } else if (targetType === "mentor_review") {
      appDb.update(mentorReviews).set({ moderationStatus: normalized.status }).where(eq(mentorReviews.id, targetId)).run();
    }

    appDb.insert(moderationLogs).values({
      targetType,
      targetId,
      moderatorId,
      action: normalized.action,
      reason: String(reason || "").slice(0, 1000),
    }).run();

    appDb.update(contentReports).set({ status: "resolved" })
      .where(and(eq(contentReports.targetType, targetType), eq(contentReports.targetId, targetId)))
      .run();

    return { targetType, targetId, action: normalized.action, mappedStatus: normalized.status };
  }
};
