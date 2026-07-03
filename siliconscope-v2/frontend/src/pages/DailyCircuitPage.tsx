import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { EntityLink } from '../components/EntityLink'
import { searchPath } from '../utils/routes'
import type { DailyCircuitItem } from '../types'

function CircuitCard({ item, featured = false }: { item: DailyCircuitItem; featured?: boolean }) {
  const queryClient = useQueryClient()
  const queue = useMutation({
    mutationFn: async (query: string) => {
      const search = await api.search({ q: query, limit: 5, semantic: 1 })
      const first = search.rows?.[0]
      if (!first) return { queued: 0, message: 'No matching papers found yet.' }
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
          <span>{item.circuitKind} · {item.level || 'intermediate'} · {item.estimatedMinutes || 15} min</span>
          <h3>{item.title}</h3>
        </div>
        <div className="learning-progress-actions">
          <Link to={`/learning/lessons/${encodeURIComponent(item.lessonId)}`}>Open lesson</Link>
          <Link to={searchPath({ q: mainSearch, semantic: 1 })}>Find papers</Link>
        </div>
      </div>

      <p className="learning-muted">{payload.problem}</p>

      <div className="learning-two-column">
        <section className="learning-foundation-card">
          <h4>Intuition</h4>
          <p>{payload.intuition}</p>
          <h4>Minimal block</h4>
          <p>{payload.minimalBlock}</p>
        </section>
        <section className="learning-foundation-card">
          <h4>Equations / checks</h4>
          <ul className="admin-mini-list">
            {payload.equations.map((line) => <li key={line}><span>{line}</span></li>)}
          </ul>
        </section>
      </div>

      <div className="learning-roadmap-grid compact">
        <section className="learning-foundation-card">
          <h4>Specs to watch</h4>
          {payload.specs.map((line) => <span key={line}>{line}</span>)}
        </section>
        <section className="learning-foundation-card">
          <h4>Tradeoffs</h4>
          {payload.tradeoffs.map((line) => <span key={line}>{line}</span>)}
        </section>
        <section className="learning-foundation-card">
          <h4>Common mistakes</h4>
          {payload.pitfalls.map((line) => <span key={line}>{line}</span>)}
        </section>
      </div>

      <div className="learning-section-head">
        <div>
          <span>Research bridge</span>
          <h3>Jump from concept to papers</h3>
        </div>
        <button type="button" disabled={queue.isPending} onClick={() => queue.mutate(mainSearch)}>
          {queue.isPending ? 'Queueing...' : 'Queue first matching paper'}
        </button>
      </div>
      {queue.data && (
        <p className="learning-muted">
          {queue.data.queued ? `Queued: ${queue.data.paper?.title}` : queue.data.message}
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
        <summary>Self-check questions</summary>
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

  if (today.isLoading || list.isLoading) return <div className="ss-skeleton-page"><div /><p>Loading Daily Circuit...</p></div>
  if (today.isError || list.isError) return <div className="ss-empty-state">Daily Circuit failed to load.</div>

  const rows = list.data?.rows || []
  const todayItem = today.data?.item || rows[0]

  return (
    <div className="learning-page learning-workbench">
      <section className="learning-hero compact">
        <div>
          <h1>Daily Circuit</h1>
          <p>
            A daily IC concept with equations, design checks, paper directions, search links, and review prompts.
            It is a learning-to-research bridge, not a replacement for textbooks or verified course notes.
          </p>
          <div className="learning-hero-actions">
            <Link to="/learning-path">Route library</Link>
            <Link to="/reading-queue">Reading queue</Link>
            <Link to="/reports/topics">Topic reports</Link>
          </div>
        </div>
        <aside>
          <span>Review cadence</span>
          <strong>{today.data?.nextReviewIntervals?.join(' / ') || '1 / 3 / 7 / 14'} days</strong>
          <p>{today.data?.caveat || list.data?.caveat}</p>
        </aside>
      </section>

      {todayItem && <CircuitCard item={todayItem} featured />}

      <section className="learning-section">
        <div className="learning-section-head">
          <div>
            <span>{rows.length} items</span>
            <h3>Upcoming concepts</h3>
          </div>
        </div>
        <div className="learning-roadmap-grid">
          {rows.filter((item) => item.id !== todayItem?.id).slice(0, 12).map((item) => (
            <Link className="learning-roadmap-card" key={item.id} to={`/daily-circuit#${item.id}`}>
              <span>{item.circuitKind}</span>
              <strong>{item.title}</strong>
              <p>{item.payload.problem}</p>
              <footer>
                <em>{item.estimatedMinutes || 15} min</em>
                <em>{item.relatedTopics?.[0] || item.roadmap?.domain}</em>
              </footer>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
