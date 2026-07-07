import { describe, expect, it } from "vitest";
import { generatePaperAiAnnotation, type PaperAiAnnotationResult } from "./paper-ai-provider.js";

const paper = {
  id: 1,
  title: "A 93% Efficient Dual-Path Hybrid DC-DC Converter",
  abstract: "A CMOS power-management converter for 12 V inputs reports 93% efficiency.",
  year: 2025,
  venue: "ISSCC",
  publication_title: "IEEE International Solid-State Circuits Conference",
  domain: "Power Management",
  doi: "10.1109/example",
  citation_count: 0,
};

const fallback: PaperAiAnnotationResult = {
  summaryZh: "Local summary",
  summaryEn: "Local summary",
  primaryDomain: "Power Management",
  labels: ["Power Management"],
  topics: [{ topicId: "pmic", label: "PMIC", confidence: 80, evidence: ["DC-DC"] }],
  entities: {},
  metrics: [{ name: "efficiency", value: "93%", context: "reports 93% efficiency" }],
  confidence: 0.8,
  needsReview: false,
  tokenInput: 10,
  tokenOutput: 5,
  costEstimateUsd: 0,
};

describe("generatePaperAiAnnotation", () => {
  it("keeps rule-local on the no-cost fallback path", async () => {
    const result = await generatePaperAiAnnotation({
      row: paper,
      provider: "rule-local",
      model: "heuristic-v1",
      fallback: () => fallback,
    });

    expect(result).toEqual(fallback);
  });

  it("rejects unsupported providers before any annotation write", async () => {
    await expect(generatePaperAiAnnotation({
      row: paper,
      provider: "mystery-provider",
      model: "unknown",
      fallback: () => fallback,
    })).rejects.toThrow("Unsupported AI enrichment provider");
  });
});

