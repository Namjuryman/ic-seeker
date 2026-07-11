import { useEffect, useState } from 'react'
import { api } from '../api'
import type { ModerationAction, ModerationQueue } from '../types'
import { friendlyError } from '../utils/errorMessages'

const PAGE_SIZE = 25
const STATUS_TABS = ['pending', 'reported', 'visible', 'hidden', 'removed'] as const
type StatusTab = typeof STATUS_TABS[number]

function StatusBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red' }) {
  const cls = tone === 'green' ? 'bg-green-50 text-green-700 border-green-100'
    : tone === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-100'
    : tone === 'red' ? 'bg-red-50 text-red-700 border-red-100'
      : 'bg-surface-elevated text-ink-secondary border-line-subtle'
  return <span className={`px-2 py-0.5 rounded border text-xs ${cls}`}>{children}</span>
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: '待复核',
    reported: '已举报',
    visible: '可见',
    hidden: '已隐藏',
    removed: '已移除',
  }
  return map[status] || '状态待确认'
}

function getStatusTone(status: string): 'neutral' | 'green' | 'amber' | 'red' {
  if (status === 'visible') return 'green'
  if (status === 'pending') return 'amber'
  if (status === 'reported') return 'red'
  if (status === 'hidden' || status === 'removed') return 'red'
  return 'neutral'
}

function commentTypeLabel(type?: string) {
  if (!type) return '评论'
  const map: Record<string, string> = {
    comment: '评论',
    question: '问题',
    correction: '纠错',
    note: '笔记',
    review: '评价',
  }
  return map[type] || type.replace(/[_-]/g, ' ')
}

function relationshipLabel(type?: string) {
  if (!type) return '其他'
  const map: Record<string, string> = {
    current_student: '当前学生',
    former_student: '曾经学生',
    collaborator: '合作者',
    applicant: '申请者',
    course_student: '课程学生',
    other: '其他',
  }
  return map[type] || type.replace(/[_-]/g, ' ')
}

function targetTypeLabel(type?: string) {
  if (!type) return '对象'
  const map: Record<string, string> = {
    paper_comment: '论文评论',
    mentor_review: '研究者评价',
    professor_review: '研究者评价',
    company: '企业',
    institution: '机构',
    author: '作者',
    paper: '论文',
  }
  return map[type] || type.replace(/[_-]/g, ' ')
}

function moderationActionLabel(action?: string) {
  if (!action) return '审核动作'
  const map: Record<string, string> = {
    restore: '恢复',
    approved: '通过',
    approve: '通过',
    hide: '隐藏',
    remove: '移除',
    rejected: '拒绝',
    reject: '拒绝',
    keep_pending: '保留待复核',
  }
  return map[action] || action.replace(/[_-]/g, ' ')
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
      <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-line text-sm" placeholder="审核原因，可选" />
      <div className="flex gap-2">
        <button disabled={loading} onClick={() => act('restore')} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs">恢复</button>
        <button disabled={loading} onClick={() => act('hide')} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs">隐藏</button>
        <button disabled={loading} onClick={() => act('remove')} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs">移除</button>
        <button disabled={loading} onClick={() => act('keep_pending')} className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-line text-xs">保留待复核</button>
      </div>
    </article>
  )
}

export default function ModerationPage() {
  const [queue, setQueue] = useState<ModerationQueue | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState<StatusTab>('pending')

  const load = async (nextOffset = 0, nextStatus = status) => {
    setLoading(true)
    setError('')
    try {
      setQueue(await api.moderationQueue({ limit: PAGE_SIZE, offset: nextOffset, status: nextStatus }))
      setOffset(nextOffset)
    } catch (err: any) {
      setError(friendlyError(err, '审核队列加载失败'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(0, status)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const totals = queue?.totals || { comments: 0, reviews: 0, reports: 0, logs: 0 }
  const hasNext = Boolean(queue && (queue.comments.length === PAGE_SIZE || queue.reviews.length === PAGE_SIZE || queue.reports.length === PAGE_SIZE || queue.logs.length === PAGE_SIZE))

  if (error) return <div className="text-sm text-red-600">{error}</div>
  if (!queue) return <div className="text-sm text-ink-muted">正在加载审核队列...</div>

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex justify-between gap-3 items-start">
        <div>
          <h1 className="text-2xl font-bold text-ink-text">内容审核</h1>
          <p className="text-sm text-ink-muted mt-1">分页加载内容、举报和最近审核记录，避免审核中心一次渲染太多卡住浏览器。</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load(Math.max(0, offset - PAGE_SIZE))} disabled={loading || offset <= 0} className="px-3 py-2 rounded-lg bg-surface-panel border border-line text-sm disabled:opacity-40">上一页</button>
          <button onClick={() => load(offset + PAGE_SIZE)} disabled={loading || !hasNext} className="px-3 py-2 rounded-lg bg-surface-panel border border-line text-sm disabled:opacity-40">下一页</button>
          <button onClick={() => load(offset)} disabled={loading} className="px-3 py-2 rounded-lg bg-surface-panel border border-line text-sm disabled:opacity-50">刷新</button>
        </div>
      </div>

      <div className="ss-caveat compact">
        论文讨论：公开、非匿名、默认可见，后台事后审核。
        研究者/课题组评价：认证匿名、默认待复核、审核后展示，并受样本阈值保护。
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatus(tab)}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-sm border ${status === tab ? 'bg-ink-text text-white border-ink-text' : 'bg-surface-panel border-line text-ink-secondary'}`}
          >
            {getStatusLabel(tab)}
          </button>
        ))}
      </div>

      <div className="text-xs text-ink-muted">当前偏移 {offset}，每页 {PAGE_SIZE} 条，状态：{getStatusLabel(status)}</div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-panel border border-line rounded-xl p-4"><div className="text-xs text-ink-subtle">待复核评论</div><div className="text-2xl font-bold">{totals.comments}</div></div>
        <div className="bg-surface-panel border border-line rounded-xl p-4"><div className="text-xs text-ink-subtle">待复核评价</div><div className="text-2xl font-bold">{totals.reviews}</div></div>
        <div className="bg-surface-panel border border-line rounded-xl p-4"><div className="text-xs text-ink-subtle">开放举报</div><div className="text-2xl font-bold">{totals.reports}</div></div>
        <div className="bg-surface-panel border border-line rounded-xl p-4"><div className="text-xs text-ink-subtle">最近日志</div><div className="text-2xl font-bold">{totals.logs}</div></div>
      </div>

      {loading && <div className="text-sm text-ink-muted">正在加载本页...</div>}

      <section className="space-y-3">
        <h2 className="font-semibold text-ink-text">论文评论</h2>
        {!queue.comments.length && <p className="text-sm text-ink-muted">本页没有评论。</p>}
        {queue.comments.map((c: any) => (
          <ModerationCard
            key={`comment-${c.id}`}
            targetType="paper_comment"
            targetId={c.id}
            title={c.paper_title || `论文 ${c.paper_id}`}
            meta={<><StatusBadge tone={getStatusTone(c.moderation_status || status)}>{getStatusLabel(c.moderation_status || status)}</StatusBadge><StatusBadge tone="amber">{commentTypeLabel(c.comment_type)}</StatusBadge><span>{c.nickname || `用户 ${c.user_id}`}</span><span>{c.created_at}</span></>}
            body={c.body}
            onDone={() => load(offset)}
          />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-ink-text">研究者/课题组评价</h2>
        {!queue.reviews.length && <p className="text-sm text-ink-muted">本页没有研究者评价。</p>}
        {queue.reviews.map((r: any) => (
          <ModerationCard
            key={`review-${r.id}`}
            targetType="mentor_review"
            targetId={r.id}
            title={r.professor_id}
            meta={<><StatusBadge tone={getStatusTone(r.moderation_status || status)}>{getStatusLabel(r.moderation_status || status)}</StatusBadge><StatusBadge tone="green">认证匿名</StatusBadge><span>{relationshipLabel(r.relationship_type)}</span><span>{r.created_at}</span></>}
            body={<div><p><b>优点：</b> {r.strengths_text || '—'}</p><p><b>注意：</b> {r.cautions_text || '—'}</p><p><b>适配：</b> {r.fit_text || '—'}</p></div>}
            onDone={() => load(offset)}
          />
        ))}
      </section>

      <section className="bg-surface-panel border border-line rounded-xl p-4">
        <h2 className="font-semibold text-ink-text mb-3">开放举报</h2>
        {!queue.reports.length ? <p className="text-sm text-ink-muted">本页没有开放举报。</p> : (
          <div className="space-y-2">
            {queue.reports.map((r: any) => (
              <div key={r.id} className="text-sm border border-line rounded-lg p-3 bg-surface-soft">
                <div className="flex gap-2 text-xs text-ink-muted mb-1"><StatusBadge tone="red">{targetTypeLabel(r.target_type)} 编号 {r.target_id}</StatusBadge><span>{r.created_at}</span></div>
                <div>{r.reason}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-surface-panel border border-line rounded-xl p-4">
        <h2 className="font-semibold text-ink-text mb-3">最近审核日志</h2>
        {!queue.logs.length ? <p className="text-sm text-ink-muted">本页没有日志。</p> : (
          <div className="space-y-2 text-sm max-h-[460px] overflow-auto">
            {queue.logs.map((log: any) => (
              <div key={log.id} className="flex gap-2 flex-wrap border-b border-line-subtle pb-2 last:border-0">
                <StatusBadge tone={log.action === 'restore' || log.action === 'approved' ? 'green' : log.action === 'hide' || log.action === 'remove' || log.action === 'rejected' ? 'red' : 'amber'}>{moderationActionLabel(log.action)}</StatusBadge>
                <span>{targetTypeLabel(log.target_type)} 编号 {log.target_id}</span>
                <span className="text-ink-muted">{log.reason || '—'}</span>
                <span className="text-ink-subtle ml-auto">{log.created_at}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
