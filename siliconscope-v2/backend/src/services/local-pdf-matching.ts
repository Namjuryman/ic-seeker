export type LocalPdfCandidate = {
  filePath: string;
  fileName: string;
  fileSize: number;
  textSample?: string;
};

export type PaperMatchCandidate = {
  id: number;
  title: string;
  doi?: string;
  year?: number;
};

export type PdfMetadataGuess = {
  doiGuess: string;
  titleGuess: string;
  matchStatus: "matched" | "candidate" | "unmatched";
  matchConfidence: number;
  paperId?: number;
  reasons: string[];
};

const DOI_RE = /10\.\d{4,9}\/[A-Za-z0-9._;()/:+-]+/i;

export function extractDoiFromText(value: string): string {
  const match = String(value || "").match(DOI_RE);
  return match ? match[0].replace(/[.,;]+$/g, "") : "";
}

export function guessTitleFromFilename(fileName: string): string {
  return String(fileName || "")
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b(ieee|acm|springer|elsevier|arxiv|preprint|accepted|camera ready|download)\b/gi, " ")
    .replace(/\b20\d{2}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(value: string): string[] {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((token) => token.length >= 3 && !["the", "and", "for", "with", "using", "based"].includes(token));
}

function overlapScore(left: string, right: string): number {
  const a = new Set(normalizeTitle(left));
  const b = new Set(normalizeTitle(right));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return Math.round((100 * overlap) / Math.max(a.size, b.size));
}

export function scorePdfMatch(candidate: LocalPdfCandidate, papers: PaperMatchCandidate[]): PdfMetadataGuess {
  const text = [candidate.textSample || "", candidate.fileName].join("\n");
  const doiGuess = extractDoiFromText(text);
  const titleGuess = guessTitleFromFilename(candidate.fileName);
  const reasons: string[] = [];

  if (doiGuess) reasons.push("doi_detected");
  if (titleGuess) reasons.push("title_from_filename");

  let best: { paper: PaperMatchCandidate; score: number; reasons: string[] } | undefined;
  for (const paper of papers) {
    let score = 0;
    const paperReasons: string[] = [];
    if (doiGuess && paper.doi && doiGuess.toLowerCase() === paper.doi.toLowerCase()) {
      score += 95;
      paperReasons.push("doi_exact_match");
    }
    const titleScore = overlapScore(titleGuess, paper.title);
    if (titleScore >= 45) {
      score = Math.max(score, titleScore);
      paperReasons.push(`title_overlap_${titleScore}`);
    }
    if (!best || score > best.score) best = { paper, score, reasons: paperReasons };
  }

  const score = Math.max(0, Math.min(100, best?.score || 0));
  return {
    doiGuess,
    titleGuess,
    matchStatus: score >= 90 ? "matched" : score >= 55 ? "candidate" : "unmatched",
    matchConfidence: score,
    paperId: score >= 55 ? best?.paper.id : undefined,
    reasons: [...reasons, ...(best?.reasons || [])],
  };
}
