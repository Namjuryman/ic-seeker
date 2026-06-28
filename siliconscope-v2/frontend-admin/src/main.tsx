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
const ModerationPage = lazy(() => import('../../frontend/src/pages/ModerationPage'))
const IdentityPage = lazy(() => import('../../frontend/src/pages/IdentityPage'))
const DataQualityPage = lazy(() => import('../../frontend/src/pages/DataQualityPage'))
const JournalIngestionPage = lazy(() => import('../../frontend/src/pages/JournalIngestionPage'))
const VenueMatrixPage = lazy(() => import('../../frontend/src/pages/VenueMatrixPage'))
const PlatformPage = lazy(() => import('../../frontend/src/pages/PlatformPage'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

const publicSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || 'http://localhost:5173'

const adminNav = [
  {
    section: 'Command',
    items: [
      { to: '/', label: 'Overview', icon: 'A' },
      { to: '/launch', label: 'Launch checklist', icon: 'G' },
      { to: '/job-operations', label: 'Operations ledger', icon: 'J' },
      { to: '/site-settings', label: 'Site settings', icon: 'F' },
      { to: '/access-requests', label: 'Access requests', icon: 'U' },
      { to: '/observability', label: 'Observability', icon: 'O' },
    ],
  },
  {
    section: 'Jobs',
    items: [
      { to: '/journal-ingestion', label: 'Ingestion jobs', icon: 'D' },
      { to: '/scheduler', label: 'Scheduler', icon: 'S' },
      { to: '/maintenance', label: 'Maintenance', icon: 'T' },
      { to: '/backups', label: 'Backups', icon: 'R' },
      { to: '/snapshots', label: 'Snapshots', icon: 'K' },
    ],
  },
  {
    section: 'Governance',
    items: [
      { to: '/audit-logs', label: 'Audit logs', icon: 'L' },
      { to: '/moderation', label: 'Moderation', icon: 'M' },
      { to: '/identity', label: 'Identity aliases', icon: 'I' },
      { to: '/data-quality', label: 'Data quality', icon: 'Q' },
    ],
  },
  {
    section: 'Business',
    items: [
      { to: '/billing', label: 'Billing admin', icon: 'B' },
      { to: '/companies', label: 'Company data', icon: 'C' },
      { to: '/notifications', label: 'Notifications', icon: 'N' },
      { to: '/venue-matrix', label: 'Venue matrix', icon: 'V' },
      { to: '/platform', label: 'Platform map', icon: 'P' },
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
      setError(err?.response?.data?.error || 'Admin login failed')
    } finally {
      setLoading(false)
    }
  }

  if (!status) return <div className="ss-loading">Loading SiliconScope Admin...</div>

  if (!status.authenticated) {
    return (
      <div className="ss-login">
        <div className="ss-login-card">
          <div className="ss-mark">A</div>
          <h1>SiliconScope Admin</h1>
          <p>Independent operations console. Public deployments should protect this hostname with Access, VPN, or an equivalent gate.</p>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && login()}
            placeholder="ADMIN_PASSWORD"
          />
          {error && <div className="ss-login-error">{error}</div>}
          <button disabled={loading || !password} onClick={login}>
            {loading ? 'Signing in...' : 'Admin sign in'}
          </button>
        </div>
      </div>
    )
  }

  if (status.user?.role !== 'admin') {
    return (
      <div className="ss-admin-denied">
        <span>Admin only</span>
        <h1>Access denied</h1>
        <p>
          This admin application is intentionally separate from the public frontend. Use an administrator session,
          Cloudflare Access, VPN, or the local development launcher with IC_SEEKER_LOCAL_ADMIN enabled.
        </p>
        <a href={publicSiteUrl}>Return to public app</a>
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
            <span>Private control plane</span>
          </div>
        </div>
        <nav className="ss-nav" aria-label="Admin navigation">
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
          <a href={publicSiteUrl}>Public app</a>
          <span>Deploy as admin.siliconscope.com</span>
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
  )
}

function AdminApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminLoginGate>
        <BrowserRouter>
          <AdminLayout>
            <Suspense fallback={<div className="ss-loading">Loading admin module...</div>}>
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
