import { Suspense, lazy, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import { api } from './api'
import { SkeletonState } from './components/StatusState'
import { useThemeMode, type ThemeMode } from './hooks/useThemeMode'
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
const AdminRedirectPage = lazy(() => import('./pages/AdminRedirectPage'))
const AccessRequestPage = lazy(() => import('./pages/AccessRequestPage'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

const navItems = [
  { to: '/', label: '学术搜索', icon: 'S', section: 'SiliconScope' },
  { to: '/intelligence', label: '情报中心', icon: 'I', section: 'SiliconScope' },
  { to: '/learning', label: '学习路线', icon: 'L', section: 'SiliconScope' },
  { to: '/workspace', label: '个人工作台', icon: 'W', section: 'SiliconScope' },
  { to: '/account', label: '账户平台', icon: 'A', section: 'SiliconScope' },
]

function LoginGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.authStatus()
      .then(setStatus)
      .catch(() => setStatus({ authenticated: true, authEnabled: false, appName: 'SiliconScope' }))
  }, [])

  async function login() {
    setLoading(true)
    setError('')
    try {
      await api.login(password)
      setStatus(await api.authStatus())
    } catch (err: any) {
      setError(err?.response?.data?.error || '登录失败，请检查 ADMIN_PASSWORD')
    } finally {
      setLoading(false)
    }
  }

  if (!status) return <SkeletonState title="正在进入 SiliconScope" description="检查本地认证状态和工作台配置。" />

  if (status.authEnabled && !status.authenticated) {
    return (
      <div className="ss-login">
        <div className="ss-login-card">
          <div className="ss-mark">S</div>
          <h1>SiliconScope</h1>
          <p>请输入管理员密码进入本地 IC 论文情报工作台。</p>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && login()}
            placeholder="ADMIN_PASSWORD"
          />
          {error && <div className="ss-login-error">{error}</div>}
          <button disabled={loading || !password} onClick={login}>
            {loading ? '登录中...' : '登录'}
          </button>
          <Link className="ss-login-link" to="/request-access">申请私测访问</Link>
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
  const [navOpen, setNavOpen] = useState(true)
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
            <span>IC intelligence</span>
          </div>
        </div>
        <nav className="ss-nav" aria-label="Primary navigation">
          {Object.entries(grouped).map(([section, items]) => (
            <div className="ss-nav-group" key={section}>
              <em>{section}</em>
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
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
            <span>主题</span>
            <select value={themeMode} onChange={(event) => setThemeMode(event.target.value as ThemeMode)}>
              <option value="system">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </label>
          <button onClick={() => setNavOpen(false)}>收起</button>
          <span>SQLite metadata workspace</span>
        </div>
      </aside>

      <button className="ss-collapse" onClick={() => setNavOpen(!navOpen)} aria-label="Toggle navigation">
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
        <Suspense fallback={<SkeletonState title="正在加载页面" description="模块正在按需加载。" />}>
          <Routes>
            <Route path="/request-access" element={<AccessRequestPage />} />
            <Route path="/legal" element={<LegalPage />} />
            <Route path="/legal/:slug" element={<LegalPage />} />
            <Route path="/*" element={<ProtectedApp themeMode={themeMode} setThemeMode={setThemeMode} />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
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
