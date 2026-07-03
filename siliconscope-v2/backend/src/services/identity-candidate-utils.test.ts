import { describe, expect, it } from "vitest";
import { buildAuthorCandidates, buildInstitutionCandidates, normalizeInstitutionKey } from "./identity-candidate-utils.js";

describe("identity candidate utilities", () => {
  it("normalizes institution noise", () => {
    expect(normalizeInstitutionKey("Dept. of EE, Tsinghua Univ.")).toContain("tsinghua university");
  });

  it("flags author aliases for review", () => {
    const rows = [
      { id: 1, title: "a", authors: "J. Wang; Alice Li", affiliations: "Tsinghua University" },
      { id: 2, title: "b", authors: "J Wang; Bob Chen", affiliations: "Tsinghua Univ." },
      { id: 3, title: "c", authors: "Jie Wang; Carol Xu", affiliations: "MIT" },
    ];
    const candidates = buildAuthorCandidates(rows, 1);
    expect(candidates.some((candidate) => candidate.normalizedKey.includes("wang") && candidate.needsReview)).toBe(true);
  });

  it("groups institution variants", () => {
    const rows = [
      { id: 1, title: "a", authors: "A", affiliations: "Tsinghua University" },
      { id: 2, title: "b", authors: "B", affiliations: "Tsinghua Univ." },
    ];
    const candidates = buildInstitutionCandidates(rows, 1);
    expect(candidates[0].aliases.length).toBeGreaterThan(1);
  });
});
