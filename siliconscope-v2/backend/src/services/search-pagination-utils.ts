export type CursorSort = "score" | "year" | "citations";

export type SearchCursor = {
  sort: CursorSort;
  id: number;
  score: number;
  year: number;
  citationCount: number;
  searchRank?: number;
};

export function stableSort(sort: string): CursorSort | null {
  return sort === "year" || sort === "citations" || sort === "score" || sort === "relevance"
    ? (sort === "relevance" ? "score" : sort)
    : null;
}

export function encodeCursor(row: { id: number; score?: number; year?: number; citationCount?: number; searchRank?: number }, sort: CursorSort) {
  const payload: SearchCursor = {
    sort,
    id: Number(row.id || 0),
    score: Number(row.score || 0),
    year: Number(row.year || 0),
    citationCount: Number(row.citationCount || 0),
  };
  if (Number.isFinite(Number(row.searchRank))) payload.searchRank = Number(row.searchRank);
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor(value: string | undefined, sort: string): SearchCursor | null {
  if (!value) return null;
  const expectedSort = stableSort(sort);
  if (!expectedSort) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<SearchCursor>;
    if (parsed.sort !== expectedSort) return null;
    const id = Number(parsed.id);
    const score = Number(parsed.score);
    const year = Number(parsed.year);
    const citationCount = Number(parsed.citationCount);
    const searchRank = Number(parsed.searchRank);
    if (![id, score, year, citationCount].every(Number.isFinite) || id <= 0) return null;
    const cursor: SearchCursor = {
      sort: expectedSort,
      id,
      score,
      year,
      citationCount,
    };
    if (Number.isFinite(searchRank)) cursor.searchRank = searchRank;
    return cursor;
  } catch {
    return null;
  }
}

export function paginationInfo(args: {
  mode: "offset" | "keyset";
  limit: number;
  offset: number;
  total: number;
  rows: Array<{ id: number; score?: number; year?: number; citationCount?: number; searchRank?: number }>;
  sort: string;
  hasExtraRow?: boolean;
}) {
  const cursorSort = stableSort(args.sort);
  const hasNextPage = args.mode === "keyset"
    ? Boolean(args.hasExtraRow)
    : args.offset + args.rows.length < args.total;
  const lastRow = args.rows[args.rows.length - 1];
  const nextCursor = hasNextPage && cursorSort && lastRow
    ? encodeCursor(lastRow, cursorSort)
    : undefined;
  return {
    mode: args.mode,
    limit: args.limit,
    offset: args.offset,
    hasNextPage,
    nextCursor,
  };
}

export function searchRelaxations(params: Record<string, string>) {
  const rows: Array<{ label: string; detail: string; params: Record<string, string> }> = [];
  const without = (keys: string[], label: string, detail: string) => {
    const next = { ...params };
    for (const key of keys) delete next[key];
    delete next.cursor;
    delete next.offset;
    rows.push({ label, detail, params: next });
  };
  if (params.venue) without(["venue"], "Remove venue filter", "Search across all conferences and journals.");
  if (params.field) without(["field"], "Remove IC direction", "Let the query match adjacent circuit domains.");
  if (params.rank) without(["rank"], "Remove venue rank", "Include all visible venue levels.");
  if (params.yearFrom || params.yearTo) without(["yearFrom", "yearTo"], "Use all years", "Search the full local 2000+ paper window.");
  if (params.minScore) without(["minScore"], "Remove score floor", "Include lower-scored but still relevant papers.");
  if (params.minCitations) without(["minCitations"], "Remove citation floor", "Recent papers often have few citations.");
  if (params.hasPdf === "1") without(["hasPdf"], "Include papers without local PDF", "The metadata index is broader than the PDF inbox.");
  if (params.favorite === "1") without(["favorite"], "Search outside favorites", "Favorites are usually a small personal subset.");
  if (params.semantic === "0") {
    rows.push({
      label: "Enable semantic expansion",
      detail: "Use alias expansion such as LDO / low-dropout regulator.",
      params: { ...params, semantic: "1" },
    });
  }
  return rows.slice(0, 5);
}
