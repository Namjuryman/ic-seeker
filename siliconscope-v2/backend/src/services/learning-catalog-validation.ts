export type LearningCatalogRoadmapLike = {
  slug: string;
  title: string;
  stages: Array<{ id: string; modules: Array<{ id: string; lessonPlaceholders?: string[] }> }>;
  relatedVenues?: string[];
  relatedTopics?: string[];
  paperQuery?: string;
  relatedSearchQueries?: string[];
};

export type LearningCatalogLessonLike = { id: string; roadmapSlug: string };
export type LearningCatalogRouteFamilyLike = { id: string; routeIds: string[] };

export function validateLearningCatalogSeeds(input: {
  roadmaps: LearningCatalogRoadmapLike[];
  lessons: LearningCatalogLessonLike[];
  routeFamilies: LearningCatalogRouteFamilyLike[];
}) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const allSlugs = new Set(input.roadmaps.map((r) => r.slug));

  const slugCounts = new Map<string, number>();
  for (const roadmap of input.roadmaps) {
    slugCounts.set(roadmap.slug, (slugCounts.get(roadmap.slug) || 0) + 1);
  }
  for (const [slug, count] of slugCounts) {
    if (count > 1) errors.push(`学习路线 slug "${slug}" 重复出现 ${count} 次`);
  }

  for (const roadmap of input.roadmaps) {
    if (!roadmap.title?.trim()) errors.push(`学习路线 "${roadmap.slug}" 缺少标题`);
    if (!roadmap.slug?.trim()) errors.push(`学习路线缺少 slug（标题：${roadmap.title || "未知"}）`);
    if (!roadmap.stages?.length) errors.push(`学习路线 "${roadmap.slug}" 缺少阶段`);
    if (!roadmap.relatedVenues?.length) warnings.push(`学习路线 "${roadmap.slug}" 缺少关联会议/期刊`);
    if (!roadmap.relatedTopics?.length) warnings.push(`学习路线 "${roadmap.slug}" 缺少关联方向`);
    if (!roadmap.paperQuery && !roadmap.relatedSearchQueries?.length) {
      warnings.push(`学习路线 "${roadmap.slug}" 缺少论文检索入口`);
    }
    const ids = new Set<string>();
    for (const stage of roadmap.stages || []) {
      if (ids.has(stage.id)) errors.push(`学习路线 "${roadmap.slug}" 的阶段 id 重复：${stage.id}`);
      ids.add(stage.id);
      for (const mod of stage.modules || []) {
        if (ids.has(mod.id)) errors.push(`学习路线 "${roadmap.slug}" 的模块 id 重复：${mod.id}`);
        ids.add(mod.id);
        if (!mod.lessonPlaceholders?.length) warnings.push(`学习路线 "${roadmap.slug}" 的模块 "${mod.id}" 缺少课程条目`);
      }
    }
  }

  for (const family of input.routeFamilies) {
    for (const routeId of family.routeIds) {
      if (!allSlugs.has(routeId)) errors.push(`路线分组 "${family.id}" 引用了不存在的路线 slug：${routeId}`);
    }
  }
  for (const lesson of input.lessons) {
    if (!allSlugs.has(lesson.roadmapSlug)) errors.push(`每日课程 "${lesson.id}" 引用了不存在的路线 slug：${lesson.roadmapSlug}`);
  }

  return { ok: errors.length === 0, errors, warnings };
}
