export type MentorVisibilityLevel = "insufficient" | "aggregate" | "summary" | "curated";

export type MentorAggregate = {
  overall: number | null;
  researchFit: number | null;
  mentoringStyle: number | null;
  workload: number | null;
  communication: number | null;
  _raw: Record<string, number>;
};

export type MentorReviewLike = {
  publicAlias?: string | null;
  structuredScoresJson?: string | null;
  strengthsText?: string | null;
  cautionsText?: string | null;
  fitText?: string | null;
};

export type MentorThresholdView = {
  visibilityLevel: MentorVisibilityLevel;
  aggregate: MentorAggregate | null;
  summary: string | null;
  curatedComments: Array<{ publicAlias: string; text: string }>;
};

export function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export function safeText(value: string | null | undefined, maxLen = 500): string {
  const text = String(value || "").trim();
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}

export function sanitizeMentorReviewText(value: string | null | undefined, maxLen = 400): string {
  return safeText(value, maxLen)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]")
    .replace(/https?:\/\/\S+/gi, "[redacted link]")
    .replace(/\b(?:19|20)\d{2}\b/g, "[year]")
    .replace(/\b[A-Z][A-Za-z&.'-]{2,}\s+(?:University|College|Institute|School|Lab|Laboratory|Group)\b/g, "[institution]")
    .replace(/\b(?:WeChat|微信|QQ|Telegram|Discord|LinkedIn)\s*[:：]?\s*\S+/gi, "[redacted contact]")
    .trim();
}

function aggregateScores(rows: MentorReviewLike[]): MentorAggregate {
  const scoreKeys = new Set<string>();
  const scoreValues: Record<string, number[]> = {};

  for (const row of rows) {
    if (!row.structuredScoresJson) continue;
    try {
      const scores = JSON.parse(row.structuredScoresJson) as Record<string, number>;
      for (const [key, value] of Object.entries(scores)) {
        if (Number.isFinite(value)) {
          scoreKeys.add(key);
          scoreValues[key] = scoreValues[key] || [];
          scoreValues[key].push(value);
        }
      }
    } catch {
      // Ignore malformed community rows instead of leaking raw text as fallback.
    }
  }

  const raw: Record<string, number> = {};
  for (const key of scoreKeys) {
    raw[key] = average(scoreValues[key] || []);
  }

  return {
    overall: raw.overall || raw.research_quality || null,
    researchFit: raw.research_fit || raw.topic_match || null,
    mentoringStyle: raw.mentoring_style || raw.guidance || null,
    workload: raw.workload || raw.work_life_balance || null,
    communication: raw.communication || raw.responsiveness || null,
    _raw: raw,
  };
}

function scorePhrase(label: string, value: number | null): string | null {
  if (value == null) return null;
  if (value >= 4.2) return `${label} is consistently high`;
  if (value >= 3.4) return `${label} is generally positive`;
  if (value >= 2.6) return `${label} is mixed`;
  return `${label} needs careful manual verification`;
}

export function thresholdSafeSummary(aggregate: MentorAggregate, approvedCount: number): string {
  const signals = [
    scorePhrase("overall signal", aggregate.overall),
    scorePhrase("research fit", aggregate.researchFit),
    scorePhrase("mentoring-style signal", aggregate.mentoringStyle),
    scorePhrase("communication signal", aggregate.communication),
    scorePhrase("workload signal", aggregate.workload),
  ].filter(Boolean);

  const signalText = signals.length ? signals.join("; ") : "structured score coverage is limited";
  return `Threshold-safe summary from ${approvedCount} approved reviews: ${signalText}. Free-text review content is withheld until at least 10 approved reviews and should never be treated as a ranking or guarantee.`;
}

export function buildMentorThresholdView(rows: MentorReviewLike[]): MentorThresholdView {
  const approvedCount = rows.length;
  if (approvedCount < 3) {
    return { visibilityLevel: "insufficient", aggregate: null, summary: null, curatedComments: [] };
  }

  const aggregate = aggregateScores(rows);
  if (approvedCount < 5) {
    return { visibilityLevel: "aggregate", aggregate, summary: null, curatedComments: [] };
  }

  const summary = thresholdSafeSummary(aggregate, approvedCount);
  if (approvedCount < 10) {
    return { visibilityLevel: "summary", aggregate, summary, curatedComments: [] };
  }

  const curatedComments = rows
    .map((row) => ({
      publicAlias: row.publicAlias || "Anonymous verified reviewer",
      text: sanitizeMentorReviewText(row.strengthsText || row.cautionsText || row.fitText || "", 400),
    }))
    .filter((row) => row.text)
    .slice(0, 3);

  return { visibilityLevel: "curated", aggregate, summary, curatedComments };
}
