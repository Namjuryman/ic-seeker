import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import type { AdminOperation } from '../types'

const statusText: Record<AdminOperation['status'], string> = {
  ready: '正常',
  partial: '建设中',
  planned: '待接入',
  attention: '需处理',
  'needs-refresh': '需刷新',
  'needs-seed': '需导入',
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024).toLocaleString()} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
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

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <span>Admin Console</span>
          <h1>管理员控制台</h1>
          <p>
            这里管理后端运行状态、缓存快照、审核队列、API key、PDF inbox、企业数据和数据质量任务。
            平台中枢看产品路线，管理员控制台看日常运营。
          </p>
        </div>
        <div className="admin-health">
          <strong>{data.health.backend}</strong>
          <span>{data.health.authMode}</span>
        </div>
      </section>

      <section className="admin-status-strip">
        <div><span>Backend API</span><strong>{data.health.backend}</strong></div>
        <div><span>Metadata DB</span><strong>{topology.metadataStore.provider}</strong></div>
        <div><span>App DB</span><strong>{topology.appStore.provider}</strong></div>
        <div><span>Cache</span><strong>{topology.cache.provider}</strong></div>
        <div><span>Search</span><strong>{topology.search.provider}</strong></div>
        <div><span>Storage</span><strong>{topology.objectStorage.provider}</strong></div>
      </section>

      <section className="admin-summary">
        <div><span>论文库</span><strong>{summary.papers.toLocaleString()}</strong><small>{summary.years?.minYear}-{summary.years?.maxYear}</small></div>
        <div><span>快照缓存</span><strong>{summary.snapshots}</strong><small>{formatBytes(summary.snapshotBytes)}</small></div>
        <div><span>审核待处理</span><strong>{summary.moderationOpen}</strong><small>comments / reviews / reports</small></div>
        <div><span>API Key</span><strong>{summary.apiKeys}</strong><small>configured</small></div>
        <div><span>PDF Inbox</span><strong>{summary.pdfInbox}</strong><small>local PDFs</small></div>
        <div><span>企业数据</span><strong>{summary.companies}</strong><small>companies</small></div>
      </section>

      <section className="admin-grid">
        <div className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>Operations</span>
              <h2>后端运营模块</h2>
            </div>
            <Link to="/platform">查看平台路线</Link>
          </div>
          <div className="admin-ops">
            {data.operations.map((item) => <OperationCard key={item.id} item={item} />)}
          </div>
        </div>

        <aside className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>Secrets</span>
              <h2>API Key 状态</h2>
            </div>
          </div>
          <div className="admin-key-list">
            {data.apiKeys.length ? data.apiKeys.map((key) => (
              <div key={`${key.provider}-${key.source}`}>
                <strong>{key.provider}</strong>
                <span>{key.source} / {key.masked || 'empty'}</span>
              </div>
            )) : <p>暂未配置 API key。</p>}
          </div>
        </aside>
      </section>

      <section className="admin-grid">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>Moderation</span>
              <h2>近期审核</h2>
            </div>
            <Link to="/moderation">进入审核</Link>
          </div>
          <div className="admin-moderation">
            <div><strong>{data.recentModeration.totals?.comments || 0}</strong><span>comments</span></div>
            <div><strong>{data.recentModeration.totals?.reviews || 0}</strong><span>reviews</span></div>
            <div><strong>{data.recentModeration.totals?.reports || 0}</strong><span>reports</span></div>
          </div>
          <ul className="admin-mini-list">
            {data.recentModeration.reports.slice(0, 3).map((report) => (
              <li key={report.id}><span>Report #{report.id}</span><small>{report.reason || report.target_type}</small></li>
            ))}
            {!data.recentModeration.reports.length && <li><span>暂无 open report</span><small>审核队列安静是好事。</small></li>}
          </ul>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>Local Files</span>
              <h2>PDF Inbox</h2>
            </div>
          </div>
          <p className="admin-path">{data.pdfInbox.path}</p>
          <ul className="admin-mini-list">
            {data.pdfInbox.samples.map((pdf) => (
              <li key={pdf.path}><span>{pdf.name}</span><small>{pdf.path}</small></li>
            ))}
            {!data.pdfInbox.samples.length && <li><span>暂无待匹配 PDF</span><small>{data.pdfInbox.importCommand}</small></li>}
          </ul>
        </div>
      </section>
    </div>
  )
}
