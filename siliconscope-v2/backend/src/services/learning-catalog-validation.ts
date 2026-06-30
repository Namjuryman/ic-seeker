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
    if (count > 1) errors.push(`duplicate roadmap slug "${slug}" appears ${count} times`);
  }

  for (const roadmap of input.roadmaps) {
    if (!roadmap.title?.trim()) errors.push(`Roadmap "${roadmap.slug}" has no title`);
    if (!roadmap.slug?.trim()) errors.push(`Roadmap has no slug (title: "${roadmap.title || "unknown"}")`);
    if (!roadmap.stages?.length) errors.push(`Roadmap "${roadmap.slug}" has no stages`);
    if (!roadmap.relatedVenues?.length) warnings.push(`Roadmap "${roadmap.slug}" has no relatedVenues`);
    if (!roadmap.relatedTopics?.length) warnings.push(`Roadmap "${roadmap.slug}" has no relatedTopics`);
    if (!roadmap.paperQuery && !roadmap.relatedSearchQueries?.length) {
      warnings.push(`Roadmap "${roadmap.slug}" has no paperQuery and no relatedSearchQueries`);
    }
    const ids = new Set<string>();
    for (const stage of roadmap.stages || []) {
      if (ids.has(stage.id)) errors.push(`Roadmap "${roadmap.slug}" has duplicate stage id: "${stage.id}"`);
      ids.add(stage.id);
      for (const mod of stage.modules || []) {
        if (ids.has(mod.id)) errors.push(`Roadmap "${roadmap.slug}" has duplicate module id: "${mod.id}"`);
        ids.add(mod.id);
        if (!mod.lessonPlaceholders?.length) warnings.push(`Roadmap "${roadmap.slug}" module "${mod.id}" has no lessonPlaceholders`);
      }
    }
  }

  for (const family of input.routeFamilies) {
    for (const routeId of family.routeIds) {
      if (!allSlugs.has(routeId)) errors.push(`Route family "${family.id}" references unknown slug: "${routeId}"`);
    }
  }
  for (const lesson of input.lessons) {
    if (!allSlugs.has(lesson.roadmapSlug)) errors.push(`Daily lesson "${lesson.id}" references unknown roadmapSlug: "${lesson.roadmapSlug}"`);
  }

  return { ok: errors.length === 0, errors, warnings };
}
