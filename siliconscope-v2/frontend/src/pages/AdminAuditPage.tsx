import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'

function formatMetadata(value: Record<string, any> | null | undefined) {
  if (!value || !Object.keys(value).length) return '-'
  return JSON.stringify(value)
}

export default function AdminAuditPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [resourceType, setResourceType] = useState('')

  const logs = useQuery({
    queryKey: ['admin-audit-logs', q, status, resourceType],
    queryFn: () => api.adminAuditLogs({
      limit: 80,
      q,
      status,
      resourceType,
    }),
    refetchInterval: 30_000,
  })

  const data = logs.data

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <span>Audit Trail</span>
          <h1>管理员审计日志</h1>
          <p>
            记录后台高风险操作：企业数据维护、审核动作、快照刷新/清理、别名归一、API key 更新。
            这是未来多人后台、商业化运营和问题追责的基础。
          </p>
        </div>
        <div className="admin-health">
          <strong>{data?.total ?? '-'}</strong>
          <span>events</span>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <span>Filters</span>
            <h2>筛选日志</h2>
          </div>
          <button className="chip-button" onClick={() => logs.refetch()}>刷新</button>
        </div>
        <div className="admin-audit-filters">
          <label>
            关键词
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="actor / action / resource" />
          </label>
          <label>
            状态
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">全部</option>
              <option value="success">success</option>
              <option value="failure">failure</option>
            </select>
          </label>
          <label>
            资源类型
            <select value={resourceType} onChange={(event) => setResourceType(event.target.value)}>
              <option value="">全部</option>
              {data?.resourceTypes.map((item) => (
                <option key={item.resourceType} value={item.resourceType}>{item.resourceType} ({item.count})</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="admin-grid">
        <div className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>Events</span>
              <h2>最近操作</h2>
            </div>
            <strong>{logs.isFetching ? 'Syncing...' : `${data?.rows.length || 0} loaded`}</strong>
          </div>
          <div className="admin-audit-table">
            <div className="admin-audit-row admin-audit-head">
              <span>时间</span>
              <span>操作者</span>
              <span>动作</span>
              <span>对象</span>
              <span>状态</span>
              <span>详情</span>
            </div>
            {data?.rows.map((row) => (
              <div className="admin-audit-row" key={row.id}>
                <span>{row.createdAt}</span>
                <span>{row.actorEmail || `User #${row.actorUserId ?? '-'}`}</span>
                <strong>{row.action}</strong>
                <span>{row.resourceType}{row.resourceId ? ` / ${row.resourceId}` : ''}</span>
                <em className={`audit-status audit-status-${row.status}`}>{row.status}</em>
                <small>{row.error || formatMetadata(row.metadata)}</small>
              </div>
            ))}
            {!logs.isLoading && !data?.rows.length && (
              <div className="admin-empty">暂无审计日志。后台产生增删改操作后会自动记录。</div>
            )}
          </div>
        </div>

        <aside className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>Actions</span>
              <h2>动作分布</h2>
            </div>
          </div>
          <ul className="admin-mini-list">
            {data?.actions.map((item) => (
              <li key={item.action}><span>{item.action}</span><small>{item.count} events</small></li>
            ))}
            {!data?.actions.length && <li><span>暂无动作</span><small>等待后台操作</small></li>}
          </ul>
        </aside>
      </section>
    </div>
  )
}
