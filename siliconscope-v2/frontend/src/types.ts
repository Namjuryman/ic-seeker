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
  matchReason?: string;
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

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected' | 'invited';

export interface AccessRequestRow {
  id: number;
  email: string;
  name: string;
  affiliation: string;
  intendedUse: string;
  planInterest: string;
  status: AccessRequestStatus;
  source: string;
  notes: string | null;
  reviewedByUserId: number | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccessRequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  invited: number;
}

export interface AccessRequestResult {
  rows: AccessRequestRow[];
  total: number;
  limit: number;
  offset: number;
  stats: AccessRequestStats;
}

export interface PlatformModule {
  id: string;
  name: string;
  track: 'research' | 'learning' | 'business' | 'operations' | 'community' | 'commercial';
  status: 'ready' | 'partial' | 'planned';
  maturity: number;
  summary: string;
  shipped: string[];
  next: string[];
}

export interface PlatformOverview {
  appName: string;
  generatedAt: string;
  topology: {
    mode: string;
    metadataStore: { provider: string; path: string; role: string };
    appStore: { provider: string; configured: boolean; role: string };
    cache: { provider: string; configured: boolean; role: string };
    search: { provider: string; configured: boolean };
    objectStorage: { provider: string; configured: boolean; bucket?: string };
    queue: { provider: string; configured: boolean };
  };
  summary: {
    modules: number;
    ready: number;
    partial: number;
    planned: number;
    averageMaturity: number;
  };
  tracks: Array<{ id: string; name: string; score: number; modules: number }>;
  modules: PlatformModule[];
  nextMilestones: string[];
}

export interface AdminOperation {
  id: string;
  title: string;
  status: 'ready' | 'partial' | 'planned' | 'attention' | 'needs-refresh' | 'needs-seed';
  metric: string;
  detail: string;
  href: string;
  action: string;
}

export interface RuntimeCheck {
  id: string;
  label: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  detail?: string;
}

export interface RuntimeHealth {
  status: 'ok' | 'warn' | 'error';
  generatedAt: string;
  uptimeSeconds: number;
  nodeVersion: string;
  environment: string;
  topology: PlatformOverview['topology'];
  checks: RuntimeCheck[];
  warnings: string[];
}

export interface SearchIndexStatus {
  provider: 'sqlite' | 'meilisearch';
  configured: boolean;
  host: string;
  reachable: boolean;
  message: string;
  indexes: Array<{
    uid: 'papers' | 'companies' | 'learning_routes';
    primaryKey: string;
    label: string;
    exists: boolean;
    documents: number;
    isIndexing?: boolean;
  }>;
}

export interface SearchIndexRebuildResult {
  ok: boolean;
  provider: string;
  target: string;
  indexed: Record<string, number>;
  tasks: Record<string, unknown>;
  generatedAt: string;
}

export interface ObservedRoute {
  key: string;
  method: string;
  path: string;
  count: number;
  errorCount: number;
  rateLimitedCount: number;
  totalDurationMs: number;
  averageDurationMs: number;
  maxDurationMs: number;
  lastStatus: number;
  lastSeenAt: string;
}

export interface ObservabilitySnapshot {
  startedAt: string;
  generatedAt: string;
  uptimeSeconds: number;
  totalRequests: number;
  totalErrors: number;
  totalRateLimited: number;
  errorRate: number;
  requestsLastMinute: number;
  requestsLastFiveMinutes: number;
  averageDurationMs: number;
  maxDurationMs: number;
  statusBuckets: Record<string, number>;
  slowRoutes: ObservedRoute[];
  hotRoutes: ObservedRoute[];
  recentErrors: Array<{
    requestId: string | null;
    method: string;
    path: string;
    status: number;
    durationMs: number;
    at: string;
  }>;
}

export interface NotificationItem {
  id: number;
  userId: number;
  kind: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
  title: string;
  body: string;
  href: string | null;
  actionLabel: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationResult {
  rows: NotificationItem[];
  total: number;
  unread: number;
  limit: number;
  offset: number;
}

export interface BillingLimits {
  savedSearches: number;
  watchlistItems: number;
  readingQueueItems: number;
  aiSummariesPerMonth: number;
  exportsPerMonth: number;
  alerts: number;
  apiRequestsPerMonth: number;
  teamSeats: number;
  privatePdfStorageGb: number;
}

export interface BillingPlan {
  id: 'free' | 'pro' | 'lab' | 'enterprise' | 'internal';
  name: string;
  audience: string;
  priceMonthlyUsd: number | null;
  badge: string;
  description: string;
  features: string[];
  limits: BillingLimits;
  recommended?: boolean;
  publicSignupEnabled: boolean;
}

export interface BillingStatus {
  paymentProvider: string;
  paymentConfigured: boolean;
  checkoutAvailable: boolean;
  checkoutReason: string;
  currentPlan: BillingPlan;
  plans: BillingPlan[];
  entitlementSummary: Array<{ label: string; value: string; detail: string }>;
  usage: BillingUsageSummary;
}

export interface CheckoutResult {
  ok: boolean;
  userId: number;
  plan: BillingPlan;
  provider: string;
  checkoutAvailable: boolean;
  reason: string;
}

export interface BillingUsageItem {
  metric: string;
  label: string;
  used: number;
  limit: number;
  remaining: number | null;
  resetAt: string | null;
  enforced: boolean;
}

export interface BillingUsageSummary {
  periodStart: string;
  periodEnd: string;
  items: BillingUsageItem[];
}

export interface BillingUserRow {
  id: number;
  email: string;
  nickname: string | null;
  roleHint: string;
  verificationLevel: string;
  subscriptionPlan: BillingPlan['id'];
  planName: string;
  createdAt: string;
  usage: BillingUsageSummary;
  subscription?: Record<string, unknown> | null;
}

export interface AdminBillingOverview {
  paymentProvider: string;
  paymentConfigured: boolean;
  plans: BillingPlan[];
  totals: {
    users: number;
    subscriptions: number;
    usageEvents: number;
    billingEvents: number;
  };
  rollout: {
    publicSignup: boolean;
    checkoutAdapter: string;
    entitlementEnforcement: string;
    notes: string[];
  };
}

export interface BillingUsersResult {
  rows: BillingUserRow[];
  total: number;
  limit: number;
  offset: number;
  plans: BillingPlan[];
}

export interface BackupManifest {
  id: string;
  label: string;
  createdAt: string;
  dbPath: string;
  dbBytes: number;
  manifestPath: string;
  manifestBytes: number;
  source: {
    databasePath: string;
    appName: string;
    deploymentMode: string;
    nodeVersion: string;
  };
  notes: string[];
}

export interface BackupListResult {
  backupDir: string;
  total: number;
  totalBytes: number;
  rows: BackupManifest[];
}

export interface BackupPruneResult {
  keep: number;
  deleted: number;
  rows: Array<{ deleted: boolean; id: string; deletedFiles?: number }>;
}

export interface MaintenanceRun {
  id: number;
  jobId: string;
  status: 'running' | 'success' | 'failure';
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  actorUserId: number | null;
  summary: Record<string, unknown> | null;
  error: string | null;
}

export interface MaintenanceJob {
  id: string;
  title: string;
  category: 'backup' | 'cache' | 'quality';
  description: string;
  expectedDuration: string;
  risk: 'low' | 'medium';
  defaultPayload?: Record<string, unknown>;
  lastRun?: MaintenanceRun | null;
}

export interface MaintenanceRunResult {
  rows: MaintenanceRun[];
  total: number;
  limit: number;
  offset: number;
}

export interface SchedulerJob {
  id: 'daily-backup' | 'core-snapshots' | 'data-quality';
  title: string;
  description: string;
  maintenanceJobId: string;
  intervalMinutes: number;
  enabled: boolean;
  payload: Record<string, unknown>;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastStatus: string | null;
  lastRunId: number | null;
  updatedAt: string;
}

export interface SchedulerStatus {
  enabled: boolean;
  running: boolean;
  generatedAt: string;
  jobs: SchedulerJob[];
  nextRunAt: string | null;
}

export type OperationLane = 'scheduler' | 'maintenance' | 'backup' | 'snapshot' | 'quality' | 'ingestion';
export type OperationStatus = 'ok' | 'warning' | 'error' | 'running' | 'idle';

export interface OperationTimelineItem {
  id: string;
  lane: OperationLane;
  title: string;
  status: OperationStatus;
  detail: string;
  at: string | null;
  href: string;
  sourceId?: string | number | null;
}

export interface OperationLaneSummary {
  lane: OperationLane;
  title: string;
  status: OperationStatus;
  metric: string;
  detail: string;
  href: string;
}

export interface JobOperationsOverview {
  generatedAt: string;
  runtimeStatus: 'ok' | 'warn' | 'error';
  lanes: OperationLaneSummary[];
  timeline: OperationTimelineItem[];
  nextRunAt: string | null;
  counts: {
    schedulerJobs: number;
    enabledSchedulerJobs: number;
    maintenanceRuns: number;
    failedRuns: number;
    backups: number;
    snapshots: number;
    ingestionJobs?: number;
    activeIngestion?: number;
  };
  caveat: string;
}

export type IngestionJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'review_required';
export type IngestionProvider = 'ieee' | 'openalex' | 'crossref' | 'csv' | 'pdf' | 'manual';

export interface IngestionJob {
  id: number;
  provider: IngestionProvider;
  mode: string;
  status: IngestionJobStatus;
  scope: Record<string, unknown>;
  counts: {
    fetched: number;
    inserted: number;
    updated: number;
    skipped: number;
    review: number;
  };
  error: string | null;
  notes: string | null;
  createdByUserId: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IngestionJobEvent {
  id: number;
  jobId: number;
  eventType: string;
  message: string | null;
  payload: Record<string, unknown>;
  createdByUserId: number | null;
  createdAt: string;
}

export interface IngestionJobResult {
  rows: IngestionJob[];
  total: number;
  limit: number;
  offset: number;
}

export interface IngestionJobEventResult {
  rows: IngestionJobEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminOverview {
  appName: string;
  generatedAt: string;
  health: {
    backend: string;
    authMode: string;
    metadataDb: string;
    publicDir: string;
    runtimeStatus?: 'ok' | 'warn' | 'error';
    uptimeSeconds?: number;
  };
  runtime?: RuntimeHealth;
  platform: PlatformOverview;
  summary: {
    papers: number;
    years?: { minYear: number; maxYear: number };
    pdfs: number;
    companies: number;
    snapshots: number;
    snapshotBytes: number;
    moderationOpen: number;
    apiKeys: number;
    pdfInbox: number;
    dataQuality: number;
    auditLogs: number;
    notifications?: number;
    unreadNotifications?: number;
    billingPlan?: string;
    paymentProvider?: string;
    backups?: number;
    backupBytes?: number;
    maintenanceRuns?: number;
    schedulerEnabled?: boolean;
    schedulerJobs?: number;
    ingestionJobs?: number;
    siteSettings?: number;
    publicSettings?: number;
  };
  operations: AdminOperation[];
  apiKeys: ApiKeyInfo[];
  pdfInbox: {
    path: string;
    count: number;
    importCommand: string;
    samples: Array<{ name: string; path: string }>;
  };
  recentModeration: {
    comments: Array<Record<string, any>>;
    reviews: Array<Record<string, any>>;
    reports: Array<Record<string, any>>;
    totals?: { comments: number; reviews: number; reports: number; logs: number };
  };
  recentAuditLogs: AdminAuditLog[];
}

export type SiteSettingValueType = 'boolean' | 'string' | 'number';

export interface SiteSettingRow {
  key: string;
  label: string;
  description: string;
  groupName: 'Access' | 'Commercial' | 'Research' | 'Community' | 'Operations';
  valueType: SiteSettingValueType;
  value: boolean | string | number;
  defaultValue: boolean | string | number;
  isPublic: boolean;
  isSensitive?: boolean;
  displayOrder: number;
  updatedAt: string | null;
  updatedByUserId: number | null;
}

export interface SiteSettingsResult {
  rows: SiteSettingRow[];
  summary: {
    total: number;
    public: number;
    enabledFlags: number;
    disabledFlags: number;
    maintenanceMode: boolean;
    checkoutEnabled: boolean;
    inviteOnlyMode: boolean;
  };
}

export interface AdminAuditLog {
  id: number;
  actorUserId?: number | null;
  actorEmail?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  status: 'success' | 'failure';
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
  error?: string | null;
  createdAt: string;
}

export interface AdminAuditLogResult {
  rows: AdminAuditLog[];
  total: number;
  limit: number;
  offset: number;
  actions: Array<{ action: string; count: number }>;
  resourceTypes: Array<{ resourceType: string; count: number }>;
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

export type ModerationAction = 'hide' | 'remove' | 'restore' | 'keep_pending';

export interface SnapshotRow {
  key: string;
  updatedAt?: string;
  updated_at?: string;
  bytes: number;
}

export interface SnapshotRefreshResult {
  key: string;
  ok: boolean;
  ms: number;
  error?: string;
}

export interface SnapshotClearResult {
  mode: 'key' | 'prefix' | 'all';
  key?: string;
  prefix?: string;
  deleted: number;
}

export interface PaperAiAnnotationJob {
  id: number;
  scope: string;
  provider: string;
  model: string;
  prompt_version?: string;
  promptVersion?: string;
  status: string;
  queued: number;
  processed: number;
  failed: number;
  skipped: number;
  estimated_cost_usd?: number;
  actual_cost_usd?: number;
  options_json?: string;
  error?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PaperAiOverview {
  annotations: number;
  annotatedPapers: number;
  totalPapers: number;
  coverage: number;
  needsReview: number;
  latestJob?: PaperAiAnnotationJob | null;
  provider: string;
  model: string;
  promptVersion: string;
}

export interface PaperAiTopicHit {
  topicId: string;
  label: string;
  confidence: number;
  evidence: string[];
}

export interface PaperAiAnnotationRow {
  id: number;
  paper_id: number;
  paperId?: number;
  provider: string;
  model: string;
  prompt_version?: string;
  input_hash?: string;
  summary_zh?: string;
  summary_en?: string;
  primary_domain?: string;
  topics_json?: string;
  metrics_json?: string;
  confidence: number;
  needs_review?: number | boolean;
  status: string;
  error?: string | null;
  created_at?: string;
  updated_at?: string;
  title: string;
  year: number | null;
  venue: string;
  domain: string;
}

export interface PaperAiAnnotationList {
  rows: PaperAiAnnotationRow[];
  total: number;
}

export interface PaperAiRunResult {
  ok: boolean;
  dryRun: boolean;
  jobId: number | null;
  mode: string;
  provider: string;
  model: string;
  promptVersion: string;
  queued: number;
  processed: number;
  failed: number;
  skipped: number;
  topicEdgesWritten: number;
  samples: Array<{
    paperId: number;
    title: string;
    confidence: number;
    topics: PaperAiTopicHit[];
    needsReview: boolean;
  }>;
  errors: string[];
  job?: PaperAiAnnotationJob | null;
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

export type RoadmapLevel = 'foundation' | 'intermediate' | 'advanced' | 'research';
export type LessonLevel = 'starter' | 'core' | 'advanced' | 'paper-reading' | 'research-frontier';

export interface RoadmapModule {
  id: string;
  title: string;
  purpose: string;
  lessonPlaceholders: string[];
  relatedKeywords: string[];
  relatedPaperQueries: string[];
}

export interface RoadmapStage {
  id: string;
  title: string;
  goal: string;
  modules: RoadmapModule[];
  checkpoints?: string[];
  resources?: LearningResource[];
}

export interface LearningResource {
  title: string;
  kind: 'course' | 'book' | 'tool' | 'paper' | 'guide';
  provider: string;
  url: string;
  note: string;
}

export interface PrerequisitesGroup {
  title: string;
  note: string;
  items: string[];
}

export interface LearningRoadmap {
  slug: string;
  title: string;
  shortTitle: string;
  domain: string;
  level: RoadmapLevel;
  description: string;
  targetUsers: string[];
  prerequisites: string[];
  stages: RoadmapStage[];
  relatedTopics: string[];
  relatedVenues: string[];
  relatedSearchQueries: string[];
  caveat: string;
  stageCount?: number;
  moduleCount?: number;
  lessonCount?: number;
  lessons?: DailyLesson[];
  family?: string;
  accent?: string;
  subtitle?: string;
  paperQuery?: string;
  venues?: string[];
  canonicalSlug?: string;
  foundation?: string[];
  prerequisitesGroups?: PrerequisitesGroup[];
  outcomes?: string[];
  projectIdeas?: string[];
}

export interface RouteFamily {
  id: string;
  title: string;
  description: string;
  routeIds: string[];
}

export interface FoundationGroup {
  title: string;
  note: string;
  items: string[];
}

export interface DailyLesson {
  id: string;
  title: string;
  roadmapSlug: string;
  moduleId: string;
  level: LessonLevel;
  estimatedMinutes: number;
  sectionPlaceholders: Record<string, string>;
  relatedTopics: string[];
  relatedSearchQueries: string[];
  relatedVenues: string[];
  roadmap?: Pick<LearningRoadmap, 'slug' | 'title' | 'shortTitle' | 'domain' | 'family' | 'foundation' | 'paperQuery'> | null;
}

export type LearningProgressAction = 'mark_completed' | 'review_later' | 'add_related_papers_to_queue';

export type LearningProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'review_later';

export interface LearningProgress {
  targetType: 'roadmap' | 'lesson';
  targetId: string;
  status: LearningProgressStatus;
  lastAction: LearningProgressStatus | 'add_related_papers_to_queue' | '';
  relatedPapersQueued: number;
  updatedAt: string | null;
}

export interface LearningQueueResult {
  ok: boolean;
  target: LearningProgress;
  queuedPaperIds: number[];
  queuedCount: number;
  errors: Array<{ paperId: number; error: string }>;
}

export interface LearningDashboard {
  generatedAt: string;
  caveats: { roadmap: string; lesson: string; intelligence: string };
  summary: { roadmaps: number; dailyLessons: number; linkedTopics: number; linkedVenues: number };
  featuredRoadmap: LearningRoadmap;
  today: DailyLesson | null;
  roadmaps: LearningRoadmap[];
  routeFamilies?: RouteFamily[];
  commonFoundations?: FoundationGroup[];
}

export type LearningContentKind = 'roadmap' | 'lesson' | 'route_family' | 'foundation_group';
export type LearningContentStatus = 'published' | 'draft' | 'archived';

export interface LearningContentRow {
  itemKind: LearningContentKind;
  itemId: string;
  title: string;
  status: LearningContentStatus;
  source: string;
  sourceVersion: string;
  payloadJson?: string;
  payloadHash: string;
  bytes: number;
  syncedAt: string;
  updatedAt: string;
  updatedByUserId?: number | null;
}

export interface LearningContentOverview {
  generatedAt: string;
  sourceVersion: string;
  summary: {
    dbItems: number;
    published: number;
    seedItems: number;
    roadmaps: number;
    lessons: number;
    routeFamilies: number;
    foundationGroups: number;
    bytes: number;
  };
  projection: {
    routes: number;
    lessons: number;
    routeFamilies: number;
    foundations: number;
    familyMembers: number;
    terms: number;
  };
  quality: {
    score: number;
    grade: string;
    possible: number;
    earned: number;
    issueCounts: Record<string, number>;
    coverage: {
      roadmaps: number;
      lessons: number;
      routesWithLessons: number;
      routeFamilies: number;
      foundations: number;
    };
    issues: Array<{
      severity: 'high' | 'medium' | 'low';
      target: string;
      message: string;
    }>;
  };
  byKind: Record<string, number>;
  validation: { errors: string[]; warnings: string[] };
  staleRows: LearningContentRow[];
  outOfSyncRows: LearningContentRow[];
  rows: LearningContentRow[];
}

export interface LearningContentSyncResult {
  ok: boolean;
  sourceVersion: string;
  seedItems: number;
  changedRows: number;
  summary: LearningContentOverview['summary'];
}

export interface CompanyRow {
  id: string;
  name: string;
  legalName?: string;
  aliases?: string[];
  country?: string;
  city?: string;
  website?: string;
  companyType?: string;
  status?: string;
  foundedYear?: number;
  registeredCapital?: string;
  employeeCount?: string;
  employeeCountRange?: string;
  stockTicker?: string;
  exchange?: string;
  marketCapUsd?: string;
  marketCapLabel?: string;
  stockPrice?: string;
  stockCurrency?: string;
  stockChangePercent?: number;
  marketDataSource?: string;
  marketDataAsOf?: string;
  description?: string;
  productLines?: string[];
  domains?: string[];
  technologyKeywords?: string[];
  applicationMarkets?: string[];
  careerRoles?: string[];
  hiringSignals?: string[];
  dataConfidence?: number;
  lastEnrichedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  sources?: CompanySource[];
  fieldFacts?: CompanyFieldFact[];
}

export interface CompanySource {
  id: string;
  sourceType: string;
  sourceName: string;
  sourceUrl?: string;
  fetchedAt?: string;
  confidence: number;
  notes?: string;
}

export interface CompanyFieldFact {
  id: string;
  fieldName: string;
  fieldValue: string;
  confidence: number;
  fetchedAt?: string;
  sourceName?: string;
  sourceUrl?: string;
}

export interface CompanyListResult {
  rows: CompanyRow[];
  total: number;
  limit: number;
  offset: number;
}

export type WatchlistTargetType = 'company' | 'paper' | 'author' | 'institution' | 'topic' | 'venue' | 'search' | 'roadmap' | 'lesson'

export interface WatchlistItem {
  id: number
  userId: number
  targetType: WatchlistTargetType
  targetId: string
  queryJson?: string
  createdAt: string
  updatedAt: string
}

export interface WatchlistByType {
  companies: Array<WatchlistItem & { title: string; subtitle: string; country: string; city: string; dataConfidence?: number; href: string }>
  searches: Array<WatchlistItem & { queryJsonObj?: Record<string, unknown>; href: string }>
  papers: Array<WatchlistItem & { title: string; venue: string; year: number | null; rank: string; field: string; score: number | null; href: string }>
  authors: Array<WatchlistItem & { title: string; href: string }>
  institutions: Array<WatchlistItem & { title: string; href: string }>
  topics: Array<WatchlistItem & { title: string; href: string }>
  venues: Array<WatchlistItem & { title: string; href: string }>
  roadmaps: Array<WatchlistItem & { title: string; family: string; href: string }>
  lessons: Array<WatchlistItem & { title: string; roadmapSlug: string; href: string }>
}

export interface CompanyCompareResult {
  companies: CompanyRow[];
  sharedDomains: string[];
  sharedCompanyTypes: string[];
  sharedCountries: string[];
  sharedProductLines: string[];
  fitMatching: Record<string, string[]>;
  caveat: string;
}

export interface ReadingQueueGroup {
  status: string
  readingStatus?: string
  label: string
  count: number
  papers: Array<{
    paper: PaperRow
    status: string
    readingStatus?: string
    readingState?: string
    important?: boolean
    flags?: string[]
    useCases?: string[]
    updatedAt: string | null
  }>
}

export interface InstitutionCompareItem {
  name: string
  requestedName: string
  canonicalName?: string
  country?: string
  city?: string
  totalPapers: number
  recentPapers: number
  avgScore: number
  citations: number
  yearlyTrend: Array<{ year: number; count: number }>
  topFields: Array<{ key: string; count: number }>
  topVenues: Array<{ key: string; count: number }>
  venueRankDistribution: Array<{ key: string; count: number }>
  activeAuthors: Array<{ name: string; count: number }>
  representativePapers: PaperRow[]
  qs: { qsWorldRank: number | null; qsRegionRank: number | null; region: string | null } | null
  metadataConfidence: number
  normalizationCaveat: string
}

export interface InstitutionCompareResult {
  institutions: InstitutionCompareItem[]
  caveat: string
}

export interface AuthorCompareItem {
  name: string
  requestedName: string
  canonicalName?: string
  aliases: string[]
  totalPapers: number
  recentPapers: number
  avgScore: number
  citations: number
  yearlyTrend: Array<{ year: number; count: number }>
  topFields: Array<{ key: string; count: number }>
  topVenues: Array<{ key: string; count: number }>
  venueRankDistribution: Array<{ key: string; count: number }>
  institutions: Array<{ name: string; count: number }>
  coauthors: Array<{ name: string; count: number }>
  representativePapers: PaperRow[]
  metadataConfidence: number
  normalizationCaveat: string
}

export interface AuthorCompareResult {
  authors: AuthorCompareItem[]
  caveat: string
}

export interface MentorCompareAggregate {
  overall: number | null
  researchFit: number | null
  mentoringStyle: number | null
  workload: number | null
  communication: number | null
  _raw: Record<string, number>
}

export interface MentorCompareItem {
  name: string
  requestedName: string
  approvedCount: number
  visibilityLevel: 'insufficient' | 'aggregate' | 'summary' | 'curated'
  aggregate: MentorCompareAggregate | null
  summary: string | null
  curatedComments: Array<{ publicAlias: string; text: string }>
  publicationProfileLink: string
  caveat: string
}

export interface MentorCompareResult {
  mentors: MentorCompareItem[]
  caveat: string
}

export interface TopicReport {
  field: string
  overview: {
    totalPapers: number
    recentPapers: number
    yearRange?: string
  }
  trend: Array<{ year: number; count: number }>
  topVenues: Array<{ key: string; count: number }>
  representativePapers: PaperRow[]
  activeAuthors: Array<{ name: string; papers: number; scoreSum: number; citations: number }>
  strongInstitutions: Array<{ name: string; papers: number; scoreSum: number; citations: number }>
  relatedCompanies: Array<{ id: string; name: string; domains: string[]; confidence: number | null }>
  relatedRoadmaps: Array<{ slug: string; title: string }>
  suggestedSearches: Array<{ label: string; params: Record<string, string> }>
  caveat: string
}

export interface TopicTaxonomyNode {
  id: string
  label: string
  parentId?: string
  aliases: string[]
  positiveKeywords: string[]
  negativeKeywords: string[]
  domain: string
}

export interface TopicTaxonomy {
  version: string
  source?: 'seed' | 'database'
  generatedAt: string
  summary?: {
    nodes: number
    rootNodes: number
    aliases: number
    keywordRules: number
    paperEdges: number
  }
  nodes: TopicTaxonomyNode[]
  tree: Array<TopicTaxonomyNode & { children: TopicTaxonomyNode[] }>
  caveat: string
}

export interface TopicTaxonomyAdminOverview {
  sourceVersion: string
  generatedAt: string
  seed: {
    nodes: number
    aliases: number
    keywordRules: number
  }
  database: {
    nodes: number
    aliases: number
    keywordRules: number
    paperEdges: number
  }
  drift: {
    missingInDb: string[]
    extraInDb: string[]
    inSync: boolean
  }
  next: string[]
}

export interface PaperTopicRefreshResult {
  generatedAt: string
  scannedPapers: number
  matchedPapers: number
  writtenEdges: number
  minConfidence: number
  reset: boolean
  topTopics: Array<{ topicId: string; label: string; count: number }>
  overview: TopicTaxonomyAdminOverview
}

export type CompanyJobSignal = {
  id: string;
  companyId: string;
  roleTitle: string;
  roleCategory?: string;
  location?: string;
  sourceUrl?: string;
  fetchedAt?: string;
  status?: 'active' | 'expired' | 'unknown';
  keywords?: string[];
}
