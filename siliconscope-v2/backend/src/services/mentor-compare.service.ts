import { appDb } from "../db/app-db.js";
import { mentorReviews } from "../db/schema.js";
import { sql } from "drizzle-orm";
import { authorIdentityService } from "./author-identity.service.js";
import { buildMentorThresholdView } from "./mentor-privacy.js";

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
      const thresholdView = buildMentorThresholdView(rows);

      return {
        name: professorId,
        requestedName: name,
        approvedCount,
        ...thresholdView,
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
