import { Suspense, lazy, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import { api } from './api'
import { SkeletonState } from './components/StatusState'
import { useThemeMode, type ThemeMode } from './hooks/useThemeMode'
import { LanguageToggle, useI18n } from './i18n'
import type { AuthStatus } from './types'

const HomePage = lazy(() => import('./pages/HomePage'))
const PaperDetailPage = lazy(() => import('./pages/PaperDetailPage'))
const TopicsPage = lazy(() => import('./pages/TopicsPage'))
const LearningPathPage = lazy(() => import('./pages/LearningPathPage'))
const LearningDashboardPage = lazy(() => import('./pages/LearningDashboardPage'))
const RoadmapDetailPage = lazy(() => import('./pages/RoadmapDetailPage'))
const DailyLessonPage = lazy(() => import('./pages/DailyLessonPage'))
const DailyCircuitPage = lazy(() => import('./pages/DailyCircuitPage'))
const IntelligenceHubPage = lazy(() => import('./pages/IntelligenceHubPage'))
const WorkspaceHubPage = lazy(() => import('./pages/WorkspaceHubPage'))
const AccountHubPage = lazy(() => import('./pages/AccountHubPage'))
const GeoPage = lazy(() => import('./pages/GeoPage'))
const AuthorsPage = lazy(() => import('./pages/AuthorsPage'))
const InstitutionsPage = lazy(() => import('./pages/InstitutionsPage'))
const MentorsPage = lazy(() => import('./pages/MentorsPage'))
const VenueMatrixPage = lazy(() => import('./pages/VenueMatrixPage'))
const CompaniesPage = lazy(() => import('./pages/CompaniesPage'))
const CompanyProfilePage = lazy(() => import('./pages/CompanyProfilePage'))
const CompanyComparePage = lazy(() => import('./pages/CompanyComparePage'))
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const BillingPage = lazy(() => import('./pages/BillingPage'))
const ReadingQueuePage = lazy(() => import('./pages/ReadingQueuePage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const InstitutionComparePage = lazy(() => import('./pages/InstitutionComparePage'))
const AuthorComparePage = lazy(() => import('./pages/AuthorComparePage'))
const MentorComparePage = lazy(() => import('./pages/MentorComparePage'))
const ExportCenterPage = lazy(() => import('./pages/ExportCenterPage'))
const TopicReportPage = lazy(() => import('./pages/TopicReportPage'))
const PlatformPage = lazy(() => import('./pages/PlatformPage'))
const LegalPage = lazy(() => import('./pages/LegalPage'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const AdminRedirectPage = lazy(() => import('./pages/AdminRedirectPage'))
const AccessRequestPage = lazy(() => import('./pages/AccessRequestPage'))

const routePreloads: Record<string, () => Promise<unknown>> = {
  '/': () => import('./pages/HomePage'),
  '/intelligence': () => import('./pages/IntelligenceHubPage'),
  '/learning': () => import('./pages/LearningDashboardPage'),
  '/workspace': () => import('./pages/WorkspaceHubPage'),
  '/account': () => import('./pages/AccountHubPage'),
}

const preloadedRoutes = new Set<string>()

function preloadRoute(path: string) {
  if (preloadedRoutes.has(path)) return
  preloadedRoutes.add(path)
  routePreloads[path]?.().catch(() => preloadedRoutes.delete(path))
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

function RouteLoadingFallback() {
  const { t } = useI18n()
  return (
    <div className="ss-route-loading" role="status" aria-live="polite">
      <span aria-hidden="true" />
      <p>{t('loading.page')}</p>
    </div>
  )
}

function LoginGate({ children, initialStatus }: { children: React.ReactNode; initialStatus?: AuthStatus }) {
  const { t } = useI18n()
  const [status, setStatus] = useState<AuthStatus | null>(initialStatus ?? null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialStatus) return
    api.authStatus()
      .then(setStatus)
      .catch(() => setStatus({ authenticated: true, authEnabled: false, appName: 'SiliconScope' }))
  }, [initialStatus])

  async function login() {
    setLoading(true)
    setError('')
    try {
      await api.login(password)
      setStatus(await api.authStatus())
    } catch (err: any) {
      setError(err?.response?.data?.error || t('login.error'))
    } finally {
      setLoading(false)
    }
  }

  if (!status) return <SkeletonState title={t('loading.enter')} description={t('loading.authCheck')} />

  if (status.authEnabled && !status.authenticated) {
    return (
      <div className="ss-login">
        <div className="ss-login-card">
          <div className="ss-mark">S</div>
          <h1>SiliconScope</h1>
          <p>{t('login.help')}</p>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && login()}
            placeholder="管理员密码"
          />
          {error && <div className="ss-login-error">{error}</div>}
          <button disabled={loading || !password} onClick={login}>
            {loading ? t('login.loading') : t('login.submit')}
          </button>
          <Link className="ss-login-link" to="/request-access">{t('login.requestAccess')}</Link>
        </div>
      </div>
    )
  }

  return children
}

function Layout({
  children,
  themeMode,
  setThemeMode,
}: {
  children: React.ReactNode
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
}) {
  const { t } = useI18n()
  const [navOpen, setNavOpen] = useState(true)
  const navItems = [
    { to: '/', label: t('nav.search'), icon: '检', section: t('nav.section.product') },
    { to: '/intelligence', label: t('nav.intelligence'), icon: '情', section: t('nav.section.product') },
    { to: '/learning', label: t('nav.learning'), icon: '学', section: t('nav.section.product') },
    { to: '/workspace', label: t('nav.workspace'), icon: '工', section: t('nav.section.product') },
    { to: '/account', label: t('nav.account'), icon: '账', section: t('nav.section.product') },
  ]
  const grouped = navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
    acc[item.section] = acc[item.section] || []
    acc[item.section].push(item)
    return acc
  }, {})

  return (
    <div className={`ss-shell ${navOpen ? '' : 'ss-shell-collapsed'}`}>
      <aside className="ss-sidebar" aria-hidden={!navOpen}>
        <div className="ss-brand">
          <div className="ss-brand-logo">S</div>
          <div>
            <strong>SiliconScope</strong>
            <span>IC 情报工作台</span>
          </div>
        </div>
        <nav className="ss-nav" aria-label="主导航">
          {Object.entries(grouped).map(([section, items]) => (
            <div className="ss-nav-group" key={section}>
              <em>{section}</em>
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onFocus={() => preloadRoute(item.to)}
                  onMouseEnter={() => preloadRoute(item.to)}
                  className={({ isActive }) => `ss-nav-item ${isActive ? 'active' : ''}`}
                >
                  <i aria-hidden="true">{item.icon}</i>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="ss-sidebar-foot">
          <label className="ss-theme-switch">
            <span>{t('nav.theme')}</span>
            <select value={themeMode} onChange={(event) => setThemeMode(event.target.value as ThemeMode)}>
              <option value="system">{t('nav.theme.system')}</option>
              <option value="light">{t('nav.theme.light')}</option>
              <option value="dark">{t('nav.theme.dark')}</option>
            </select>
          </label>
          <LanguageToggle />
          <button onClick={() => setNavOpen(false)}>{t('nav.collapse')}</button>
          <span>{t('nav.workspaceHint')}</span>
        </div>
      </aside>

      <button className="ss-collapse" onClick={() => setNavOpen(!navOpen)} aria-label={t('nav.toggle')}>
        {navOpen ? '<' : '>'}
      </button>

      <section className="ss-workspace">
        <main className="ss-main">{children}</main>
      </section>
    </div>
  )
}

function App() {
  const { themeMode, setThemeMode } = useThemeMode()

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/request-access" element={<AccessRequestPage />} />
            <Route path="/legal" element={<LegalPage />} />
            <Route path="/legal/:slug" element={<LegalPage />} />
            <Route path="/" element={<EntryPage themeMode={themeMode} setThemeMode={setThemeMode} />} />
            <Route path="/*" element={<ProtectedApp themeMode={themeMode} setThemeMode={setThemeMode} />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function EntryPage({ themeMode, setThemeMode }: { themeMode: ThemeMode; setThemeMode: (mode: ThemeMode) => void }) {
  const { t } = useI18n()
  const [status, setStatus] = useState<AuthStatus | null>(null)

  useEffect(() => {
    api.authStatus()
      .then(setStatus)
      .catch(() => setStatus({ authenticated: true, authEnabled: false, appName: 'SiliconScope' }))
  }, [])

  if (!status) return <SkeletonState title={t('loading.enter')} description={t('loading.home')} />
  if (status.authEnabled && !status.authenticated) return <LandingPage />

  return (
    <LoginGate initialStatus={status}>
      <Layout themeMode={themeMode} setThemeMode={setThemeMode}>
        <HomePage />
      </Layout>
    </LoginGate>
  )
}

function ProtectedApp({ themeMode, setThemeMode }: { themeMode: ThemeMode; setThemeMode: (mode: ThemeMode) => void }) {
  return (
    <LoginGate>
      <Layout themeMode={themeMode} setThemeMode={setThemeMode}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/papers/:id" element={<PaperDetailPage />} />
          <Route path="/intelligence" element={<IntelligenceHubPage />} />
          <Route path="/workspace" element={<WorkspaceHubPage />} />
          <Route path="/account" element={<AccountHubPage />} />
          <Route path="/daily-circuit" element={<DailyCircuitPage />} />
          <Route path="/learning" element={<LearningDashboardPage />} />
          <Route path="/learning/roadmaps/:slug" element={<RoadmapDetailPage />} />
          <Route path="/learning/today" element={<DailyLessonPage today />} />
          <Route path="/learning/lessons/:lessonId" element={<DailyLessonPage />} />
          <Route path="/learning-path" element={<LearningPathPage />} />
          <Route path="/topics" element={<TopicsPage />} />
          <Route path="/geo" element={<GeoPage />} />
          <Route path="/authors" element={<AuthorsPage />} />
          <Route path="/authors/*" element={<AuthorsPage />} />
          <Route path="/institutions" element={<InstitutionsPage />} />
          <Route path="/institutions/*" element={<InstitutionsPage />} />
          <Route path="/mentors" element={<MentorsPage />} />
          <Route path="/mentors/*" element={<MentorsPage />} />
          <Route path="/venue-matrix" element={<VenueMatrixPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/companies/:companyId" element={<CompanyProfilePage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/reading-queue" element={<ReadingQueuePage />} />
          <Route path="/compare/companies" element={<CompanyComparePage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/compare/institutions" element={<InstitutionComparePage />} />
          <Route path="/compare/authors" element={<AuthorComparePage />} />
          <Route path="/compare/mentors" element={<MentorComparePage />} />
          <Route path="/exports" element={<ExportCenterPage />} />
          <Route path="/reports" element={<TopicReportPage />} />
          <Route path="/platform" element={<PlatformPage />} />
          <Route path="/reports/topics" element={<TopicReportPage />} />
          <Route path="/reports/topics/:field" element={<TopicReportPage />} />
          <Route path="/admin/*" element={<AdminRedirectPage />} />
        </Routes>
      </Layout>
    </LoginGate>
  )
}

export default App
