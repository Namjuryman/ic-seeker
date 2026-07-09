import { db as metadataDb } from "../db/connection.js";
import { appDb } from "../db/app-db.js";
import { papers, favorites, readingStatus, notes, tags, paperTags } from "../db/schema.js";
import { sql, eq, and, inArray, not, gte, lte } from "drizzle-orm";
import { toPaperRow } from "./paper-row.js";
import { decodeCursor, paginationInfo, searchRelaxations, stableSort, type SearchCursor } from "./search-pagination-utils.js";
import { ftsQuery, searchAliasSuggestions, semanticText } from "./search-query-utils.js";

export { semanticText };

function keysetCondition(cursor: SearchCursor | null) {
  if (!cursor) return null;
  if (cursor.sort === "year") {
    return sql`(
      COALESCE(${papers.year}, 0) < ${cursor.year}
      OR (COALESCE(${papers.year}, 0) = ${cursor.year} AND COALESCE(${papers.qualityScore}, 0) < ${cursor.score})
      OR (COALESCE(${papers.year}, 0) = ${cursor.year} AND COALESCE(${papers.qualityScore}, 0) = ${cursor.score} AND ${papers.id} < ${cursor.id})
    )`;
  }
  if (cursor.sort === "citations") {
    return sql`(
      COALESCE(${papers.citationCount}, 0) < ${cursor.citationCount}
      OR (COALESCE(${papers.citationCount}, 0) = ${cursor.citationCount} AND COALESCE(${papers.qualityScore}, 0) < ${cursor.score})
      OR (COALESCE(${papers.citationCount}, 0) = ${cursor.citationCount} AND COALESCE(${papers.qualityScore}, 0) = ${cursor.score} AND ${papers.id} < ${cursor.id})
    )`;
  }
  return sql`(
    COALESCE(${papers.qualityScore}, 0) < ${cursor.score}
    OR (COALESCE(${papers.qualityScore}, 0) = ${cursor.score} AND COALESCE(${papers.year}, 0) < ${cursor.year})
    OR (COALESCE(${papers.qualityScore}, 0) = ${cursor.score} AND COALESCE(${papers.year}, 0) = ${cursor.year} AND ${papers.id} < ${cursor.id})
  )`;
}

function buildWhereClause(params: Record<string, string>, userId = 0) {
  const conditions = [];

  if (params.includeHidden !== "1" && params.rank !== "Hidden") {
    conditions.push(sql`COALESCE(${papers.venueRank}, '') != 'Hidden'`);
  }

  const q = (params.q || "").trim();
  if (q && params._includeQ !== "0") {
    const pattern = `%${q}%`;
    conditions.push(
      sql`(${papers.title} LIKE ${pattern} OR ${papers.abstract} LIKE ${pattern} OR ${papers.authors} LIKE ${pattern} OR ${papers.doi} LIKE ${pattern})`
    );
  }

  if (params.venue) {
    const venues = params.venue.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20);
    conditions.push(venues.length > 1 ? inArray(papers.venue, venues) : eq(papers.venue, venues[0] || params.venue));
  }
  if (params.field) {
    conditions.push(eq(papers.domain, params.field));
  }
  if (params.rank) {
    conditions.push(eq(papers.venueRank, params.rank));
  }
  if (params.yearFrom) {
    conditions.push(gte(papers.year, Number(params.yearFrom)));
  }
  if (params.yearTo) {
    conditions.push(lte(papers.year, Number(params.yearTo)));
  }
  if (params.author) {
    conditions.push(sql`${papers.authors} LIKE ${`%${params.author}%`}`);
  }
  if (params.institution) {
    conditions.push(sql`${papers.affiliations} LIKE ${`%${params.institution}%`}`);
  }
  if (params.country) {
    conditions.push(sql`${papers.affiliations} LIKE ${`%${params.country}%`}`);
  }
  if (params.minScore) {
    conditions.push(gte(papers.qualityScore, Number(params.minScore)));
  }
  if (params.minCitations) {
    conditions.push(gte(papers.citationCount, Number(params.minCitations)));
  }
  if (params.hasPdf === "1") {
    conditions.push(not(eq(papers.localPdf, "")));
  }
  if (params.favorite === "1") {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM favorites f
      WHERE f.user_id = ${userId}
        AND f.paper_id = ${papers.id}
    )`);
  }
  if (params.tag) {
    conditions.push(sql`EXISTS (
      SELECT 1
      FROM paper_tags pt
      INNER JOIN tags t ON t.id = pt.tag_id
      WHERE pt.user_id = ${userId}
        AND pt.paper_id = ${papers.id}
        AND t.name = ${params.tag}
    )`);
  }
  if (params.status) {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM reading_status rs
      WHERE rs.user_id = ${userId}
        AND rs.paper_id = ${papers.id}
        AND rs.status = ${params.status}
    )`);
  }

  return conditions;
}

function cleanText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function includesLoose(haystack: unknown, needle: string) {
  const source = cleanText(haystack).toLowerCase();
  const target = needle.trim().toLowerCase();
  return Boolean(source && target && source.includes(target));
}

function firstMatchingTerms(row: Record<string, unknown>, rawQ: string) {
  const terms = rawQ
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .slice(0, 8);

  const fields = [
    ["title", "title"],
    ["abstract", "abstract"],
    ["authors", "authors"],
    ["affiliations", "affiliations"],
    ["doi", "DOI"],
    ["venue", "venue"],
    ["field", "field"],
  ] as const;

  const hits: string[] = [];
  for (const term of terms) {
    const field = fields.find(([key]) => includesLoose(row[key], term));
    if (field) hits.push(`${field[1]}:${term}`);
  }
  return [...new Set(hits)].slice(0, 4);
}

function matchReason(row: Record<string, unknown>, rawQ: string, semantic: boolean, searchRank?: unknown) {
  const hits = firstMatchingTerms(row, rawQ);
  if (hits.length) return `${semantic ? "semantic-lite" : "keyword"} match (${hits.join(", ")})`;
  if (typeof searchRank === "number" && Number.isFinite(searchRank)) return `FTS rank ${searchRank.toFixed(3)}`;
  return rawQ ? "metadata filter match" : "ranked by score and recency";
}

function uniqueSuggestionRows(rows: Array<{ kind: string; label: string; query: string; detail?: string }>) {
  const seen = new Set<string>();
  const result = [];
  for (const row of rows) {
    const key = `${row.kind}:${row.query}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result.slice(0, 12);
}

export const searchService = {
  suggestions(params: Record<string, string>) {
    const q = String(params.q || "").trim();
    const aliases = searchAliasSuggestions(q);
    const rows = aliases.map((item) => ({
      kind: "alias",
      label: item.label,
      query: item.query,
      detail: item.aliases.join(" / "),
    }));

    if (q) {
      const like = `%${q}%`;
      const venueRows = metadataDb.all<{ venue: string; n: number }>(sql`
        SELECT venue, COUNT(*) AS n
        FROM papers
        WHERE venue LIKE ${like} AND COALESCE(venue_rank, '') != 'Hidden'
        GROUP BY venue
        ORDER BY n DESC
        LIMIT 4
      `);
      rows.push(...venueRows.map((row) => ({
        kind: "venue",
        label: row.venue,
        query: row.venue,
        detail: `${row.n.toLocaleString()} papers in this venue`,
      })));

      const fieldRows = metadataDb.all<{ domain: string; n: number }>(sql`
        SELECT domain, COUNT(*) AS n
        FROM papers
        WHERE domain LIKE ${like} AND COALESCE(venue_rank, '') != 'Hidden'
        GROUP BY domain
        ORDER BY n DESC
        LIMIT 4
      `);
      rows.push(...fieldRows.map((row) => ({
        kind: "field",
        label: row.domain,
        query: row.domain,
        detail: `${row.n.toLocaleString()} papers in this IC direction`,
      })));

      const authorRows = metadataDb.all<{ authors: string; n: number }>(sql`
        SELECT authors, COUNT(*) AS n
        FROM papers
        WHERE authors LIKE ${like} AND COALESCE(venue_rank, '') != 'Hidden'
        GROUP BY authors
        ORDER BY n DESC
        LIMIT 12
      `);
      const authorSuggestions = new Map<string, number>();
      for (const row of authorRows) {
        for (const author of row.authors.split(";").map((item) => item.trim()).filter(Boolean)) {
          if (author.toLowerCase().includes(q.toLowerCase())) {
            authorSuggestions.set(author, (authorSuggestions.get(author) || 0) + row.n);
          }
        }
      }
      rows.push(...[...authorSuggestions.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([author, n]) => ({
          kind: "author",
          label: author,
          query: author,
          detail: `${n.toLocaleString()} matching author rows`,
        })));

      const institutionRows = metadataDb.all<{ affiliations: string; n: number }>(sql`
        SELECT affiliations, COUNT(*) AS n
        FROM papers
        WHERE affiliations LIKE ${like} AND COALESCE(venue_rank, '') != 'Hidden'
        GROUP BY affiliations
        ORDER BY n DESC
        LIMIT 12
      `);
      const institutionSuggestions = new Map<string, number>();
      for (const row of institutionRows) {
        for (const institution of row.affiliations.split(";").map((item) => item.trim()).filter(Boolean)) {
          if (institution.toLowerCase().includes(q.toLowerCase())) {
            institutionSuggestions.set(institution, (institutionSuggestions.get(institution) || 0) + row.n);
          }
        }
      }
      rows.push(...[...institutionSuggestions.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([institution, n]) => ({
          kind: "institution",
          label: institution,
          query: institution,
          detail: `${n.toLocaleString()} matching affiliation rows`,
        })));
    }

    return {
      query: q,
      rows: uniqueSuggestionRows(rows),
      emptyState: q
        ? rows.length
          ? `Try ${rows[0].label} or narrow by venue, IC direction, author, or institution.`
          : "Try a broader circuit block, venue, author, or institution."
        : "Type a circuit block, venue, author, institution, or DOI.",
    };
  },

  search(params: Record<string, string>, userId = 0) {
    const startedAt = performance.now();
    const limit = Math.min(Math.max(Number(params.limit || 50), 1), 100);
    const offset = Math.max(Number(params.offset || 0), 0);
    const rawQ = (params.q || "").trim();
    const semantic = params.semantic === "1";
    const q = semantic ? semanticText(rawQ) : rawQ;
    const requestedSort = params.sort || "score";
    const sort = !rawQ && requestedSort === "relevance" ? "score" : requestedSort;

    const ftsOrderBy =
      sort === "year"
        ? "papers.year DESC, papers.quality_score DESC, papers.id DESC"
        : sort === "citations"
        ? "papers.citation_count DESC, papers.quality_score DESC, papers.id DESC"
        : sort === "title"
        ? "papers.title COLLATE NOCASE ASC, papers.id ASC"
        : "searchRank ASC, papers.quality_score DESC, papers.year DESC, papers.id DESC";

    const tableOrderBy =
      sort === "year"
        ? "papers.year DESC, papers.quality_score DESC, papers.id DESC"
        : sort === "citations"
        ? "papers.citation_count DESC, papers.quality_score DESC, papers.id DESC"
        : sort === "title"
        ? "papers.title COLLATE NOCASE ASC, papers.id ASC"
        : "papers.quality_score DESC, papers.year DESC, papers.id DESC";

    const filterParams = { ...params, _includeQ: "0" };
    const whereConditions = buildWhereClause(filterParams, userId);

    const query = ftsQuery(q, semantic ? "OR" : "AND");

    if (query) {
      // FTS5 search
      const totalResult = metadataDb.get<{ n: number }>(sql`
        WITH matched AS (
          SELECT rowid AS id FROM papers_fts WHERE papers_fts MATCH ${query}
        )
        SELECT COUNT(*) AS n FROM matched
        JOIN papers ON papers.id = matched.id
        ${whereConditions.length > 0 ? sql`WHERE ${and(...whereConditions)}` : sql``}
      `);
      const total = totalResult?.n ?? 0;

      const rows = metadataDb.all<{
        id: number;
        title: string;
        authors: string;
        affiliations: string;
        abstract: string;
        year: number;
        venue: string;
        rank: string;
        field: string;
        score: number;
        doi: string;
        pdfLink: string;
        localPdf: string;
        downloadStatus: string;
        citationCount: number;
        verificationStatus: string;
        collectionMethod: string;
        searchRank: number;
      }>(sql`
        WITH matched AS (
          SELECT rowid AS id, bm25(papers_fts, 8.0, 2.0, 4.0, 1.5, 1.2, 4.0) AS searchRank
          FROM papers_fts WHERE papers_fts MATCH ${query}
        )
        SELECT
          papers.id, papers.title, papers.authors, papers.affiliations, papers.abstract, papers.year,
          papers.venue, papers.venue_rank AS rank, papers.domain AS field,
          papers.quality_score AS score, papers.doi, papers.pdf_link AS pdfLink,
          papers.source_url AS sourceUrl, papers.publication_title AS publicationTitle,
          papers.openalex_id AS openalexId, papers.ieee_article_number AS ieeeArticleNumber,
          papers.local_pdf AS localPdf, papers.download_status AS downloadStatus,
          papers.citation_count AS citationCount, papers.verification_status AS verificationStatus,
          papers.collection_method AS collectionMethod, matched.searchRank
        FROM matched
        JOIN papers ON papers.id = matched.id
        ${whereConditions.length > 0 ? sql`WHERE ${and(...whereConditions)}` : sql``}
        ORDER BY ${sql.raw(ftsOrderBy)}
        LIMIT ${limit} OFFSET ${offset}
      `);

      const enriched = this.enrichWithUserState(rows.map((row) => ({
        ...toPaperRow(row),
        matchReason: matchReason(row as unknown as Record<string, unknown>, rawQ, semantic, row.searchRank),
      })), userId);
      return {
        total,
        limit,
        offset,
        query: rawQ,
        expandedQuery: q,
        engine: semantic ? "sqlite-fts5-semantic-lite" : "sqlite-fts5",
        durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
        pagination: paginationInfo({ mode: "offset", limit, offset, total, rows: enriched, sort }),
        relaxations: enriched.length ? [] : searchRelaxations(params),
        rows: enriched,
      };
    }

    // Non-FTS search
    const totalResult = metadataDb.get<{ n: number }>(sql`
      SELECT COUNT(*) AS n FROM papers
      ${whereConditions.length > 0 ? sql`WHERE ${and(...whereConditions)}` : sql``}
    `);
    const total = totalResult?.n ?? 0;

    const cursor = decodeCursor(params.cursor, sort);
    const cursorWhere = keysetCondition(cursor);
    const pageConditions = cursorWhere ? [...whereConditions, cursorWhere] : whereConditions;
    const queryLimit = cursor ? limit + 1 : limit;

    const rows = metadataDb.all<{
      id: number;
      title: string;
      authors: string;
      affiliations: string;
      abstract: string;
      year: number;
      venue: string;
      rank: string;
      field: string;
      score: number;
      doi: string;
      pdfLink: string;
      localPdf: string;
      downloadStatus: string;
      citationCount: number;
      verificationStatus: string;
      collectionMethod: string;
    }>(sql`
      SELECT
        papers.id, papers.title, papers.authors, papers.affiliations, papers.abstract, papers.year,
        papers.venue, papers.venue_rank AS rank, papers.domain AS field,
        papers.quality_score AS score, papers.doi, papers.pdf_link AS pdfLink,
        papers.source_url AS sourceUrl, papers.publication_title AS publicationTitle,
        papers.openalex_id AS openalexId, papers.ieee_article_number AS ieeeArticleNumber,
        papers.local_pdf AS localPdf, papers.download_status AS downloadStatus,
        papers.citation_count AS citationCount, papers.verification_status AS verificationStatus,
        papers.collection_method AS collectionMethod
      FROM papers
      ${pageConditions.length > 0 ? sql`WHERE ${and(...pageConditions)}` : sql``}
      ORDER BY ${sql.raw(tableOrderBy)}
      LIMIT ${queryLimit} OFFSET ${cursor ? 0 : offset}
    `);

    const visibleRows = cursor ? rows.slice(0, limit) : rows;
    const enriched = this.enrichWithUserState(visibleRows.map((row) => ({
      ...toPaperRow(row),
      matchReason: matchReason(row as unknown as Record<string, unknown>, rawQ, semantic),
    })), userId);
    return {
      total,
      limit,
      offset: cursor ? 0 : offset,
      engine: "sqlite",
      durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
      pagination: paginationInfo({
        mode: cursor ? "keyset" : "offset",
        limit,
        offset: cursor ? 0 : offset,
        total,
        rows: enriched,
        sort,
        hasExtraRow: cursor ? rows.length > limit : false,
      }),
      relaxations: enriched.length ? [] : searchRelaxations(params),
      rows: enriched,
    };
  },

  enrichWithUserState(
    rows: Array<{
      id: number;
      [key: string]: unknown;
    }>,
    userId = 0
  ) {
    if (!rows.length) return rows;
    const ids = rows.map((r) => r.id);
    const favRows = appDb.select({ paperId: favorites.paperId })
      .from(favorites)
      .where(and(eq(favorites.userId, userId), inArray(favorites.paperId, ids)))
      .all();
    const favoriteIds = new Set(favRows.map((r) => r.paperId));

    const statusRows = appDb.select({ paperId: readingStatus.paperId, status: readingStatus.status })
      .from(readingStatus)
      .where(and(eq(readingStatus.userId, userId), inArray(readingStatus.paperId, ids)))
      .all();
    const statusMap = new Map(statusRows.map((r) => [r.paperId, r.status]));

    const tagRows = appDb.select({ paperId: paperTags.paperId, name: tags.name, color: tags.color })
      .from(paperTags)
      .innerJoin(tags, eq(tags.id, paperTags.tagId))
      .where(and(eq(paperTags.userId, userId), inArray(paperTags.paperId, ids)))
      .orderBy(tags.name)
      .all();
    const tagsMap = new Map<number, Array<{ name: string; color: string }>>();
    for (const r of tagRows) {
      if (!tagsMap.has(r.paperId)) tagsMap.set(r.paperId, []);
      tagsMap.get(r.paperId)!.push({ name: r.name, color: r.color });
    }

    return rows.map((row) => ({
      ...row,
      favorite: favoriteIds.has(row.id),
      readingStatus: statusMap.get(row.id) || "unread",
      tags: tagsMap.get(row.id) || [],
    }));
  },
};
