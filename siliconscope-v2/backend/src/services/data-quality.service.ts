import { sql } from "drizzle-orm";
import { db as metadataDb } from "../db/connection.js";

function normalizeKey(value: unknown) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeInstitution(value: string) {
  return normalizeKey(value)
    .replace(/\bdepartment of\b/g, " ")
    .replace(/\bschool of\b/g, " ")
    .replace(/\bfaculty of\b/g, " ")
    .replace(/\blaboratory\b/g, " ")
    .replace(/\blab\b/g, " ")
    .replace(/\buniv\b/g, "university")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePerson(value: string) {
  return normalizeKey(value.replace(/,/g, " "));
}

function splitList(value: string) {
  return String(value || "").split(";").map((item) => item.trim()).filter(Boolean);
}

function addSample<T>(entry: { count: number; samples: T[] }, sample: T, limit = 6) {
  entry.count += 1;
  if (entry.samples.length < limit) entry.samples.push(sample);
}

export const dataQualityService = {
  getReport(options: { scanLimit?: number; sampleLimit?: number } = {}) {
    const scanLimit = Math.min(Math.max(Number(options.scanLimit || 12000), 1000), 50000);
    const sampleLimit = Math.min(Math.max(Number(options.sampleLimit || 50), 10), 200);
    const total = metadataDb.get<{ total: number }>(sql`SELECT COUNT(*) AS total FROM papers`)?.total ?? 0;

    const duplicateDoi = metadataDb.all(sql`
      SELECT LOWER(TRIM(doi)) AS key, COUNT(*) AS count,
             GROUP_CONCAT(id || ':' || SUBSTR(title, 1, 90), ' || ') AS samples
      FROM papers
      WHERE doi IS NOT NULL AND TRIM(doi) != ''
      GROUP BY LOWER(TRIM(doi))
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT ${sampleLimit}
    `);

    const duplicateTitleYear = metadataDb.all(sql`
      SELECT LOWER(TRIM(title)) || '|' || year AS key, COUNT(*) AS count,
             GROUP_CONCAT(id || ':' || SUBSTR(venue, 1, 40), ' || ') AS samples
      FROM papers
      WHERE title IS NOT NULL AND TRIM(title) != '' AND year IS NOT NULL
      GROUP BY LOWER(TRIM(title)), year
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT ${sampleLimit}
    `);

    const unknownVenues = metadataDb.all(sql`
      SELECT venue, venue_rank AS rank, COUNT(*) AS count, ROUND(AVG(quality_score), 1) AS avgScore
      FROM papers
      WHERE COALESCE(venue, '') = '' OR COALESCE(venue_rank, '') IN ('', 'User', 'Unknown') OR quality_score <= 0
      GROUP BY venue, venue_rank
      ORDER BY COUNT(*) DESC
      LIMIT ${sampleLimit}
    `);

    const lowConfidenceTopics = metadataDb.all(sql`
      SELECT domain AS field, COUNT(*) AS count,
             ROUND(AVG(domain_hits), 2) AS avgHits,
             GROUP_CONCAT(id || ':' || SUBSTR(title, 1, 90), ' || ') AS samples
      FROM papers
      WHERE COALESCE(domain, '') = '' OR domain = 'General IC' OR domain_hits <= 1
      GROUP BY domain
      ORDER BY COUNT(*) DESC
      LIMIT ${sampleLimit}
    `);

    const venuePublicationMismatches = metadataDb.all(sql`
      SELECT id, title, year, venue, publication_title AS publicationTitle, domain, domain_hits AS domainHits
      FROM papers
      WHERE COALESCE(publication_title, '') != ''
        AND (
          (venue = 'JSSC' AND LOWER(publication_title) NOT LIKE '%solid-state circuits%')
          OR (venue = 'ISSCC' AND LOWER(publication_title) NOT LIKE '%solid-state circuits%')
          OR (venue = 'CICC' AND LOWER(publication_title) NOT LIKE '%custom integrated circuits%')
          OR (venue = 'VLSI' AND LOWER(publication_title) NOT LIKE '%vlsi%' AND LOWER(publication_title) NOT LIKE '%very large scale integration%')
          OR (venue = 'TCAD' AND LOWER(publication_title) NOT LIKE '%computer-aided design%' AND LOWER(publication_title) NOT LIKE '%tcad%')
          OR (venue = 'IEDM' AND LOWER(publication_title) NOT LIKE '%electron devices%')
        )
      ORDER BY year DESC, id DESC
      LIMIT ${sampleLimit}
    `);

    const aiReviewQueue = metadataDb.all(sql`
      SELECT
        a.id AS annotationId,
        a.paper_id AS paperId,
        p.title,
        p.year,
        p.venue,
        p.publication_title AS publicationTitle,
        a.provider,
        a.model,
        a.primary_domain AS primaryDomain,
        a.confidence,
        a.needs_review AS needsReview,
        a.topics_json AS topicsJson,
        a.summary_zh AS summary,
        a.updated_at AS updatedAt
      FROM paper_ai_annotations a
      JOIN papers p ON p.id = a.paper_id
      WHERE a.id = (
        SELECT latest.id
        FROM paper_ai_annotations latest
        WHERE latest.paper_id = a.paper_id
        ORDER BY latest.updated_at DESC, latest.id DESC
        LIMIT 1
      )
        AND (
          a.needs_review = 1
          OR a.confidence < 0.55
          OR a.topics_json IS NULL
          OR a.topics_json = '[]'
        )
      ORDER BY a.needs_review DESC, a.confidence ASC, a.updated_at DESC
      LIMIT ${sampleLimit}
    `);

    const rows = metadataDb.all<{ id: number; title: string; authors: string; affiliations: string; venue: string; year: number }>(sql`
      SELECT id, title, authors, affiliations, venue, year FROM papers ORDER BY year DESC LIMIT ${scanLimit}
    `);

    const instMap = new Map<string, { count: number; raw: Set<string>; samples: Array<{ id: number; title: string; raw: string }> }>();
    const authorMap = new Map<string, { count: number; raw: Set<string>; venues: Set<string>; samples: Array<{ id: number; title: string; name: string; venue: string; year: number }> }>();
    let missingAffiliations = 0;

    for (const row of rows) {
      const affiliations = splitList(row.affiliations);
      if (!affiliations.length) missingAffiliations += 1;
      for (const raw of affiliations) {
        const key = normalizeInstitution(raw);
        if (!key) continue;
        if (!instMap.has(key)) instMap.set(key, { count: 0, raw: new Set(), samples: [] });
        const entry = instMap.get(key)!;
        entry.count += 1;
        entry.raw.add(raw);
        if (entry.samples.length < 6) entry.samples.push({ id: row.id, title: row.title, raw });
      }

      for (const name of splitList(row.authors)) {
        const key = normalizePerson(name);
        if (!key) continue;
        if (!authorMap.has(key)) authorMap.set(key, { count: 0, raw: new Set(), venues: new Set(), samples: [] });
        const entry = authorMap.get(key)!;
        entry.count += 1;
        entry.raw.add(name);
        entry.venues.add(row.venue);
        if (entry.samples.length < 6) entry.samples.push({ id: row.id, title: row.title, name, venue: row.venue, year: row.year });
      }
    }

    const institutionVariants = [...instMap.entries()]
      .filter(([, value]) => value.count >= 3 && value.raw.size > 1)
      .map(([key, value]) => ({ key, count: value.count, variants: [...value.raw].slice(0, 12), samples: value.samples }))
      .sort((a, b) => b.count - a.count)
      .slice(0, sampleLimit);

    const ambiguousAuthors = [...authorMap.entries()]
      .filter(([, value]) => value.count >= 8 && (value.raw.size > 1 || value.venues.size >= 4))
      .map(([key, value]) => ({ key, count: value.count, variants: [...value.raw].slice(0, 12), venues: [...value.venues].slice(0, 12), samples: value.samples }))
      .sort((a, b) => b.count - a.count)
      .slice(0, sampleLimit);

    return {
      generatedAt: new Date().toISOString(),
      totalPapers: total,
      scannedRows: rows.length,
      sampleLimit,
      duplicateDoi,
      duplicateTitleYear,
      unknownVenues,
      lowConfidenceTopics,
      venuePublicationMismatches,
      aiReviewQueue,
      institutionVariants,
      ambiguousAuthors,
      missingAffiliations,
      recommendations: [
        "Review duplicate DOI groups first; they are highest-confidence duplicates.",
        "Move broad-journal filters into data/venue_filters/journal_extensions.json and log relevance evidence.",
        "Normalize institutions before treating regional maps and institution rankings as serious intelligence.",
        "Do not auto-merge ambiguous authors by name only; use IDs, affiliations, coauthors, topics, and manual overrides.",
        "Use review queues for broad-journal papers near the relevance threshold.",
        "Review venue/publication-title mismatches before trusting venue rank, score, and institution rankings.",
        "Use the AI enrichment review queue to find non-IC leakage, missing topic edges, and low-confidence labels."
      ]
    };
  }
};
