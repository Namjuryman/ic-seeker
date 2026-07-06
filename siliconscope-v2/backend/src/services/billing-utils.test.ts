import { describe, expect, it } from "vitest";
import { evaluateQuota } from "./billing-utils.js";

describe("billing quota evaluation", () => {
  it("allows unlimited limits", () => {
    expect(evaluateQuota({ metric: "exportsPerMonth", planName: "Lab", limit: -1, used: 9999 })).toMatchObject({ allowed: true, remaining: null });
  });

  it("rejects usage over quota with a clear reason", () => {
    const result = evaluateQuota({ metric: "readingQueueItems", planName: "Free Preview", limit: 3, used: 3, increment: 1 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toContain("readingQueueItems quota exceeded");
  });

  it("allows exact-boundary increments and reports remaining before consumption", () => {
    const result = evaluateQuota({ metric: "dailyAiReports", planName: "Builder", limit: 10, used: 8, increment: 2 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.reason).toBeUndefined();
  });

  it("rejects batch increments that cross the quota even when remaining is nonzero", () => {
    const result = evaluateQuota({ metric: "exportsPerMonth", planName: "Free Preview", limit: 10, used: 9, increment: 2 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(1);
  });
});
