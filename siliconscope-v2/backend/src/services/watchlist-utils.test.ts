import { describe, expect, it } from "vitest";
import {
  WATCHLIST_MAX_QUERY_JSON_SIZE,
  canonicalizeWatchlistQueryJson,
  isValidTargetType,
} from "./watchlist-utils.js";

describe("watchlist utilities", () => {
  it("canonicalizes saved-search query JSON independent of key order", () => {
    const a = canonicalizeWatchlistQueryJson({ field: "PMIC", q: "LDO", ignored: "x", yearFrom: 2020 });
    const b = canonicalizeWatchlistQueryJson({ ignored: "x", yearFrom: 2020, q: "LDO", field: "PMIC" });
    expect("error" in a).toBe(false);
    expect("error" in b).toBe(false);
    if ("error" in a || "error" in b) return;
    expect(a.json).toBe('{"field":"PMIC","q":"LDO","yearFrom":2020}');
    expect(a.hash).toBe(b.hash);
  });

  it("rejects invalid target types", () => {
    expect(isValidTargetType("company")).toBe(true);
    expect(isValidTargetType("mentor-blacklist")).toBe(false);
  });

  it("rejects query_json larger than 8KB", () => {
    const result = canonicalizeWatchlistQueryJson({ q: "x".repeat(WATCHLIST_MAX_QUERY_JSON_SIZE + 100) });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("too large");
  });
});
