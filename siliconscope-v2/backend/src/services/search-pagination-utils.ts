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
  if (params.venue) without(["venue"], "移除会议/期刊筛选", "在全部会议和期刊中继续检索。");
  if (params.field) without(["field"], "移除方向筛选", "允许查询匹配相邻电路方向。");
  if (params.rank) without(["rank"], "移除会议等级筛选", "包含所有可见会议/期刊等级。");
  if (params.yearFrom || params.yearTo) without(["yearFrom", "yearTo"], "使用全部年份", "检索本地 2000 年以来的完整论文窗口。");
  if (params.minScore) without(["minScore"], "移除排序信号门槛", "包含排序信号较低但仍可能相关的论文。");
  if (params.minCitations) without(["minCitations"], "移除引用门槛", "较新的论文通常引用数还不高。");
  if (params.hasPdf === "1") without(["hasPdf"], "包含无本地 PDF 的论文", "元数据索引通常比本地 PDF 收件箱更完整。");
  if (params.favorite === "1") without(["favorite"], "搜索收藏夹之外", "收藏内容通常只是个人子集。");
  if (params.semantic === "0") {
    rows.push({
      label: "开启语义扩展",
      detail: "使用 LDO / low-dropout regulator 这类别名扩展。",
      params: { ...params, semantic: "1" },
    });
  }
  return rows.slice(0, 5);
}
