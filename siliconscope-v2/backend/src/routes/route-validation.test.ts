import { describe, expect, it } from "vitest";
import {
  aiEnrichmentRunBodySchema,
  contentQualitySyncBodySchema,
  learningContentUpdateBodySchema,
  moderationActionBodySchema,
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
});
