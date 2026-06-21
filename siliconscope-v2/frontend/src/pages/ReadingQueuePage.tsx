import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { PaperLink } from '../components/PaperLink'

const statusActions: Record<string, string[]> = {
  unread: ['reading', 'important', 'skip'],
  reading: ['read', 'important', 'skip'],
  read: ['important', 'review_later', 'skip'],
  important: ['read', 'review_later', 'skip'],
  skip: ['reading', 'unread'],
  review_later: ['reading', 'unread'],
  use_for_literature_review: ['read', 'important'],
  use_for_application: ['read', 'important'],
  use_for_project: ['read', 'important'],
}

const actionLabels: Record<string, string> = {
  unread: '标记未读',
  reading: '在读',
  read: '已读',
  important: '重点',
  skip: '跳过',
  review_later: '稍后复习',
  use_for_literature_review: '用于文献综述',
  use_for_application: '用于应用',
  use_for_project: '用于项目',
}

export default function ReadingQueuePage() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')

  const queue = useQuery({
    queryKey: ['reading-queue'],
    queryFn: () => api.readingQueue(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ paperId, status }: { paperId: number; status: string }) =>
      api.updateReadingQueue(paperId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-queue'] })
      setMessage('已更新')
      setTimeout(() => setMessage(''), 1200)
    },
  })

  const data = queue.data || []
  const totalPapers = data.reduce((sum, g) => sum + g.count, 0)

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Reading Queue</p>
          <h1 className="text-2xl font-bold text-ink-text mt-0.5">阅读队列</h1>
          <p className="text-sm text-ink-muted mt-1">
            共 {totalPapers} 篇论文。按阅读状态组织，不干扰 Watchlist 的长期关注。
          </p>
        </div>
      </section>

      {message && (
        <div className="rounded-xl border p-3 text-sm bg-emerald-50 text-emerald-700 border-emerald-100">
          {message}
        </div>
      )}

      {queue.isLoading && <p className="text-sm text-ink-muted">Loading reading queue...</p>}

      {!queue.isLoading && totalPapers === 0 && (
        <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm text-sm text-ink-muted">
          阅读队列为空。在论文详情页或相关论文列表中添加到阅读队列。
        </div>
      )}

      {data.map((group) => (
        group.count > 0 && (
          <section key={group.status} className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">{group.status}</p>
                <h2 className="text-lg font-bold text-ink-text">{group.label}</h2>
              </div>
              <span className="text-xs text-ink-muted">{group.count} 篇</span>
            </div>
            <div className="divide-y divide-line-subtle">
              {group.papers.map(({ paper, status }) => (
                <div key={paper.id} className="flex items-center gap-4 py-3 hover:bg-surface-elevated transition-colors px-2 rounded-lg group">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink-text">
                      <PaperLink id={paper.id} title={paper.title} />
                    </div>
                    <div className="text-xs text-ink-muted truncate">
                      {paper.venue} · {paper.year} · {paper.rank} · {paper.field} · score {paper.score}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(statusActions[status] || []).map((nextStatus) => (
                      <button
                        key={nextStatus}
                        className="text-xs px-2 py-1 rounded border border-line hover:bg-surface-elevated"
                        onClick={() => updateMutation.mutate({ paperId: paper.id, status: nextStatus })}
                        disabled={updateMutation.isPending}
                        title={actionLabels[nextStatus] || nextStatus}
                      >
                        {actionLabels[nextStatus] || nextStatus}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      ))}
    </div>
  )
}
