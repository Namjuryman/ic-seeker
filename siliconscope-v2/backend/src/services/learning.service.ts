import { searchService } from "./search.service.js";
import { learningContentService } from "./learning-content.service.js";
import {
  localizeFoundationsDisplay,
  localizeLessonsDisplay,
  localizeRoadmapsDisplay,
  localizeRouteFamiliesDisplay,
} from "./learning-display-localization.js";
import type { DailyLessonSeed, LearningRoadmapSeed } from "./learning-content.service.js";

const slugAliases: Record<string, string> = {
  "analog-foundations": "analog-mixed-signal",
  "pll-clocking": "clocking-pll-timing",
  "digital-soc-accelerator": "digital-asic",
  "eda-cad-ai": "eda-tools",
};

function resolveSlug(slug: string, roadmaps: LearningRoadmapSeed[]): string {
  if (roadmaps.some((roadmap) => roadmap.slug === slug)) return slug;
  return slugAliases[slug] || slug;
}

function activeContent() {
  return learningContentService.activeContent();
}

function activeDisplayContent() {
  const { roadmaps, lessons, routeFamilies, commonFoundations } = activeContent();
  return {
    roadmaps: localizeRoadmapsDisplay(roadmaps),
    lessons: localizeLessonsDisplay(lessons),
    routeFamilies: localizeRouteFamiliesDisplay(routeFamilies),
    commonFoundations: localizeFoundationsDisplay(commonFoundations),
  };
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
    const { roadmaps, lessons, routeFamilies, commonFoundations } = activeDisplayContent();
    const today = this.getTodayLesson();
    return {
      generatedAt: new Date().toISOString(),
      caveats: {
        roadmap: "学习路线用于组织 IC 研究准备，不替代教材、课程、数据手册或指导教师建议。",
        lesson: "课程内容会关联 SiliconScope 元数据；用于设计或研究前，请复核公式、指标和论文解读。",
        intelligence: "相关论文、作者、机构和会议来自元数据检索，可能存在缺漏或噪声。",
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
    const { roadmaps, lessons } = activeDisplayContent();
    return roadmaps.map((roadmap) => summarizeRoadmap(roadmap, lessons));
  },

  getRoadmap(slug: string) {
    const { roadmaps, lessons } = activeDisplayContent();
    const resolved = resolveSlug(slug, roadmaps);
    const roadmap = roadmaps.find((item) => item.slug === resolved);
    if (!roadmap) return null;
    return {
      ...summarizeRoadmap(roadmap, lessons),
      canonicalSlug: roadmap.slug,
      lessons: lessons.filter((lesson) => lesson.roadmapSlug === resolved).map((lesson) => lessonWithRoadmap(lesson, roadmaps)),
    };
  },

  listLessons(params: Record<string, string> = {}) {
    const { roadmaps, lessons } = activeDisplayContent();
    const roadmapSlug = params.roadmapSlug || params.roadmap;
    const rows = roadmapSlug ? lessons.filter((lesson) => lesson.roadmapSlug === roadmapSlug) : lessons;
    return rows.map((lesson) => lessonWithRoadmap(lesson, roadmaps));
  },

  getLesson(id: string) {
    const { roadmaps, lessons } = activeDisplayContent();
    const lesson = lessons.find((item) => item.id === id);
    return lesson ? lessonWithRoadmap(lesson, roadmaps) : null;
  },

  getTodayLesson(date = new Date()) {
    const { roadmaps, lessons } = activeDisplayContent();
    if (lessons.length === 0) return null;
    const start = Date.UTC(2026, 0, 1);
    const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const day = Math.max(0, Math.floor((now - start) / 86_400_000));
    return lessonWithRoadmap(lessons[day % lessons.length], roadmaps);
  },

  relatedPapersForRoadmap(slug: string, userId = 0, limit = 8) {
    const { roadmaps } = activeContent();
    const resolved = resolveSlug(slug, roadmaps);
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
    return localizeRouteFamiliesDisplay(activeContent().routeFamilies);
  },

  listFoundations() {
    return localizeFoundationsDisplay(activeContent().commonFoundations);
  },
};
