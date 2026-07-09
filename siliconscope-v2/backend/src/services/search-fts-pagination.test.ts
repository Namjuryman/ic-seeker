import { describe, expect, it } from "vitest";
import { paperService } from "./paper.service.js";
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

  it("returns compact abstracts in search while preserving full paper details", () => {
    const result = searchService.search({ q: "adc", semantic: "0", limit: "20" }, 0);
    const row = result.rows.find((item) => Number(item.abstractFullLength || 0) > String(item.abstract || "").length) as any;

    expect(row).toBeTruthy();
    expect(String(row?.abstract || "").length).toBeLessThanOrEqual(603);
    expect(row?.abstractTruncated).toBe(true);

    const detail = paperService.getPaper(Number(row?.id), 0) as any;
    expect(String(detail?.abstract || "").length).toBe(Number(row?.abstractFullLength));
  });
});
