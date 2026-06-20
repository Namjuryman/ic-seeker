import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { EntityLink } from '../components/EntityLink'
import { PaperLink } from '../components/PaperLink'
import { roadmapPath, searchPath } from '../utils/routes'

const sectionLabels: Record<string, string> = {
  problem: '1. What problem does this circuit solve?',
  intuition: '2. Core intuition',
  minimalBlock: '3. Minimal circuit block',
  equations: '4. Key equations',
  specs: '5. Important specs',
  tradeoffs: '6. Design trade-offs',
  pitfalls: '7. Common pitfalls',
  paperDirections: '8. Representative paper directions',
  searches: '9. Related SiliconScope searches',
  quiz: '10. Quick quiz',
  next: '11. What to learn next',
}

export default function DailyLessonPage({ today = false }: { today?: boolean }) {
  const { lessonId = '' } = useParams()
  const lessonQuery = useQuery({
    queryKey: ['learning-lesson', today ? 'today' : lessonId],
    queryFn: () => today ? api.todayLesson() : api.dailyLesson(lessonId),
    enabled: today || Boolean(lessonId),
  })
  const related = useQuery({
    queryKey: ['learning-lesson-papers', lessonQuery.data?.id],
    queryFn: () => api.lessonRelatedPapers(lessonQuery.data!.id, 8),
    enabled: Boolean(lessonQuery.data?.id),
  })

  if (lessonQuery.isLoading) return <div className="ss-skeleton-page"><div /><p>Loading lesson...</p></div>
  if (lessonQuery.isError || !lessonQuery.data) return <div className="ss-empty-state">Lesson not found.</div>

  const lesson = lessonQuery.data

  return (
    <div className="learning-page learning-workbench">
      <section className="learning-overview learning-detail-hero">
        <div>
          <span>{lesson.roadmap?.shortTitle ?? lesson.roadmapSlug} · {lesson.level}</span>
          <h2>{lesson.title}</h2>
          <p>
            This is a structured lesson placeholder. The final derivations, equations, examples, and paper interpretation
            should be written and reviewed manually before public release.
          </p>
          <div className="learning-outcome-list">
            <span>{lesson.estimatedMinutes} min</span>
            <span>{lesson.moduleId}</span>
            {lesson.roadmap && <Link to={roadmapPath(lesson.roadmap.slug)}>Open roadmap</Link>}
          </div>
        </div>
        <div className="learning-venue-strip">
          {lesson.relatedVenues.map((venue) => (
            <EntityLink key={venue} kind="venue" value={venue}>{venue}</EntityLink>
          ))}
        </div>
      </section>

      <section className="learning-two-column wide">
        <article className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>Lesson template</span>
              <h3>Content sections</h3>
            </div>
            <p>Lessons are educational summaries linked to SiliconScope metadata. Verify equations, specs, and paper interpretations before using them in design or research.</p>
          </div>
          <div className="learning-lesson-template">
            {Object.entries(lesson.sectionPlaceholders).map(([key, text]) => (
              <div key={key}>
                <strong>{sectionLabels[key] ?? key}</strong>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </article>

        <aside className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>Research links</span>
              <h3>Jump back to SiliconScope</h3>
            </div>
          </div>
          <div className="learning-chip-row vertical">
            {lesson.relatedTopics.map((topic) => <EntityLink key={topic} kind="topic" value={topic}>{topic}</EntityLink>)}
            {lesson.relatedVenues.map((venue) => <EntityLink key={venue} kind="venue" value={venue}>{venue}</EntityLink>)}
          </div>
          <div className="learning-query-grid">
            {lesson.relatedSearchQueries.map((query) => (
              <Link key={query} to={searchPath({ q: query, field: lesson.relatedTopics[0], semantic: 1 })}>{query}</Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="learning-section">
        <div className="learning-section-head">
          <div>
            <span>Related papers</span>
            <h3>Metadata search preview</h3>
          </div>
          <p>Related papers are generated from metadata-based search and may be incomplete or noisy.</p>
        </div>
        <div className="learning-paper-grid">
          {related.data?.rows?.slice(0, 8).map((paper) => (
            <article key={paper.id}>
              <PaperLink id={paper.id} title={paper.title} />
              <span>{paper.venue} · {paper.year} · {paper.rank}</span>
              <p>{paper.abstract || 'No abstract available.'}</p>
            </article>
          )) ?? <p className="learning-muted">Loading related papers...</p>}
        </div>
      </section>
    </div>
  )
}
