import { describe, expect, it } from "vitest";
import { validateLearningCatalogSeeds } from "./learning-catalog-validation.js";
import { learningRoadmaps, dailyLessons, routeFamilies } from "../data/learning-catalog-v3.js";

describe("learning catalog validation", () => {
  it("accepts the shipped learning catalog seeds", () => {
    const result = validateLearningCatalogSeeds({ roadmaps: learningRoadmaps, lessons: dailyLessons, routeFamilies });
    expect(result.errors).toEqual([]);
  });

  it("detects broken lesson references", () => {
    const result = validateLearningCatalogSeeds({
      roadmaps: [{ slug: "pmic", title: "PMIC", stages: [{ id: "s1", modules: [{ id: "m1", lessonPlaceholders: ["lesson"] }] }], relatedTopics: ["PMIC"], relatedVenues: ["ISSCC"], paperQuery: "PMIC" }],
      lessons: [{ id: "bad", roadmapSlug: "missing" }],
      routeFamilies: [],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("unknown roadmapSlug");
  });
});
