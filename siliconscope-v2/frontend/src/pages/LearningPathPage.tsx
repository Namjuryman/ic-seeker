import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { learningRoadmaps, learningSource } from '../data/learningRoadmaps'
import type { LearningRoadmap, LearningResource } from '../data/learningRoadmaps'

const kindLabel: Record<LearningResource['kind'], string> = {
  course: '课程',
  book: '书籍',
  tool: '工具',
  paper: '论文入口',
  guide: '指南',
}

function ResourceCard({ resource }: { resource: LearningResource }) {
  const external = resource.url.startsWith('http')

  const body = (
    <>
      <span>{kindLabel[resource.kind]}</span>
      <strong>{resource.title}</strong>
      <em>{resource.provider}</em>
      <p>{resource.note}</p>
    </>
  )

  if (external) {
    return (
      <a className="learning-resource" href={resource.url} target="_blank" rel="noreferrer">
        {body}
      </a>
    )
  }

  return (
    <Link className="learning-resource" to={resource.url}>
      {body}
    </Link>
  )
}

function RouteMap({ roadmap }: { roadmap: LearningRoadmap }) {
  return (
    <div className="learning-map" style={{ '--learning-accent': roadmap.accent } as CSSProperties}>
      {roadmap.foundation.map((item, index) => (
        <div className="learning-map-node" key={item}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <strong>{item}</strong>
        </div>
      ))}
    </div>
  )
}

export default function LearningPathPage() {
  const [activeId, setActiveId] = useState(learningRoadmaps[0]?.id ?? '')
  const active = useMemo(
    () => learningRoadmaps.find((roadmap) => roadmap.id === activeId) ?? learningRoadmaps[0],
    [activeId],
  )

  if (!active) return null

  return (
    <div className="learning-page">
      <section className="learning-hero">
        <div>
          <p className="profile-kicker">Learning roadmap</p>
          <h1>IC 学习路线</h1>
          <p>
            把论文数据库和学习地图连起来：先知道该学什么，再用 SiliconScope 找代表论文、活跃老师和强势机构。
          </p>
          <div className="learning-hero-actions">
            <Link to={`/?q=${encodeURIComponent(active.paperQuery)}&scope=all&semantic=1`}>搜索相关论文</Link>
            <a href={learningSource.url} target="_blank" rel="noreferrer">
              来源项目
            </a>
          </div>
        </div>
        <aside>
          <span>Source</span>
          <strong>{learningSource.name}</strong>
          <p>{learningSource.note}</p>
        </aside>
      </section>

      <div className="learning-layout">
        <aside className="learning-rail">
          <div className="learning-rail-title">方向</div>
          {learningRoadmaps.map((roadmap) => (
            <button
              key={roadmap.id}
              type="button"
              className={roadmap.id === active.id ? 'active' : ''}
              onClick={() => setActiveId(roadmap.id)}
              style={{ '--learning-accent': roadmap.accent } as CSSProperties}
            >
              <span />
              <strong>{roadmap.title}</strong>
              <em>{roadmap.venues.slice(0, 3).join(' / ')}</em>
            </button>
          ))}
        </aside>

        <main className="learning-main">
          <section className="learning-overview" style={{ '--learning-accent': active.accent } as CSSProperties}>
            <div>
              <span>当前路线</span>
              <h2>{active.title}</h2>
              <p>{active.subtitle}</p>
            </div>
            <div className="learning-venue-strip">
              {active.venues.map((venue) => (
                <span key={venue}>{venue}</span>
              ))}
            </div>
          </section>

          <section className="learning-section">
            <div className="learning-section-head">
              <div>
                <span>Foundation graph</span>
                <h3>先修知识链</h3>
              </div>
              <Link to={`/?q=${encodeURIComponent(active.paperQuery)}&scope=all&semantic=1`}>跳到论文库</Link>
            </div>
            <RouteMap roadmap={active} />
          </section>

          <section className="learning-stage-grid">
            {active.stages.map((stage, index) => (
              <article className="learning-stage" key={stage.title}>
                <div className="learning-stage-index">{index + 1}</div>
                <div>
                  <h3>{stage.title}</h3>
                  <p>{stage.goal}</p>
                </div>
                <ul>
                  {stage.checkpoints.map((checkpoint) => (
                    <li key={checkpoint}>{checkpoint}</li>
                  ))}
                </ul>
                <div className="learning-resource-grid">
                  {stage.resources.map((resource) => (
                    <ResourceCard key={`${stage.title}-${resource.title}`} resource={resource} />
                  ))}
                </div>
              </article>
            ))}
          </section>

          <section className="learning-section learning-projects">
            <div className="learning-section-head">
              <div>
                <span>Practice</span>
                <h3>可做的小项目</h3>
              </div>
            </div>
            <div className="learning-project-list">
              {active.projectIdeas.map((idea, index) => (
                <div key={idea}>
                  <span>{index + 1}</span>
                  <p>{idea}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
