import { describe, expect, it } from "vitest";
import { computeMetadataConfidence, venueLooksConsistent } from "./paper-metadata-confidence.js";

describe("paper metadata confidence", () => {
  it("marks multi-source DOI-consistent papers as trusted or usable", () => {
    const result = computeMetadataConfidence({
      title: "A 0.6-V SAR ADC With Background Calibration",
      doi: "10.1109/JSSC.2024.1234567",
      year: 2024,
      venue: "JSSC",
      publicationTitle: "IEEE Journal of Solid-State Circuits",
      authors: ["Jane Doe", "John Smith"],
      affiliations: ["Tsinghua University"],
      sourceRecords: [
        { source: "openalex", doi: "https://doi.org/10.1109/JSSC.2024.1234567", title: "A 0.6-V SAR ADC With Background Calibration", year: 2024, authors: ["Jane Doe"] },
        { source: "crossref", doi: "10.1109/JSSC.2024.1234567", title: "A 0.6-V SAR ADC With Background Calibration", year: 2024, authors: ["John Smith"] },
      ],
    });
    expect(result.score).toBeGreaterThanOrEqual(82);
    expect(result.reviewRequired).toBe(false);
    expect(result.reasons).toContain("multi_source_provenance");
  });

  it("routes invalid DOI and venue mismatch to review", () => {
    const result = computeMetadataConfidence({
      title: "Suspicious Record",
      doi: "not-a-doi",
      year: 2035,
      venue: "ISSCC",
      publicationTitle: "Random Workshop",
      sourceRecords: [{ source: "csv", title: "Suspicious Record", year: 2035 }],
    });
    expect(result.reviewRequired).toBe(true);
    expect(result.flags).toContain("invalid_doi_format");
    expect(result.flags).toContain("implausible_year");
    expect(result.flags).toContain("venue_publication_title_mismatch");
  });

  it("recognizes IC venue aliases", () => {
    expect(venueLooksConsistent("ISSCC", "IEEE International Solid-State Circuits Conference Digest of Technical Papers")).toBe(true);
    expect(venueLooksConsistent("TCAD", "IEEE Transactions on Computer-Aided Design of Integrated Circuits and Systems")).toBe(true);
  });
});
