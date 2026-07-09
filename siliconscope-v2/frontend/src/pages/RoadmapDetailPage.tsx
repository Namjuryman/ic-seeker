import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { EntityLink } from '../components/EntityLink'
import { PaperLink } from '../components/PaperLink'
import { LearningProgressActions } from '../components/LearningProgressActions'
import { lessonPath, searchPath, todayLessonPath } from '../utils/routes'

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

export default function RoadmapDetailPage() {
  const { slug = '' } = useParams()
  const queryClient = useQueryClient()
  const roadmap = useQuery({ queryKey: ['learning-roadmap', slug], queryFn: () => api.learningRoadmap(slug), enabled: Boolean(slug) })
  const related = useQuery({ queryKey: ['learning-roadmap-papers', slug], queryFn: () => api.roadmapRelatedPapers(slug, 8), enabled: Boolean(slug) })

  const addToQueue = useMutation({
    mutationFn: ({ paperId, status }: { paperId: number; status: string }) =>
      api.updateReadingQueue(paperId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-queue'] })
    },
  })

  if (roadmap.isLoading) return <div className="ss-skeleton-page"><p>Loading roadmap...</p></div>
  if (roadmap.isError || !roadmap.data) return <div className="ss-empty-state">Roadmap not found.</div>

  const data = roadmap.data

  return (
    <div className="learning-page learning-workbench">
      <section className="learning-overview learning-detail-hero" style={{ borderLeftColor: data.accent || undefined }}>
        <div>
          <span>{data.domain}{data.level ? ` · ${data.level}` : ''}{data.family ? ` · ${data.family}` : ''}</span>
          <h2 style={{ color: data.accent || undefined }}>{data.title}</h2>
          {data.subtitle && <p className="learning-muted" style={{ fontStyle: 'italic' }}>{data.subtitle}</p>}
          <p>{data.description}</p>
          <div className="learning-outcome-list">
            {data.targetUsers?.map((user) => <span key={user}>{user}</span>) ?? <span>—</span>}
            <Link to="/learning">Daily Circuit workspace</Link>
            <Link to="/learning-path">Full route library</Link>
          </div>
        </div>
        <div className="learning-venue-strip">
          {data.relatedVenues?.map((venue) => (
            <EntityLink key={venue} kind="venue" value={venue}>{venue}</EntityLink>
          )) ?? <span>—</span>}
        </div>
      </section>

      <LearningProgressActions targetType="roadmap" targetId={data.slug} />

      <section className="learning-two-column wide">
        <article className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>Prerequisites</span>
              <h3>Before this route</h3>
            </div>
          </div>
          <div className="learning-chip-row">
            {data.prerequisites?.map((item) => <span key={item}>{item}</span>) ?? <span>—</span>}
          </div>
          {data.prerequisitesGroups && data.prerequisitesGroups.length > 0 && (
            <div className="learning-prereq-grid">
              {data.prerequisitesGroups.map((group) => (
                <article className="learning-prereq-card" key={group.title}>
                  <h4>{group.title}</h4>
                  <p>{group.note}</p>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
          {data.outcomes && data.outcomes.length > 0 && (
            <div className="learning-outcome-list">
              {data.outcomes.map((outcome) => (
                <span key={outcome}>{outcome}</span>
              ))}
            </div>
          )}
        </article>
        <article className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>SiliconScope links</span>
              <h3>Research entry points</h3>
            </div>
            <Link to={todayLessonPath()}>Today</Link>
          </div>
          {data.paperQuery && (
            <div className="learning-progress-actions">
              <Link className="button" to={searchPath({ q: data.paperQuery, scope: 'all', semantic: 1 })}>
                Search: {data.paperQuery}
              </Link>
            </div>
          )}
          {data.venues && data.venues.length > 0 && (
            <div className="learning-venue-strip">
              {data.venues.map((venue) => (
                <EntityLink key={venue} kind="venue" value={venue} params={{ q: data.paperQuery }}>{venue}</EntityLink>
              ))}
            </div>
          )}
          {data.relatedTopics && data.relatedTopics.length > 0 && (
            <div className="learning-chip-row">
              {data.relatedTopics.map((topic) => (
                <EntityLink key={topic} kind="topic" value={topic}>{topic}</EntityLink>
              ))}
            </div>
          )}
          {data.relatedSearchQueries && data.relatedSearchQueries.length > 0 && (
            <div className="learning-query-grid">
              {data.relatedSearchQueries.slice(0, 8).map((query) => (
                <Link key={query} to={searchPath({ q: query, field: data.relatedTopics?.[0], semantic: 1 })}>{query}</Link>
              ))}
            </div>
          )}
          {!data.paperQuery && (!data.venues || data.venues.length === 0) && (!data.relatedTopics || data.relatedTopics.length === 0) && (!data.relatedSearchQueries || data.relatedSearchQueries.length === 0) && (
            <p className="learning-muted">No research links available.</p>
          )}
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
          {data.stages?.map((stage, index) => (
            <article key={stage.id} className="learning-stage-row">
              <div className="learning-stage-index">{index + 1}</div>
              <div>
                <h3>{stage.title}</h3>
                <p>{stage.goal}</p>
                {stage.checkpoints && stage.checkpoints.length > 0 && (
                  <ul>
                    {stage.checkpoints.map((checkpoint) => (
                      <li key={checkpoint}>{checkpoint}</li>
                    ))}
                  </ul>
                )}
                {stage.resources && stage.resources.length > 0 && (
                  <div className="learning-resource-grid">
                    {stage.resources.map((resource) => (
                      <a key={resource.title} className="learning-resource" href={resource.url} target="_blank" rel="noreferrer">
                        <span>{resource.kind}</span>
                        <strong>{resource.title}</strong>
                        <em>{resource.provider}</em>
                        <p>{resource.note}</p>
                      </a>
                    ))}
                  </div>
                )}
                <div className="learning-module-grid">
                  {stage.modules?.map((module) => (
                    <div key={module.id} className="learning-module-card">
                      <strong>{module.title}</strong>
                      <p>{module.purpose}</p>
                      <div>
                        {module.lessonPlaceholders?.map((lesson) => <span key={lesson}>{lesson}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          )) ?? <p className="learning-muted">No stages defined.</p>}
        </div>
      </section>

      {data.projectIdeas && data.projectIdeas.length > 0 && (
        <section className="learning-section learning-projects">
          <div className="learning-section-head">
            <div>
              <span>Practice</span>
              <h3>可做的小项目</h3>
            </div>
          </div>
          <div className="learning-project-list">
            {data.projectIdeas.slice(0, 8).map((idea, index) => (
              <div key={idea}>
                <span>{index + 1}</span>
                <p>{idea}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="learning-two-column">
        <article className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>Daily lesson pool</span>
              <h3>Lessons in this roadmap</h3>
            </div>
          </div>
          <div className="learning-link-list">
            {(data.lessons ?? []).slice(0, 12).map((lesson) => (
              <Link key={lesson.id} to={lessonPath(lesson.id)}>
                <strong>{lesson.title}</strong>
                <span>{lesson.estimatedMinutes} min</span>
              </Link>
            ))}
            {(data.lessons ?? []).length === 0 && <p className="learning-muted">No lessons available.</p>}
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
              <div key={paper.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <PaperLink id={paper.id} title={paper.title} />
                  <span><EntityLink kind="venue" value={paper.venue}>{paper.venue}</EntityLink> · {paper.year} · {paper.rank}</span>
                </div>
                <button
                  className="text-xs px-2 py-0.5 rounded border border-line hover:bg-surface-elevated shrink-0"
                  onClick={() => addToQueue.mutate({ paperId: paper.id, status: 'review_later' })}
                  disabled={addToQueue.isPending}
                  title="Add to reading queue"
                >
                  + 队列
                </button>
              </div>
            )) ?? <p className="learning-muted">Loading related papers...</p>}
          </div>
        </article>
      </section>

      <section className="learning-section">
        <div className="learning-section-head">
          <div>
            <span>Career</span>
            <h3>Career Directions</h3>
          </div>
        </div>
        <div className="learning-chip-row" style={{ marginBottom: '0.75rem' }}>
          {getSuitableCompanyTypes(data.domain).map((type) => (
            <span key={type}>{type}</span>
          ))}
        </div>
        <div className="learning-progress-actions">
          <Link to={searchPath({ q: data.paperQuery || data.title, scope: 'all', semantic: 1 })}>
            Search: {data.paperQuery || data.title}
          </Link>
          <Link to="/companies">Explore companies →</Link>
        </div>
        <p className="learning-muted" style={{ fontSize: 12, marginTop: '0.5rem' }}>
          Company type suggestions are based on domain matching, not verified employer listings.
        </p>
      </section>
    </div>
  )
}
