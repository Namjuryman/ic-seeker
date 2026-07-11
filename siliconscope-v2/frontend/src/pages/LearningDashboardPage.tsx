import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { EntityLink } from '../components/EntityLink'
import { formatLearningDomain } from '../utils/learningLabels'
import { lessonPath, roadmapPath, searchPath, todayLessonPath } from '../utils/routes'

export default function LearningDashboardPage() {
  const dashboard = useQuery({ queryKey: ['learning-dashboard'], queryFn: () => api.learningDashboard() })
  const progress = useQuery({ queryKey: ['learning-progress'], queryFn: () => api.learningProgressList() })

  if (dashboard.isLoading) return <div className="ss-skeleton-page"><p>正在加载学习工作区...</p></div>
  if (dashboard.isError || !dashboard.data) return <div className="ss-empty-state">学习工作区暂时无法加载。</div>

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
          <h1>把 IC 电路学习接回真实论文线索。</h1>
          <p>
            从一个电路概念出发，继续追到相关论文、方向、会议、作者线索和机构线索。
            当前课程卡片提供学习结构和检索入口，公式推导与设计细节会逐步补齐并人工校审。
          </p>
          <div className="learning-hero-actions">
            <Link to={todayLessonPath()}>今日电路</Link>
            <Link to="/learning-path">完整路线库</Link>
            <Link to={roadmapPath(data.featuredRoadmap.slug)}>推荐路线</Link>
          </div>
        </div>
        <aside>
          <span>内容说明</span>
          <strong>论文元数据驱动</strong>
          <p>每日工作区聚合学习卡片；完整路线库整理 IC 路线、外部资源和论文检索入口。</p>
        </aside>
      </section>

      <section className="learning-stat-strip">
        <div><span>学习路线</span><strong>{data.summary.roadmaps}</strong></div>
        <div><span>每日卡片</span><strong>{data.summary.dailyLessons}</strong></div>
        <div><span>关联方向</span><strong>{data.summary.linkedTopics}</strong></div>
        <div><span>关联会议</span><strong>{data.summary.linkedVenues}</strong></div>
      </section>

      <section className="learning-two-column">
        <article className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>推荐路线</span>
              <h3>{data.featuredRoadmap.title}</h3>
            </div>
            <Link to={roadmapPath(data.featuredRoadmap.slug)}>打开</Link>
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
              <span>每日电路</span>
              <h3>{data.today?.title ?? '尚未配置课程卡片'}</h3>
            </div>
            {data.today && <Link to={lessonPath(data.today.id)}>打开</Link>}
          </div>
          {data.today ? (
            <>
              <p className="learning-muted">{data.today.estimatedMinutes} 分钟 / {data.today.roadmap?.shortTitle}</p>
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
          ) : <p className="learning-muted">还没有配置每日电路内容。</p>}
        </article>
      </section>

      <section className="learning-section">
        <div className="learning-section-head">
          <div>
            <span>学习路线</span>
            <h3>IC 路线库</h3>
          </div>
          <p>{data.caveats.intelligence}</p>
        </div>
        <div className="learning-roadmap-grid">
          {data.roadmaps.map((roadmap) => (
            <Link className="learning-roadmap-card" key={roadmap.slug} to={roadmapPath(roadmap.slug)}>
              <span>{formatLearningDomain(roadmap.domain)}</span>
              <strong>{roadmap.shortTitle}</strong>
              <p>{roadmap.description}</p>
              <footer>
                <em>{roadmap.stageCount} 阶段</em>
                <em>{roadmap.moduleCount} 模块</em>
                <em>{roadmap.lessonCount} 卡片</em>
              </footer>
            </Link>
          ))}
        </div>
        <div className="learning-progress-actions" style={{ marginTop: '1rem' }}>
          <Link to="/learning-path">查看完整路线库</Link>
        </div>
      </section>

      {(data.routeFamilies?.length ?? 0) > 0 && (
        <section className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>路线族</span>
              <h3>IC 路线族</h3>
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
              <span>公共基础</span>
              <h3>所有路线共用的前置知识</h3>
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
            <span>个人进度</span>
            <h3>学习进度概览</h3>
          </div>
          <p>学习进度按用户保存，用于复习提醒、路线推荐和阅读队列衔接。</p>
        </div>
        <div className="learning-stat-strip compact">
          <div><span>学习中</span><strong>{progressSummary.inProgress}</strong></div>
          <div><span>已完成</span><strong>{progressSummary.completed}</strong></div>
          <div><span>稍后复习</span><strong>{progressSummary.reviewLater}</strong></div>
          <div><span>队列论文</span><strong>{progressSummary.queued}</strong></div>
        </div>
        <div className="learning-progress-actions" style={{ marginTop: '1rem' }}>
          <Link to={todayLessonPath()}>打开今日电路</Link>
          <Link to="/reading-queue">打开阅读队列</Link>
        </div>
      </section>

      <section className="learning-section">
        <div className="learning-section-head">
          <div>
            <span>产业</span>
            <h3>职业与公司入口</h3>
          </div>
        </div>
        <p className="learning-muted">把学习方向继续映射到可能相关的公司类型和岗位线索。</p>
        <div className="learning-progress-actions" style={{ marginTop: '0.75rem' }}>
          <Link to="/companies">查看 IC 公司</Link>
        </div>
      </section>
    </div>
  )
}
