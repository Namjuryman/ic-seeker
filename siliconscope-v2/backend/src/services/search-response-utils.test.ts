import { describe, expect, it } from "vitest";
import { compactPaperAbstract } from "./search-response-utils.js";

describe("search response utils", () => {
  it("keeps short abstracts intact", () => {
    const row = compactPaperAbstract({ id: 1, abstract: "Short abstract." }, 80);
    expect(row.abstract).toBe("Short abstract.");
    expect(row.abstractFullLength).toBe(15);
    expect(row.abstractTruncated).toBe(false);
  });

  it("truncates long abstracts for list responses", () => {
    const full = Array.from({ length: 80 }, (_, index) => `term${index}`).join(" ");
    const row = compactPaperAbstract({ id: 2, abstract: full }, 120);
    expect(row.abstract.length).toBeLessThanOrEqual(123);
    expect(row.abstract.endsWith("...")).toBe(true);
    expect(row.abstractFullLength).toBe(full.length);
    expect(row.abstractTruncated).toBe(true);
  });
});
