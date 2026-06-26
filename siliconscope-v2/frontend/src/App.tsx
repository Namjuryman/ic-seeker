import { Suspense, createContext, lazy, useContext, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { api } from './api'
import type { AuthStatus } from './types'

const HomePage = lazy(() => import('./pages/HomePage'))
const PaperDetailPage = lazy(() => import('./pages/PaperDetailPage'))
const TopicsPage = lazy(() => import('./pages/TopicsPage'))
const LearningPathPage = lazy(() => import('./pages/LearningPathPage'))
const LearningDashboardPage = lazy(() => import('./pages/LearningDashboardPage'))
const RoadmapDetailPage = lazy(() => import('./pages/RoadmapDetailPage'))
const DailyLessonPage = lazy(() => import('./pages/DailyLessonPage'))
const GeoPage = lazy(() => import('./pages/GeoPage'))
const AuthorsPage = lazy(() => import('./pages/AuthorsPage'))
const InstitutionsPage = lazy(() => import('./pages/InstitutionsPage'))
const MentorsPage = lazy(() => import('./pages/MentorsPage'))
const VenueMatrixPage = lazy(() => import('./pages/VenueMatrixPage'))
const DataQualityPage = lazy(() => import('./pages/DataQualityPage'))
const JournalIngestionPage = lazy(() => import('./pages/JournalIngestionPage'))
const ModerationPage = lazy(() => import('./pages/ModerationPage'))
const IdentityPage = lazy(() => import('./pages/IdentityPage'))
const SnapshotAdminPage = lazy(() => import('./pages/SnapshotAdminPage'))
const CompaniesPage = lazy(() => import('./pages/CompaniesPage'))
const CompanyProfilePage = lazy(() => import('./pages/CompanyProfilePage'))
const CompanyComparePage = lazy(() => import('./pages/CompanyComparePage'))
const CompanyAdminPage = lazy(() => import('./pages/CompanyAdminPage'))
const AdminConsolePage = lazy(() => import('./pages/AdminConsolePage'))
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'))
const ReadingQueuePage = lazy(() => import('./pages/ReadingQueuePage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const InstitutionComparePage = lazy(() => import('./pages/InstitutionComparePage'))
const AuthorComparePage = lazy(() => import('./pages/AuthorComparePage'))
const MentorComparePage = lazy(() => import('./pages/MentorComparePage'))
const TopicReportPage = lazy(() => import('./pages/TopicReportPage'))
const PlatformPage = lazy(() => import('./pages/PlatformPage'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

type NavItem = {
  to: string
  label: string
  icon: string
  section: string
  adminOnly?: boolean
}

const AuthContext = createContext<AuthStatus | null>(null)

const navItems: NavItem[] = [
  { to: '/', label: '学术搜索', icon: 'S', section: '探索' },
  { to: '/learning', label: '每日电路', icon: 'D', section: '探索' },
  { to: '/learning-path', label: '路线库', icon: 'L', section: '探索' },
  { to: '/topics', label: '方向洞察', icon: 'T', section: '探索' },
  { to: '/geo', label: '区域地图', icon: 'G', section: '探索' },
  { to: '/companies', label: '企业情报', icon: 'C', section: '探索' },
  { to: '/watchlist', label: '关注列表', icon: 'W', section: '探索' },
  { to: '/reading-queue', label: '阅读队列', icon: 'R', section: '探索' },
  { to: '/compare', label: '对比中心', icon: '≋', section: '探索' },
  { to: '/reports', label: '报告中心', icon: 'P', section: '探索' },
  { to: '/authors', label: '学者画像', icon: 'A', section: '画像' },
  { to: '/institutions', label: '机构实力', icon: 'I', section: '画像' },
  { to: '/mentors', label: '导师档案', icon: 'M', section: '画像' },
  { to: '/platform', label: '平台中枢', icon: 'O', section: '数据' },
  { to: '/venue-matrix', label: '会议/期刊', icon: 'V', section: '数据' },
  { to: '/identity', label: '别名管理', icon: 'N', section: '数据', adminOnly: true },
  { to: '/snapshots', label: '快照管理', icon: 'C', section: '数据', adminOnly: true },
  { to: '/data-quality', label: '数据质量', icon: 'Q', section: '数据', adminOnly: true },
  { to: '/moderation', label: '审核中心', icon: '!', section: '数据', adminOnly: true },
]

function isAdmin(status: AuthStatus | null) {
  return status?.user?.role === 'admin'
}

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

  if (!status) return <div className="ss-loading">Loading SiliconScope...</div>

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
        </div>
      </div>
    )
  }

  return <AuthContext.Provider value={status}>{children}</AuthContext.Provider>
}

function Layout({ children }: { children: React.ReactNode }) {
  const auth = useContext(AuthContext)
  const [navOpen, setNavOpen] = useState(true)
  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin(auth))
  const grouped = visibleItems.reduce<Record<string, NavItem[]>>((acc, item) => {
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

function AdminOnly({ children }: { children: React.ReactNode }) {
  const auth = useContext(AuthContext)

  if (!isAdmin(auth)) {
    return (
      <div className="ss-admin-denied">
        <span>Admin only</span>
        <h1>这个页面只有管理员能访问</h1>
        <p>普通用户不会在导航中看到后台入口；即使直接输入地址，也会被前端拦截，后端 API 仍然会做管理员权限校验。</p>
      </div>
    )
  }

  return children
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LoginGate>
        <BrowserRouter>
          <Layout>
            <Suspense fallback={<div className="ss-loading">Loading page...</div>}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/papers/:id" element={<PaperDetailPage />} />
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
                <Route path="/identity" element={<AdminOnly><IdentityPage /></AdminOnly>} />
                <Route path="/snapshots" element={<AdminOnly><SnapshotAdminPage /></AdminOnly>} />
                <Route path="/journal-ingestion" element={<AdminOnly><JournalIngestionPage /></AdminOnly>} />
                <Route path="/data-quality" element={<AdminOnly><DataQualityPage /></AdminOnly>} />
                <Route path="/moderation" element={<AdminOnly><ModerationPage /></AdminOnly>} />
                <Route path="/companies" element={<CompaniesPage />} />
                <Route path="/companies/:companyId" element={<CompanyProfilePage />} />
                <Route path="/watchlist" element={<WatchlistPage />} />
                <Route path="/reading-queue" element={<ReadingQueuePage />} />
                <Route path="/compare/companies" element={<CompanyComparePage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/compare/institutions" element={<InstitutionComparePage />} />
                <Route path="/compare/authors" element={<AuthorComparePage />} />
                <Route path="/compare/mentors" element={<MentorComparePage />} />
                <Route path="/reports" element={<TopicReportPage />} />
                <Route path="/platform" element={<PlatformPage />} />
                <Route path="/reports/topics/:field" element={<TopicReportPage />} />
                <Route path="/admin" element={<AdminOnly><AdminConsolePage /></AdminOnly>} />
                <Route path="/admin/companies" element={<AdminOnly><CompanyAdminPage /></AdminOnly>} />
              </Routes>
            </Suspense>
          </Layout>
        </BrowserRouter>
      </LoginGate>
    </QueryClientProvider>
  )
}

export default App

