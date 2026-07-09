import { describe, expect, it } from "vitest";
import { searchService } from "./search.service.js";

describe("FTS search pagination", () => {
  it("uses keyset pagination after the first FTS page", () => {
    const first = searchService.search({ q: "adc", semantic: "0", limit: "3" }, 0);
    expect(first.rows.length).toBeGreaterThan(0);
    expect(first.pagination.nextCursor).toBeTruthy();

    const second = searchService.search({
      q: "adc",
      semantic: "0",
      limit: "3",
      cursor: String(first.pagination.nextCursor),
    }, 0);

    expect(second.pagination.mode).toBe("keyset");
    expect(second.offset).toBe(0);
    const firstIds = new Set(first.rows.map((row) => row.id));
    expect(second.rows.every((row) => !firstIds.has(row.id))).toBe(true);
  });
});
