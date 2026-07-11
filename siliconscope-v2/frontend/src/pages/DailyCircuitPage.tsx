import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { EntityLink } from '../components/EntityLink'
import { formatLessonLevel } from '../utils/learningLabels'
import { searchPath } from '../utils/routes'
import type { DailyCircuitItem } from '../types'

function CircuitCard({ item, featured = false }: { item: DailyCircuitItem; featured?: boolean }) {
  const queryClient = useQueryClient()
  const queue = useMutation({
    mutationFn: async (query: string) => {
      const search = await api.search({ q: query, limit: 5, semantic: 1 })
      const first = search.rows?.[0]
      if (!first) return { queued: 0, message: '暂时没有找到匹配论文。' }
      await api.updateReadingQueue(first.id, { readingStatus: 'review_later', useCases: ['learning'] })
      return { queued: 1, paper: first }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reading-queue'] }),
  })

  const payload = item.payload
  const mainSearch = item.relatedSearchQueries?.[0] || payload.searches?.[0] || item.title

  return (
    <article className={`learning-section ${featured ? 'daily-circuit-featured' : ''}`}>
      <div className="learning-section-head">
        <div>
          <span>{item.circuitKind} · {formatLessonLevel(item.level || 'core')} · {item.estimatedMinutes || 15} 分钟</span>
          <h3>{item.title}</h3>
        </div>
        <div className="learning-progress-actions">
          <Link to={`/learning/lessons/${encodeURIComponent(item.lessonId)}`}>打开课程卡片</Link>
          <Link to={searchPath({ q: mainSearch, semantic: 1 })}>查找论文</Link>
        </div>
      </div>

      <p className="learning-muted">{payload.problem}</p>

      <div className="learning-two-column">
        <section className="learning-foundation-card">
          <h4>直觉理解</h4>
          <p>{payload.intuition}</p>
          <h4>最小电路块</h4>
          <p>{payload.minimalBlock}</p>
        </section>
        <section className="learning-foundation-card">
          <h4>公式 / 检查点</h4>
          <ul className="admin-mini-list">
            {payload.equations.map((line) => <li key={line}><span>{line}</span></li>)}
          </ul>
        </section>
      </div>

      <div className="learning-roadmap-grid compact">
        <section className="learning-foundation-card">
          <h4>重点规格</h4>
          {payload.specs.map((line) => <span key={line}>{line}</span>)}
        </section>
        <section className="learning-foundation-card">
          <h4>设计取舍</h4>
          {payload.tradeoffs.map((line) => <span key={line}>{line}</span>)}
        </section>
        <section className="learning-foundation-card">
          <h4>常见误区</h4>
          {payload.pitfalls.map((line) => <span key={line}>{line}</span>)}
        </section>
      </div>

      <div className="learning-section-head">
        <div>
          <span>论文桥接</span>
          <h3>从概念跳到论文</h3>
        </div>
        <button type="button" disabled={queue.isPending} onClick={() => queue.mutate(mainSearch)}>
          {queue.isPending ? '加入中...' : '把第一篇匹配论文加入队列'}
        </button>
      </div>
      {queue.data && (
        <p className="learning-muted">
          {queue.data.queued ? `已加入：${queue.data.paper?.title}` : queue.data.message}
        </p>
      )}
      <div className="learning-query-grid">
        {[...(item.relatedSearchQueries || []), ...(payload.searches || [])].slice(0, 10).map((query) => (
          <Link key={query} to={searchPath({ q: query, semantic: 1 })}>{query}</Link>
        ))}
      </div>
      <div className="learning-chip-row">
        {(item.relatedTopics || []).map((topic) => <EntityLink key={topic} kind="topic" value={topic}>{topic}</EntityLink>)}
        {(item.relatedVenues || []).map((venue) => <EntityLink key={venue} kind="venue" value={venue}>{venue}</EntityLink>)}
        {item.roadmap && <Link to={`/learning/roadmaps/${item.roadmap.slug}`}>{item.roadmap.shortTitle || item.roadmap.title}</Link>}
      </div>
      <details className="learning-foundation-card">
        <summary>自测问题</summary>
        <ol>
          {payload.quiz.map((line) => <li key={line}>{line}</li>)}
        </ol>
        <p>{payload.next}</p>
      </details>
      <p className="learning-muted">{payload.caveat}</p>
    </article>
  )
}

export default function DailyCircuitPage() {
  const today = useQuery({ queryKey: ['daily-circuit', 'today'], queryFn: () => api.todayDailyCircuit() })
  const list = useQuery({ queryKey: ['daily-circuit', 'list'], queryFn: () => api.dailyCircuit({ limit: 18 }) })

  if (today.isLoading || list.isLoading) return <div className="ss-skeleton-page"><p>正在加载每日电路...</p></div>
  if (today.isError || list.isError) return <div className="ss-empty-state">每日电路加载失败。</div>

  const rows = list.data?.rows || []
  const todayItem = today.data?.item || rows[0]

  return (
    <div className="learning-page learning-workbench">
      <section className="learning-hero compact">
        <div>
          <h1>每日电路</h1>
          <p>
            每天用一个 IC 概念串起公式、设计检查、论文方向、检索入口和复习提示。
            它是从学习走向研究的桥，不替代教材、课程讲义或人工校审笔记。
          </p>
          <div className="learning-hero-actions">
            <Link to="/learning-path">路线库</Link>
            <Link to="/reading-queue">阅读队列</Link>
            <Link to="/reports/topics">方向报告</Link>
          </div>
        </div>
        <aside>
          <span>复习节奏</span>
          <strong>{today.data?.nextReviewIntervals?.join(' / ') || '1 / 3 / 7 / 14'} 天</strong>
          <p>{today.data?.caveat || list.data?.caveat}</p>
        </aside>
      </section>

      {todayItem && <CircuitCard item={todayItem} featured />}

      <section className="learning-section">
        <div className="learning-section-head">
          <div>
            <span>{rows.length} 个概念</span>
            <h3>延伸概念</h3>
          </div>
        </div>
        <div className="learning-roadmap-grid">
          {rows.filter((item) => item.id !== todayItem?.id).slice(0, 12).map((item) => (
            <Link className="learning-roadmap-card" key={item.id} to={`/daily-circuit#${item.id}`}>
              <span>{item.circuitKind}</span>
              <strong>{item.title}</strong>
              <p>{item.payload.problem}</p>
              <footer>
                <em>{item.estimatedMinutes || 15} 分钟</em>
                <em>{item.relatedTopics?.[0] || item.roadmap?.domain}</em>
              </footer>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
