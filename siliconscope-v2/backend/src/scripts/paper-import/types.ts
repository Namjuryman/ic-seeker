export type PaperImportSource =
  | "openalex"
  | "crossref"
  | "ieee"
  | "semantic-scholar"
  | "dblp"
  | "aminer"
  | "csv"
  | "scholar-csv";

export type ImportedPaper = {
  source: PaperImportSource | string;
  sourceId?: string;
  title: string;
  authors?: string[];
  affiliations?: string[];
  abstract?: string;
  year?: number;
  venue?: string;
  publicationTitle?: string;
  venueRank?: string;
  domain?: string;
  doi?: string;
  pdfLink?: string;
  sourceUrl?: string;
  openalexId?: string;
  ieeeArticleNumber?: string;
  citationCount?: number;
  externalIds?: Record<string, string>;
  rawHash?: string;
  raw?: unknown;
};

export type MergedPaper = Omit<ImportedPaper, "source" | "sourceId" | "raw"> & {
  sources: string[];
  sourceIds: string[];
  sourceRecords: ImportedPaper[];
  metadataConfidence?: number;
  confidenceFlags?: string[];
  confidenceReasons?: string[];
};

export type ImportOptions = {
  sources: PaperImportSource[];
  queries: string[];
  venues: string[];
  yearFrom: number;
  yearTo: number;
  limit: number;
  dryRun: boolean;
  refreshTopics: boolean;
  includeLowRelevance: boolean;
  csvPath?: string;
  scholarCsvPath?: string;
  aminerJsonPath?: string;
};

export type SourceFetchContext = {
  query: string;
  venue?: string;
  yearFrom: number;
  yearTo: number;
  limit: number;
};

export type SourceFetchResult = {
  source: PaperImportSource;
  papers: ImportedPaper[];
  warnings: string[];
};

export type UpsertSummary = {
  inserted: number;
  updated: number;
  unchanged: number;
  skipped: number;
  ftsRebuilt: number;
  errors: string[];
};
