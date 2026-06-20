import { useEffect, useState } from 'react'
import { api } from '../api'
import type { ModerationAction, ModerationQueue } from '../types'

const PAGE_SIZE = 25

function StatusBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red' }) {
  const cls = tone === 'green' ? 'bg-green-50 text-green-700 border-green-100'
    : tone === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-100'
    : tone === 'red' ? 'bg-red-50 text-red-700 border-red-100'
      : 'bg-surface-elevated text-ink-secondary border-line-subtle'
  return <span className={`px-2 py-0.5 rounded border text-xs ${cls}`}>{children}</span>
}

function ModerationCard({
  title,
  meta,
  body,
  targetType,
  targetId,
  onDone,
}: {
  title: string;
  meta: React.ReactNode;
  body: React.ReactNode;
  targetType: string;
  targetId: number;
  onDone: () => void;
}) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const act = async (action: ModerationAction) => {
    setLoading(true)
    try {
      await api.moderate(targetType, targetId, action, reason)
      onDone()
    } finally {
      setLoading(false)
    }
  }

  return (
    <article className="bg-surface-panel border border-line rounded-xl p-4 shadow-sm space-y-3">
      <div>
        <h3 className="font-semibold text-sm text-ink-text leading-snug">{title}</h3>
        <div className="text-xs text-ink-muted mt-1 flex gap-2 flex-wrap">{meta}</div>
      </div>
      <div className="text-sm text-ink-secondary whitespace-pre-wrap bg-surface-soft rounded-lg p-3 max-h-64 overflow-auto">{body}</div>
      <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-line text-sm" placeholder="Moderation reason optional" />
      <div className="flex gap-2">
        <button disabled={loading} onClick={() => act('restore')} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs">Restore</button>
        <button disabled={loading} onClick={() => act('hide')} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs">Hide</button>
        <button disabled={loading} onClick={() => act('remove')} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs">Remove</button>
        <button disabled={loading} onClick={() => act('keep_pending')} className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-line text-xs">Keep pending</button>
      </div>
    </article>
  )
}

export default function ModerationPage() {
  const [queue, setQueue] = useState<ModerationQueue | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)

  const load = async (nextOffset = offset) => {
    setLoading(true)
    setError('')
    try {
      setQueue(await api.moderationQueue({ limit: PAGE_SIZE, offset: nextOffset }))
      setOffset(nextOffset)
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totals = queue?.totals || { comments: 0, reviews: 0, reports: 0, logs: 0 }
  const hasNext = Boolean(queue && (queue.comments.length === PAGE_SIZE || queue.reviews.length === PAGE_SIZE || queue.reports.length === PAGE_SIZE || queue.logs.length === PAGE_SIZE))

  if (error) return <div className="text-sm text-red-600">{error}</div>
  if (!queue) return <div className="text-sm text-ink-muted">Loading moderation queue...</div>

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex justify-between gap-3 items-start">
        <div>
          <h1 className="text-2xl font-bold text-ink-text">Moderation</h1>
          <p className="text-sm text-ink-muted mt-1">分页加载 pending 内容、举报和最近审核记录，避免审核中心一次渲染太多卡住浏览器。</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load(Math.max(0, offset - PAGE_SIZE))} disabled={loading || offset <= 0} className="px-3 py-2 rounded-lg bg-surface-panel border border-line text-sm disabled:opacity-40">Prev</button>
          <button onClick={() => load(offset + PAGE_SIZE)} disabled={loading || !hasNext} className="px-3 py-2 rounded-lg bg-surface-panel border border-line text-sm disabled:opacity-40">Next</button>
          <button onClick={() => load(offset)} disabled={loading} className="px-3 py-2 rounded-lg bg-surface-panel border border-line text-sm disabled:opacity-50">Refresh</button>
        </div>
      </div>

      <div className="text-xs text-ink-muted">Showing page offset {offset}, page size {PAGE_SIZE}</div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-panel border border-line rounded-xl p-4"><div className="text-xs text-ink-subtle">Pending comments</div><div className="text-2xl font-bold">{totals.comments}</div></div>
        <div className="bg-surface-panel border border-line rounded-xl p-4"><div className="text-xs text-ink-subtle">Pending reviews</div><div className="text-2xl font-bold">{totals.reviews}</div></div>
        <div className="bg-surface-panel border border-line rounded-xl p-4"><div className="text-xs text-ink-subtle">Open reports</div><div className="text-2xl font-bold">{totals.reports}</div></div>
        <div className="bg-surface-panel border border-line rounded-xl p-4"><div className="text-xs text-ink-subtle">Recent logs</div><div className="text-2xl font-bold">{totals.logs}</div></div>
      </div>

      {loading && <div className="text-sm text-ink-muted">Loading page...</div>}

      <section className="space-y-3">
        <h2 className="font-semibold text-ink-text">Paper comments needing visibility decision</h2>
        {!queue.comments.length && <p className="text-sm text-ink-muted">No pending comments on this page.</p>}
        {queue.comments.map((c: any) => (
          <ModerationCard
            key={`comment-${c.id}`}
            targetType="paper_comment"
            targetId={c.id}
            title={c.paper_title || `Paper #${c.paper_id}`}
            meta={<><StatusBadge tone="amber">{c.comment_type}</StatusBadge><span>{c.nickname || `User #${c.user_id}`}</span><span>{c.created_at}</span></>}
            body={c.body}
            onDone={() => load(offset)}
          />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-ink-text">Mentor/group reviews needing visibility decision</h2>
        {!queue.reviews.length && <p className="text-sm text-ink-muted">No pending mentor reviews on this page.</p>}
        {queue.reviews.map((r: any) => (
          <ModerationCard
            key={`review-${r.id}`}
            targetType="mentor_review"
            targetId={r.id}
            title={r.professor_id}
            meta={<><StatusBadge tone="green">Verified anonymous</StatusBadge><span>{r.relationship_type || 'Other'}</span><span>{r.created_at}</span></>}
            body={<div><p><b>Strengths:</b> {r.strengths_text || '-'}</p><p><b>Cautions:</b> {r.cautions_text || '-'}</p><p><b>Fit:</b> {r.fit_text || '-'}</p></div>}
            onDone={() => load(offset)}
          />
        ))}
      </section>

      <section className="bg-surface-panel border border-line rounded-xl p-4">
        <h2 className="font-semibold text-ink-text mb-3">Open reports</h2>
        {!queue.reports.length ? <p className="text-sm text-ink-muted">No open reports on this page.</p> : (
          <div className="space-y-2">
            {queue.reports.map((r: any) => (
              <div key={r.id} className="text-sm border border-line rounded-lg p-3 bg-surface-soft">
                <div className="flex gap-2 text-xs text-ink-muted mb-1"><StatusBadge tone="red">{r.target_type} #{r.target_id}</StatusBadge><span>{r.created_at}</span></div>
                <div>{r.reason}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-surface-panel border border-line rounded-xl p-4">
        <h2 className="font-semibold text-ink-text mb-3">Recent moderation logs</h2>
        {!queue.logs.length ? <p className="text-sm text-ink-muted">No logs on this page.</p> : (
          <div className="space-y-2 text-sm max-h-[460px] overflow-auto">
            {queue.logs.map((log: any) => (
              <div key={log.id} className="flex gap-2 flex-wrap border-b border-line-subtle pb-2 last:border-0">
                <StatusBadge tone={log.action === 'restore' || log.action === 'approved' ? 'green' : log.action === 'hide' || log.action === 'remove' || log.action === 'rejected' ? 'red' : 'amber'}>{log.action}</StatusBadge>
                <span>{log.target_type} #{log.target_id}</span>
                <span className="text-ink-muted">{log.reason || '-'}</span>
                <span className="text-ink-subtle ml-auto">{log.created_at}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
