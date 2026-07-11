import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import '../../frontend/src/index.css'
import { api } from '../../frontend/src/api'
import type { AuthStatus } from '../../frontend/src/types'

const AdminConsolePage = lazy(() => import('../../frontend/src/pages/AdminConsolePage'))
const LaunchAdminPage = lazy(() => import('../../frontend/src/pages/LaunchAdminPage'))
const JobOperationsPage = lazy(() => import('../../frontend/src/pages/JobOperationsPage'))
const SiteSettingsAdminPage = lazy(() => import('../../frontend/src/pages/SiteSettingsAdminPage'))
const AccessRequestsAdminPage = lazy(() => import('../../frontend/src/pages/AccessRequestsAdminPage'))
const SchedulerAdminPage = lazy(() => import('../../frontend/src/pages/SchedulerAdminPage'))
const MaintenanceAdminPage = lazy(() => import('../../frontend/src/pages/MaintenanceAdminPage'))
const ObservabilityPage = lazy(() => import('../../frontend/src/pages/ObservabilityPage'))
const AdminAuditPage = lazy(() => import('../../frontend/src/pages/AdminAuditPage'))
const NotificationsPage = lazy(() => import('../../frontend/src/pages/NotificationsPage'))
const AdminBillingPage = lazy(() => import('../../frontend/src/pages/AdminBillingPage'))
const BackupAdminPage = lazy(() => import('../../frontend/src/pages/BackupAdminPage'))
const CompanyAdminPage = lazy(() => import('../../frontend/src/pages/CompanyAdminPage'))
const SnapshotAdminPage = lazy(() => import('../../frontend/src/pages/SnapshotAdminPage'))
const SearchIndexAdminPage = lazy(() => import('../../frontend/src/pages/SearchIndexAdminPage'))
const AiEnrichmentAdminPage = lazy(() => import('../../frontend/src/pages/AiEnrichmentAdminPage'))
const LearningContentAdminPage = lazy(() => import('../../frontend/src/pages/LearningContentAdminPage'))
const TopicTaxonomyAdminPage = lazy(() => import('../../frontend/src/pages/TopicTaxonomyAdminPage'))
const ModerationPage = lazy(() => import('../../frontend/src/pages/ModerationPage'))
const IdentityPage = lazy(() => import('../../frontend/src/pages/IdentityPage'))
const DataQualityPage = lazy(() => import('../../frontend/src/pages/DataQualityPage'))
const JournalIngestionPage = lazy(() => import('../../frontend/src/pages/JournalIngestionPage'))
const VenueMatrixPage = lazy(() => import('../../frontend/src/pages/VenueMatrixPage'))
const PlatformPage = lazy(() => import('../../frontend/src/pages/PlatformPage'))
const CompletionReportAdminPage = lazy(() => import('../../frontend/src/pages/CompletionReportAdminPage'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

const publicSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || 'http://localhost:5173'

const adminNav = [
  {
    section: '总览',
    items: [
      { to: '/', label: '控制台概览', icon: '总' },
      { to: '/launch', label: '上线检查', icon: '检' },
      { to: '/job-operations', label: '运营记录', icon: '记' },
      { to: '/site-settings', label: '站点设置', icon: '设' },
      { to: '/access-requests', label: '访问申请', icon: '访' },
      { to: '/observability', label: '运行观测', icon: '观' },
      { to: '/completion-report', label: '任务报告', icon: '20' },
    ],
  },
  {
    section: '任务',
    items: [
      { to: '/journal-ingestion', label: '采集任务', icon: '采' },
      { to: '/scheduler', label: '调度器', icon: '调' },
      { to: '/maintenance', label: '维护任务', icon: '维' },
      { to: '/backups', label: '备份', icon: '备' },
      { to: '/snapshots', label: '快照', icon: '照' },
      { to: '/search-index', label: '搜索索引', icon: '索' },
      { to: '/ai-enrichment', label: 'AI 标注', icon: 'AI' },
    ],
  },
  {
    section: '治理',
    items: [
      { to: '/audit-logs', label: '审计日志', icon: '审' },
      { to: '/moderation', label: '内容审核', icon: '核' },
      { to: '/learning-content', label: '学习内容', icon: '学' },
      { to: '/topic-taxonomy', label: '主题分类', icon: '题' },
      { to: '/identity', label: '身份别名', icon: '名' },
      { to: '/data-quality', label: '数据质量', icon: '质' },
    ],
  },
  {
    section: '业务',
    items: [
      { to: '/billing', label: '订阅管理', icon: '订' },
      { to: '/companies', label: '企业数据', icon: '企' },
      { to: '/notifications', label: '通知', icon: '通' },
      { to: '/venue-matrix', label: '会议/期刊矩阵', icon: '会' },
      { to: '/platform', label: '平台中枢', icon: '台' },
    ],
  },
]

function normalizeAdminPath(pathname: string) {
  return pathname.startsWith('/admin/') ? pathname.slice('/admin'.length) : pathname === '/admin' ? '/' : pathname
}

function AdminLoginGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.authStatus()
      .then(setStatus)
      .catch(() => setStatus({ authenticated: false, authEnabled: true, appName: 'SiliconScope' }))
  }, [])

  async function login() {
    setLoading(true)
    setError('')
    try {
      await api.login(password)
      setStatus(await api.authStatus())
    } catch (err: any) {
      setError(err?.response?.data?.error || '管理端登录失败。')
    } finally {
      setLoading(false)
    }
  }

  if (!status) return <div className="ss-loading">正在进入 SiliconScope 管理后台...</div>

  if (!status.authenticated) {
    return (
      <div className="ss-login">
        <div className="ss-login-card">
          <div className="ss-mark">管</div>
          <h1>SiliconScope 管理后台</h1>
          <p>独立运营后台。公开部署时，请用访问网关、VPN 或等效访问控制保护管理域名。</p>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && login()}
            placeholder="管理员密码"
          />
          {error && <div className="ss-login-error">{error}</div>}
          <button disabled={loading || !password} onClick={login}>
            {loading ? '登录中...' : '进入管理后台'}
          </button>
        </div>
      </div>
    )
  }

  if (status.user?.role !== 'admin') {
    return (
      <div className="ss-admin-denied">
        <span>仅管理员可访问</span>
        <h1>无权访问</h1>
        <p>
          管理后台与公开站点相互隔离。请使用管理员会话、访问网关、VPN，或在本地开发环境启用管理端访问。
        </p>
        <a href={publicSiteUrl}>返回公开站点</a>
      </div>
    )
  }

  return children
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ss-shell ss-admin-shell">
      <aside className="ss-sidebar">
        <div className="ss-brand">
          <div className="ss-brand-logo">A</div>
          <div>
            <strong>SiliconScope 管理后台</strong>
            <span>私有运营后台</span>
          </div>
        </div>
        <nav className="ss-nav" aria-label="管理端导航">
          {adminNav.map((group) => (
            <div className="ss-nav-group" key={group.section}>
              <em>{group.section}</em>
              {group.items.map((item) => (
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
          <a href={publicSiteUrl}>公开站点</a>
          <span>建议部署为独立管理域名</span>
        </div>
      </aside>
      <section className="ss-workspace">
        <main className="ss-main">{children}</main>
      </section>
    </div>
  )
}

function AdminRoutes() {
  const location = useLocation()
  const normalizedPath = useMemo(() => normalizeAdminPath(location.pathname), [location.pathname])

  if (normalizedPath !== location.pathname) {
    return <Navigate to={`${normalizedPath}${location.search}${location.hash}`} replace />
  }

  return (
    <Routes>
      <Route path="/" element={<AdminConsolePage />} />
      <Route path="/launch" element={<LaunchAdminPage />} />
      <Route path="/job-operations" element={<JobOperationsPage />} />
      <Route path="/site-settings" element={<SiteSettingsAdminPage />} />
      <Route path="/access-requests" element={<AccessRequestsAdminPage />} />
      <Route path="/scheduler" element={<SchedulerAdminPage />} />
      <Route path="/maintenance" element={<MaintenanceAdminPage />} />
      <Route path="/observability" element={<ObservabilityPage />} />
      <Route path="/completion-report" element={<CompletionReportAdminPage />} />
      <Route path="/audit-logs" element={<AdminAuditPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/billing" element={<AdminBillingPage />} />
      <Route path="/backups" element={<BackupAdminPage />} />
      <Route path="/companies" element={<CompanyAdminPage />} />
      <Route path="/snapshots" element={<SnapshotAdminPage />} />
      <Route path="/search-index" element={<SearchIndexAdminPage />} />
      <Route path="/ai-enrichment" element={<AiEnrichmentAdminPage />} />
      <Route path="/learning-content" element={<LearningContentAdminPage />} />
      <Route path="/topic-taxonomy" element={<TopicTaxonomyAdminPage />} />
      <Route path="/moderation" element={<ModerationPage />} />
      <Route path="/identity" element={<IdentityPage />} />
      <Route path="/data-quality" element={<DataQualityPage />} />
      <Route path="/journal-ingestion" element={<JournalIngestionPage />} />
      <Route path="/venue-matrix" element={<VenueMatrixPage />} />
      <Route path="/platform" element={<PlatformPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function AdminApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminLoginGate>
        <BrowserRouter>
          <AdminLayout>
            <Suspense fallback={<div className="ss-loading">正在加载管理模块...</div>}>
              <AdminRoutes />
            </Suspense>
          </AdminLayout>
        </BrowserRouter>
      </AdminLoginGate>
    </QueryClientProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>,
)
