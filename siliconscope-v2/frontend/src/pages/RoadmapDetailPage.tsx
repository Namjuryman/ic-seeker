import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { EntityLink } from '../components/EntityLink'
import { PaperLink } from '../components/PaperLink'
import { lessonPath, searchPath, todayLessonPath } from '../utils/routes'

export default function RoadmapDetailPage() {
  const { slug = '' } = useParams()
  const roadmap = useQuery({ queryKey: ['learning-roadmap', slug], queryFn: () => api.learningRoadmap(slug), enabled: Boolean(slug) })
  const related = useQuery({ queryKey: ['learning-roadmap-papers', slug], queryFn: () => api.roadmapRelatedPapers(slug, 8), enabled: Boolean(slug) })

  if (roadmap.isLoading) return <div className="ss-skeleton-page"><div /><p>Loading roadmap...</p></div>
  if (roadmap.isError || !roadmap.data) return <div className="ss-empty-state">Roadmap not found.</div>

  const data = roadmap.data

  return (
    <div className="learning-page learning-workbench">
      <section className="learning-overview learning-detail-hero">
        <div>
          <span>{data.domain}</span>
          <h2>{data.title}</h2>
          <p>{data.description}</p>
          <div className="learning-outcome-list">
            {data.targetUsers.map((user) => <span key={user}>{user}</span>)}
            <Link to="/learning">Daily Circuit workspace</Link>
            <Link to="/learning-path">Full route library</Link>
          </div>
        </div>
        <div className="learning-venue-strip">
          {data.relatedVenues.map((venue) => (
            <EntityLink key={venue} kind="venue" value={venue}>{venue}</EntityLink>
          ))}
        </div>
      </section>

      <section className="learning-section">
        <div className="learning-section-head">
          <div>
            <span>Progress placeholders</span>
            <h3>Route planning actions</h3>
          </div>
          <p>Reserved for future user progress, review reminders, and paper reading queues.</p>
        </div>
        <div className="learning-progress-actions">
          <button type="button">Mark route started</button>
          <button type="button">Review later</button>
          <button type="button">Add related papers to reading queue</button>
        </div>
      </section>

      <section className="learning-two-column wide">
        <article className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>Prerequisites</span>
              <h3>Before this route</h3>
            </div>
          </div>
          <div className="learning-chip-row">
            {data.prerequisites.map((item) => <span key={item}>{item}</span>)}
          </div>
        </article>
        <article className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>SiliconScope links</span>
              <h3>Search entry points</h3>
            </div>
            <Link to={todayLessonPath()}>Today</Link>
          </div>
          <div className="learning-query-grid">
            {data.relatedSearchQueries.map((query) => (
              <Link key={query} to={searchPath({ q: query, field: data.relatedTopics[0], semantic: 1 })}>{query}</Link>
            ))}
          </div>
        </article>
      </section>

      <section className="learning-section">
        <div className="learning-section-head">
          <div>
            <span>Stage timeline</span>
            <h3>Modules and lesson placeholders</h3>
          </div>
          <p>{data.caveat}</p>
        </div>
        <div className="learning-stage-list">
          {data.stages.map((stage, index) => (
            <article key={stage.id} className="learning-stage-row">
              <div className="learning-stage-index">{index + 1}</div>
              <div>
                <h3>{stage.title}</h3>
                <p>{stage.goal}</p>
                <div className="learning-module-grid">
                  {stage.modules.map((module) => (
                    <div key={module.id} className="learning-module-card">
                      <strong>{module.title}</strong>
                      <p>{module.purpose}</p>
                      <div>
                        {module.lessonPlaceholders.map((lesson) => <span key={lesson}>{lesson}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="learning-two-column">
        <article className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>Daily lesson pool</span>
              <h3>Lessons in this roadmap</h3>
            </div>
          </div>
          <div className="learning-link-list">
            {(data.lessons ?? []).map((lesson) => (
              <Link key={lesson.id} to={lessonPath(lesson.id)}>
                <strong>{lesson.title}</strong>
                <span>{lesson.estimatedMinutes} min</span>
              </Link>
            ))}
          </div>
        </article>

        <article className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>Related papers</span>
              <h3>Metadata search preview</h3>
            </div>
          </div>
          <div className="learning-paper-list">
            {related.data?.rows?.slice(0, 6).map((paper) => (
              <div key={paper.id}>
                <PaperLink id={paper.id} title={paper.title} />
                <span>{paper.venue} · {paper.year} · {paper.rank}</span>
              </div>
            )) ?? <p className="learning-muted">Loading related papers...</p>}
          </div>
        </article>
      </section>
    </div>
  )
}
