import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { EntityLink } from '../components/EntityLink'
import { PaperLink } from '../components/PaperLink'
import { roadmapPath, searchPath } from '../utils/routes'

function getSuitableCompanyTypes(domain: string): string[] {
  const d = domain.toLowerCase()
  const matches = new Set<string>()
  const map: [string[], string[]][] = [
    [['power', 'pmic', 'dc-dc', 'ldo', 'voltage'], ['Power Semiconductor', 'Analog / Mixed-Signal']],
    [['analog', 'mixed-signal', 'adc', 'dac', 'bandgap'], ['Analog / Mixed-Signal', 'Fabless IC Design']],
    [['rf', 'wireless', 'mmwave', 'mm-wave', 'transceiver'], ['RF / Wireless Semiconductor', 'Fabless IC Design', 'Telecom Equipment']],
    [['digital', 'processor', 'cpu', 'gpu', 'soc', 'dsp'], ['Fabless IC Design', 'Processor / SoC']],
    [['memory', 'sram', 'dram', 'flash', 'nand', 'nvm'], ['Memory Semiconductor', 'IDM']],
    [['clock', 'pll', 'oscillator', 'timing'], ['Analog / Mixed-Signal', 'Fabless IC Design']],
    [['serdes', 'interface', 'high-speed', 'high speed'], ['High-Speed Interface', 'Fabless IC Design']],
    [['sensor', 'mems', 'image sensor', 'cis'], ['Sensor / MEMS', 'IDM']],
    [['eda', 'verification', 'fpga'], ['EDA / IP', 'Fabless IC Design']],
    [['foundry', 'fab', 'process', 'manufacturing'], ['Foundry', 'IDM', 'Semiconductor Equipment']],
    [['test', 'ate', 'packaging', 'assembly'], ['Test & Measurement', 'OSAT']],
    [['ai', 'machine learning', 'neural', 'accelerator', 'npu'], ['AI Chip', 'Fabless IC Design']],
    [['automotive', 'car', 'vehicle', 'ev'], ['Automotive Semiconductor', 'Tier-1 Supplier']],
    [['photonic', 'opto', 'optical'], ['Photonics / Optoelectronics']],
  ]
  for (const [keywords, types] of map) {
    if (keywords.some((k) => d.includes(k))) {
      types.forEach((t) => matches.add(t))
    }
  }
  const result = [...matches]
  if (result.length === 0) return ['Fabless IC Design', 'IDM']
  return result.slice(0, 5)
}

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
          <span>{lesson.roadmap?.shortTitle ?? lesson.roadmapSlug}</span>
          <h2>{lesson.title}</h2>
          <p>
            This is a structured lesson placeholder. The final derivations, equations, examples, and paper interpretation
            should be written and reviewed manually before public release.
          </p>
          <div className="learning-outcome-list">
            <span>{lesson.estimatedMinutes} min</span>
            <span>{lesson.moduleId}</span>
            {lesson.roadmap && <Link to={roadmapPath(lesson.roadmap.slug)}>Open roadmap</Link>}
            <Link to="/learning-path">Full route library</Link>
          </div>
        </div>
        {lesson.roadmap?.family && (
          <div className="learning-chip-row">
            <span>Family: {lesson.roadmap.family}</span>
          </div>
        )}
        {lesson.roadmap?.foundation && lesson.roadmap.foundation.length > 0 && (
          <div className="learning-chip-row">
            {lesson.roadmap.foundation.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        )}
        <div className="learning-venue-strip">
          {lesson.relatedVenues.map((venue) => (
            <EntityLink key={venue} kind="venue" value={venue}>{venue}</EntityLink>
          ))}
        </div>
      </section>

      <section className="learning-section">
        <div className="learning-section-head">
          <div>
            <span>Progress placeholders</span>
            <h3>Review actions</h3>
          </div>
          <p>These buttons are UI placeholders for a future progress, review, and reading-queue model.</p>
        </div>
        <div className="learning-progress-actions">
          <button type="button">Mark completed</button>
          <button type="button">Review later</button>
          <button type="button">Add related papers to reading queue</button>
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
          {lesson.roadmap?.paperQuery && (
            <div className="learning-progress-actions" style={{ marginBottom: '0.75rem' }}>
              <Link to={searchPath({ q: lesson.roadmap.paperQuery, scope: 'all', semantic: 1 })}>
                Search: {lesson.roadmap.paperQuery}
              </Link>
            </div>
          )}
          <div className="learning-chip-row vertical">
            {lesson.relatedTopics?.slice(0, 8).map((topic) => <EntityLink key={topic} kind="topic" value={topic}>{topic}</EntityLink>)}
            {lesson.relatedVenues?.slice(0, 8).map((venue) => <EntityLink key={venue} kind="venue" value={venue}>{venue}</EntityLink>)}
          </div>
          <div className="learning-query-grid">
            {lesson.relatedSearchQueries?.slice(0, 8).map((query) => (
              <Link key={query} to={searchPath({ q: query, field: lesson.relatedTopics?.[0], semantic: 1 })}>{query}</Link>
            ))}
          </div>
          {(!lesson.relatedTopics || lesson.relatedTopics.length === 0) && (!lesson.relatedVenues || lesson.relatedVenues.length === 0) && (!lesson.relatedSearchQueries || lesson.relatedSearchQueries.length === 0) && !lesson.roadmap?.paperQuery && (
            <p className="learning-muted">No research links available.</p>
          )}

          {lesson.roadmap?.domain && (
            <>
              <div className="learning-section-head" style={{ marginTop: '1.5rem' }}>
                <div>
                  <span>Career</span>
                  <h3>Career Relevance</h3>
                </div>
              </div>
              <div className="learning-chip-row" style={{ marginBottom: '0.75rem' }}>
                {getSuitableCompanyTypes(lesson.roadmap.domain).map((type) => (
                  <span key={type}>{type}</span>
                ))}
              </div>
              <div className="learning-progress-actions">
                <Link to="/companies">Explore companies in this area →</Link>
              </div>
              <p className="learning-muted" style={{ fontSize: 12, marginTop: '0.5rem' }}>
                Company suggestions are domain-based and may not reflect current hiring.
              </p>
            </>
          )}
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
              <span><EntityLink kind="venue" value={paper.venue}>{paper.venue}</EntityLink> · {paper.year} · {paper.rank}</span>
              <p>{paper.abstract || 'No abstract available.'}</p>
            </article>
          )) ?? <p className="learning-muted">Loading related papers...</p>}
          {related.isError && <p className="learning-muted">Failed to load related papers.</p>}
          {related.data?.rows?.length === 0 && <p className="learning-muted">No related papers found.</p>}
        </div>
      </section>
    </div>
  )
}
