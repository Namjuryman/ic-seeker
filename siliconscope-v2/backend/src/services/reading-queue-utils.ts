export const READING_STATES = ["unread", "reading", "read", "review_later", "skip"] as const;
export const USE_CASES = ["literature_review", "application", "project"] as const;

export type ReadingState = (typeof READING_STATES)[number];
export type UseCase = (typeof USE_CASES)[number];

export type ReadingQueueInput =
  | string
  | {
      status?: string;
      readingStatus?: string;
      readingState?: string;
      important?: boolean;
      flags?: string[];
      useCases?: string[];
    };

export type ReadingQueueRowLike = {
  status?: string | null;
  readingState?: string | null;
  important?: boolean | number | null;
  useCasesJson?: string | null;
};

export const STATE_LABELS: Record<ReadingState, string> = {
  unread: "未读",
  reading: "在读",
  read: "已读",
  review_later: "稍后复习",
  skip: "跳过",
};

export function isReadingState(value: unknown): value is ReadingState {
  return READING_STATES.includes(String(value) as ReadingState);
}

export function parseUseCases(value: unknown): UseCase[] {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map(String).filter((item): item is UseCase => USE_CASES.includes(item as UseCase)))];
  } catch {
    return [];
  }
}

export function normalizeLegacyStatus(status: string | null | undefined): {
  readingState: ReadingState;
  important: boolean;
  useCases: UseCase[];
  legacyIntent: boolean;
} {
  const value = String(status || "unread");
  if (READING_STATES.includes(value as ReadingState)) {
    return { readingState: value as ReadingState, important: false, useCases: [], legacyIntent: false };
  }
  if (value === "important") {
    return { readingState: "reading", important: true, useCases: [], legacyIntent: true };
  }
  if (value === "use_for_literature_review") {
    return { readingState: "reading", important: false, useCases: ["literature_review"], legacyIntent: true };
  }
  if (value === "use_for_application") {
    return { readingState: "reading", important: false, useCases: ["application"], legacyIntent: true };
  }
  if (value === "use_for_project") {
    return { readingState: "reading", important: false, useCases: ["project"], legacyIntent: true };
  }
  return { readingState: "unread", important: false, useCases: [], legacyIntent: false };
}

function explicitImportant(value: boolean | number | null | undefined): boolean | undefined {
  if (value === null || value === undefined) return undefined;
  return Boolean(value);
}

export function readingQueueModelFromRow(row?: ReadingQueueRowLike) {
  const legacy = normalizeLegacyStatus(row?.status);
  const rowState = isReadingState(row?.readingState) ? row?.readingState : undefined;

  // Older rows can keep their real intent in status while a newly-added
  // reading_state column has the default "unread".
  const readingState = legacy.legacyIntent && (!rowState || rowState === "unread")
    ? legacy.readingState
    : (rowState || legacy.readingState);

  const storedUseCases = parseUseCases(row?.useCasesJson);
  const useCases = [...new Set([...storedUseCases, ...legacy.useCases])] as UseCase[];
  const important = Boolean(legacy.important || explicitImportant(row?.important));

  return {
    status: readingState,
    readingStatus: readingState,
    readingState,
    important: readingState === "unread" ? false : important,
    flags: readingState !== "unread" && important ? ["important"] : [],
    useCases: readingState === "unread" ? [] : useCases,
  };
}

export function normalizeReadingQueueInput(input: ReadingQueueInput, current?: ReadingQueueRowLike) {
  const currentModel = readingQueueModelFromRow(current);
  const baseState = currentModel.readingState;
  const baseImportant = currentModel.important;
  const baseUseCases = currentModel.useCases;

  if (typeof input === "string") {
    const legacy = normalizeLegacyStatus(input);
    if (input === "important") {
      return { readingState: baseState === "unread" ? "reading" : baseState, important: true, useCases: baseUseCases };
    }
    if (input.startsWith("use_for_")) {
      return {
        readingState: baseState === "unread" ? "reading" : baseState,
        important: baseImportant,
        useCases: [...new Set([...baseUseCases, ...legacy.useCases])] as UseCase[],
      };
    }
    return {
      readingState: legacy.readingState,
      important: legacy.readingState === "unread" ? false : baseImportant,
      useCases: legacy.readingState === "unread" ? [] : baseUseCases,
    };
  }

  const requestedState = String(input.readingStatus || input.readingState || input.status || baseState);
  const readingState = isReadingState(requestedState)
    ? requestedState
    : normalizeLegacyStatus(requestedState).readingState;
  const flags = Array.isArray(input.flags) ? input.flags.map(String) : [];
  const important = input.important !== undefined ? Boolean(input.important) : flags.includes("important") || baseImportant;
  const useCases = input.useCases !== undefined ? parseUseCases(input.useCases) : baseUseCases;

  return {
    readingState,
    important: readingState === "unread" ? false : important,
    useCases: readingState === "unread" ? [] : useCases,
  };
}
