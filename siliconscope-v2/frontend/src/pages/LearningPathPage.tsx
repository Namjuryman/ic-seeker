import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import {
  commonFoundations,
  learningRoadmaps,
  learningSource,
  routeFamilies,
} from '../data/learningRoadmaps'
import type {
  FoundationGroup,
  LearningResource,
  LearningRoadmap,
  RouteFamily,
} from '../data/learningRoadmaps'

const kindLabel: Record<LearningResource['kind'], string> = {
  course: '课程',
  book: '书籍',
  tool: '工具',
  paper: '论文入口',
  guide: '指南',
}

function ResourceCard({ resource }: { resource: LearningResource }) {
  const body = (
    <>
      <span>{kindLabel[resource.kind]}</span>
      <strong>{resource.title}</strong>
      <em>{resource.provider}</em>
      <p>{resource.note}</p>
    </>
  )

  if (resource.url.startsWith('http')) {
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

function FoundationCards({ groups }: { groups: FoundationGroup[] }) {
  return (
    <div className="learning-foundation-grid">
      {groups.map((group) => (
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
  )
}

function FamilyCard({
  family,
  active,
  onPick,
}: {
  family: RouteFamily
  active: boolean
  onPick: () => void
}) {
  const routes = family.routeIds
    .map((id) => learningRoadmaps.find((roadmap) => roadmap.id === id))
    .filter(Boolean) as LearningRoadmap[]

  return (
    <button
      type="button"
      className={`learning-family-card ${active ? 'active' : ''}`}
      onClick={onPick}
    >
      <span>{routes.length} 条路线</span>
      <strong>{family.title}</strong>
      <p>{family.description}</p>
    </button>
  )
}

export default function LearningPathPage() {
  const [activeId, setActiveId] = useState(learningRoadmaps[0]?.id ?? '')
  const active = useMemo(
    () => learningRoadmaps.find((roadmap) => roadmap.id === activeId) ?? learningRoadmaps[0],
    [activeId],
  )
  const activeFamily = routeFamilies.find((family) => family.id === active?.family) ?? routeFamilies[0]
  const visibleRoadmaps = useMemo(() => {
    if (!activeFamily) return learningRoadmaps
    return activeFamily.routeIds
      .map((id) => learningRoadmaps.find((roadmap) => roadmap.id === id))
      .filter(Boolean) as LearningRoadmap[]
  }, [activeFamily])

  if (!active) return null

  function pickFamily(family: RouteFamily) {
    const firstRoute = family.routeIds.find((id) => learningRoadmaps.some((roadmap) => roadmap.id === id))
    if (firstRoute) setActiveId(firstRoute)
  }

  return (
    <div className="learning-page">
      <section className="learning-hero">
        <div>
          <p className="profile-kicker">Learning roadmap</p>
          <h1>IC 学习路线</h1>
          <p>
            这页把 IC 的主流方向拆成可执行的学习地图：先补数学、器件、电路、系统和 EDA
            工具基础，再进入模拟、射频、电源、数字 SoC、验证、架构、器件工艺、封装、EDA
            与硬件安全等分支。每个分支都绑定 SiliconScope 的论文检索入口，后续可以继续接入
            阅读清单、课程笔记和本地 PDF 库。
          </p>
          <div className="learning-hero-actions">
            <Link to="/learning">
              Daily Circuit workspace
            </Link>
            <Link to={`/?q=${encodeURIComponent(active.paperQuery)}&scope=all&semantic=1`}>
              搜索当前方向论文
            </Link>
            <a href={learningSource.url} target="_blank" rel="noreferrer">
              参考项目
            </a>
          </div>
        </div>
        <aside>
          <span>Source</span>
          <strong>{learningSource.name}</strong>
          <p>{learningSource.note}</p>
        </aside>
      </section>

      <section className="learning-section">
        <div className="learning-section-head">
          <div>
            <span>Common base</span>
            <h3>所有 IC 路线的公共前置知识</h3>
          </div>
        </div>
        <FoundationCards groups={commonFoundations} />
      </section>

      <section className="learning-section learning-family-section">
        <div className="learning-section-head">
          <div>
            <span>Route families</span>
            <h3>IC 方向大类</h3>
          </div>
          <p>按职业路径和研究对象组织，避免只按课程名堆列表。</p>
        </div>
        <div className="learning-family-grid">
          {routeFamilies.map((family) => (
            <FamilyCard
              key={family.id}
              family={family}
              active={family.id === active.family}
              onPick={() => pickFamily(family)}
            />
          ))}
        </div>
      </section>

      <div className="learning-layout">
        <aside className="learning-rail">
          <div className="learning-rail-title">
            {activeFamily?.title ?? '方向'}
            <small>{visibleRoadmaps.length} 条细分路线</small>
          </div>
          {visibleRoadmaps.map((roadmap) => (
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
              <span>{activeFamily?.title ?? '当前路线'}</span>
              <h2>{active.title}</h2>
              <p>{active.subtitle}</p>
              <div className="learning-outcome-list">
                {active.outcomes.map((outcome) => (
                  <span key={outcome}>{outcome}</span>
                ))}
              </div>
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
                <span>Prerequisite map</span>
                <h3>本路线先修结构</h3>
              </div>
              <Link to={`/?q=${encodeURIComponent(active.paperQuery)}&scope=all&semantic=1`}>
                跳到论文库
              </Link>
            </div>
            <RouteMap roadmap={active} />
            <div className="learning-prereq-grid">
              {active.prerequisites.map((group) => (
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
