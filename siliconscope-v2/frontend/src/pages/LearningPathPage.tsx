import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { commonFoundations, learningSource } from '../data/learningRoadmaps'
import type { FoundationGroup } from '../data/learningRoadmaps'
import type { LearningRoadmap } from '../types'

const domainAccents = [
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#ea580c',
  '#0f766e',
]

function accentFor(value: string) {
  let hash = 0
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return domainAccents[hash % domainAccents.length]
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

function RouteMap({ roadmap }: { roadmap: LearningRoadmap }) {
  const items = roadmap.prerequisites.length ? roadmap.prerequisites : roadmap.relatedTopics
  return (
    <div className="learning-map" style={{ '--learning-accent': accentFor(roadmap.domain) } as CSSProperties}>
      {items.map((item, index) => (
        <div className="learning-map-node" key={item}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <strong>{item}</strong>
        </div>
      ))}
    </div>
  )
}

function FamilyCard({
  name,
  count,
  active,
  onPick,
}: {
  name: string
  count: number
  active: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      className={`learning-family-card ${active ? 'active' : ''}`}
      onClick={onPick}
    >
      <span>{count} 条路线</span>
      <strong>{name}</strong>
      <p>由后端 Learning API 返回，未来可迁移到数据库和管理后台维护。</p>
    </button>
  )
}

function StageCard({ stage, index }: { stage: LearningRoadmap['stages'][number]; index: number }) {
  return (
    <article className="learning-stage">
      <div className="learning-stage-index">{index + 1}</div>
      <div>
        <h3>{stage.title}</h3>
        <p>{stage.goal}</p>
      </div>
      <div className="learning-module-grid">
        {stage.modules.map((module) => (
          <div key={module.id} className="learning-module-card">
            <strong>{module.title}</strong>
            <p>{module.purpose}</p>
            <div>
              {module.lessonPlaceholders.slice(0, 4).map((lesson) => (
                <span key={lesson}>{lesson}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

export default function LearningPathPage() {
  const roadmapsQuery = useQuery({ queryKey: ['learning-roadmaps'], queryFn: () => api.learningRoadmaps() })
  const roadmaps = roadmapsQuery.data ?? []
  const [activeSlug, setActiveSlug] = useState('')
  const [activeDomain, setActiveDomain] = useState('')

  const domains = useMemo(() => {
    const rows = new Map<string, LearningRoadmap[]>()
    for (const roadmap of roadmaps) {
      const key = roadmap.domain || 'General IC'
      rows.set(key, [...(rows.get(key) ?? []), roadmap])
    }
    return [...rows.entries()].map(([name, items]) => ({ name, items }))
  }, [roadmaps])

  useEffect(() => {
    if (!roadmaps.length) return
    if (!activeSlug || !roadmaps.some((roadmap) => roadmap.slug === activeSlug)) {
      setActiveSlug(roadmaps[0].slug)
    }
  }, [activeSlug, roadmaps])

  const active = roadmaps.find((roadmap) => roadmap.slug === activeSlug) ?? roadmaps[0]
  const currentDomain = activeDomain || active?.domain || domains[0]?.name || ''
  const visibleRoadmaps = currentDomain ? roadmaps.filter((roadmap) => roadmap.domain === currentDomain) : roadmaps

  if (roadmapsQuery.isLoading) return <div className="ss-skeleton-page"><div /><p>Loading route library...</p></div>
  if (roadmapsQuery.isError) return <div className="ss-empty-state">Learning API 暂时不可用，请确认后端服务已启动。</div>
  if (!active) return <div className="ss-empty-state">后端还没有返回学习路线。</div>

  function pickDomain(domain: string) {
    const first = roadmaps.find((roadmap) => roadmap.domain === domain)
    setActiveDomain(domain)
    if (first) setActiveSlug(first.slug)
  }

  return (
    <div className="learning-page">
      <section className="learning-hero">
        <div>
          <p className="profile-kicker">Learning roadmap</p>
          <h1>IC 学习路线</h1>
          <p>
            这是商业版收口后的 API 驱动路线库：前端只负责展示，路线数据由后端 Learning API 返回。
            后续可以继续把这些种子数据迁移到数据库、后台编辑器和每周更新任务。
          </p>
          <div className="learning-hero-actions">
            <Link to="/learning">Daily Circuit workspace</Link>
            <Link to={`/?q=${encodeURIComponent(active.relatedSearchQueries[0] || active.title)}&scope=all&semantic=1`}>
              搜索当前方向论文
            </Link>
            <a href={learningSource.url} target="_blank" rel="noreferrer">参考项目</a>
          </div>
        </div>
        <aside>
          <span>Source of truth</span>
          <strong>Backend Learning API</strong>
          <p>{roadmaps.length} 条路线来自 /api/learning/roadmaps；/learning 和 /learning-path 已使用同一后端数据源。</p>
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
          <p>按后端 roadmap domain 聚合，避免前端和后端各写一套分类。</p>
        </div>
        <div className="learning-family-grid">
          {domains.map((domain) => (
            <FamilyCard
              key={domain.name}
              name={domain.name}
              count={domain.items.length}
              active={domain.name === currentDomain}
              onPick={() => pickDomain(domain.name)}
            />
          ))}
        </div>
      </section>

      <div className="learning-layout">
        <aside className="learning-rail">
          <div className="learning-rail-title">
            {currentDomain || 'Route library'}
            <small>{visibleRoadmaps.length} 条路线</small>
          </div>
          {visibleRoadmaps.map((roadmap) => (
            <button
              key={roadmap.slug}
              type="button"
              className={roadmap.slug === active.slug ? 'active' : ''}
              onClick={() => setActiveSlug(roadmap.slug)}
              style={{ '--learning-accent': accentFor(roadmap.domain) } as CSSProperties}
            >
              <span />
              <strong>{roadmap.shortTitle || roadmap.title}</strong>
              <em>{roadmap.relatedVenues.slice(0, 3).join(' / ')}</em>
            </button>
          ))}
        </aside>

        <main className="learning-main">
          <section className="learning-overview" style={{ '--learning-accent': accentFor(active.domain) } as CSSProperties}>
            <div>
              <span>{active.domain}</span>
              <h2>{active.title}</h2>
              <p>{active.description}</p>
              <div className="learning-outcome-list">
                {active.targetUsers.map((user) => (
                  <span key={user}>{user}</span>
                ))}
              </div>
            </div>
            <div className="learning-venue-strip">
              {active.relatedVenues.map((venue) => (
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
              <Link to={`/?q=${encodeURIComponent(active.relatedSearchQueries[0] || active.title)}&scope=all&semantic=1`}>
                跳到论文库
              </Link>
            </div>
            <RouteMap roadmap={active} />
            <div className="learning-chip-row">
              {active.prerequisites.map((item) => <span key={item}>{item}</span>)}
            </div>
          </section>

          <section className="learning-stage-list">
            {active.stages.map((stage, index) => (
              <StageCard key={stage.id} stage={stage} index={index} />
            ))}
          </section>

          <section className="learning-section learning-projects">
            <div className="learning-section-head">
              <div>
                <span>Related searches</span>
                <h3>可以继续挖的论文入口</h3>
              </div>
            </div>
            <div className="learning-query-grid">
              {active.relatedSearchQueries.map((query) => (
                <Link key={query} to={`/?q=${encodeURIComponent(query)}&scope=all&semantic=1`}>
                  {query}
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
