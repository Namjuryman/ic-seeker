import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor, paginationInfo, searchRelaxations, stableSort } from "./search-pagination-utils.js";

describe("search pagination utilities", () => {
  it("normalizes supported sort modes for cursor pagination", () => {
    expect(stableSort("relevance")).toBe("score");
    expect(stableSort("score")).toBe("score");
    expect(stableSort("year")).toBe("year");
    expect(stableSort("citations")).toBe("citations");
    expect(stableSort("title")).toBeNull();
  });

  it("round-trips cursors and rejects stale sort modes", () => {
    const cursor = encodeCursor({ id: 42, score: 193.5, year: 2025, citationCount: 17 }, "score");
    expect(decodeCursor(cursor, "score")).toEqual({
      sort: "score",
      id: 42,
      score: 193.5,
      year: 2025,
      citationCount: 17,
    });
    expect(decodeCursor(cursor, "year")).toBeNull();
    expect(decodeCursor("not-json", "score")).toBeNull();
  });

  it("preserves optional FTS search ranks in cursors", () => {
    const cursor = encodeCursor({ id: 42, score: 193.5, year: 2025, citationCount: 17, searchRank: -8.25 }, "score");
    expect(decodeCursor(cursor, "score")).toEqual({
      sort: "score",
      id: 42,
      score: 193.5,
      year: 2025,
      citationCount: 17,
      searchRank: -8.25,
    });
  });


  it("adds nextCursor only when a stable next page exists", () => {
    const page = paginationInfo({
      mode: "offset",
      limit: 2,
      offset: 0,
      total: 3,
      sort: "score",
      rows: [
        { id: 3, score: 200, year: 2026, citationCount: 20 },
        { id: 2, score: 180, year: 2025, citationCount: 10 },
      ],
    });
    expect(page.hasNextPage).toBe(true);
    expect(page.nextCursor).toBeTruthy();

    const tail = paginationInfo({
      mode: "offset",
      limit: 2,
      offset: 2,
      total: 3,
      sort: "score",
      rows: [{ id: 1, score: 170, year: 2024, citationCount: 1 }],
    });
    expect(tail.hasNextPage).toBe(false);
    expect(tail.nextCursor).toBeUndefined();
  });

  it("returns bounded relaxations without carrying offset or cursor", () => {
    const relaxations = searchRelaxations({
      q: "pll",
      venue: "ISSCC",
      field: "RF/mmWave & Wireline",
      rank: "S+",
      yearFrom: "2024",
      yearTo: "2026",
      minCitations: "20",
      semantic: "0",
      offset: "80",
      cursor: "abc",
    });
    expect(relaxations).toHaveLength(5);
    expect(relaxations.map((item) => item.label)).toContain("移除会议/期刊筛选");
    expect(relaxations[0].params).not.toHaveProperty("offset");
    expect(relaxations[0].params).not.toHaveProperty("cursor");
  });
});
