import { dailyLessons, learningRoadmaps } from "../data/learning-catalog.js";
import type { DailyLessonSeed, LearningRoadmapSeed } from "../data/learning-catalog.js";
import { searchService } from "./search.service.js";

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
    } : null,
  };
}

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
    };
  },

  listRoadmaps() {
    return learningRoadmaps.map(summarizeRoadmap);
  },

  getRoadmap(slug: string) {
    const roadmap = learningRoadmaps.find((item) => item.slug === slug);
    if (!roadmap) return null;
    return {
      ...summarizeRoadmap(roadmap),
      lessons: dailyLessons.filter((lesson) => lesson.roadmapSlug === slug).map(lessonWithRoadmap),
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
    const roadmap = learningRoadmaps.find((item) => item.slug === slug);
    if (!roadmap) return null;
    const q = roadmap.relatedSearchQueries[0] || roadmap.title;
    return searchService.search({ q, field: roadmap.relatedTopics[0], semantic: "1", limit: String(limit), sort: "relevance" }, userId);
  },

  relatedPapersForLesson(id: string, userId = 0, limit = 8) {
    const lesson = dailyLessons.find((item) => item.id === id);
    if (!lesson) return null;
    const q = lesson.relatedSearchQueries[0] || lesson.title;
    return searchService.search({ q, field: lesson.relatedTopics[0], semantic: "1", limit: String(limit), sort: "relevance" }, userId);
  },
};
