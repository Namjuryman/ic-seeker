import { describe, expect, it } from "vitest";
import {
  aiEnrichmentRunBodySchema,
  backupPruneBodySchema,
  billingCheckoutBodySchema,
  billingPlanUpdateBodySchema,
  contentQualitySyncBodySchema,
  importDoiBodySchema,
  ingestionJobCreateBodySchema,
  learningContentUpdateBodySchema,
  moderationActionBodySchema,
  notificationCreateBodySchema,
  paperAiSummaryBodySchema,
  parseBody,
  snapshotRefreshBodySchema,
} from "./route-validation.js";

describe("route body validation", () => {
  it("coerces bounded numeric admin inputs", () => {
    const body = parseBody(contentQualitySyncBodySchema, { scanLimit: "5000", sampleLimit: "25" });
    expect(body).toEqual({ scanLimit: 5000, sampleLimit: 25 });
  });

  it("rejects unknown admin write fields", () => {
    expect(() => parseBody(moderationActionBodySchema, { action: "restore", surprise: true }))
      .toThrow(/不支持字段：surprise/);
  });

  it("bounds expensive AI enrichment batches", () => {
    expect(() => parseBody(aiEnrichmentRunBodySchema, { mode: "all", limit: 5001 }))
      .toThrow(/数量上限: 数值不能超过 5000/);
  });

  it("limits learning content payload size at the route boundary", () => {
    expect(() => parseBody(learningContentUpdateBodySchema, { payloadJson: "x".repeat(1_500_001) }))
      .toThrow(/内容 JSON: 长度不能超过 1500000 个字符/);
  });

  it("rejects ambiguous snapshot refresh requests", () => {
    expect(() => parseBody(snapshotRefreshBodySchema, { key: "all", keys: ["profiles:professors:top80"] }))
      .toThrow(/key 和 keys 只能提供其中一个/);
  });

  it("accepts known billing plans only", () => {
    expect(parseBody(billingPlanUpdateBodySchema, { planId: "lab" })).toEqual({ planId: "lab", reason: "" });
    expect(() => parseBody(billingPlanUpdateBodySchema, { planId: "god-mode" })).toThrow(/方案: 取值无效/);
  });

  it("validates billing checkout plan IDs", () => {
    expect(parseBody(billingCheckoutBodySchema, { planId: "pro" })).toEqual({ planId: "pro" });
    expect(() => parseBody(billingCheckoutBodySchema, { planId: "" })).toThrow(/方案: 取值无效/);
  });

  it("validates paper write payloads", () => {
    expect(parseBody(paperAiSummaryBodySchema, { refresh: "true" })).toEqual({ refresh: true });
    expect(parseBody(paperAiSummaryBodySchema, { refresh: "false" })).toEqual({ refresh: false });
    expect(() => parseBody(paperAiSummaryBodySchema, { provider: "x".repeat(81) })).toThrow(/服务提供方: 长度不能超过 80 个字符/);
    expect(parseBody(importDoiBodySchema, { doi: " 10.1109/example " })).toEqual({ doi: "10.1109/example" });
    expect(() => parseBody(importDoiBodySchema, {})).toThrow(/DOI 不能为空/);
  });

  it("normalizes bounded backup retention", () => {
    expect(parseBody(backupPruneBodySchema, { keep: "7" })).toEqual({ keep: 7 });
    expect(() => parseBody(backupPruneBodySchema, { keep: 101 })).toThrow(/保留数量: 数值不能超过 100/);
  });

  it("validates ingestion job payload shape", () => {
    expect(parseBody(ingestionJobCreateBodySchema, { provider: "openalex", scope: { q: "adc" } }).provider).toBe("openalex");
    expect(() => parseBody(ingestionJobCreateBodySchema, { provider: "unknown" })).toThrow(/服务提供方: 取值无效/);
  });

  it("requires notification titles", () => {
    expect(() => parseBody(notificationCreateBodySchema, { severity: "info" })).toThrow(/标题: 不能为空/);
  });
});
