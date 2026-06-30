export const WATCHLIST_VALID_TYPES = [
  "company",
  "paper",
  "author",
  "institution",
  "topic",
  "venue",
  "search",
  "roadmap",
  "lesson",
] as const;

export type WatchlistTargetType = (typeof WATCHLIST_VALID_TYPES)[number];

export const WATCHLIST_ALLOWED_QUERY_KEYS = [
  "q",
  "venue",
  "field",
  "rank",
  "yearFrom",
  "yearTo",
  "author",
  "institution",
  "country",
  "minScore",
  "minCitations",
  "sort",
  "semantic",
  "hasPdf",
  "favorite",
] as const;

const ALLOWED_QUERY_KEYS = new Set<string>(WATCHLIST_ALLOWED_QUERY_KEYS);
export const WATCHLIST_MAX_QUERY_JSON_SIZE = 8192;

export type CanonicalWatchlistQueryResult =
  | { json: string | null; hash: string; size: number }
  | { error: string };

export function isValidTargetType(value: string): value is WatchlistTargetType {
  return WATCHLIST_VALID_TYPES.includes(value as WatchlistTargetType);
}

export function hashString(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return String(Math.abs(h));
}

export function canonicalizeWatchlistQueryJson(
  raw: Record<string, unknown> | string | undefined
): CanonicalWatchlistQueryResult {
  let parsed: Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { error: "Invalid JSON in query_json" };
    }
  } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    parsed = raw;
  } else {
    return { error: "query_json must be an object" };
  }

  const cleaned: Record<string, unknown> = {};
  for (const key of Object.keys(parsed).sort()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) continue;
    const value = parsed[key];
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "boolean" || typeof value === "number") {
      cleaned[key] = value;
    } else {
      const normalized = String(value).trim();
      if (normalized) cleaned[key] = normalized;
    }
  }

  const json = JSON.stringify(cleaned);
  const size = Buffer.byteLength(json, "utf8");
  if (size > WATCHLIST_MAX_QUERY_JSON_SIZE) {
    return { error: `query_json too large (${size} bytes > ${WATCHLIST_MAX_QUERY_JSON_SIZE} bytes)` };
  }

  return { json: json === "{}" ? null : json, hash: hashString(json), size };
}
