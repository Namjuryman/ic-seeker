import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import type { RuntimeCheck } from '../types'

type LaunchStep = {
  id: string
  title: string
  detail: string
  status: 'ready' | 'warn' | 'manual'
  action?: string
  href?: string
}

function CheckPill({ status }: { status: RuntimeCheck['status'] | LaunchStep['status'] }) {
  const label = status === 'ok' || status === 'ready' ? 'Ready' : status === 'error' ? 'Blocker' : status === 'manual' ? 'Manual' : 'Review'
  return <span className={`launch-pill launch-pill-${status}`}>{label}</span>
}

function runtimeRank(status: RuntimeCheck['status']) {
  if (status === 'error') return 0
  if (status === 'warn') return 1
  return 2
}

function formatTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export default function LaunchAdminPage() {
  const runtime = useQuery({
    queryKey: ['admin-runtime'],
    queryFn: () => api.adminRuntime(),
    refetchInterval: 60_000,
  })

  const backups = useQuery({
    queryKey: ['admin-backups'],
    queryFn: () => api.backups(),
    refetchInterval: 60_000,
  })

  const maintenance = useQuery({
    queryKey: ['maintenance-runs', 'launch'],
    queryFn: () => api.maintenanceRuns({ limit: 5 }),
    refetchInterval: 60_000,
  })

  const checks = [...(runtime.data?.checks || [])].sort((a, b) => runtimeRank(a.status) - runtimeRank(b.status))
  const blockerCount = checks.filter((check) => check.status === 'error').length
  const warnCount = checks.filter((check) => check.status === 'warn').length
  const lastBackup = backups.data?.rows?.[0]
  const lastRun = maintenance.data?.rows?.[0]

  const steps: LaunchStep[] = [
    {
      id: 'domain-split',
      title: 'Domain split',
      detail: 'Use three hostnames: public app, private admin app, and API. Example: www, admin, api.',
      status: runtime.data?.status === 'error' ? 'warn' : 'ready',
      action: 'Deployment doc',
      href: '/platform',
    },
    {
      id: 'admin-protection',
      title: 'Admin protection',
      detail: 'Keep admin.siliconscope behind Cloudflare Access, VPN, or an equivalent gate plus backend admin login.',
      status: checks.some((check) => check.id === 'auth-mode' && check.status === 'ok') ? 'ready' : 'warn',
      action: 'Runtime checks',
      href: '/',
    },
    {
      id: 'backup',
      title: 'Pre-deploy restore point',
      detail: lastBackup ? `Latest backup: ${lastBackup.label} at ${formatTime(lastBackup.createdAt)}` : 'Create a backup before DNS cutover, weekly imports, or schema changes.',
      status: lastBackup ? 'ready' : 'warn',
      action: 'Backups',
      href: '/backups',
    },
    {
      id: 'maintenance',
      title: 'Weekly maintenance task',
      detail: lastRun ? `Latest run: ${lastRun.jobId} ${lastRun.status} at ${formatTime(lastRun.finishedAt || lastRun.startedAt)}` : 'Run data quality and snapshot jobs before public traffic.',
      status: lastRun?.status === 'success' ? 'ready' : 'manual',
      action: 'Maintenance',
      href: '/maintenance',
    },
    {
      id: 'dns',
      title: 'DNS and HTTPS cutover',
      detail: 'Point www/admin/api to the VPS or static hosts. Caddy can issue certificates after records resolve.',
      status: 'manual',
      action: 'Run deploy doctor',
    },
  ]

  return (
    <div className="launch-page">
      <section className="launch-hero">
        <div>
          <span>Go-live Console</span>
          <h1>Independent domain launch</h1>
          <p>
            Production readiness for the public site, private admin console, and API domain. This page is a launch board,
            not a public feature.
          </p>
        </div>
        <div className={`launch-score launch-score-${runtime.data?.status || 'warn'}`}>
          <strong>{runtime.data?.status || 'loading'}</strong>
          <span>{blockerCount} blockers / {warnCount} warnings</span>
        </div>
      </section>

      <section className="launch-command-card">
        <div>
          <span>One-time bootstrap</span>
          <h2>Generate production env for your domain</h2>
          <p>Run this on the server repo, then review secrets before starting Docker.</p>
        </div>
        <pre>{`npm run deploy:init -- your-domain.com
npm run deploy:check -- .env.production
npm run build
npm run deploy:doctor -- .env.production
docker compose -f docker-compose.production.yml up -d --build`}</pre>
      </section>

      <section className="launch-grid">
        {steps.map((step) => (
          <article key={step.id} className={`launch-step launch-step-${step.status}`}>
            <div>
              <CheckPill status={step.status} />
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </div>
            {step.href ? <Link to={step.href}>{step.action}</Link> : <span>{step.action}</span>}
          </article>
        ))}
      </section>

      <section className="launch-panels">
        <div className="launch-panel">
          <div className="launch-panel-head">
            <span>Runtime blockers first</span>
            <h2>Health checks</h2>
          </div>
          <div className="launch-check-list">
            {checks.map((check) => (
              <div key={check.id} className={`launch-check launch-check-${check.status}`}>
                <CheckPill status={check.status} />
                <div>
                  <strong>{check.label}</strong>
                  <p>{check.message}</p>
                  {check.detail && <small>{check.detail}</small>}
                </div>
              </div>
            ))}
            {!checks.length && <p className="learning-muted">Loading runtime checks...</p>}
          </div>
        </div>

        <aside className="launch-panel">
          <div className="launch-panel-head">
            <span>DNS shape</span>
            <h2>Recommended records</h2>
          </div>
          <dl className="launch-dns">
            <div><dt>www</dt><dd>Public app</dd></div>
            <div><dt>admin</dt><dd>Private admin app</dd></div>
            <div><dt>api</dt><dd>Backend API</dd></div>
          </dl>
          <p>
            For the first version, Cloudflare DNS + Cloudflare Access + one VPS with Caddy is the simplest path.
          </p>
          <Link to="/backups" className="launch-primary-link">Create restore point</Link>
        </aside>
      </section>
    </div>
  )
}
