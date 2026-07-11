import { appDb } from "../db/app-db.js";
import { mentorReviews } from "../db/schema.js";
import { sql } from "drizzle-orm";
import { authorIdentityService } from "./author-identity.service.js";
import { buildMentorThresholdView } from "./mentor-privacy.js";

export const mentorCompareService = {
  compare(names: string[]) {
    const unique = [...new Set(names)].slice(0, 4);
    if (unique.length < 2) throw new Error("请至少输入 2 位研究者再进行对比。");

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
        caveat: "研究者/课题组对比基于通过审核的匿名评价，并设置最低样本保护；适合了解课题组体验和匹配度，不用于排名或人身攻击。",
      };
    });

    return {
      mentors,
      caveat: "研究者/课题组对比来自已审核匿名反馈，并设置最低样本保护；适合了解课题组体验和匹配度，不用于排名或人身攻击。",
    };
  },
};
