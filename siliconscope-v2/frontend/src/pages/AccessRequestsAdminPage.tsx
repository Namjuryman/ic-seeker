import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { AccessRequestRow, AccessRequestStatus } from '../types'

const statuses: Array<{ value: '' | AccessRequestStatus; label: string }> = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'invited', label: '已邀请' },
  { value: 'rejected', label: '已拒绝' },
]

const statusLabels: Record<AccessRequestStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  invited: '已邀请',
  rejected: '已拒绝',
}

const planInterestLabels: Record<string, string> = {
  research: '个人研究 / 学习',
  pro: 'Pro 工作流',
  lab: '课题组 / 实验室',
  enterprise: '企业情报',
  private_deploy: '私有化部署',
}

function formatTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function RequestRow({ row }: { row: AccessRequestRow }) {
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState(row.notes || '')
  const mutation = useMutation({
    mutationFn: (status: AccessRequestStatus) => api.updateAccessRequest(row.id, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
    },
  })

  return (
    <article className={`access-admin-row access-admin-row-${row.status}`}>
      <div className="access-admin-main">
        <span>{statusLabels[row.status]}</span>
        <h3>{row.name || row.email}</h3>
        <p>{row.email} · {row.affiliation || '未填写机构'} · {planInterestLabels[row.planInterest] || '使用方向待确认'}</p>
        <small>{row.intendedUse || '未填写使用场景。'}</small>
      </div>
      <div className="access-admin-meta">
        <div><span>提交时间</span><strong>{formatTime(row.createdAt)}</strong></div>
        <div><span>审核时间</span><strong>{formatTime(row.reviewedAt)}</strong></div>
      </div>
      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="审核备注、邀请渠道、通过或拒绝原因..." rows={3} />
      <div className="access-admin-actions">
        <button disabled={mutation.isPending} onClick={() => mutation.mutate('approved')}>通过</button>
        <button disabled={mutation.isPending} onClick={() => mutation.mutate('invited')}>标记已邀请</button>
        <button disabled={mutation.isPending} onClick={() => mutation.mutate('rejected')}>拒绝</button>
        <button disabled={mutation.isPending} onClick={() => mutation.mutate('pending')}>恢复待审核</button>
      </div>
    </article>
  )
}

export default function AccessRequestsAdminPage() {
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')

  const requests = useQuery({
    queryKey: ['access-requests', status, q],
    queryFn: () => api.accessRequests({ status, q, limit: 80 }),
  })

  const stats = requests.data?.stats
  const rows = requests.data?.rows || []
  const filteredNote = useMemo(() => status ? statusLabels[status as AccessRequestStatus] : '全部申请', [status])

  return (
    <div className="access-admin-page">
      <section className="launch-hero">
        <div>
          <span>访问申请队列</span>
          <h1>访问申请审核</h1>
          <p>
            集中处理公共申请表提交的访问请求。这里用于后台审核、记录处理意见，并衔接账号开通与邀请发送流程。
          </p>
        </div>
        <div className="launch-score launch-score-ok">
          <strong>{stats?.pending ?? 0}</strong>
          <span>待审核申请</span>
        </div>
      </section>

      <section className="scheduler-summary">
        <div><span>总数</span><strong>{stats?.total ?? 0}</strong></div>
        <div><span>待审核</span><strong>{stats?.pending ?? 0}</strong></div>
        <div><span>已通过</span><strong>{stats?.approved ?? 0}</strong></div>
        <div><span>已邀请</span><strong>{stats?.invited ?? 0}</strong></div>
        <div><span>已拒绝</span><strong>{stats?.rejected ?? 0}</strong></div>
      </section>

      <section className="billing-admin-filters">
        <label>
          状态
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {statuses.map((item) => <option key={item.value || 'all'} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label>
          搜索
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="邮箱、姓名、机构、使用场景..." />
        </label>
      </section>

      <section className="admin-panel admin-panel-wide">
        <div className="admin-panel-head">
          <span>{rows.length} 条可见 · {filteredNote}</span>
          <h2>审核列表</h2>
        </div>
        <div className="access-admin-list">
          {requests.isLoading && <p className="learning-muted">正在加载访问申请...</p>}
          {rows.map((row) => <RequestRow key={row.id} row={row} />)}
          {!requests.isLoading && rows.length === 0 && <p className="learning-muted">当前筛选条件下没有申请。</p>}
        </div>
      </section>
    </div>
  )
}
