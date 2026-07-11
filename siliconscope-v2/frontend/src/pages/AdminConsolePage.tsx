import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import type { AdminOperation, RuntimeCheck } from '../types'
import { providerLabel } from '../utils/displayLabels'

const statusText: Record<AdminOperation['status'], string> = {
  ready: '正常',
  partial: '部分可用',
  planned: '准备中',
  attention: '需处理',
  'needs-refresh': '需刷新',
  'needs-seed': '需导入',
}

const runtimeText: Record<RuntimeCheck['status'], string> = {
  ok: '正常',
  warn: '警告',
  error: '异常',
}

const healthText: Record<string, string> = {
  ok: '正常',
  warn: '警告',
  error: '异常',
  online: '在线',
  degraded: '降级',
  unknown: '未知',
}

const authModeText: Record<string, string> = {
  password: '密码登录',
  'local-dev': '本地开发',
}

const moderationLabel: Record<string, string> = {
  comments: '评论',
  reviews: '评价',
  reports: '举报',
  paper_comment: '论文评论',
  mentor_review: '研究者评价',
  professor_review: '研究者评价',
  company: '企业',
  institution: '机构',
  author: '作者',
  paper: '论文',
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024).toLocaleString()} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatUptime(seconds = 0) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '刚启动'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`
  return `${minutes} 分钟`
}

function displayHealth(value?: string | null) {
  if (!value) return '-'
  return healthText[value] || value
}

function OperationCard({ item }: { item: AdminOperation }) {
  return (
    <Link to={item.href} className={`admin-op admin-op-${item.status}`}>
      <div className="admin-op-head">
        <span>{statusText[item.status]}</span>
        <strong>{item.metric}</strong>
      </div>
      <h3>{item.title}</h3>
      <p>{item.detail}</p>
      <em>{item.action}</em>
    </Link>
  )
}

function RuntimeCheckRow({ check }: { check: RuntimeCheck }) {
  return (
    <div className={`runtime-check runtime-check-${check.status}`}>
      <span>{runtimeText[check.status]}</span>
      <strong>{check.label}</strong>
      <p>{check.message}</p>
      {check.detail && <small>{check.detail}</small>}
    </div>
  )
}

export default function AdminConsolePage() {
  const overview = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => api.adminOverview(),
    refetchInterval: 60_000,
  })

  if (overview.isLoading) {
    return <div className="learning-muted">正在加载管理后台...</div>
  }

  if (!overview.data) {
    return <div className="learning-muted">管理员总览暂不可用。</div>
  }

  const data = overview.data
  const summary = data.summary
  const topology = data.platform.topology
  const runtime = data.runtime
  const runtimeStatus = runtime?.status || data.health.backend

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <span>后台总览</span>
          <h1>管理员控制台</h1>
          <p>
            面向独立后台域名的运营入口：检查生产就绪状态、任务台账、备份、快照、审核队列、API key、企业数据、别名归一和数据质量。
          </p>
        </div>
        <div className={`admin-health admin-health-${runtime?.status || 'warn'}`}>
          <strong>{displayHealth(runtimeStatus)}</strong>
          <span>{authModeText[data.health.authMode] || data.health.authMode} / {formatUptime(data.health.uptimeSeconds)}</span>
        </div>
      </section>

      <section className="admin-status-strip">
        <div><span>后端 API</span><strong>{displayHealth(data.health.backend)}</strong></div>
        <div><span>运行状态</span><strong>{displayHealth(runtime?.status || 'unknown')}</strong></div>
        <div><span>Node</span><strong>{runtime?.nodeVersion || '-'}</strong></div>
        <div><span>应用库</span><strong>{providerLabel(topology.appStore.provider)}</strong></div>
        <div><span>缓存</span><strong>{providerLabel(topology.cache.provider)}</strong></div>
        <div><span>搜索</span><strong>{providerLabel(topology.search.provider)}</strong></div>
      </section>

      <section className="admin-summary">
        <div><span>论文库</span><strong>{summary.papers.toLocaleString()}</strong><small>{summary.years?.minYear}-{summary.years?.maxYear}</small></div>
        <div><span>快照缓存</span><strong>{summary.snapshots}</strong><small>{formatBytes(summary.snapshotBytes)}</small></div>
        <div><span>审核待处理</span><strong>{summary.moderationOpen}</strong><small>评论 / 评价 / 举报</small></div>
        <div><span>访问密钥</span><strong>{summary.apiKeys}</strong><small>已配置</small></div>
        <div><span>企业数据</span><strong>{summary.companies}</strong><small>家企业</small></div>
        <div><span>通知</span><strong>{summary.unreadNotifications ?? 0}</strong><small>共 {summary.notifications ?? 0} 条</small></div>
      </section>

      <section className="admin-grid">
        <div className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>运维模块</span>
              <h2>后端运营模块</h2>
            </div>
            <Link to="/job-operations">打开任务台账</Link>
          </div>
          <div className="admin-ops">
            {data.operations.map((item) => <OperationCard key={item.id} item={item} />)}
          </div>
        </div>

        <aside className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>运行检查</span>
              <h2>生产检查</h2>
            </div>
          </div>
          <div className="runtime-check-list">
            {(runtime?.checks || []).slice(0, 8).map((check) => (
              <RuntimeCheckRow key={check.id} check={check} />
            ))}
            {!runtime?.checks?.length && <p className="learning-muted">暂无运行检查数据。</p>}
          </div>
        </aside>
      </section>

      <section className="admin-grid">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>审核</span>
              <h2>近期审核</h2>
            </div>
            <Link to="/moderation">进入审核</Link>
          </div>
          <div className="admin-moderation">
            <div><strong>{data.recentModeration.totals?.comments || 0}</strong><span>评论</span></div>
            <div><strong>{data.recentModeration.totals?.reviews || 0}</strong><span>评价</span></div>
            <div><strong>{data.recentModeration.totals?.reports || 0}</strong><span>举报</span></div>
          </div>
          <ul className="admin-mini-list">
            {data.recentModeration.reports.slice(0, 3).map((report) => (
              <li key={report.id}><span>举报 {report.id}</span><small>{report.reason || moderationLabel[report.target_type] || report.target_type}</small></li>
            ))}
            {!data.recentModeration.reports.length && <li><span>暂无待处理举报</span><small>审核队列保持安静是好事。</small></li>}
          </ul>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>本地文件</span>
              <h2>PDF 待匹配目录</h2>
            </div>
          </div>
          <p className="admin-path">{data.pdfInbox.path}</p>
          <ul className="admin-mini-list">
            {data.pdfInbox.samples.map((pdf) => (
              <li key={pdf.path}><span>{pdf.name}</span><small>{pdf.path}</small></li>
            ))}
            {!data.pdfInbox.samples.length && <li><span>暂无待匹配 PDF</span><small>可通过本地 PDF 扫描流程重新匹配。</small></li>}
          </ul>
        </div>
      </section>
    </div>
  )
}
