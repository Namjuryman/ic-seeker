import { Suspense, lazy, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { api } from './api'
import type { AuthStatus } from './types'

const HomePage = lazy(() => import('./pages/HomePage'))
const PaperDetailPage = lazy(() => import('./pages/PaperDetailPage'))
const TopicsPage = lazy(() => import('./pages/TopicsPage'))
const GeoPage = lazy(() => import('./pages/GeoPage'))
const AuthorsPage = lazy(() => import('./pages/AuthorsPage'))
const InstitutionsPage = lazy(() => import('./pages/InstitutionsPage'))
const MentorsPage = lazy(() => import('./pages/MentorsPage'))
const VenueMatrixPage = lazy(() => import('./pages/VenueMatrixPage'))
const DataQualityPage = lazy(() => import('./pages/DataQualityPage'))
const JournalIngestionPage = lazy(() => import('./pages/JournalIngestionPage'))
const ModerationPage = lazy(() => import('./pages/ModerationPage'))
const IdentityPage = lazy(() => import('./pages/IdentityPage'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

const navItems = [
  { to: '/', label: '学术搜索', icon: '⌕' },
  { to: '/topics', label: '方向洞察', icon: '◌' },
  { to: '/geo', label: '区域地图', icon: '◇' },
  { to: '/authors', label: '学者画像', icon: '◎' },
  { to: '/institutions', label: '机构实力', icon: '▣' },
  { to: '/mentors', label: '导师/机构', icon: '♙' },
  { to: '/venue-matrix', label: '会议/期刊', icon: '▤' },
  { to: '/identity', label: '别名管理', icon: '≋' },
  { to: '/data-quality', label: '数据质量', icon: '✓' },
  { to: '/moderation', label: '审核中心', icon: '!' },
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

  return children
}

function Layout({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(true)

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
          {navItems.map((item) => (
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
                <Route path="/topics" element={<TopicsPage />} />
                <Route path="/geo" element={<GeoPage />} />
                <Route path="/authors" element={<AuthorsPage />} />
                <Route path="/authors/*" element={<AuthorsPage />} />
                <Route path="/institutions" element={<InstitutionsPage />} />
                <Route path="/institutions/*" element={<InstitutionsPage />} />
                <Route path="/mentors" element={<MentorsPage />} />
                <Route path="/mentors/*" element={<MentorsPage />} />
                <Route path="/venue-matrix" element={<VenueMatrixPage />} />
                <Route path="/identity" element={<IdentityPage />} />
                <Route path="/journal-ingestion" element={<JournalIngestionPage />} />
                <Route path="/data-quality" element={<DataQualityPage />} />
                <Route path="/moderation" element={<ModerationPage />} />
              </Routes>
            </Suspense>
          </Layout>
        </BrowserRouter>
      </LoginGate>
    </QueryClientProvider>
  )
}

export default App
