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
  const label = status === 'ok' || status === 'ready' ? '就绪' : status === 'error' ? '阻塞' : status === 'manual' ? '人工确认' : '需复核'
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

function maintenanceStatusLabel(status?: string) {
  if (!status) return '状态未知'
  const labels: Record<string, string> = {
    success: '成功',
    failed: '失败',
    error: '异常',
    running: '运行中',
    queued: '排队中',
    skipped: '已跳过',
  }
  return labels[status] || '状态待确认'
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
      title: '域名拆分',
      detail: '建议使用三个域名：公共站点、独立后台和 API，例如 www、admin、api。',
      status: runtime.data?.status === 'error' ? 'warn' : 'ready',
      action: '部署说明',
      href: '/platform',
    },
    {
      id: 'admin-protection',
      title: '后台访问保护',
      detail: '后台域名应叠加访问网关、VPN 或等效控制，并继续保留后端管理员登录校验。',
      status: checks.some((check) => check.id === 'auth-mode' && check.status === 'ok') ? 'ready' : 'warn',
      action: '运行检查',
      href: '/',
    },
    {
      id: 'backup',
      title: '部署前恢复点',
      detail: lastBackup ? `最近备份：${lastBackup.label}，${formatTime(lastBackup.createdAt)}` : 'DNS 切换、周更导入或结构变更前，请先创建备份。',
      status: lastBackup ? 'ready' : 'warn',
      action: '备份',
      href: '/backups',
    },
    {
      id: 'maintenance',
      title: '周更维护任务',
      detail: lastRun ? `最近运行：${lastRun.jobId} ${maintenanceStatusLabel(lastRun.status)}，${formatTime(lastRun.finishedAt || lastRun.startedAt)}` : '公开流量前先运行数据质量和快照任务。',
      status: lastRun?.status === 'success' ? 'ready' : 'manual',
      action: '维护任务',
      href: '/maintenance',
    },
    {
      id: 'dns',
      title: 'DNS 与 HTTPS 切换',
      detail: '把 www/admin/api 指向 VPS 或静态托管；解析生效后再签发证书。',
      status: 'manual',
      action: '运行部署检查',
    },
  ]

  return (
    <div className="launch-page">
      <section className="launch-hero">
        <div>
          <span>上线检查</span>
          <h1>独立域名上线面板</h1>
          <p>
            检查公共站点、独立后台和 API 域名的上线状态。这里是后台上线看板，不是面向公共用户的功能页。
          </p>
        </div>
        <div className={`launch-score launch-score-${runtime.data?.status || 'warn'}`}>
          <strong>{runtime.data?.status === 'ok' ? '正常' : runtime.data?.status === 'error' ? '阻塞' : runtime.data?.status === 'warn' ? '警告' : '加载中'}</strong>
          <span>{blockerCount} 个阻塞 / {warnCount} 个警告</span>
        </div>
      </section>

      <section className="launch-command-card">
        <div>
          <span>一次性初始化</span>
          <h2>生成生产环境配置</h2>
          <p>在服务器仓库执行这些命令，启动 Docker 前再人工检查密钥。</p>
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
            <span>先看阻塞项</span>
            <h2>健康检查</h2>
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
            {!checks.length && <p className="learning-muted">正在加载运行检查...</p>}
          </div>
        </div>

        <aside className="launch-panel">
          <div className="launch-panel-head">
            <span>DNS 结构</span>
            <h2>建议记录</h2>
          </div>
          <dl className="launch-dns">
            <div><dt>www</dt><dd>公共站点</dd></div>
            <div><dt>admin</dt><dd>独立后台</dd></div>
            <div><dt>api</dt><dd>后端 API</dd></div>
          </dl>
          <p>
            第一版可使用 DNS 服务、访问网关和单台 VPS + Caddy 作为最简单路径。
          </p>
          <Link to="/backups" className="launch-primary-link">创建恢复点</Link>
        </aside>
      </section>
    </div>
  )
}
