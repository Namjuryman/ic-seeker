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
});
