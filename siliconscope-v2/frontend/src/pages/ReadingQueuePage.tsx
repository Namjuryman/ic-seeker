import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { PaperLink } from '../components/PaperLink'
import type { ReadingQueueGroup } from '../types'

const readingStateActions = [
  { value: 'reading', label: '正在读' },
  { value: 'read', label: '已读' },
  { value: 'review_later', label: '稍后复习' },
  { value: 'skip', label: '跳过' },
  { value: 'unread', label: '移出队列' },
]

const useCaseActions = [
  { value: 'literature_review', label: '文献综述' },
  { value: 'application', label: '应用参考' },
  { value: 'project', label: '项目使用' },
]

function toggleValue(values: string[] = [], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export default function ReadingQueuePage() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')

  const queue = useQuery({
    queryKey: ['reading-queue'],
    queryFn: () => api.readingQueue(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ paperId, payload }: {
      paperId: number
      payload: string | { readingStatus?: string; important?: boolean; useCases?: string[] }
    }) => api.updateReadingQueue(paperId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-queue'] })
      setMessage('已更新阅读队列')
      setTimeout(() => setMessage(''), 1200)
    },
  })

  const data: ReadingQueueGroup[] = queue.data || []
  const totalPapers = data.reduce((sum, g) => sum + g.count, 0)

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <p className="text-xs font-semibold text-brand uppercase tracking-wide">Reading Queue</p>
        <h1 className="text-2xl font-bold text-ink-text mt-0.5">阅读队列</h1>
        <p className="text-sm text-ink-muted mt-1">
          共 {totalPapers} 篇论文。阅读状态、重要标记和用途已经拆开，后面迁移到用户系统时不会互相覆盖。
        </p>
      </section>

      {message && (
        <div className="rounded-xl border p-3 text-sm bg-emerald-50 text-emerald-700 border-emerald-100">
          {message}
        </div>
      )}

      {queue.isLoading && <p className="text-sm text-ink-muted">Loading reading queue...</p>}

      {!queue.isLoading && totalPapers === 0 && (
        <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm text-sm text-ink-muted">
          阅读队列为空。你可以在论文详情页、学习路线页或相关论文列表里加入待读论文。
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
              {group.papers.map((item) => {
                const { paper } = item
                const currentState = item.readingStatus || item.readingState || item.status
                const useCases = item.useCases || []
                return (
                  <div key={paper.id} className="reading-queue-item group">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink-text">
                        <PaperLink id={paper.id} title={paper.title} />
                      </div>
                      <div className="text-xs text-ink-muted truncate">
                        {paper.venue} · {paper.year} · {paper.rank} · {paper.field} · score {paper.score}
                      </div>
                      <div className="reading-queue-badges">
                        {item.important && <span className="important">重要</span>}
                        {useCases.map((useCase) => (
                          <span key={useCase}>{useCaseActions.find((u) => u.value === useCase)?.label || useCase}</span>
                        ))}
                      </div>
                    </div>

                    <div className="reading-queue-actions">
                      <div>
                        {readingStateActions.map((action) => (
                          <button
                            key={action.value}
                            className={currentState === action.value ? 'active' : ''}
                            onClick={() => updateMutation.mutate({ paperId: paper.id, payload: action.value })}
                            disabled={updateMutation.isPending}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                      <div>
                        <button
                          className={item.important ? 'active important' : ''}
                          onClick={() => updateMutation.mutate({
                            paperId: paper.id,
                            payload: { readingStatus: currentState, important: !item.important, useCases },
                          })}
                          disabled={updateMutation.isPending}
                        >
                          重要
                        </button>
                        {useCaseActions.map((action) => (
                          <button
                            key={action.value}
                            className={useCases.includes(action.value) ? 'active' : ''}
                            onClick={() => updateMutation.mutate({
                              paperId: paper.id,
                              payload: {
                                readingStatus: currentState,
                                important: Boolean(item.important),
                                useCases: toggleValue(useCases, action.value),
                              },
                            })}
                            disabled={updateMutation.isPending}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      ))}
    </div>
  )
}
