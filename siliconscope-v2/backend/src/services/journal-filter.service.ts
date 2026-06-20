import { promises as fs } from "node:fs";
import path from "node:path";

const configPath = path.resolve(process.cwd(), "../data/venue_filters/journal_extensions.json");
const fallbackConfigPath = path.resolve(process.cwd(), "data/venue_filters/journal_extensions.json");

type KeywordBucket = "must" | "strong" | "medium" | "weak" | "negative";

interface VenueFilter {
  venue: string;
  aliases?: string[];
  rank?: string;
  baseScore?: number;
  scopeType?: string;
  threshold: number;
  must?: string[];
  strong?: string[];
  medium?: string[];
  weak?: string[];
  negative?: string[];
}

interface FilterConfig {
  version: string;
  purpose: string;
  scoring: { formula: string; reviewWindow?: number; notes?: string[] };
  globalNegative?: string[];
  venues: VenueFilter[];
}

function normalize(value: unknown): string {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^\p{L}\p{N}+.#/&-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countHits(text: string, terms: string[] = []) {
  const hits: string[] = [];
  for (const term of terms) {
    const key = normalize(term);
    if (key && text.includes(key)) hits.push(term);
  }
  return hits;
}

async function readConfig(): Promise<FilterConfig> {
  const file = await fs.readFile(configPath).catch(() => fs.readFile(fallbackConfigPath));
  return JSON.parse(file.toString("utf8")) as FilterConfig;
}

export const journalFilterService = {
  async getConfig() {
    return readConfig();
  },

  async evaluate(input: { venue?: string; title?: string; abstract?: string; concepts?: string[] | string }) {
    const config = await readConfig();
    const venueKey = normalize(input.venue);
    const venue = config.venues.find((item) => {
      const names = [item.venue, ...(item.aliases || [])].map(normalize);
      return names.includes(venueKey);
    }) || config.venues.find((item) => venueKey.includes(normalize(item.venue)) || normalize(item.venue).includes(venueKey));

    const text = normalize([
      input.title,
      input.abstract,
      Array.isArray(input.concepts) ? input.concepts.join(" ") : input.concepts,
      input.venue,
    ].filter(Boolean).join(" "));

    const buckets: Record<KeywordBucket, string[]> = {
      must: countHits(text, venue?.must || []),
      strong: countHits(text, venue?.strong || []),
      medium: countHits(text, venue?.medium || []),
      weak: countHits(text, venue?.weak || []),
      negative: [
        ...countHits(text, venue?.negative || []),
        ...countHits(text, config.globalNegative || []),
      ],
    };

    const score = 4 * buckets.must.length + 3 * buckets.strong.length + 2 * buckets.medium.length + buckets.weak.length - 4 * buckets.negative.length;
    const threshold = venue?.threshold ?? 6;
    const reviewWindow = config.scoring.reviewWindow ?? 2;
    const hasStrongEvidence = buckets.must.length > 0 || buckets.strong.length > 0;
    const hasNegativeConflict = buckets.negative.length > 0 && score >= threshold - reviewWindow;

    let decision: "insert" | "review" | "skip" = "skip";
    if (score >= threshold && hasStrongEvidence && !hasNegativeConflict) decision = "insert";
    else if (score >= threshold - reviewWindow || hasNegativeConflict) decision = "review";

    return {
      venue: venue?.venue || input.venue || "Unknown",
      threshold,
      score,
      decision,
      hasStrongEvidence,
      hits: buckets,
      reason: decision === "insert"
        ? "score meets threshold with strong IC evidence"
        : decision === "review"
          ? "borderline score or negative-keyword conflict"
          : "not enough IC evidence",
    };
  },
};
