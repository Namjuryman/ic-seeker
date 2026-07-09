import { describe, expect, it } from "vitest";
import {
  aiEnrichmentRunBodySchema,
  backupPruneBodySchema,
  billingPlanUpdateBodySchema,
  contentQualitySyncBodySchema,
  ingestionJobCreateBodySchema,
  learningContentUpdateBodySchema,
  moderationActionBodySchema,
  notificationCreateBodySchema,
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
      .toThrow(/Unrecognized key/);
  });

  it("bounds expensive AI enrichment batches", () => {
    expect(() => parseBody(aiEnrichmentRunBodySchema, { mode: "all", limit: 5001 }))
      .toThrow(/less than or equal to 5000/);
  });

  it("limits learning content payload size at the route boundary", () => {
    expect(() => parseBody(learningContentUpdateBodySchema, { payloadJson: "x".repeat(1_500_001) }))
      .toThrow(/at most 1500000/);
  });

  it("rejects ambiguous snapshot refresh requests", () => {
    expect(() => parseBody(snapshotRefreshBodySchema, { key: "all", keys: ["profiles:professors:top80"] }))
      .toThrow(/either key or keys/);
  });

  it("accepts known billing plans only", () => {
    expect(parseBody(billingPlanUpdateBodySchema, { planId: "lab" })).toEqual({ planId: "lab", reason: "" });
    expect(() => parseBody(billingPlanUpdateBodySchema, { planId: "god-mode" })).toThrow(/Invalid enum value/);
  });

  it("normalizes bounded backup retention", () => {
    expect(parseBody(backupPruneBodySchema, { keep: "7" })).toEqual({ keep: 7 });
    expect(() => parseBody(backupPruneBodySchema, { keep: 101 })).toThrow(/less than or equal to 100/);
  });

  it("validates ingestion job payload shape", () => {
    expect(parseBody(ingestionJobCreateBodySchema, { provider: "openalex", scope: { q: "adc" } }).provider).toBe("openalex");
    expect(() => parseBody(ingestionJobCreateBodySchema, { provider: "unknown" })).toThrow(/Invalid enum value/);
  });

  it("requires notification titles", () => {
    expect(() => parseBody(notificationCreateBodySchema, { severity: "info" })).toThrow(/title/);
  });
});
