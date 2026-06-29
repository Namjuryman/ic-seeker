import { inferDomain, inferVenueRank, normalizeDoi, normalizeTitle } from "./classify.js";
import type { ImportedPaper, MergedPaper } from "./types.js";

function keyForPaper(paper: ImportedPaper): string {
  const doi = normalizeDoi(paper.doi);
  if (doi) return `doi:${doi}`;
  if (paper.openalexId) return `openalex:${paper.openalexId.toLowerCase()}`;
  if (paper.ieeeArticleNumber) return `ieee:${String(paper.ieeeArticleNumber).toLowerCase()}`;
  return `titleyear:${normalizeTitle(paper.title)}:${paper.year || ""}`;
}

function betterString(current?: string, incoming?: string): string | undefined {
  if (!incoming) return current;
  if (!current) return incoming;
  return incoming.length > current.length ? incoming : current;
}

function betterArray(current?: string[], incoming?: string[]): string[] | undefined {
  const values = [...(current || []), ...(incoming || [])].map((value) => String(value || "").trim()).filter(Boolean);
  return values.length ? [...new Set(values)] : undefined;
}

export function mergePapers(papers: ImportedPaper[]): MergedPaper[] {
  const byKey = new Map<string, MergedPaper>();
  for (const paper of papers) {
    if (!paper.title?.trim()) continue;
    const key = keyForPaper(paper);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        title: paper.title,
        authors: paper.authors || [],
        affiliations: paper.affiliations || [],
        abstract: paper.abstract || "",
        year: paper.year,
        venue: paper.venue || "",
        publicationTitle: paper.publicationTitle || paper.venue || "",
        venueRank: paper.venueRank,
        domain: paper.domain,
        doi: normalizeDoi(paper.doi),
        pdfLink: paper.pdfLink || "",
        sourceUrl: paper.sourceUrl || "",
        openalexId: paper.openalexId || "",
        ieeeArticleNumber: paper.ieeeArticleNumber || "",
        citationCount: paper.citationCount || 0,
        sources: [paper.source],
        sourceIds: paper.sourceId ? [paper.sourceId] : [],
      });
      continue;
    }
    existing.title = betterString(existing.title, paper.title) || existing.title;
    existing.authors = betterArray(existing.authors, paper.authors);
    existing.affiliations = betterArray(existing.affiliations, paper.affiliations);
    existing.abstract = betterString(existing.abstract, paper.abstract);
    existing.year = existing.year || paper.year;
    existing.venue = betterString(existing.venue, paper.venue);
    existing.publicationTitle = betterString(existing.publicationTitle, paper.publicationTitle || paper.venue);
    existing.venueRank = existing.venueRank || paper.venueRank;
    existing.domain = existing.domain || paper.domain;
    existing.doi = existing.doi || normalizeDoi(paper.doi);
    existing.pdfLink = existing.pdfLink || paper.pdfLink;
    existing.sourceUrl = existing.sourceUrl || paper.sourceUrl;
    existing.openalexId = existing.openalexId || paper.openalexId;
    existing.ieeeArticleNumber = existing.ieeeArticleNumber || paper.ieeeArticleNumber;
    existing.citationCount = Math.max(Number(existing.citationCount || 0), Number(paper.citationCount || 0));
    if (!existing.sources.includes(paper.source)) existing.sources.push(paper.source);
    if (paper.sourceId && !existing.sourceIds.includes(paper.sourceId)) existing.sourceIds.push(paper.sourceId);
  }

  return [...byKey.values()].map((paper) => {
    const venue = paper.venue || paper.publicationTitle || "";
    const inferred = inferDomain(paper);
    return {
      ...paper,
      venue,
      publicationTitle: paper.publicationTitle || venue,
      venueRank: paper.venueRank || inferVenueRank(venue),
      domain: paper.domain || inferred.domain,
    };
  });
}
