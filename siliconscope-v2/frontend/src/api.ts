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
  JournalFilterConfig,
  JournalFilterEvaluation,
  IdentityAliasInput,
  IdentityAliasRow,
  LearningDashboard,
  LearningRoadmap,
  DailyLesson,
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

  async moderationQueue(params?: { limit?: number; offset?: number }) {
    const res = await axios.get<ModerationQueue>('/api/admin/moderation', { params })
    return res.data
  },

  async moderate(targetType: string, targetId: number, action: 'approved' | 'rejected' | 'pending', reason?: string) {
    const res = await axios.post(`/api/admin/moderation/${encodeURIComponent(targetType)}/${targetId}`, { action, reason })
    return res.data
  },

  async reportContent(targetType: string, targetId: number, reason: string) {
    const res = await axios.post('/api/reports', { targetType, targetId, reason })
    return res.data
  },

  async methodology() {
    const res = await axios.get('/api/methodology')
    return res.data
  },
}
