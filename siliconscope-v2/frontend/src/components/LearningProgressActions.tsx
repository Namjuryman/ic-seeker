import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { friendlyError } from '../utils/errorMessages'

type Props = {
  targetType: 'roadmap' | 'lesson'
  targetId: string
}

const statusText: Record<string, string> = {
  not_started: '未开始',
  in_progress: '学习中',
  completed: '已完成',
  review_later: '稍后复习',
}

export function LearningProgressActions({ targetType, targetId }: Props) {
  const queryClient = useQueryClient()
  const queryKey = ['learning-progress', targetType, targetId]
  const progress = useQuery({
    queryKey,
    queryFn: () => api.learningProgress(targetType, targetId),
    enabled: Boolean(targetId),
  })

  const update = useMutation({
    mutationFn: (status: string) => api.updateLearningProgress(targetType, targetId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['learning-progress'] })
    },
  })

  const queueRelated = useMutation({
    mutationFn: () => api.queueLearningRelatedPapers(targetType, targetId, 5),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['reading-queue'] })
      queryClient.invalidateQueries({ queryKey: ['learning-progress'] })
    },
  })

  const current = progress.data?.status || 'not_started'
  const queued = queueRelated.data?.queuedCount ?? progress.data?.relatedPapersQueued ?? 0
  const busy = update.isPending || queueRelated.isPending

  return (
    <section className="learning-section">
      <div className="learning-section-head">
        <div>
          <span>学习进度</span>
          <h3>学习状态</h3>
        </div>
        <p>
          当前状态：<strong>{statusText[current] || current}</strong>
          {queued > 0 ? ` · 已加入 ${queued} 篇相关论文到阅读队列` : ''}
        </p>
      </div>
      <div className="learning-progress-actions">
        <button type="button" disabled={busy} onClick={() => update.mutate('in_progress')}>
          标记开始
        </button>
        <button type="button" disabled={busy} onClick={() => update.mutate('completed')}>
          标记完成
        </button>
        <button type="button" disabled={busy} onClick={() => update.mutate('review_later')}>
          稍后复习
        </button>
        <button type="button" disabled={busy} onClick={() => queueRelated.mutate()}>
          加入相关论文
        </button>
      </div>
      {(update.isError || queueRelated.isError) && (
        <p className="learning-muted" style={{ color: '#b42318', marginTop: '0.75rem' }}>
          {friendlyError(update.error || queueRelated.error, '学习进度更新失败。')}
        </p>
      )}
      {queueRelated.data && queueRelated.data.errors.length > 0 && (
        <p className="learning-muted" style={{ color: '#b54708', marginTop: '0.75rem' }}>
          已加入 {queueRelated.data.queuedCount} 篇论文，{queueRelated.data.errors.length} 篇因配额或数据校验被跳过。
        </p>
      )}
    </section>
  )
}
