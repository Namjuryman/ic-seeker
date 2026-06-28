import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { EntityLink } from '../components/EntityLink'
import { lessonPath, roadmapPath, searchPath, todayLessonPath } from '../utils/routes'

export default function LearningDashboardPage() {
  const dashboard = useQuery({ queryKey: ['learning-dashboard'], queryFn: () => api.learningDashboard() })
  const progress = useQuery({ queryKey: ['learning-progress'], queryFn: () => api.learningProgressList() })

  if (dashboard.isLoading) return <div className="ss-skeleton-page"><div /><p>Loading learning workspace...</p></div>
  if (dashboard.isError || !dashboard.data) return <div className="ss-empty-state">Learning workspace failed to load.</div>

  const data = dashboard.data
  const progressRows = progress.data || []
  const progressSummary = {
    inProgress: progressRows.filter((row) => row.status === 'in_progress').length,
    completed: progressRows.filter((row) => row.status === 'completed').length,
    reviewLater: progressRows.filter((row) => row.status === 'review_later').length,
    queued: progressRows.reduce((sum, row) => sum + (row.relatedPapersQueued || 0), 0),
  }

  return (
    <div className="learning-page learning-workbench">
      <section className="learning-hero compact">
        <div>
          <h1>Learn IC circuits through research intelligence.</h1>
          <p>
            Start from a circuit concept, then jump into related papers, topics, venues, active authors, and strong institutions.
            Lessons are placeholders by design; detailed equations and explanations should be manually reviewed before publication.
          </p>
          <div className="learning-hero-actions">
            <Link to={todayLessonPath()}>Today&apos;s circuit</Link>
            <Link to="/learning-path">Full IC route library</Link>
            <Link to={roadmapPath(data.featuredRoadmap.slug)}>Featured roadmap</Link>
          </div>
        </div>
        <aside>
          <span>Learning caveat</span>
          <strong>Metadata-linked guide</strong>
          <p>/learning is the Daily Circuit workspace. Use /learning-path for the broader IC route library and external guide-style resources.</p>
        </aside>
      </section>

      <section className="learning-stat-strip">
        <div><span>Roadmaps</span><strong>{data.summary.roadmaps}</strong></div>
        <div><span>Daily lessons</span><strong>{data.summary.dailyLessons}</strong></div>
        <div><span>Linked topics</span><strong>{data.summary.linkedTopics}</strong></div>
        <div><span>Linked venues</span><strong>{data.summary.linkedVenues}</strong></div>
      </section>

      <section className="learning-two-column">
        <article className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>Featured roadmap</span>
              <h3>{data.featuredRoadmap.title}</h3>
            </div>
            <Link to={roadmapPath(data.featuredRoadmap.slug)}>Open</Link>
          </div>
          <p className="learning-muted">{data.featuredRoadmap.description}</p>
          <div className="learning-chip-row">
            {data.featuredRoadmap.relatedTopics.map((topic) => (
              <EntityLink key={topic} kind="topic" value={topic}>{topic}</EntityLink>
            ))}
          </div>
          <div className="learning-query-grid">
            {data.featuredRoadmap.relatedSearchQueries.slice(0, 6).map((query) => (
              <Link key={query} to={searchPath({ q: query, field: data.featuredRoadmap.relatedTopics[0], semantic: 1 })}>{query}</Link>
            ))}
          </div>
        </article>

        <article className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>Daily circuit</span>
              <h3>{data.today?.title ?? 'No lesson configured'}</h3>
            </div>
            {data.today && <Link to={lessonPath(data.today.id)}>Open</Link>}
          </div>
          {data.today ? (
            <>
              <p className="learning-muted">{data.today.estimatedMinutes} min · {data.today.roadmap?.shortTitle}</p>
              <div className="learning-chip-row">
                {data.today.relatedVenues.map((venue) => (
                  <EntityLink key={venue} kind="venue" value={venue}>{venue}</EntityLink>
                ))}
              </div>
              <div className="learning-query-grid">
                {data.today.relatedSearchQueries.map((query) => (
                  <Link key={query} to={searchPath({ q: query, field: data.today?.relatedTopics[0], semantic: 1 })}>{query}</Link>
                ))}
              </div>
            </>
          ) : <p className="learning-muted">Add lesson seeds to enable the daily circuit entry.</p>}
        </article>
      </section>

      <section className="learning-section">
        <div className="learning-section-head">
          <div>
            <span>Roadmaps</span>
            <h3>IC route library</h3>
          </div>
          <p>{data.caveats.intelligence}</p>
        </div>
        <div className="learning-roadmap-grid">
          {data.roadmaps.map((roadmap) => (
            <Link className="learning-roadmap-card" key={roadmap.slug} to={roadmapPath(roadmap.slug)}>
              <span>{roadmap.domain}</span>
              <strong>{roadmap.shortTitle}</strong>
              <p>{roadmap.description}</p>
              <footer>
                <em>{roadmap.stageCount} stages</em>
                <em>{roadmap.moduleCount} modules</em>
                <em>{roadmap.lessonCount} lessons</em>
              </footer>
            </Link>
          ))}
        </div>
        <div className="learning-progress-actions" style={{ marginTop: '1rem' }}>
          <Link to="/learning-path">View full route library →</Link>
        </div>
      </section>

      {(data.routeFamilies?.length ?? 0) > 0 && (
        <section className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>Route families</span>
              <h3>IC 方向大类</h3>
            </div>
          </div>
          <div className="learning-family-grid">
            {data.routeFamilies?.map((family) => (
              <Link className="learning-family-card" key={family.id} to="/learning-path">
                <span>{family.routeIds.length} 条路线</span>
                <strong>{family.title}</strong>
                <p>{family.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(data.commonFoundations?.length ?? 0) > 0 && (
        <section className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>Common foundations</span>
              <h3>公共前置知识</h3>
            </div>
          </div>
          <div className="learning-foundation-grid">
            {data.commonFoundations?.map((group) => (
              <article className="learning-foundation-card" key={group.title}>
                <h4>{group.title}</h4>
                <p>{group.note}</p>
                <div>
                  {group.items.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="learning-section">
        <div className="learning-section-head">
          <div>
            <span>Personal progress</span>
            <h3>学习状态总览</h3>
          </div>
          <p>Progress is stored per user and can drive future spaced review, recommendations, and reading queues.</p>
        </div>
        <div className="learning-stat-strip compact">
          <div><span>Learning</span><strong>{progressSummary.inProgress}</strong></div>
          <div><span>Completed</span><strong>{progressSummary.completed}</strong></div>
          <div><span>Review later</span><strong>{progressSummary.reviewLater}</strong></div>
          <div><span>Queued papers</span><strong>{progressSummary.queued}</strong></div>
        </div>
        <div className="learning-progress-actions" style={{ marginTop: '1rem' }}>
          <Link to={todayLessonPath()}>Open today's circuit</Link>
          <Link to="/reading-queue">Open reading queue</Link>
        </div>
      </section>

      <section className="learning-section">
        <div className="learning-section-head">
          <div>
            <span>Industry</span>
            <h3>Career & Industry</h3>
          </div>
        </div>
        <p className="learning-muted">Connect learning directions to industry employers.</p>
        <div className="learning-progress-actions" style={{ marginTop: '0.75rem' }}>
          <Link to="/companies">Explore IC companies →</Link>
        </div>
      </section>
    </div>
  )
}
