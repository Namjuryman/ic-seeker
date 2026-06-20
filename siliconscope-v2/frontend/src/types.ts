export interface PaperRow {
  id: number;
  title: string;
  authors: string;
  affiliations?: string;
  abstract?: string;
  year: number;
  venue: string;
  publicationTitle?: string;
  rank: string;
  field: string;
  score: number;
  doi: string;
  sourceUrl?: string;
  pdfLink?: string;
  localPdf?: string;
  downloadStatus?: string;
  citationCount: number;
  verificationStatus?: string;
  collectionMethod?: string;
  favorite?: boolean;
  readingStatus?: string;
  tags?: Array<{ name: string; color: string }>;
  note?: string;
}

export interface SearchResult {
  total: number;
  limit: number;
  offset: number;
  engine: string;
  query?: string;
  expandedQuery?: string;
  rows: PaperRow[];
}

export interface TopicSummary {
  field: string;
  papers: number;
  avgScore: number;
  score: number;
  sPlus: number;
  s: number;
  a: number;
  firstYear: number;
  lastYear: number;
}

export interface TopicDetail {
  field: string;
  papers: number;
  avgScore: number;
  citations: number;
  ranks: { sPlus: number; s: number; a: number; other: number };
  byYear: Array<{ year: number; count: number }>;
  peakYear: { year: number; count: number } | null;
  byVenue: Array<{ key: string; count: number }>;
  authors: Array<{ name: string; papers: number; scoreSum: number; citations: number; topicScore: number }>;
  institutions: Array<{ name: string; papers: number; scoreSum: number; citations: number; topicScore: number }>;
  representativePapers: PaperRow[];
  recentPapers: PaperRow[];
}

export interface AuthorProfile {
  name: string;
  paperCount: number;
  authorScore: number;
  scoreSum: number;
  avgScore: number;
  citations: number;
  ranks: { sPlus: number; s: number; a: number; other: number };
  byYear: Array<{ key: string; count: number }>;
  byVenue: Array<{ key: string; count: number }>;
  byDomain: Array<{ key: string; count: number }>;
  coauthors: Array<{ key: string; count: number }>;
  institutions: Array<{ key: string; count: number }>;
  primaryInstitution: string;
  identity?: { canonicalName: string; normalizedKey: string; aliases: string[]; confidence: number; caveat?: string };
  requestedName?: string;
  qs: { qs_world_rank: number; qs_region_rank: number; region: string } | null;
  external: { googleScholar: string; webSearch: string };
  papers: PaperRow[];
}

export interface InstitutionProfile {
  name: string;
  paperCount: number;
  institutionScore: number;
  scoreSum: number;
  avgScore: number;
  citations: number;
  ranks: { sPlus: number; s: number; a: number; other: number };
  byYear: Array<{ key: string; count: number }>;
  byVenue: Array<{ key: string; count: number }>;
  byDomain: Array<{ key: string; count: number }>;
  authors: Array<{ key: string; count: number }>;
  qs: { qs_world_rank: number; qs_region_rank: number; region: string } | null;
  identity?: { canonicalName: string; normalizedKey: string; aliases: string[]; confidence: number; countryCode?: string; countryName?: string; city?: string; caveat?: string };
  requestedName?: string;
  papers: PaperRow[];
}

export interface GeoCountry {
  code: string;
  name: string;
  region: string;
  x: number;
  y: number;
  papers: number;
  score: number;
  recentScore: number;
  avgScore: number;
  citations: number;
  ranks: { sPlus: number; s: number; a: number; other: number };
  topField: string;
  topInstitutions: Array<{ name: string; count: number }>;
  byField: Array<{ key: string; count: number }>;
  byYear: Array<{ year: number; papers: number; score: number }>;
}

export interface GeoResult {
  generatedAt: string;
  field: string | null;
  fields: string[];
  skippedWithoutCountry: number;
  totalRows: number;
  countries: GeoCountry[];
  regionTrends: Array<{ region: string; year: number; papers: number; score: number }>;
  topPapers: PaperRow[];
}

export interface MentorInstitution {
  name: string;
  papers: number;
  authorCount: number;
  mentorCount: number;
  institutionScore: number;
  avgScore: number;
  citations: number;
  sPlus: number;
  s: number;
  a: number;
  qs?: { qs_world_rank: number | null; qs_region_rank: number | null; region: string | null } | null;
}

export interface MentorAuthor {
  name: string;
  papers: number;
  citations: number;
  sPlus: number;
  s: number;
  a: number;
  avgScore: number;
  authorScore: number;
  topDomains: Array<{ key: string; count: number }>;
  yearlyActivity: Array<{ year: number; count: number }>;
  recentPapers: number;
  trend: 'rising' | 'cooling' | 'stable';
  roleStage: string;
  likelyMentor: boolean;
  firstYear: number | null;
  lastYear: number | null;
  careerSpan: number;
}

export interface MentorDetail {
  institution: string;
  mentors: MentorAuthor[];
  mentorCandidateCount: number;
  excludedLikelyStudentCount: number;
  domains: Array<{ key: string; count: number }>;
}

export interface MentorProfile {
  name: string;
  paperCount: number;
  authorScore: number;
  roleStage: string;
  likelyMentor: boolean;
  firstYear: number | null;
  lastYear: number | null;
  careerSpan: number;
  papers: PaperRow[];
}

export interface StatsData {
  appName: string;
  total: number;
  pdfs: number;
  favorites: number;
  notes: number;
  aminerRows: number;
  byVenue: Array<{ venue: string; rank: string; count: number; avgScore: number }>;
  byField: Array<{ field: string; count: number }>;
  byVenueYear: Array<{ venue: string; year: number; count: number }>;
  byCollectionMethod: Array<{ method: string; count: number }>;
  byVerification: Array<{ status: string; count: number }>;
  years: { minYear: number; maxYear: number };
  venues: string[];
  fields: string[];
  ranks: string[];
  tags: Array<{ name: string; color: string }>;
  csvPath: string;
  dbPath: string;
  pdfInboxPath: string;
}

export interface VenueMatrixItem {
  name: string;
  rank: string;
  total: number;
  primaryDomain: string;
  allDomains: string[];
  yearCounts: Record<number, number>;
  earlier: number;
}


export interface PaperComment {
  id: number;
  paper_id?: number;
  paperId?: number;
  user_id?: number;
  comment_type?: string;
  commentType?: string;
  body: string;
  moderation_status?: string;
  moderationStatus?: string;
  created_at?: string;
  createdAt?: string;
  nickname?: string | null;
  verified?: boolean;
  displayName?: string;
}

export interface MentorReview {
  id: number;
  publicAlias?: string;
  public_alias?: string;
  isVerifiedReview?: boolean;
  is_verified_review?: boolean;
  relationshipType?: string;
  relationship_type?: string;
  scores?: Record<string, number>;
  strengthsText?: string;
  strengths_text?: string;
  cautionsText?: string;
  cautions_text?: string;
  fitText?: string;
  fit_text?: string;
  moderationStatus?: string;
  moderation_status?: string;
  createdAt?: string;
  created_at?: string;
}

export interface MentorReviewStats {
  total: number;
  verified: number;
  approved?: number;
  pending?: number;
}

export interface ApiKeyInfo {
  provider: string;
  masked: string;
  updatedAt?: string;
  source: 'env' | 'database';
}

export interface PdfInboxInfo {
  path: string;
  count: number;
  pdfs: Array<{ name: string; path: string }>;
  importCommand: string;
}

export interface AuthStatus {
  authenticated: boolean;
  authEnabled: boolean;
  appName: string;
  user?: { userId: number; email: string; role: string };
}


export interface DataQualityReport {
  generatedAt: string;
  totalPapers: number;
  scannedRows?: number;
  sampleLimit?: number;
  duplicateDoi: Array<{ key: string; count: number; samples: string }>;
  duplicateTitleYear: Array<{ key: string; count: number; samples: string }>;
  unknownVenues: Array<{ venue: string; rank: string; count: number; avgScore: number }>;
  lowConfidenceTopics: Array<{ field: string; count: number; avgHits: number; samples: string }>;
  institutionVariants: Array<{ key: string; count: number; variants: string[]; samples: Array<{ id: number; title: string; raw: string }> }>;
  ambiguousAuthors: Array<{ key: string; count: number; variants: string[]; venues: string[]; samples: Array<{ id: number; title: string; name: string; venue: string; year: number }> }>;
  missingAffiliations: number;
  recommendations: string[];
}

export interface ModerationQueue {
  comments: Array<Record<string, any>>;
  reviews: Array<Record<string, any>>;
  reports: Array<Record<string, any>>;
  logs: Array<Record<string, any>>;
  totals?: { comments: number; reviews: number; reports: number; logs: number };
  limit?: number;
  offset?: number;
}


export interface IdentityAliasRow {
  alias: string;
  canonicalName: string;
  institutionHint?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  city?: string | null;
  source: string;
  confidence: number;
  updatedAt?: string;
}

export interface IdentityAliasInput {
  alias: string;
  canonicalName: string;
  institutionHint?: string;
  countryCode?: string;
  countryName?: string;
  city?: string;
  source?: string;
  confidence?: number;
}

export interface JournalFilterVenue {
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

export interface JournalFilterConfig {
  version: string;
  purpose: string;
  scoring: { formula: string; reviewWindow?: number; notes?: string[] };
  globalNegative?: string[];
  venues: JournalFilterVenue[];
}

export interface JournalFilterEvaluation {
  venue: string;
  threshold: number;
  score: number;
  decision: 'insert' | 'review' | 'skip';
  hasStrongEvidence: boolean;
  hits: Record<string, string[]>;
  reason: string;
}
