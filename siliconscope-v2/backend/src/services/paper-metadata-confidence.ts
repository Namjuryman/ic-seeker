import { createHash } from "node:crypto";

export type PaperSourceEvidence = {
  source: string;
  sourceId?: string;
  sourceUrl?: string;
  doi?: string;
  title?: string;
  venue?: string;
  publicationTitle?: string;
  year?: number;
  authors?: string[];
  affiliations?: string[];
  rawHash?: string;
};

export type MetadataConfidenceInput = {
  id?: number;
  title: string;
  doi?: string;
  venue?: string;
  publicationTitle?: string;
  year?: number;
  authors?: string[];
  affiliations?: string[];
  sourceRecords?: PaperSourceEvidence[];
};

export type MetadataConfidenceResult = {
  score: number;
  status: "trusted" | "usable" | "needs_review" | "blocked";
  reviewRequired: boolean;
  flags: string[];
  reasons: string[];
  provenanceScore: number;
  sourceCount: number;
};

const DOI_RE = /^10\.\d{4,9}\/[\S]+$/i;
const CURRENT_YEAR = new Date().getFullYear();

const VENUE_RULES: Array<{ label: string; aliases: string[]; negative?: string[] }> = [
  { label: "ISSCC", aliases: ["isscc", "solid-state circuits conference", "international solid-state circuits"] },
  { label: "JSSC", aliases: ["journal of solid-state circuits", "jssc", "solid-state circuits"] },
  { label: "CICC", aliases: ["custom integrated circuits", "cicc"] },
  { label: "VLSI", aliases: ["vlsi", "very large scale integration", "symposium on vlsi"] },
  { label: "DAC", aliases: ["design automation conference", "dac"] },
  { label: "DATE", aliases: ["design automation and test in europe", "date"] },
  { label: "TCAD", aliases: ["computer-aided design", "tcad"] },
  { label: "IEDM", aliases: ["electron devices meeting", "iedm"] },
  { label: "ESSCIRC", aliases: ["esscirc", "solid-state circuits conference"] },
  { label: "RFIC", aliases: ["radio frequency integrated circuits", "rfic"] },
];

function normalizeText(value: unknown): string {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/doi\.org\//g, "")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[^\p{L}\p{N}./-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeDoiForConfidence(value: unknown): string {
  return normalizeText(value).replace(/^doi:\s*/i, "").replace(/[.;,]+$/g, "");
}

function tokenizeTitle(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter((token) => token.length >= 3 && !["with", "from", "using", "based", "and", "the", "for"].includes(token)),
  );
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / (a.size + b.size - overlap);
}

function compactList(values?: string[]) {
  return (values || []).map((value) => normalizeText(value)).filter(Boolean);
}

function hasOverlap(left?: string[], right?: string[]) {
  const a = new Set(compactList(left));
  const b = new Set(compactList(right));
  if (!a.size || !b.size) return false;
  for (const item of a) if (b.has(item)) return true;
  return false;
}

function canonicalVenue(value: string): string {
  const normalized = normalizeText(value);
  for (const rule of VENUE_RULES) {
    if (rule.aliases.some((alias) => normalized.includes(alias))) return rule.label;
  }
  return normalized;
}

export function venueLooksConsistent(venue?: string, publicationTitle?: string): boolean {
  const v = normalizeText(venue);
  const p = normalizeText(publicationTitle);
  if (!v || !p) return true;
  const canonicalVenueName = canonicalVenue(v);
  if (!canonicalVenueName || canonicalVenueName === p) return true;
  const rule = VENUE_RULES.find((item) => item.label.toLowerCase() === canonicalVenueName.toLowerCase());
  if (!rule) return p.includes(v) || v.includes(p);
  return rule.aliases.some((alias) => p.includes(alias));
}

export function stableEvidenceHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

function classify(score: number, flags: string[]): MetadataConfidenceResult["status"] {
  if (flags.includes("invalid_doi_format") || flags.includes("implausible_year")) return score >= 55 ? "needs_review" : "blocked";
  if (score >= 82) return "trusted";
  if (score >= 60) return "usable";
  return "needs_review";
}

export function computeMetadataConfidence(input: MetadataConfidenceInput): MetadataConfidenceResult {
  const flags = new Set<string>();
  const reasons: string[] = [];
  let score = 18;

  const doi = normalizeDoiForConfidence(input.doi);
  const sourceRecords = input.sourceRecords || [];
  const sourceCount = new Set(sourceRecords.map((record) => record.source).filter(Boolean)).size || 0;
  const paperTitleTokens = tokenizeTitle(input.title);

  if (input.title?.trim()) {
    score += 10;
    reasons.push("title_present");
  } else {
    flags.add("missing_title");
    score -= 30;
  }

  if (doi) {
    if (DOI_RE.test(doi)) {
      score += 16;
      reasons.push("doi_format_valid");
    } else {
      flags.add("invalid_doi_format");
      score -= 14;
    }
  } else {
    flags.add("missing_doi");
  }

  const year = Number(input.year || 0);
  if (year >= 1950 && year <= CURRENT_YEAR + 1) {
    score += 8;
    reasons.push("year_plausible");
  } else {
    flags.add("implausible_year");
    score -= 12;
  }

  if (input.venue || input.publicationTitle) {
    score += 7;
    reasons.push("venue_present");
  } else {
    flags.add("missing_venue");
  }

  if (!venueLooksConsistent(input.venue, input.publicationTitle)) {
    flags.add("venue_publication_title_mismatch");
    score -= 12;
  } else if (input.venue && input.publicationTitle) {
    score += 6;
    reasons.push("venue_publication_title_consistent");
  }

  if ((input.authors || []).length) {
    score += 8;
    reasons.push("authors_present");
  } else {
    flags.add("missing_authors");
  }

  if ((input.affiliations || []).length) {
    score += 5;
    reasons.push("affiliations_present");
  } else {
    flags.add("missing_affiliations");
  }

  if (sourceCount >= 2) {
    score += 16;
    reasons.push("multi_source_provenance");
  } else if (sourceCount === 1) {
    score += 7;
    reasons.push("single_source_provenance");
  } else {
    flags.add("missing_source_provenance");
  }

  const sourceDois = sourceRecords.map((record) => normalizeDoiForConfidence(record.doi)).filter(Boolean);
  const uniqueSourceDois = new Set(sourceDois);
  if (doi && uniqueSourceDois.size) {
    if (uniqueSourceDois.size === 1 && uniqueSourceDois.has(doi)) {
      score += 10;
      reasons.push("doi_cross_source_consistent");
    } else if (!uniqueSourceDois.has(doi) || uniqueSourceDois.size > 1) {
      flags.add("doi_conflict_across_sources");
      score -= 18;
    }
  }

  const sourceYears = new Set(sourceRecords.map((record) => Number(record.year || 0)).filter(Boolean));
  if (year && sourceYears.size) {
    if (sourceYears.size === 1 && sourceYears.has(year)) {
      score += 5;
      reasons.push("year_cross_source_consistent");
    } else if (!sourceYears.has(year) || sourceYears.size > 1) {
      flags.add("year_conflict_across_sources");
      score -= 8;
    }
  }

  const sourceTitles = sourceRecords.map((record) => record.title || "").filter(Boolean);
  if (sourceTitles.length) {
    const minSimilarity = Math.min(...sourceTitles.map((title) => jaccard(paperTitleTokens, tokenizeTitle(title))));
    if (minSimilarity >= 0.72) {
      score += 8;
      reasons.push("title_cross_source_consistent");
    } else if (minSimilarity < 0.45) {
      flags.add("title_conflict_across_sources");
      score -= 12;
    }
  }

  const authorEvidence = sourceRecords.filter((record) => hasOverlap(input.authors, record.authors));
  if ((input.authors || []).length && sourceRecords.length && authorEvidence.length === 0) {
    flags.add("authors_not_confirmed_by_sources");
    score -= 5;
  } else if (authorEvidence.length) {
    score += 4;
    reasons.push("author_overlap_confirmed");
  }

  const affiliationEvidence = sourceRecords.filter((record) => hasOverlap(input.affiliations, record.affiliations));
  if ((input.affiliations || []).length && sourceRecords.length && affiliationEvidence.length === 0) {
    flags.add("affiliations_not_confirmed_by_sources");
    score -= 3;
  } else if (affiliationEvidence.length) {
    score += 3;
    reasons.push("affiliation_overlap_confirmed");
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const status = classify(clamped, [...flags]);
  return {
    score: clamped,
    status,
    reviewRequired: status === "needs_review" || status === "blocked" || clamped < 60,
    flags: [...flags].sort(),
    reasons,
    provenanceScore: Math.min(100, sourceCount * 35 + (sourceRecords.some((r) => r.rawHash) ? 15 : 0)),
    sourceCount,
  };
}
