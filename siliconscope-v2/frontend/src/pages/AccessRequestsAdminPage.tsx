import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { AccessRequestRow, AccessRequestStatus } from '../types'

const statuses: Array<{ value: '' | AccessRequestStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'invited', label: 'Invited' },
  { value: 'rejected', label: 'Rejected' },
]

const statusLabels: Record<AccessRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  invited: 'Invited',
  rejected: 'Rejected',
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
        <p>{row.email} · {row.affiliation || 'No affiliation'} · {row.planInterest}</p>
        <small>{row.intendedUse || 'No use case submitted.'}</small>
      </div>
      <div className="access-admin-meta">
        <div><span>Submitted</span><strong>{formatTime(row.createdAt)}</strong></div>
        <div><span>Reviewed</span><strong>{formatTime(row.reviewedAt)}</strong></div>
      </div>
      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Admin notes, invitation channel, approval reason..." rows={3} />
      <div className="access-admin-actions">
        <button disabled={mutation.isPending} onClick={() => mutation.mutate('approved')}>Approve</button>
        <button disabled={mutation.isPending} onClick={() => mutation.mutate('invited')}>Mark invited</button>
        <button disabled={mutation.isPending} onClick={() => mutation.mutate('rejected')}>Reject</button>
        <button disabled={mutation.isPending} onClick={() => mutation.mutate('pending')}>Restore pending</button>
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
  const filteredNote = useMemo(() => status ? statusLabels[status as AccessRequestStatus] : 'all requests', [status])

  return (
    <div className="access-admin-page">
      <section className="launch-hero">
        <div>
          <span>Private beta funnel</span>
          <h1>Access requests</h1>
          <p>
            Review visitor applications from the public request form. This is an admin-only queue;
            user account creation and invitation delivery can be automated later.
          </p>
        </div>
        <div className="launch-score launch-score-ok">
          <strong>{stats?.pending ?? 0}</strong>
          <span>pending requests</span>
        </div>
      </section>

      <section className="scheduler-summary">
        <div><span>Total</span><strong>{stats?.total ?? 0}</strong></div>
        <div><span>Pending</span><strong>{stats?.pending ?? 0}</strong></div>
        <div><span>Approved</span><strong>{stats?.approved ?? 0}</strong></div>
        <div><span>Invited</span><strong>{stats?.invited ?? 0}</strong></div>
        <div><span>Rejected</span><strong>{stats?.rejected ?? 0}</strong></div>
      </section>

      <section className="billing-admin-filters">
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {statuses.map((item) => <option key={item.value || 'all'} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label>
          Search
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="email, name, affiliation, use case..." />
        </label>
      </section>

      <section className="admin-panel admin-panel-wide">
        <div className="admin-panel-head">
          <span>{rows.length} visible · {filteredNote}</span>
          <h2>Review queue</h2>
        </div>
        <div className="access-admin-list">
          {requests.isLoading && <p className="learning-muted">Loading access requests...</p>}
          {rows.map((row) => <RequestRow key={row.id} row={row} />)}
          {!requests.isLoading && rows.length === 0 && <p className="learning-muted">No requests match this filter.</p>}
        </div>
      </section>
    </div>
  )
}
