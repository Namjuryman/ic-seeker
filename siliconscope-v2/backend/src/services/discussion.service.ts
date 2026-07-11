import { appDb } from "../db/app-db.js";
import { paperComments } from "../db/schema.js";
import { sql } from "drizzle-orm";

const riskyTerms = [
  "plagiarism", "fraud", "fake data", "fabricated", "misconduct", "stolen", "scam",
  "抄袭", "造假", "学术不端", "欺诈", "骗子", "垃圾论文",
];

const blockedPatterns = [
  /https?:\/\/[^\s]*(pdf|sci-hub|libgen|z-lib)[^\s]*/i,
  /\b(wechat|weixin|qq|phone|mobile)\b/i,
  /(微信|手机号|电话|QQ)/i,
];

function normalizeCommentType(value: unknown): string {
  const allowed = new Set(["Question", "Technical Note", "Reproduction Note", "Related Work", "Correction", "Reading Summary"]);
  const type = String(value || "Technical Note").trim();
  return allowed.has(type) ? type : "Technical Note";
}

function moderationStatus(body: string): "approved" | "pending" {
  const hay = body.toLowerCase();
  if (riskyTerms.some((term) => hay.includes(term.toLowerCase()))) return "pending";
  if (blockedPatterns.some((pattern) => pattern.test(body))) return "pending";
  if (body.length > 3500) return "pending";
  return "approved";
}

export const discussionService = {
  listComments(paperId: number, options: { limit?: number; offset?: number } = {}) {
    const limit = Math.min(Math.max(Number(options.limit || 20), 1), 100);
    const offset = Math.max(Number(options.offset || 0), 0);
    const rows = appDb.all<{
      id: number;
      paper_id: number;
      user_id: number;
      comment_type: string;
      body: string;
      moderation_status: string;
      created_at: string;
      nickname: string | null;
      verification_status: string | null;
    }>(sql`
      SELECT c.id, c.paper_id, c.user_id, c.comment_type, c.body, c.moderation_status, c.created_at,
             u.nickname, u.verification_status
      FROM paper_comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.paper_id = ${paperId} AND c.moderation_status = 'approved'
      ORDER BY c.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    return rows.map((row) => ({
      ...row,
      verified: row.verification_status === "verified" || row.user_id === 0,
      displayName: row.user_id === 0 ? "本地管理员" : (row.nickname || `用户 #${row.user_id}`),
    }));
  },

  addComment(paperId: number, userId: number, body: Record<string, unknown>) {
    if (!Number.isFinite(paperId) || paperId <= 0) throw new Error("论文 ID 无效。");
    if (userId === undefined || userId === null || Number.isNaN(Number(userId))) throw new Error("需要登录后才能评论。");
    const text = String(body.body || "").trim();
    if (text.length < 2) throw new Error("评论内容不能为空。");
    if (text.length > 10000) throw new Error("评论内容过长。");

    const result = appDb.insert(paperComments).values({
      paperId,
      userId: Number(userId),
      commentType: normalizeCommentType(body.commentType),
      body: text.slice(0, 10000),
      moderationStatus: moderationStatus(text),
    }).returning({ id: paperComments.id }).get();

    return {
      id: result.id,
      paperId,
      userId: Number(userId),
      commentType: normalizeCommentType(body.commentType),
      body: text,
      moderationStatus: moderationStatus(text),
    };
  },
};
