import { describe, expect, it } from "vitest";
import { buildMentorThresholdView } from "./mentor-privacy.js";

function review(overall: number, text = "Great research fit from 2024, contact me at user@example.com") {
  return {
    structuredScoresJson: JSON.stringify({ overall, research_fit: overall, communication: overall }),
    strengthsText: text,
    cautionsText: "Caution text",
    fitText: "Fit text",
  };
}

describe("mentor privacy thresholds", () => {
  it("hides aggregate and summary when fewer than 3 approved reviews exist", () => {
    const view = buildMentorThresholdView([review(5), review(4)]);
    expect(view.visibilityLevel).toBe("insufficient");
    expect(view.aggregate).toBeNull();
    expect(view.summary).toBeNull();
    expect(view.curatedComments).toEqual([]);
  });

  it("shows aggregate only for 3 to 4 approved reviews", () => {
    const view = buildMentorThresholdView([review(5), review(4), review(3)]);
    expect(view.visibilityLevel).toBe("aggregate");
    expect(view.aggregate?.overall).toBe(4);
    expect(view.summary).toBeNull();
    expect(view.curatedComments).toEqual([]);
  });

  it("shows threshold-safe structured summary but no curated comments for 5 to 9 reviews", () => {
    const view = buildMentorThresholdView(Array.from({ length: 7 }, () => review(4, "Raw nickname and University 2024 should not be copied")));
    expect(view.visibilityLevel).toBe("summary");
    expect(view.summary).toContain("Threshold-safe summary");
    expect(view.summary).not.toContain("Raw nickname");
    expect(view.summary).not.toContain("University 2024");
    expect(view.curatedComments).toEqual([]);
  });

  it("curates anonymized and sanitized comments only at 10 or more reviews", () => {
    const view = buildMentorThresholdView(Array.from({ length: 10 }, () => review(5)));
    expect(view.visibilityLevel).toBe("curated");
    expect(view.curatedComments.length).toBeGreaterThan(0);
    expect(view.curatedComments[0].publicAlias).toBe("Anonymous verified reviewer");
    expect(view.curatedComments[0].text).not.toContain("user@example.com");
    expect(view.curatedComments[0].text).not.toContain("2024");
  });
});
