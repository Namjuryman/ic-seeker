import { searchService } from "./search.service.js";
import { learningContentService } from "./learning-content.service.js";
import type { DailyLessonSeed, LearningRoadmapSeed } from "./learning-content.service.js";

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

function activeContent() {
  return learningContentService.activeContent();
}

function summarizeRoadmap(roadmap: LearningRoadmapSeed, lessons: DailyLessonSeed[]) {
  return {
    ...roadmap,
    stageCount: roadmap.stages.length,
    moduleCount: roadmap.stages.reduce((sum, stage) => sum + stage.modules.length, 0),
    lessonCount: lessons.filter((lesson) => lesson.roadmapSlug === roadmap.slug).length,
  };
}

function lessonWithRoadmap(lesson: DailyLessonSeed, roadmaps: LearningRoadmapSeed[]) {
  const roadmap = roadmaps.find((item) => item.slug === lesson.roadmapSlug);
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

export const learningService = {
  getDashboard() {
    const { roadmaps, lessons, routeFamilies, commonFoundations } = activeContent();
    const today = this.getTodayLesson();
    return {
      generatedAt: new Date().toISOString(),
      caveats: {
        roadmap: "Learning roadmaps are structured guides for IC research preparation. They are not a substitute for textbooks, lectures, datasheets, or advisor guidance.",
        lesson: "Lessons are educational placeholders linked to SiliconScope metadata. Verify equations, specs, and paper interpretations before using them in design or research.",
        intelligence: "Related papers, authors, institutions, and venues are generated from metadata-based search and may be incomplete or noisy.",
      },
      summary: {
        roadmaps: roadmaps.length,
        dailyLessons: lessons.length,
        linkedTopics: new Set(roadmaps.flatMap((roadmap) => roadmap.relatedTopics)).size,
        linkedVenues: new Set(roadmaps.flatMap((roadmap) => roadmap.relatedVenues)).size,
      },
      featuredRoadmap: summarizeRoadmap(roadmaps.find((roadmap) => roadmap.slug === "pmic") ?? roadmaps[0], lessons),
      today,
      roadmaps: roadmaps.map((roadmap) => summarizeRoadmap(roadmap, lessons)),
      routeFamilies,
      commonFoundations,
    };
  },

  listRoadmaps() {
    const { roadmaps, lessons } = activeContent();
    return roadmaps.map((roadmap) => summarizeRoadmap(roadmap, lessons));
  },

  getRoadmap(slug: string) {
    const { roadmaps, lessons } = activeContent();
    const resolved = resolveSlug(slug);
    const roadmap = roadmaps.find((item) => item.slug === resolved);
    if (!roadmap) return null;
    return {
      ...summarizeRoadmap(roadmap, lessons),
      canonicalSlug: roadmap.slug,
      lessons: lessons.filter((lesson) => lesson.roadmapSlug === resolved).map((lesson) => lessonWithRoadmap(lesson, roadmaps)),
    };
  },

  listLessons(params: Record<string, string> = {}) {
    const { roadmaps, lessons } = activeContent();
    const roadmapSlug = params.roadmapSlug || params.roadmap;
    const rows = roadmapSlug ? lessons.filter((lesson) => lesson.roadmapSlug === roadmapSlug) : lessons;
    return rows.map((lesson) => lessonWithRoadmap(lesson, roadmaps));
  },

  getLesson(id: string) {
    const { roadmaps, lessons } = activeContent();
    const lesson = lessons.find((item) => item.id === id);
    return lesson ? lessonWithRoadmap(lesson, roadmaps) : null;
  },

  getTodayLesson(date = new Date()) {
    const { roadmaps, lessons } = activeContent();
    if (lessons.length === 0) return null;
    const start = Date.UTC(2026, 0, 1);
    const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const day = Math.max(0, Math.floor((now - start) / 86_400_000));
    return lessonWithRoadmap(lessons[day % lessons.length], roadmaps);
  },

  relatedPapersForRoadmap(slug: string, userId = 0, limit = 8) {
    const { roadmaps } = activeContent();
    const resolved = resolveSlug(slug);
    const roadmap = roadmaps.find((item) => item.slug === resolved);
    if (!roadmap) return null;
    const q = roadmap.paperQuery || roadmap.relatedSearchQueries[0] || roadmap.title;
    return searchService.search({ q, field: roadmap.relatedTopics[0], semantic: "1", limit: String(limit), sort: "relevance" }, userId);
  },

  relatedPapersForLesson(id: string, userId = 0, limit = 8) {
    const { lessons } = activeContent();
    const lesson = lessons.find((item) => item.id === id);
    if (!lesson) return null;
    const q = lesson.relatedSearchQueries[0] || lesson.title;
    return searchService.search({ q, field: lesson.relatedTopics[0], semantic: "1", limit: String(limit), sort: "relevance" }, userId);
  },

  listRouteFamilies() {
    return activeContent().routeFamilies;
  },

  listFoundations() {
    return activeContent().commonFoundations;
  },
};
