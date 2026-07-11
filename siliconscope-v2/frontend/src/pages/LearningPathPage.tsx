import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import type {
  FoundationGroup,
  LearningResource,
  LearningRoadmap,
  RouteFamily,
} from '../types'
import { learningSource } from '../data/learningRoadmaps'

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
      {roadmap.foundation?.map((item, index) => (
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
  roadmaps,
}: {
  family: RouteFamily
  active: boolean
  onPick: () => void
  roadmaps: LearningRoadmap[]
}) {
  const routes = family.routeIds
    .map((id) => roadmaps.find((roadmap) => roadmap.slug === id))
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
  const roadmapsQuery = useQuery({
    queryKey: ['learning-roadmaps'],
    queryFn: () => api.learningRoadmaps(),
  })
  const familiesQuery = useQuery({
    queryKey: ['learning-route-families'],
    queryFn: () => api.learningRouteFamilies(),
  })
  const foundationsQuery = useQuery({
    queryKey: ['learning-foundations'],
    queryFn: () => api.learningFoundations(),
  })

  const roadmaps = roadmapsQuery.data ?? []
  const routeFamilies = familiesQuery.data ?? []
  const commonFoundations = foundationsQuery.data ?? []

  const [activeSlug, setActiveSlug] = useState('')
  const [activeFamilyId, setActiveFamilyId] = useState('')

  const active = useMemo(
    () => roadmaps.find((roadmap) => roadmap.slug === activeSlug) ?? roadmaps[0],
    [activeSlug, roadmaps],
  )

  const activeFamily = useMemo(() => {
    if (activeFamilyId) {
      return routeFamilies.find((f) => f.id === activeFamilyId) ?? routeFamilies[0]
    }
    return routeFamilies.find((f) => f.id === active?.family) ?? routeFamilies[0]
  }, [activeFamilyId, active?.family, routeFamilies])

  const visibleRoadmaps = useMemo(() => {
    if (!activeFamily) return roadmaps
    return activeFamily.routeIds
      .map((id) => roadmaps.find((roadmap) => roadmap.slug === id))
      .filter(Boolean) as LearningRoadmap[]
  }, [activeFamily, roadmaps])

  const hasRoadmaps = roadmaps.length > 0
  const hasFamilies = routeFamilies.length > 0
  const hasFoundations = commonFoundations.length > 0

  if (!hasRoadmaps && !roadmapsQuery.isError && (roadmapsQuery.isLoading || familiesQuery.isLoading || foundationsQuery.isLoading)) {
    return <div className="ss-skeleton-page"><p>正在加载学习路线库...</p></div>
  }

  function pickFamily(family: RouteFamily) {
    setActiveFamilyId(family.id)
    const firstRoute = family.routeIds.find((id) => roadmaps.some((roadmap) => roadmap.slug === id))
    if (firstRoute) setActiveSlug(firstRoute)
  }

  return (
    <div className="learning-page">
      <section className="learning-hero">
        <div>
          <p className="profile-kicker">学习路线</p>
          <h1>IC 学习路线库</h1>
          <p>
            这里把 IC 的主流方向拆成可执行路线：先补数学、器件、电路、系统和 EDA 工具基础，
            再进入模拟、数模混合、ADC/DAC、PLL、RF/mmWave、SerDes、PMIC、数字 SoC、验证、架构、器件工艺、封装、EDA、安全和前沿交叉方向。
            每条路线都绑定 SiliconScope 的论文检索入口，可衔接阅读队列、课程笔记和本地 PDF 库。
          </p>
          <div className="learning-hero-actions">
            <Link to="/learning">每日电路工作区</Link>
            {active && (
              <Link to={`/?q=${encodeURIComponent(active.paperQuery || '')}&scope=all&semantic=1`}>
                搜索当前方向论文
              </Link>
            )}
            <a href={learningSource.url} target="_blank" rel="noreferrer">
              参考项目
            </a>
          </div>
        </div>
        <aside>
          <span>来源</span>
          <strong>{learningSource.name}</strong>
          <p>{learningSource.note}</p>
        </aside>
      </section>

      {roadmapsQuery.isError && (
        <div className="ss-empty-state" style={{ margin: '1rem 0' }}>
          学习路线加载失败，部分内容可能暂时不可用。
        </div>
      )}
      {familiesQuery.isError && (
        <div className="ss-empty-state" style={{ margin: '1rem 0' }}>
          路线分类加载失败，部分内容可能暂时不可用。
        </div>
      )}
      {foundationsQuery.isError && (
        <div className="ss-empty-state" style={{ margin: '1rem 0' }}>
          公共前置知识加载失败，部分内容可能暂时不可用。
        </div>
      )}

      {!foundationsQuery.isError && hasFoundations && (
        <section className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>公共基础</span>
              <h3>所有 IC 路线的公共前置知识</h3>
            </div>
          </div>
          <FoundationCards groups={commonFoundations} />
        </section>
      )}

      {!familiesQuery.isError && hasFamilies && (
        <section className="learning-section learning-family-section">
          <div className="learning-section-head">
            <div>
              <span>路线分类</span>
              <h3>IC 方向大类</h3>
            </div>
            <p>按职业路径和研究对象组织，避免只按课程名堆列表。</p>
          </div>
          <div className="learning-family-grid">
            {routeFamilies.map((family) => (
              <FamilyCard
                key={family.id}
                family={family}
                active={family.id === activeFamily?.id}
                onPick={() => pickFamily(family)}
                roadmaps={roadmaps}
              />
            ))}
          </div>
        </section>
      )}

      {familiesQuery.isError && hasRoadmaps && (
        <section className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>全部路线</span>
              <h3>全部学习路线</h3>
            </div>
            <p>路线分类暂时不可用，先显示全部路线。</p>
          </div>
        </section>
      )}

      <div className="learning-layout">
        <aside className="learning-rail">
          <div className="learning-rail-title">
            {activeFamily?.title ?? '全部路线'}
            <small>{visibleRoadmaps.length} 条路线</small>
          </div>
          {visibleRoadmaps.length === 0 && !roadmapsQuery.isLoading && (
            <p className="learning-muted" style={{ padding: '1rem' }}>暂无可用路线。</p>
          )}
          {visibleRoadmaps.map((roadmap) => (
            <button
              key={roadmap.slug}
              type="button"
              className={roadmap.slug === active?.slug ? 'active' : ''}
              onClick={() => setActiveSlug(roadmap.slug)}
              style={{ '--learning-accent': roadmap.accent } as CSSProperties}
            >
              <span />
              <strong>{roadmap.title}</strong>
              <em>{roadmap.venues?.slice(0, 3).join(' / ') ?? ''}</em>
            </button>
          ))}
        </aside>

        <main className="learning-main">
          {active ? (
            <section className="learning-overview" style={{ '--learning-accent': active.accent } as CSSProperties}>
              <div>
                <span>{activeFamily?.title ?? '当前路线'}</span>
                <h2>{active.title}</h2>
                <p>{active.subtitle}</p>
                <div className="learning-outcome-list">
                  {active.outcomes?.map((outcome) => (
                    <span key={outcome}>{outcome}</span>
                  ))}
                </div>
              </div>
              <div className="learning-venue-strip">
                {active.venues?.map((venue) => (
                  <span key={venue}>{venue}</span>
                ))}
              </div>
            </section>
          ) : (
            <section className="learning-overview">
              <div>
                <span>暂无内容</span>
                <h2>尚未选择路线</h2>
                <p>可以从左侧选择一条路线，或稍后再回来查看。</p>
              </div>
            </section>
          )}

          <section className="learning-section">
            <div className="learning-section-head">
              <div>
                <span>先修地图</span>
                <h3>本路线先修结构</h3>
              </div>
              {active && (
                <Link to={`/?q=${encodeURIComponent(active.paperQuery || '')}&scope=all&semantic=1`}>
                  跳到论文库
                </Link>
              )}
            </div>
            {active && <RouteMap roadmap={active} />}
            <div className="learning-prereq-grid">
              {active?.prerequisitesGroups?.map((group) => (
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
              {!active?.prerequisitesGroups?.length && <p className="learning-muted">暂未配置先修结构。</p>}
            </div>
          </section>

          <section className="learning-stage-grid">
            {active?.stages?.map((stage, index) => (
              <article className="learning-stage" key={stage.title}>
                <div className="learning-stage-index">{index + 1}</div>
                <div>
                  <h3>{stage.title}</h3>
                  <p>{stage.goal}</p>
                </div>
                <ul>
                  {stage.checkpoints?.map((checkpoint) => (
                    <li key={checkpoint}>{checkpoint}</li>
                  ))}
                </ul>
                <div className="learning-resource-grid">
                  {stage.resources?.map((resource) => (
                    <ResourceCard key={`${stage.title}-${resource.title}`} resource={resource} />
                  ))}
                </div>
              </article>
            ))}
            {!active?.stages?.length && <p className="learning-muted">暂未配置阶段内容。</p>}
          </section>

          <section className="learning-section learning-projects">
            <div className="learning-section-head">
              <div>
                <span>练习</span>
                <h3>可以直接做的小项目</h3>
              </div>
            </div>
            <div className="learning-project-list">
              {active?.projectIdeas?.map((idea, index) => (
                <div key={idea}>
                  <span>{index + 1}</span>
                  <p>{idea}</p>
                </div>
              ))}
              {!active?.projectIdeas?.length && <p className="learning-muted">暂未配置项目建议。</p>}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
