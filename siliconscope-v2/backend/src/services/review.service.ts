import { appDb } from "../db/app-db.js";
import { mentorReviews } from "../db/schema.js";
import { sql } from "drizzle-orm";

const relationshipLabels = new Set([
  "Former Group Member",
  "Current Group Member",
  "Applicant",
  "Collaborator",
  "Other",
]);

function safeRelationship(value: unknown): string {
  const raw = String(value || "Other").trim();
  return relationshipLabels.has(raw) ? raw : "Other";
}

function normalizeScores(value: unknown): Record<string, number> {
  const input = (value && typeof value === "object") ? value as Record<string, unknown> : {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(input)) {
    const score = Number(raw);
    if (Number.isFinite(score)) out[key] = Math.max(1, Math.min(5, Math.round(score)));
  }
  return out;
}

function trimText(value: unknown): string {
  return String(value || "").trim().slice(0, 3000);
}

export const reviewService = {
  listReviews(professorId: string) {
    const rows = appDb.select().from(mentorReviews)
      .where(sql`${mentorReviews.professorId} = ${professorId} AND ${mentorReviews.moderationStatus} = 'approved'`)
      .orderBy(sql`${mentorReviews.createdAt} DESC`)
      .all();
    return rows.map((row) => ({
      ...row,
      publicAlias: "匿名已验证评价者",
      public_alias: "匿名已验证评价者",
      scores: row.structuredScoresJson ? JSON.parse(row.structuredScoresJson) : {},
      // Never expose nickname/email/school here. The frontend should also enforce display thresholds.
    }));
  },

  getReviewStats(professorId: string) {
    const result = appDb.get<{ approved: number; pending: number; verified: number }>(sql`
      SELECT
        SUM(CASE WHEN moderation_status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN moderation_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN moderation_status = 'approved' AND is_verified_review = 1 THEN 1 ELSE 0 END) as verified
      FROM mentor_reviews
      WHERE professor_id = ${professorId}
    `);
    const approved = result?.approved || 0;
    return { total: approved, approved, pending: result?.pending || 0, verified: result?.verified || 0 };
  },

  addReview(professorId: string, userId: number, body: Record<string, unknown>) {
    const target = String(professorId || "").trim();
    if (!target) throw new Error("研究者 ID 不能为空。");
    if (userId === undefined || userId === null || Number.isNaN(Number(userId))) throw new Error("需要登录后才能提交评价。");

    const result = appDb.insert(mentorReviews).values({
      professorId: target,
      userId: Number(userId),
      publicAlias: "匿名已验证评价者",
      isVerifiedReview: true,
      relationshipType: safeRelationship(body.relationshipType),
      structuredScoresJson: JSON.stringify(normalizeScores(body.scores)),
      strengthsText: trimText(body.strengthsText),
      cautionsText: trimText(body.cautionsText),
      fitText: trimText(body.fitText),
      moderationStatus: "pending",
    }).returning({ id: mentorReviews.id }).get();
    return { id: result.id, publicAlias: "匿名已验证评价者", moderationStatus: "pending" };
  },
};
