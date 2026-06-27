import React, { Suspense, lazy, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import '../../frontend/src/index.css'
import { api } from '../../frontend/src/api'
import type { AuthStatus } from '../../frontend/src/types'

const AdminConsolePage = lazy(() => import('../../frontend/src/pages/AdminConsolePage'))
const AdminAuditPage = lazy(() => import('../../frontend/src/pages/AdminAuditPage'))
const NotificationsPage = lazy(() => import('../../frontend/src/pages/NotificationsPage'))
const AdminBillingPage = lazy(() => import('../../frontend/src/pages/AdminBillingPage'))
const BackupAdminPage = lazy(() => import('../../frontend/src/pages/BackupAdminPage'))
const CompanyAdminPage = lazy(() => import('../../frontend/src/pages/CompanyAdminPage'))
const SnapshotAdminPage = lazy(() => import('../../frontend/src/pages/SnapshotAdminPage'))
const ModerationPage = lazy(() => import('../../frontend/src/pages/ModerationPage'))
const IdentityPage = lazy(() => import('../../frontend/src/pages/IdentityPage'))
const DataQualityPage = lazy(() => import('../../frontend/src/pages/DataQualityPage'))
const JournalIngestionPage = lazy(() => import('../../frontend/src/pages/JournalIngestionPage'))
const VenueMatrixPage = lazy(() => import('../../frontend/src/pages/VenueMatrixPage'))
const PlatformPage = lazy(() => import('../../frontend/src/pages/PlatformPage'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

const adminNav = [
  { to: '/', label: '总览', icon: 'A' },
  { to: '/audit-logs', label: '审计日志', icon: 'L' },
  { to: '/notifications', label: '通知中心', icon: 'N' },
  { to: '/billing', label: '订阅配额', icon: 'B' },
  { to: '/backups', label: '备份恢复', icon: 'R' },
  { to: '/companies', label: '企业数据', icon: 'C' },
  { to: '/snapshots', label: '快照缓存', icon: 'S' },
  { to: '/moderation', label: '审核队列', icon: 'M' },
  { to: '/identity', label: '别名归一', icon: 'I' },
  { to: '/data-quality', label: '数据质量', icon: 'Q' },
  { to: '/journal-ingestion', label: '导入任务', icon: 'J' },
  { to: '/venue-matrix', label: '会议期刊', icon: 'V' },
  { to: '/platform', label: '平台中枢', icon: 'P' },
]

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
      setError(err?.response?.data?.error || '管理员登录失败')
    } finally {
      setLoading(false)
    }
  }

  if (!status) return <div className="ss-loading">Loading SiliconScope Admin...</div>

  if (!status.authenticated || (status.authEnabled && status.user?.role !== 'admin')) {
    return (
      <div className="ss-login">
        <div className="ss-login-card">
          <div className="ss-mark">A</div>
          <h1>SiliconScope Admin</h1>
          <p>独立管理后台。请输入管理员密码；普通用户不会进入这里。</p>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && login()}
            placeholder="ADMIN_PASSWORD"
          />
          {error && <div className="ss-login-error">{error}</div>}
          <button disabled={loading || !password} onClick={login}>
            {loading ? '登录中...' : '管理员登录'}
          </button>
        </div>
      </div>
    )
  }

  if (status.user?.role !== 'admin') {
    return (
      <div className="ss-admin-denied">
        <span>Admin only</span>
        <h1>后台权限未开启</h1>
        <p>
          当前会话不是管理员。公网环境请启用密码登录并使用管理员账号；
          本地开发请通过 start-dev 脚本启动，它会显式设置 IC_SEEKER_LOCAL_ADMIN=1。
        </p>
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
            <strong>SiliconScope Admin</strong>
            <span>Operations console</span>
          </div>
        </div>
        <nav className="ss-nav" aria-label="Admin navigation">
          <div className="ss-nav-group">
            <em>后台</em>
            {adminNav.map((item) => (
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
        </nav>
        <div className="ss-sidebar-foot">
          <a href="http://localhost:5173">返回前台</a>
          <span>Deploy as admin.siliconscope.com</span>
        </div>
      </aside>
      <section className="ss-workspace">
        <main className="ss-main">{children}</main>
      </section>
    </div>
  )
}

function AdminApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminLoginGate>
        <BrowserRouter>
          <AdminLayout>
            <Suspense fallback={<div className="ss-loading">Loading admin module...</div>}>
              <Routes>
                <Route path="/" element={<AdminConsolePage />} />
                <Route path="/audit-logs" element={<AdminAuditPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/billing" element={<AdminBillingPage />} />
                <Route path="/backups" element={<BackupAdminPage />} />
                <Route path="/companies" element={<CompanyAdminPage />} />
                <Route path="/snapshots" element={<SnapshotAdminPage />} />
                <Route path="/moderation" element={<ModerationPage />} />
                <Route path="/identity" element={<IdentityPage />} />
                <Route path="/data-quality" element={<DataQualityPage />} />
                <Route path="/journal-ingestion" element={<JournalIngestionPage />} />
                <Route path="/venue-matrix" element={<VenueMatrixPage />} />
                <Route path="/platform" element={<PlatformPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
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
