import { describe, expect, it } from "vitest";
import { extractDoiFromText, guessTitleFromFilename, scorePdfMatch } from "./local-pdf-matching.js";

describe("local PDF matching", () => {
  it("extracts DOI from noisy text", () => {
    expect(extractDoiFromText("Downloaded from publisher doi:10.1109/JSSC.2024.1234567.")).toBe("10.1109/JSSC.2024.1234567");
  });

  it("guesses readable title from filename", () => {
    expect(guessTitleFromFilename("2024_ieee_A_0.6-V_SAR_ADC_preprint.pdf")).toBe("A 0.6 V SAR ADC");
  });

  it("prefers exact DOI match over filename title", () => {
    const match = scorePdfMatch(
      { filePath: "/local/a.pdf", fileName: "random.pdf", fileSize: 100, textSample: "10.1109/JSSC.2024.1234567" },
      [{ id: 7, title: "A Great ADC", doi: "10.1109/JSSC.2024.1234567" }],
    );
    expect(match.matchStatus).toBe("matched");
    expect(match.paperId).toBe(7);
  });
});
