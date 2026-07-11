import { describe, expect, it } from "vitest";
import { csv, topicCsv, topicMarkdown } from "./export-format-utils.js";

const report = {
  field: "PMIC",
  overview: { totalPapers: 2, recentPapers: 1, yearRange: "2020-2024" },
  trend: [{ year: 2024, count: 1 }],
  topVenues: [{ key: "ISSCC", count: 1 }],
  representativePapers: [{ title: "A, B", year: 2024, venue: "ISSCC", rank: "S+", field: "PMIC", doi: "10.1/test" }],
  activeAuthors: [{ name: "Ada", papers: 1, scoreSum: 95, citations: 10 }],
  strongInstitutions: [{ name: "Example University", papers: 1, scoreSum: 95, citations: 10 }],
  relatedCompanies: [{ id: "co-1", name: "Example Semi", confidence: 80 }],
  relatedRoadmaps: [{ slug: "pmic", title: "PMIC Roadmap" }],
  caveat: "metadata caveat",
};

describe("export format utilities", () => {
  it("escapes CSV cells", () => {
    expect(csv(["a", "b"], [["hello, world", "x"]])).toBe('a,b\n"hello, world",x');
  });

  it("includes metadata, filters, caveat, and representative paper rows in topic CSV", () => {
    const out = topicCsv(report, "2026-06-30T00:00:00.000Z");
    expect(out).toContain("生成时间");
    expect(out).toContain("筛选条件,方向,PMIC");
    expect(out).toContain("使用提示,说明,metadata caveat");
    expect(out).toContain('论文,"A, B",2024,ISSCC,S+,PMIC,10.1/test');
  });

  it("includes AI/report verification disclaimer in markdown", () => {
    const out = topicMarkdown(report, "2026-06-30T00:00:00.000Z");
    expect(out).toContain("本报告由 SiliconScope 元数据和用户输入生成");
    expect(out).toContain("代表论文");
  });
});
