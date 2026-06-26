import axios from 'axios'
import type {
  SearchResult,
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
  ModerationQueue,
  ModerationAction,
  SnapshotRow,
  SnapshotRefreshResult,
  SnapshotClearResult,
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
  PlatformOverview,
} from './types'

axios.defaults.withCredentials = true

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

  async stats() {
    const res = await axios.get<StatsData>('/api/stats')
    return res.data
  },

  async platform() {
    const res = await axios.get<PlatformOverview>('/api/platform')
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
    const res = await axios.get<{ status: string }>(`/api/reading-queue/${paperId}`)
    return res.data
  },

  async updateReadingQueue(paperId: number, status: string) {
    const res = await axios.post<{ ok: boolean }>(`/api/reading-queue/${paperId}`, { status })
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

  async methodology() {
    const res = await axios.get('/api/methodology')
    return res.data
  },
}
