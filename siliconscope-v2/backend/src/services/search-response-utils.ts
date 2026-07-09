const DEFAULT_ABSTRACT_LIMIT = 600;

function compactText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncateAtWordBoundary(value: string, limit: number) {
  if (value.length <= limit) return value;
  const clipped = value.slice(0, limit + 1);
  const boundary = clipped.search(/\s+\S*$/);
  const end = boundary > Math.floor(limit * 0.72) ? boundary : limit;
  return `${value.slice(0, end).trimEnd()}...`;
}

export function compactPaperAbstract<T extends { abstract?: unknown }>(row: T, limit = DEFAULT_ABSTRACT_LIMIT) {
  const full = compactText(row.abstract);
  const compact = truncateAtWordBoundary(full, limit);
  return {
    ...row,
    abstract: compact,
    abstractFullLength: full.length,
    abstractTruncated: compact.length < full.length,
  };
}
