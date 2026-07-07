import { db as metadataDb } from "../db/connection.js";
import { appDb } from "../db/app-db.js";
import { papers, favorites, readingStatus, notes, tags, paperTags } from "../db/schema.js";
import { sql, eq, and, inArray, not, gte, lte } from "drizzle-orm";
import { toPaperRow } from "./paper-row.js";
import { ftsQuery, searchAliasSuggestions, semanticText } from "./search-query-utils.js";

export { semanticText };

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
    const favoriteIds = appDb.select({ id: favorites.paperId })
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .all()
      .map((row) => row.id);
    conditions.push(favoriteIds.length ? inArray(papers.id, favoriteIds) : sql`0 = 1`);
  }
  if (params.tag) {
    const tagId = appDb.select({ id: tags.id }).from(tags).where(eq(tags.name, params.tag)).get()?.id;
    if (tagId) {
      const taggedIds = appDb.select({ paperId: paperTags.paperId })
        .from(paperTags)
        .where(and(eq(paperTags.userId, userId), eq(paperTags.tagId, tagId)))
        .all()
        .map((row) => row.paperId);
      conditions.push(taggedIds.length ? inArray(papers.id, taggedIds) : sql`0 = 1`);
    } else {
      conditions.push(sql`0 = 1`);
    }
  }
  if (params.status) {
    const statusIds = appDb.select({ paperId: readingStatus.paperId })
      .from(readingStatus)
      .where(and(eq(readingStatus.userId, userId), eq(readingStatus.status, params.status)))
      .all()
      .map((row) => row.paperId);
    conditions.push(statusIds.length ? inArray(papers.id, statusIds) : sql`0 = 1`);
  }

  return conditions;
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

    return {
      query: q,
      rows,
      emptyState: q
        ? rows.length
          ? `Try ${rows[0].label} or one of its IC aliases.`
          : "Try a broader circuit block, venue, author, or institution."
        : "Type a circuit block, venue, author, institution, or DOI.",
    };
  },

  search(params: Record<string, string>, userId = 0) {
    const limit = Math.min(Math.max(Number(params.limit || 50), 1), 100);
    const offset = Math.max(Number(params.offset || 0), 0);
    const rawQ = (params.q || "").trim();
    const semantic = params.semantic === "1";
    const q = semantic ? semanticText(rawQ) : rawQ;
    const requestedSort = params.sort || "score";
    const sort = !rawQ && requestedSort === "relevance" ? "score" : requestedSort;

    const ftsOrderBy =
      sort === "year"
        ? "papers.year DESC, papers.quality_score DESC"
        : sort === "citations"
        ? "papers.citation_count DESC, papers.quality_score DESC"
        : sort === "title"
        ? "papers.title COLLATE NOCASE ASC"
        : "searchRank ASC, papers.quality_score DESC, papers.year DESC";

    const tableOrderBy =
      sort === "year"
        ? "papers.year DESC, papers.quality_score DESC"
        : sort === "citations"
        ? "papers.citation_count DESC, papers.quality_score DESC"
        : sort === "title"
        ? "papers.title COLLATE NOCASE ASC"
        : "papers.quality_score DESC, papers.year DESC";

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

      const enriched = this.enrichWithUserState(rows.map(toPaperRow), userId);
      return {
        total,
        limit,
        offset,
        query: rawQ,
        expandedQuery: q,
        engine: semantic ? "sqlite-fts5-semantic-lite" : "sqlite-fts5",
        rows: enriched,
      };
    }

    // Non-FTS search
    const totalResult = metadataDb.get<{ n: number }>(sql`
      SELECT COUNT(*) AS n FROM papers
      ${whereConditions.length > 0 ? sql`WHERE ${and(...whereConditions)}` : sql``}
    `);
    const total = totalResult?.n ?? 0;

    const rows = metadataDb.all<{
      id: number;
      title: string;
      authors: string;
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
      ${whereConditions.length > 0 ? sql`WHERE ${and(...whereConditions)}` : sql``}
      ORDER BY ${sql.raw(tableOrderBy)}
      LIMIT ${limit} OFFSET ${offset}
    `);

    const enriched = this.enrichWithUserState(rows.map(toPaperRow), userId);
    return {
      total,
      limit,
      offset,
      engine: "sqlite",
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
