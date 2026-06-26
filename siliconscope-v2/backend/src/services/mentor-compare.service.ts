import { appDb } from "../db/app-db.js";
import { mentorReviews } from "../db/schema.js";
import { sql } from "drizzle-orm";
import { authorIdentityService } from "./author-identity.service.js";

function average(arr: number[]): number {
  if (!arr.length) return 0;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}

function safeText(value: string | null | undefined, maxLen = 500): string {
  const s = String(value || "").trim();
  return s.length > maxLen ? s.slice(0, maxLen) + "..." : s;
}

function generateSummary(strengths: string, cautions: string, fit: string): string {
  const parts: string[] = [];
  if (strengths) parts.push(`Strengths: ${safeText(strengths, 200)}`);
  if (cautions) parts.push(`Cautions: ${safeText(cautions, 200)}`);
  if (fit) parts.push(`Fit: ${safeText(fit, 200)}`);
  return parts.join("; ");
}

export const mentorCompareService = {
  compare(names: string[]) {
    const unique = [...new Set(names)].slice(0, 4);
    if (unique.length < 2) throw new Error("At least 2 mentors are required");

    const mentors = unique.map((name) => {
      const identity = authorIdentityService.canonicalize(name);
      const professorId = identity.canonicalName || name;

      // Only approved reviews
      const rows = appDb.select().from(mentorReviews)
        .where(sql`${mentorReviews.professorId} = ${professorId} AND ${mentorReviews.moderationStatus} = 'approved'`)
        .orderBy(sql`${mentorReviews.createdAt} DESC`)
        .all();

      const approvedCount = rows.length;

      // Threshold-protected visibility
      let visibilityLevel: "insufficient" | "aggregate" | "summary" | "curated" = "insufficient";
      let aggregate: Record<string, any> | null = null;
      let summary: string | null = null;
      let curatedComments: Array<{ publicAlias: string; text: string }> = [];

      if (approvedCount >= 3) {
        // Compute aggregate scores from structuredScoresJson
        const scoreKeys = new Set<string>();
        const scoreValues: Record<string, number[]> = {};

        for (const row of rows) {
          if (row.structuredScoresJson) {
            try {
              const scores = JSON.parse(row.structuredScoresJson) as Record<string, number>;
              for (const [key, val] of Object.entries(scores)) {
                if (Number.isFinite(val)) {
                  scoreKeys.add(key);
                  scoreValues[key] = scoreValues[key] || [];
                  scoreValues[key].push(val);
                }
              }
            } catch {
              // ignore invalid JSON
            }
          }
        }

        const aggregateScores: Record<string, number> = {};
        for (const key of scoreKeys) {
          aggregateScores[key] = average(scoreValues[key] || []);
        }

        aggregate = {
          overall: aggregateScores["overall"] || aggregateScores["research_quality"] || null,
          researchFit: aggregateScores["research_fit"] || aggregateScores["topic_match"] || null,
          mentoringStyle: aggregateScores["mentoring_style"] || aggregateScores["guidance"] || null,
          workload: aggregateScores["workload"] || aggregateScores["work_life_balance"] || null,
          communication: aggregateScores["communication"] || aggregateScores["responsiveness"] || null,
          _raw: aggregateScores,
        };

        if (approvedCount >= 5) {
          visibilityLevel = "summary";
          const allStrengths = rows.map((r) => r.strengthsText).filter(Boolean).join("; ");
          const allCautions = rows.map((r) => r.cautionsText).filter(Boolean).join("; ");
          const allFit = rows.map((r) => r.fitText).filter(Boolean).join("; ");
          summary = generateSummary(allStrengths, allCautions, allFit);
        } else {
          visibilityLevel = "aggregate";
        }

        if (approvedCount >= 10) {
          visibilityLevel = "curated";
          // Select up to 3 curated comments that have non-empty text
          curatedComments = rows
            .filter((r) => (r.strengthsText || r.cautionsText || r.fitText))
            .slice(0, 3)
            .map((r) => ({
              publicAlias: r.publicAlias || "Anonymous Verified Reviewer",
              text: safeText(r.strengthsText || r.cautionsText || r.fitText || "", 400),
            }));
        }
      }

      return {
        name: professorId,
        requestedName: name,
        approvedCount,
        visibilityLevel,
        aggregate,
        summary,
        curatedComments,
        publicationProfileLink: `/mentors/authors/${encodeURIComponent(professorId)}`,
        caveat: "Mentor comparison is based on verified anonymous reviews with threshold protection. It is intended for group experience and fit matching, not ranking or personal attacks.",
      };
    });

    return {
      mentors,
      caveat: "Mentor comparison is verified anonymous and threshold-protected. It is intended for group experience and fit matching, not ranking or personal attacks.",
    };
  },
};
