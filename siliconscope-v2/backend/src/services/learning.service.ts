import { dailyLessons, learningRoadmaps, routeFamilies, commonFoundations } from "../data/learning-catalog.js";
import type { DailyLessonSeed, LearningRoadmapSeed } from "../data/learning-catalog.js";
import { searchService } from "./search.service.js";

const slugAliases: Record<string, string> = {
  "analog-foundations": "analog-mixed-signal",
  "data-converters": "analog-mixed-signal",
  "pll-clocking": "analog-mixed-signal",
  "wireline-serdes": "analog-mixed-signal",
  "digital-soc-accelerator": "digital-asic",
  "eda-cad-ai": "eda-tools",
};

function resolveSlug(slug: string): string {
  return slugAliases[slug] || slug;
}

function summarizeRoadmap(roadmap: LearningRoadmapSeed) {
  return {
    ...roadmap,
    stageCount: roadmap.stages.length,
    moduleCount: roadmap.stages.reduce((sum, stage) => sum + stage.modules.length, 0),
    lessonCount: dailyLessons.filter((lesson) => lesson.roadmapSlug === roadmap.slug).length,
  };
}

function lessonWithRoadmap(lesson: DailyLessonSeed) {
  const roadmap = learningRoadmaps.find((item) => item.slug === lesson.roadmapSlug);
  return {
    ...lesson,
    roadmap: roadmap ? {
      slug: roadmap.slug,
      title: roadmap.title,
      shortTitle: roadmap.shortTitle,
      domain: roadmap.domain,
      family: roadmap.family,
      foundation: roadmap.foundation,
    } : null,
  };
}


function validateLearningCatalog() {
  const errors: string[] = [];
  const warnings: string[] = [];
  const allSlugs = new Set(learningRoadmaps.map((r) => r.slug));

  // 0. slug duplicate check (fatal)
  const slugCounts = new Map<string, number>();
  for (const roadmap of learningRoadmaps) {
    slugCounts.set(roadmap.slug, (slugCounts.get(roadmap.slug) || 0) + 1);
  }
  for (const [slug, count] of slugCounts) {
    if (count > 1) {
      throw new Error(`[validateLearningCatalog] Fatal: duplicate roadmap slug "${slug}" appears ${count} times`);
    }
  }

  // 1. title / slug / stages non-empty; relatedVenues/relatedTopics/lessonPlaceholders warnings
  for (const roadmap of learningRoadmaps) {
    if (!roadmap.title || !roadmap.title.trim()) {
      errors.push(`Roadmap "${roadmap.slug}" has no title`);
    }
    if (!roadmap.slug || !roadmap.slug.trim()) {
      errors.push(`Roadmap has no slug (title: "${roadmap.title || "unknown"}")`);
    }
    if (!roadmap.stages || roadmap.stages.length === 0) {
      errors.push(`Roadmap "${roadmap.slug}" has no stages`);
    }
    if (!roadmap.relatedVenues || roadmap.relatedVenues.length === 0) {
      warnings.push(`Roadmap "${roadmap.slug}" has no relatedVenues`);
    }
    if (!roadmap.relatedTopics || roadmap.relatedTopics.length === 0) {
      warnings.push(`Roadmap "${roadmap.slug}" has no relatedTopics`);
    }
    for (const stage of roadmap.stages || []) {
      for (const mod of stage.modules || []) {
        if (!mod.lessonPlaceholders || mod.lessonPlaceholders.length === 0) {
          warnings.push(`Roadmap "${roadmap.slug}" module "${mod.id}" has no lessonPlaceholders`);
        }
      }
    }
  }

  // 2. routeFamilies reference valid route slugs
  for (const family of routeFamilies) {
    for (const routeId of family.routeIds) {
      if (!allSlugs.has(routeId)) {
        errors.push(`Route family "${family.id}" references unknown slug: "${routeId}"`);
      }
    }
  }

  // 3. dailyLessons reference valid roadmap slugs
  for (const lesson of dailyLessons) {
    if (!allSlugs.has(lesson.roadmapSlug)) {
      errors.push(`Daily lesson "${lesson.id}" references unknown roadmapSlug: "${lesson.roadmapSlug}"`);
    }
  }

  // 4. roadmap stage/module ids unique
  for (const roadmap of learningRoadmaps) {
    const ids = new Set<string>();
    for (const stage of roadmap.stages) {
      if (ids.has(stage.id)) {
        errors.push(`Roadmap "${roadmap.slug}" has duplicate stage id: "${stage.id}"`);
      }
      ids.add(stage.id);
      for (const mod of stage.modules) {
        if (ids.has(mod.id)) {
          errors.push(`Roadmap "${roadmap.slug}" has duplicate module id: "${mod.id}"`);
        }
        ids.add(mod.id);
      }
    }
  }

  // 5. paperQuery fallback (warning only — title is used as fallback in relatedPapersForRoadmap)
  for (const roadmap of learningRoadmaps) {
    if (!roadmap.paperQuery && !roadmap.relatedSearchQueries?.length) {
      warnings.push(`Roadmap "${roadmap.slug}" has no paperQuery and no relatedSearchQueries (will use title as fallback)`);
    }
  }

  if (warnings.length > 0) {
    console.warn("[validateLearningCatalog] Warnings found:", warnings.length);
    for (const w of warnings) console.warn("  -", w);
  }
  if (errors.length > 0) {
    console.error("[validateLearningCatalog] Errors found:", errors.length);
    for (const err of errors) console.error("  -", err);
  } else if (warnings.length === 0) {
    console.log("[validateLearningCatalog] OK — no issues found.");
  }
  return errors;
}

// Run validation at startup
validateLearningCatalog();

export const learningService = {
  getDashboard() {
    const today = this.getTodayLesson();
    return {
      generatedAt: new Date().toISOString(),
      caveats: {
        roadmap: "Learning roadmaps are structured guides for IC research preparation. They are not a substitute for textbooks, lectures, datasheets, or advisor guidance.",
        lesson: "Lessons are educational placeholders linked to SiliconScope metadata. Verify equations, specs, and paper interpretations before using them in design or research.",
        intelligence: "Related papers, authors, institutions, and venues are generated from metadata-based search and may be incomplete or noisy.",
      },
      summary: {
        roadmaps: learningRoadmaps.length,
        dailyLessons: dailyLessons.length,
        linkedTopics: new Set(learningRoadmaps.flatMap((roadmap) => roadmap.relatedTopics)).size,
        linkedVenues: new Set(learningRoadmaps.flatMap((roadmap) => roadmap.relatedVenues)).size,
      },
      featuredRoadmap: summarizeRoadmap(learningRoadmaps.find((roadmap) => roadmap.slug === "pmic") ?? learningRoadmaps[0]),
      today,
      roadmaps: learningRoadmaps.map(summarizeRoadmap),
      routeFamilies,
      commonFoundations,
    };
  },

  listRoadmaps() {
    return learningRoadmaps.map(summarizeRoadmap);
  },

  getRoadmap(slug: string) {
    const resolved = resolveSlug(slug);
    const roadmap = learningRoadmaps.find((item) => item.slug === resolved);
    if (!roadmap) return null;
    return {
      ...summarizeRoadmap(roadmap),
      canonicalSlug: roadmap.slug,
      lessons: dailyLessons.filter((lesson) => lesson.roadmapSlug === resolved).map(lessonWithRoadmap),
    };
  },

  listLessons(params: Record<string, string> = {}) {
    const roadmapSlug = params.roadmapSlug || params.roadmap;
    const rows = roadmapSlug ? dailyLessons.filter((lesson) => lesson.roadmapSlug === roadmapSlug) : dailyLessons;
    return rows.map(lessonWithRoadmap);
  },

  getLesson(id: string) {
    const lesson = dailyLessons.find((item) => item.id === id);
    return lesson ? lessonWithRoadmap(lesson) : null;
  },

  getTodayLesson(date = new Date()) {
    if (dailyLessons.length === 0) return null;
    const start = Date.UTC(2026, 0, 1);
    const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const day = Math.max(0, Math.floor((now - start) / 86_400_000));
    return lessonWithRoadmap(dailyLessons[day % dailyLessons.length]);
  },

  relatedPapersForRoadmap(slug: string, userId = 0, limit = 8) {
    const resolved = resolveSlug(slug);
    const roadmap = learningRoadmaps.find((item) => item.slug === resolved);
    if (!roadmap) return null;
    const q = roadmap.paperQuery || roadmap.relatedSearchQueries[0] || roadmap.title;
    return searchService.search({ q, field: roadmap.relatedTopics[0], semantic: "1", limit: String(limit), sort: "relevance" }, userId);
  },

  relatedPapersForLesson(id: string, userId = 0, limit = 8) {
    const lesson = dailyLessons.find((item) => item.id === id);
    if (!lesson) return null;
    const q = lesson.relatedSearchQueries[0] || lesson.title;
    return searchService.search({ q, field: lesson.relatedTopics[0], semantic: "1", limit: String(limit), sort: "relevance" }, userId);
  },
};
