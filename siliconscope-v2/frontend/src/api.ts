import axios from 'axios'
import type {
  SearchResult,
  SearchSuggestionResult,
  TopicSummary,
  TopicDetail,
  AuthorProfile,
  InstitutionProfile,
  GeoResult,
  MentorInstitution,
  MentorDetail,
  MentorProfile,
  StatsData,
  VenueMatrixItem,
  PaperRow,
  PaperComment,
  MentorReview,
  MentorReviewStats,
  ApiKeyInfo,
  PdfInboxInfo,
  AuthStatus,
  DataQualityReport,
  ContentQualityFindingResult,
  ContentQualitySyncResult,
  ModerationQueue,
  ModerationAction,
  SnapshotRow,
  SnapshotRefreshResult,
  SnapshotClearResult,
  PaperAiOverview,
  PaperAiAnnotationList,
  PaperAiRunResult,
  JournalFilterConfig,
  JournalFilterEvaluation,
  IdentityAliasInput,
  IdentityAliasRow,
  LearningDashboard,
  LearningRoadmap,
  DailyLesson,
  RouteFamily,
  FoundationGroup,
  CompanyListResult,
  CompanyRow,
  CompanyCompareResult,
  WatchlistItem,
  WatchlistByType,
  ReadingQueueGroup,
  InstitutionCompareResult,
  AuthorCompareResult,
  MentorCompareResult,
  TopicReport,
  TopicTaxonomy,
  TopicTaxonomyAdminOverview,
  PaperTopicRefreshResult,
  PlatformOverview,
  AdminOverview,
  RuntimeHealth,
  SearchIndexStatus,
  SearchIndexRebuildResult,
  ObservabilitySnapshot,
  NotificationResult,
  AdminAuditLogResult,
  BillingPlan,
  BillingStatus,
  BillingUsageSummary,
  AdminBillingOverview,
  BillingUsersResult,
  BillingUserRow,
  CheckoutResult,
  BackupListResult,
  BackupManifest,
  BackupPruneResult,
  MaintenanceJob,
  MaintenanceRun,
  MaintenanceRunResult,
  SchedulerStatus,
  SchedulerJob,
  JobOperationsOverview,
  IngestionJob,
  IngestionJobResult,
  IngestionJobEventResult,
  SiteSettingsResult,
  SiteSettingRow,
  AccessRequestResult,
  AccessRequestRow,
  LearningContentOverview,
  LearningContentRow,
  LearningContentSyncResult,
  LearningProgress,
  LearningQueueResult,
  DailyCircuitListResult,
  DailyCircuitTodayResult,
  DailyCircuitItem,
  ReadingWorkflowResult,
  PaperDedupeResult,
  LocalPdfResult,
  FeatureCompletionReport,
  PaperIngestionRunResult,
  IdentityCandidateResult,
} from './types'

axios.defaults.withCredentials = true
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || ''

export const api = {
  async authStatus() {
    const res = await axios.get<AuthStatus>('/api/auth/status')
    return res.data
  },

  async login(password: string) {
    const res = await axios.post('/api/auth/login', { password })
    return res.data
  },

  async logout() {
    const res = await axios.post('/api/auth/logout')
    return res.data
  },

  async search(params: Record<string, string | number | boolean>) {
    const res = await axios.get<SearchResult>('/api/search', { params })
    return res.data
  },

  async searchSuggestions(params: { q: string }) {
    const res = await axios.get<SearchSuggestionResult>('/api/search/suggestions', { params })
    return res.data
  },

  async publicSearchDemo(params: { q: string }) {
    const res = await axios.get<SearchResult>('/api/public/search-demo', { params })
    return res.data
  },

  async stats() {
    const res = await axios.get<StatsData>('/api/stats')
    return res.data
  },

  async platform() {
    const res = await axios.get<PlatformOverview>('/api/platform')
    return res.data
  },

  async publicSiteSettings() {
    const res = await axios.get<Record<string, boolean | string | number>>('/api/site-settings')
    return res.data
  },

  async createAccessRequest(body: { email: string; name?: string; affiliation?: string; intendedUse?: string; planInterest?: string }) {
    const res = await axios.post<{ row: AccessRequestRow; duplicate: boolean }>('/api/access-requests', body)
    return res.data
  },

  async billingPlans() {
    const res = await axios.get<BillingPlan[]>('/api/billing/plans')
    return res.data
  },

  async billingStatus() {
    const res = await axios.get<BillingStatus>('/api/billing/status')
    return res.data
  },

  async billingUsage() {
    const res = await axios.get<BillingUsageSummary>('/api/billing/usage')
    return res.data
  },

  async startCheckout(planId: string) {
    const res = await axios.post<CheckoutResult>('/api/billing/checkout', { planId })
    return res.data
  },

  async adminOverview() {
    const res = await axios.get<AdminOverview>('/api/admin/overview')
    return res.data
  },

  async adminBilling() {
    const res = await axios.get<AdminBillingOverview>('/api/admin/billing')
    return res.data
  },

  async adminBillingUsers(params?: Record<string, string | number>) {
    const res = await axios.get<BillingUsersResult>('/api/admin/billing/users', { params })
    return res.data
  },

  async updateUserPlan(userId: number, body: { planId: string; reason?: string }) {
    const res = await axios.patch<BillingUserRow>(`/api/admin/billing/users/${userId}/plan`, body)
    return res.data
  },

  async adminRuntime() {
    const res = await axios.get<RuntimeHealth>('/api/admin/runtime')
    return res.data
  },

  async searchIndexStatus() {
    const res = await axios.get<SearchIndexStatus>('/api/admin/search-index')
    return res.data
  },

  async rebuildSearchIndex(target: string) {
    const res = await axios.post<SearchIndexRebuildResult>('/api/admin/search-index/rebuild', { target })
    return res.data
  },

  async adminObservability() {
    const res = await axios.get<ObservabilitySnapshot>('/api/admin/observability')
    return res.data
  },

  async backups() {
    const res = await axios.get<BackupListResult>('/api/admin/backups')
    return res.data
  },

  async createBackup(label: string) {
    const res = await axios.post<BackupManifest>('/api/admin/backups', { label })
    return res.data
  },

  async pruneBackups(keep: number) {
    const res = await axios.post<BackupPruneResult>('/api/admin/backups/prune', { keep })
    return res.data
  },

  async deleteBackup(id: string) {
    const res = await axios.delete<{ deleted: boolean; id: string; deletedFiles?: number }>(`/api/admin/backups/${encodeURIComponent(id)}`)
    return res.data
  },

  async maintenanceJobs() {
    const res = await axios.get<MaintenanceJob[]>('/api/admin/maintenance/jobs')
    return res.data
  },

  async maintenanceRuns(params?: Record<string, string | number>) {
    const res = await axios.get<MaintenanceRunResult>('/api/admin/maintenance/runs', { params })
    return res.data
  },

  async runMaintenanceJob(jobId: string, payload?: Record<string, unknown>) {
    const res = await axios.post<MaintenanceRun>(`/api/admin/maintenance/jobs/${encodeURIComponent(jobId)}/run`, payload || {})
    return res.data
  },

  async schedulerStatus() {
    const res = await axios.get<SchedulerStatus>('/api/admin/scheduler')
    return res.data
  },

  async updateSchedulerJob(jobId: string, body: { enabled?: boolean; intervalMinutes?: number; payload?: Record<string, unknown> }) {
    const res = await axios.patch<SchedulerJob>(`/api/admin/scheduler/${encodeURIComponent(jobId)}`, body)
    return res.data
  },

  async runSchedulerJob(jobId: string) {
    const res = await axios.post<MaintenanceRun>(`/api/admin/scheduler/${encodeURIComponent(jobId)}/run`)
    return res.data
  },

  async jobOperations() {
    const res = await axios.get<JobOperationsOverview>('/api/admin/job-operations')
    return res.data
  },

  async siteSettings() {
    const res = await axios.get<SiteSettingsResult>('/api/admin/site-settings')
    return res.data
  },

  async updateSiteSetting(key: string, value: boolean | string | number) {
    const res = await axios.patch<SiteSettingRow>(`/api/admin/site-settings/${encodeURIComponent(key)}`, { value })
    return res.data
  },

  async accessRequests(params?: Record<string, string | number>) {
    const res = await axios.get<AccessRequestResult>('/api/admin/access-requests', { params })
    return res.data
  },

  async updateAccessRequest(id: number, body: { status: string; notes?: string }) {
    const res = await axios.patch<AccessRequestRow>(`/api/admin/access-requests/${id}`, body)
    return res.data
  },

  async ingestionJobs(params?: Record<string, string | number>) {
    const res = await axios.get<IngestionJobResult>('/api/admin/ingestion/jobs', { params })
    return res.data
  },

  async createIngestionJob(body: { provider: string; mode: string; scope: Record<string, unknown>; notes?: string }) {
    const res = await axios.post<IngestionJob>('/api/admin/ingestion/jobs', body)
    return res.data
  },

  async updateIngestionJob(id: number, body: { status?: string; counts?: Record<string, number>; error?: string | null; notes?: string | null }) {
    const res = await axios.patch<IngestionJob>(`/api/admin/ingestion/jobs/${id}`, body)
    return res.data
  },

  async startIngestionJob(id: number) {
    const res = await axios.post<IngestionJob>(`/api/admin/ingestion/jobs/${id}/start`)
    return res.data
  },

  async cancelIngestionJob(id: number) {
    const res = await axios.post<IngestionJob>(`/api/admin/ingestion/jobs/${id}/cancel`)
    return res.data
  },

  async retryIngestionJob(id: number) {
    const res = await axios.post<IngestionJob>(`/api/admin/ingestion/jobs/${id}/retry`)
    return res.data
  },

  async ingestionJobEvents(id: number) {
    const res = await axios.get<IngestionJobEventResult>(`/api/admin/ingestion/jobs/${id}/events`)
    return res.data
  },

  async notifications(params?: Record<string, string | number>) {
    const res = await axios.get<NotificationResult>('/api/notifications', { params })
    return res.data
  },

  async notificationUnreadCount() {
    const res = await axios.get<{ unread: number }>('/api/notifications/unread-count')
    return res.data
  },

  async markNotificationRead(id: number) {
    const res = await axios.post<{ ok: boolean }>(`/api/notifications/${id}/read`)
    return res.data
  },

  async markAllNotificationsRead() {
    const res = await axios.post<{ ok: boolean; changed: number }>('/api/notifications/read-all')
    return res.data
  },

  async deleteNotification(id: number) {
    const res = await axios.delete<{ ok: boolean }>(`/api/notifications/${id}`)
    return res.data
  },

  async adminAuditLogs(params?: Record<string, string | number>) {
    const res = await axios.get<AdminAuditLogResult>('/api/admin/audit-logs', { params })
    return res.data
  },

  async topics() {
    const res = await axios.get<TopicSummary[]>('/api/topics')
    return res.data
  },

  async topicDetail(field: string) {
    const res = await axios.get<TopicDetail>('/api/topics/detail', { params: { field } })
    return res.data
  },

  async professors(params?: Record<string, string | number>) {
    const res = await axios.get('/api/professors', { params: { limit: 80, minPapers: 2, ...params } })
    return res.data
  },

  async authorProfile(name: string) {
    const res = await axios.get<AuthorProfile>(`/api/authors/${encodeURIComponent(name)}`)
    return res.data
  },

  async institutions(params?: Record<string, string | number>) {
    const res = await axios.get('/api/institutions', { params: { limit: 80, minPapers: 2, ...params } })
    return res.data
  },

  async institutionProfile(name: string) {
    const res = await axios.get<InstitutionProfile>(`/api/institutions/${encodeURIComponent(name)}`)
    return res.data
  },

  async geo(params?: Record<string, string | number>) {
    const res = await axios.get<GeoResult>('/api/geo', { params })
    return res.data
  },

  async venueMatrix() {
    const res = await axios.get<VenueMatrixItem[]>('/api/venue-matrix')
    return res.data
  },

  async learningDashboard() {
    const res = await axios.get<LearningDashboard>('/api/learning')
    return res.data
  },

  async learningRoadmaps() {
    const res = await axios.get<LearningRoadmap[]>('/api/learning/roadmaps')
    return res.data
  },

  async learningRoadmap(slug: string) {
    const res = await axios.get<LearningRoadmap>(`/api/learning/roadmaps/${encodeURIComponent(slug)}`)
    return res.data
  },

  async roadmapRelatedPapers(slug: string, limit = 8) {
    const res = await axios.get<SearchResult>(`/api/learning/roadmaps/${encodeURIComponent(slug)}/related-papers`, { params: { limit } })
    return res.data
  },

  async dailyLessons(params?: { roadmapSlug?: string }) {
    const res = await axios.get<DailyLesson[]>('/api/learning/lessons', { params })
    return res.data
  },

  async todayLesson() {
    const res = await axios.get<DailyLesson | null>('/api/learning/today')
    return res.data
  },

  async dailyCircuit(params?: { roadmapSlug?: string; limit?: number }) {
    const res = await axios.get<DailyCircuitListResult>('/api/daily-circuit', { params })
    return res.data
  },

  async todayDailyCircuit() {
    const res = await axios.get<DailyCircuitTodayResult | null>('/api/daily-circuit/today')
    return res.data
  },

  async dailyCircuitItem(id: string) {
    const res = await axios.get<DailyCircuitItem>(`/api/daily-circuit/${encodeURIComponent(id)}`)
    return res.data
  },

  async dailyLesson(lessonId: string) {
    const res = await axios.get<DailyLesson>(`/api/learning/lessons/${encodeURIComponent(lessonId)}`)
    return res.data
  },

  async lessonRelatedPapers(lessonId: string, limit = 8) {
    const res = await axios.get<SearchResult>(`/api/learning/lessons/${encodeURIComponent(lessonId)}/related-papers`, { params: { limit } })
    return res.data
  },

  async learningRouteFamilies() {
    const res = await axios.get<RouteFamily[]>('/api/learning/route-families')
    return res.data
  },

  async learningFoundations() {
    const res = await axios.get<FoundationGroup[]>('/api/learning/foundations')
    return res.data
  },

  async mentorInstitutions() {
    const res = await axios.get<MentorInstitution[]>('/api/mentor/institutions')
    return res.data
  },

  async mentorDetail(name: string) {
    const res = await axios.get<MentorDetail>(`/api/mentor/institutions/${encodeURIComponent(name)}`)
    return res.data
  },

  async mentorProfile(name: string) {
    const res = await axios.get<MentorProfile & { reviews?: MentorReview[]; reviewStats?: MentorReviewStats }>(`/api/mentor/authors/${encodeURIComponent(name)}`)
    return res.data
  },

  async paper(id: number) {
    const res = await axios.get<PaperRow & { note?: string }>(`/api/papers/${id}`)
    return res.data
  },

  async updatePaperState(id: number, body: { favorite?: boolean; readingStatus?: string; note?: string; tags?: string[] }) {
    const res = await axios.put<PaperRow & { note?: string }>(`/api/private/papers/${id}/state`, body)
    return res.data
  },

  async tags() {
    const res = await axios.get<Array<{ name: string; color: string; papers: number }>>('/api/private/tags')
    return res.data
  },

  async importDoi(doi: string) {
    const res = await axios.post<PaperRow>('/api/import/doi', { doi })
    return res.data
  },

  async importManual(body: Record<string, unknown>) {
    const res = await axios.post<PaperRow>('/api/import/manual', body)
    return res.data
  },

  async paperComments(id: number, params?: { limit?: number; offset?: number }) {
    const res = await axios.get<PaperComment[]>(`/api/papers/${id}/comments`, { params })
    return res.data
  },

  async addPaperComment(id: number, body: { commentType: string; body: string }) {
    const res = await axios.post<PaperComment>(`/api/papers/${id}/comments`, body)
    return res.data
  },

  async addMentorReview(name: string, body: Record<string, unknown>) {
    const res = await axios.post(`/api/mentor/authors/${encodeURIComponent(name)}/reviews`, body)
    return res.data
  },



  async identityAliases(type: 'author' | 'institution', params?: { q?: string; limit?: number; offset?: number }) {
    const res = await axios.get<IdentityAliasRow[]>('/api/admin/identity/aliases', { params: { type, ...params } })
    return res.data
  },

  async saveIdentityAlias(type: 'author' | 'institution', body: IdentityAliasInput) {
    const res = await axios.put<IdentityAliasRow>(`/api/admin/identity/aliases/${encodeURIComponent(type)}`, body)
    return res.data
  },

  async deleteIdentityAlias(type: 'author' | 'institution', alias: string) {
    const res = await axios.delete(`/api/admin/identity/aliases/${encodeURIComponent(type)}/${encodeURIComponent(alias)}`)
    return res.data
  },

  async apiKeys() {
    const res = await axios.get<ApiKeyInfo[]>('/api/admin/api-keys')
    return res.data
  },

  async setApiKey(provider: string, value: string) {
    const res = await axios.put<ApiKeyInfo[]>(`/api/admin/api-keys/${encodeURIComponent(provider)}`, { value })
    return res.data
  },

  async pdfInbox() {
    const res = await axios.get<PdfInboxInfo>('/api/pdf-inbox')
    return res.data
  },



  async dataQuality(params?: { scanLimit?: number; sampleLimit?: number }) {
    const res = await axios.get<DataQualityReport>('/api/data-quality', { params })
    return res.data
  },

  async contentQualityFindings(params?: { status?: string; type?: string; severity?: string; limit?: number; offset?: number }) {
    const res = await axios.get<ContentQualityFindingResult>('/api/admin/content-quality/findings', { params })
    return res.data
  },

  async syncContentQualityFindings(body?: { scanLimit?: number; sampleLimit?: number }) {
    const res = await axios.post<ContentQualitySyncResult>('/api/admin/content-quality/sync', body || {})
    return res.data
  },

  async updateContentQualityFinding(id: number, body: { status: 'open' | 'ignored' | 'resolved' }) {
    const res = await axios.patch(`/api/admin/content-quality/findings/${id}`, body)
    return res.data
  },

  async journalFilters() {
    const res = await axios.get<JournalFilterConfig>('/api/journal-filters')
    return res.data
  },

  async evaluateJournalFilter(body: { venue: string; title: string; abstract?: string; concepts?: string[] | string }) {
    const res = await axios.post<JournalFilterEvaluation>('/api/journal-filters/evaluate', body)
    return res.data
  },

  async moderationQueue(params?: { limit?: number; offset?: number; status?: string }) {
    const res = await axios.get<ModerationQueue>('/api/admin/moderation', { params })
    return res.data
  },

  async moderate(targetType: string, targetId: number, action: ModerationAction, reason?: string) {
    const res = await axios.post(`/api/admin/moderation/${encodeURIComponent(targetType)}/${targetId}`, { action, reason })
    return res.data
  },

  async snapshots() {
    const res = await axios.get<SnapshotRow[]>('/api/admin/snapshots')
    return res.data
  },

  async refreshSnapshots(body: { key?: string; keys?: string[] } = { key: 'all' }) {
    const res = await axios.post<SnapshotRefreshResult[]>('/api/admin/snapshots/refresh', body)
    return res.data
  },

  async clearSnapshots(body: { key?: string; prefix?: string } = {}) {
    const res = await axios.post<SnapshotClearResult>('/api/admin/snapshots/clear', body)
    return res.data
  },

  async paperAiOverview() {
    const res = await axios.get<PaperAiOverview>('/api/admin/ai-enrichment/overview')
    return res.data
  },

  async paperAiAnnotations(params?: { limit?: number; needsReview?: boolean }) {
    const res = await axios.get<PaperAiAnnotationList>('/api/admin/ai-enrichment/annotations', { params })
    return res.data
  },

  async runPaperAiEnrichment(body: {
    mode?: string
    limit?: number
    provider?: string
    model?: string
    dryRun?: boolean
    writeTopicEdges?: boolean
    minTopicConfidence?: number
  }) {
    const res = await axios.post<PaperAiRunResult>('/api/admin/ai-enrichment/run', body)
    return res.data
  },

  async learningContentAdmin() {
    const res = await axios.get<LearningContentOverview>('/api/admin/learning-content')
    return res.data
  },

  async syncLearningSeed() {
    const res = await axios.post<LearningContentSyncResult>('/api/admin/learning-content/sync-seed')
    return res.data
  },

  async learningContentItem(kind: string, id: string) {
    const res = await axios.get<LearningContentRow>(`/api/admin/learning-content/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`)
    return res.data
  },

  async updateLearningContentItem(kind: string, id: string, body: { status?: string; title?: string; payloadJson?: string }) {
    const res = await axios.patch<LearningContentRow>(`/api/admin/learning-content/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`, body)
    return res.data
  },

  async reportContent(targetType: string, targetId: number, reason: string) {
    const res = await axios.post('/api/reports', { targetType, targetId, reason })
    return res.data
  },

  async companies(params?: Record<string, string | number>) {
    const res = await axios.get<CompanyListResult>('/api/companies', { params })
    return res.data
  },

  async company(id: string) {
    const res = await axios.get<CompanyRow>(`/api/companies/${encodeURIComponent(id)}`)
    return res.data
  },

  async companyRelatedPapers(id: string, limit = 20) {
    const res = await axios.get<SearchResult>(`/api/companies/${encodeURIComponent(id)}/related-papers`, { params: { limit } })
    return res.data
  },

  async companyRelatedRoadmaps(id: string) {
    const res = await axios.get<Array<{ slug: string; title: string; domain: string; level: string; score: number }>>(`/api/companies/${encodeURIComponent(id)}/related-roadmaps`)
    return res.data
  },

  async companyTypes() {
    const res = await axios.get<string[]>('/api/companies/types')
    return res.data
  },

  async companyDomains() {
    const res = await axios.get<string[]>('/api/companies/domains')
    return res.data
  },

  async compareCompanies(ids: string[]) {
    const res = await axios.get<CompanyCompareResult>('/api/compare/companies', { params: { ids: ids.join(',') } })
    return res.data
  },

  async compareInstitutions(names: string[]) {
    const res = await axios.get<InstitutionCompareResult>('/api/compare/institutions', { params: { names: names.join(',') } })
    return res.data
  },

  async compareAuthors(names: string[]) {
    const res = await axios.get<AuthorCompareResult>('/api/compare/authors', { params: { names: names.join(',') } })
    return res.data
  },

  async compareMentors(names: string[]) {
    const res = await axios.get<MentorCompareResult>('/api/compare/mentors', { params: { names: names.join(',') } })
    return res.data
  },

  async topicReport(field: string) {
    const res = await axios.get<TopicReport>(`/api/reports/topics/${encodeURIComponent(field)}`)
    return res.data
  },

  async topicTaxonomy() {
    const res = await axios.get<TopicTaxonomy>('/api/topic-taxonomy')
    return res.data
  },

  async topicTaxonomyAdmin() {
    const res = await axios.get<TopicTaxonomyAdminOverview>('/api/admin/topic-taxonomy')
    return res.data
  },

  async syncTopicTaxonomy() {
    const res = await axios.post<TopicTaxonomyAdminOverview>('/api/admin/topic-taxonomy/sync')
    return res.data
  },

  async refreshPaperTopicEdges(payload: { limit?: number; minConfidence?: number; reset?: boolean } = {}) {
    const res = await axios.post<PaperTopicRefreshResult>('/api/admin/topic-taxonomy/paper-edges/refresh', payload)
    return res.data
  },

  async exportFile(kind: string, params: Record<string, string>) {
    const path = kind === 'topic-report' ? '/api/exports/topic-report' : `/api/exports/${encodeURIComponent(kind)}`
    const res = await axios.get<Blob>(path, { params, responseType: 'blob' })
    const disposition = String(res.headers['content-disposition'] || '')
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] || `siliconscope-${kind}.${params.format || 'md'}`
    return { blob: res.data, filename }
  },

  async createCompany(body: Record<string, unknown>) {
    const res = await axios.post<CompanyRow>('/api/admin/companies', body)
    return res.data
  },

  async updateCompany(id: string, body: Record<string, unknown>) {
    const res = await axios.patch<CompanyRow>(`/api/admin/companies/${encodeURIComponent(id)}`, body)
    return res.data
  },

  async deleteCompany(id: string) {
    const res = await axios.delete<{ id: string; deleted: boolean }>(`/api/admin/companies/${encodeURIComponent(id)}`)
    return res.data
  },

  async watchlistItems() {
    const res = await axios.get<WatchlistByType>('/api/watchlist')
    return res.data
  },

  async watchlistByType(type: string) {
    const res = await axios.get<WatchlistItem[]>(`/api/watchlist/type/${encodeURIComponent(type)}`)
    return res.data
  },

  async addWatchlistItem(type: string, targetId: string, queryJson?: Record<string, unknown>) {
    const res = await axios.post<{ ok: boolean; created?: boolean; alreadyExists?: boolean }>('/api/watchlist', { targetType: type, targetId, queryJson })
    return res.data
  },

  async deleteWatchlistItem(id: number) {
    const res = await axios.delete<{ ok: boolean }>(`/api/watchlist/${id}`)
    return res.data
  },

  async readingQueue() {
    const res = await axios.get<ReadingQueueGroup[]>('/api/reading-queue')
    return res.data
  },

  async readingQueueStatus(paperId: number) {
    const res = await axios.get<{ status: string; readingStatus?: string; important?: boolean; flags?: string[]; useCases?: string[] }>(`/api/reading-queue/${paperId}`)
    return res.data
  },

  async updateReadingQueue(
    paperId: number,
    payload: string | { readingStatus?: string; readingState?: string; status?: string; important?: boolean; flags?: string[]; useCases?: string[] }
  ) {
    const body = typeof payload === 'string' ? { status: payload } : payload
    const res = await axios.post<{ ok: boolean }>(`/api/reading-queue/${paperId}`, body)
    return res.data
  },

  async readingWorkflow(paperId: number) {
    const res = await axios.get<ReadingWorkflowResult>(`/api/reading-workflow/${paperId}`)
    return res.data
  },

  async updateReadingWorkflow(paperId: number, body: Record<string, unknown>) {
    const res = await axios.put<ReadingWorkflowResult>(`/api/reading-workflow/${paperId}`, body)
    return res.data
  },

  async readingWorkflowDue(limit = 30) {
    const res = await axios.get<Array<{ workflow: ReadingWorkflowResult['workflow']; paper: PaperRow }>>('/api/reading-workflow/due', { params: { limit } })
    return res.data
  },

  async learningProgress(targetType: 'roadmap' | 'lesson', targetId: string) {
    const res = await axios.get<LearningProgress>(`/api/learning/progress/${targetType}/${encodeURIComponent(targetId)}`)
    return res.data
  },

  async learningProgressList() {
    const res = await axios.get<LearningProgress[]>('/api/learning/progress')
    return res.data
  },

  async updateLearningProgress(targetType: 'roadmap' | 'lesson', targetId: string, status: string) {
    const res = await axios.post<LearningProgress>(`/api/learning/progress/${targetType}/${encodeURIComponent(targetId)}`, { status })
    return res.data
  },

  async queueLearningRelatedPapers(targetType: 'roadmap' | 'lesson', targetId: string, limit = 5) {
    const res = await axios.post<LearningQueueResult>(`/api/learning/progress/${targetType}/${encodeURIComponent(targetId)}/queue-related`, { limit })
    return res.data
  },

  async watchlistCompanies() {
    const res = await axios.get<CompanyRow[]>('/api/watchlist/companies')
    return res.data
  },

  async isWatchedCompany(id: string) {
    const res = await axios.get<{ watched: boolean }>(`/api/watchlist/companies/${encodeURIComponent(id)}`)
    return res.data
  },

  async watchCompany(id: string) {
    const res = await axios.post<{ watched: boolean; companyId: string }>(`/api/watchlist/companies/${encodeURIComponent(id)}`)
    return res.data
  },

  async unwatchCompany(id: string) {
    const res = await axios.delete<{ watched: boolean; companyId: string }>(`/api/watchlist/companies/${encodeURIComponent(id)}`)
    return res.data
  },

  async completionReport() {
    const res = await axios.get<FeatureCompletionReport>('/api/admin/completion-report')
    return res.data
  },

  async paperIngestionRuns(params?: { status?: string; limit?: number; offset?: number }) {
    const res = await axios.get<PaperIngestionRunResult>('/api/admin/paper-ingestion/runs', { params })
    return res.data
  },

  async runPaperIngestion(body: Record<string, unknown>) {
    const res = await axios.post<Record<string, unknown>>('/api/admin/paper-ingestion/run', body)
    return res.data
  },

  async paperDedupe(params?: { status?: string; limit?: number; offset?: number }) {
    const res = await axios.get<PaperDedupeResult>('/api/admin/paper-dedupe', { params })
    return res.data
  },

  async scanPaperDedupe(body: { limit?: number; persist?: boolean } = {}) {
    const res = await axios.post<PaperDedupeResult>('/api/admin/paper-dedupe/scan', body)
    return res.data
  },

  async localPdfs(params?: { status?: string; limit?: number; offset?: number }) {
    const res = await axios.get<LocalPdfResult>('/api/admin/local-pdfs', { params })
    return res.data
  },

  async identityCandidates(type: 'author' | 'institution', params?: { status?: string; limit?: number; offset?: number }) {
    const res = await axios.get<IdentityCandidateResult>('/api/admin/identity/candidates', { params: { type, ...params } })
    return res.data
  },

  async methodology() {
    const res = await axios.get('/api/methodology')
    return res.data
  },
}
