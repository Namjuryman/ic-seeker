import { describe, expect, it } from "vitest";
import { authorIdentityService } from "./author-identity.service.js";

describe("author identity matching", () => {
  it("matches compact and hyphenated romanized given names", () => {
    expect(authorIdentityService.sameAuthor("Wen-Liang Zeng", "Wenliang Zeng")).toBe(true);
    expect(authorIdentityService.sameAuthor("Chi-Seng Lam", "Chiseng Lam")).toBe(true);
    expect(authorIdentityService.sameAuthor("Wei zeng Li", "Weizeng Li")).toBe(true);
  });

  it("matches explicit and conservative surname-first variants", () => {
    expect(authorIdentityService.sameAuthor("Zeng, Wen-Liang", "Wenliang Zeng")).toBe(true);
    expect(authorIdentityService.sameAuthor("Zeng Wen Liang", "Wen-Liang Zeng")).toBe(true);
  });

  it("keeps short initial-only names conservative", () => {
    expect(authorIdentityService.sameAuthor("W. Zeng", "Wenliang Zeng")).toBe(false);
    expect(authorIdentityService.sameAuthor("Zeng Wenliang", "Wenliang Zeng")).toBe(false);
    expect(authorIdentityService.sameAuthor("Weizeng Li", "Weizeng Liu")).toBe(false);
  });

  it("uses the family name as a broad SQL search term", () => {
    expect(authorIdentityService.searchTermsFor("Wenliang Zeng")).toContain("zeng");
  });
});
