import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { EntityLink } from '../components/EntityLink'
import { PaperLink } from '../components/PaperLink'
import { LearningProgressActions } from '../components/LearningProgressActions'
import { paperRankLabel } from '../utils/displayLabels'
import { formatLearningFamily } from '../utils/learningLabels'
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

const companyTypeLabels: Record<string, string> = {
  'Power Semiconductor': '功率半导体',
  'Analog / Mixed-Signal': '模拟 / 数模混合',
  'Fabless IC Design': 'Fabless IC 设计',
  'RF / Wireless Semiconductor': '射频 / 无线芯片',
  'Telecom Equipment': '通信设备',
  'Processor / SoC': '处理器 / SoC',
  'Memory Semiconductor': '存储芯片',
  IDM: 'IDM',
  'High-Speed Interface': '高速接口',
  'Sensor / MEMS': '传感器 / MEMS',
  'EDA / IP': 'EDA / IP',
  Foundry: '晶圆代工',
  'Semiconductor Equipment': '半导体设备',
  'Test & Measurement': '测试测量',
  OSAT: '封测',
  'AI Chip': 'AI 芯片',
  'Automotive Semiconductor': '汽车半导体',
  'Tier-1 Supplier': '一级供应商',
  'Photonics / Optoelectronics': '光子 / 光电',
}

const sectionLabels: Record<string, string> = {
  problem: '1. 这个电路解决什么问题',
  intuition: '2. 核心直觉',
  minimalBlock: '3. 最小电路模块',
  equations: '4. 关键公式',
  specs: '5. 重要指标',
  tradeoffs: '6. 设计取舍',
  pitfalls: '7. 常见坑',
  paperDirections: '8. 代表性论文方向',
  searches: '9. 相关 SiliconScope 检索',
  quiz: '10. 快速自测',
  next: '11. 下一步学习',
}

export default function DailyLessonPage({ today = false }: { today?: boolean }) {
  const { lessonId = '' } = useParams()
  const queryClient = useQueryClient()

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

  const addToQueue = useMutation({
    mutationFn: ({ paperId, status }: { paperId: number; status: string }) =>
      api.updateReadingQueue(paperId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-queue'] })
    },
  })

  if (lessonQuery.isLoading) return <div className="ss-skeleton-page"><p>正在加载课程卡片...</p></div>
  if (lessonQuery.isError || !lessonQuery.data) return <div className="ss-empty-state">没有找到这节课程。</div>

  const lesson = lessonQuery.data

  return (
    <div className="learning-page learning-workbench">
      <section className="learning-overview learning-detail-hero">
        <div>
          <span>{lesson.roadmap?.shortTitle ?? lesson.roadmapSlug}</span>
          <h2>{lesson.title}</h2>
          <p>
            这是一张结构化学习卡片：先给出问题、直觉、公式入口和论文检索线索。
            具体推导、例题和论文解读会继续补齐，并在公开前人工校审。
          </p>
          <div className="learning-outcome-list">
            <span>{lesson.estimatedMinutes} 分钟</span>
            <span>模块：{lesson.moduleId}</span>
            {lesson.roadmap && <Link to={roadmapPath(lesson.roadmap.slug)}>打开路线</Link>}
            <Link to="/learning-path">完整路线库</Link>
          </div>
        </div>
        {lesson.roadmap?.family && (
          <div className="learning-chip-row">
            <span>路线分类：{formatLearningFamily(lesson.roadmap.family)}</span>
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

      <LearningProgressActions targetType="lesson" targetId={lesson.id} />

      <section className="learning-two-column wide">
        <article className="learning-section">
          <div className="learning-section-head">
            <div>
              <span>学习卡片</span>
              <h3>本节结构</h3>
            </div>
            <p>课程内容连接 SiliconScope 元数据；用于建立学习路径和检索入口，正式设计或研究前仍需复核公式、指标和论文解释。</p>
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
              <span>论文入口</span>
              <h3>回到 SiliconScope 检索</h3>
            </div>
          </div>
          {lesson.roadmap?.paperQuery && (
            <div className="learning-progress-actions" style={{ marginBottom: '0.75rem' }}>
              <Link to={searchPath({ q: lesson.roadmap.paperQuery, scope: 'all', semantic: 1 })}>
                搜索：{lesson.roadmap.paperQuery}
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
            <p className="learning-muted">暂无关联检索入口。</p>
          )}

          {lesson.roadmap?.domain && (
            <>
              <div className="learning-section-head" style={{ marginTop: '1.5rem' }}>
                <div>
                  <span>职业</span>
                  <h3>职业关联</h3>
                </div>
              </div>
              <div className="learning-chip-row" style={{ marginBottom: '0.75rem' }}>
                {getSuitableCompanyTypes(lesson.roadmap.domain).map((type) => (
                  <span key={type}>{companyTypeLabels[type] || type}</span>
                ))}
              </div>
              <div className="learning-progress-actions">
                <Link to="/companies">查看相关公司 →</Link>
              </div>
              <p className="learning-muted" style={{ fontSize: 12, marginTop: '0.5rem' }}>
                公司类型由方向关键词推断，不代表实时招聘情况。
              </p>
            </>
          )}
        </aside>
      </section>

      <section className="learning-section">
        <div className="learning-section-head">
          <div>
            <span>相关论文</span>
            <h3>元数据推荐</h3>
          </div>
          <p>相关论文来自元数据检索，适合拓展阅读，关键结论仍需回到原文核验。</p>
        </div>
        <div className="learning-paper-grid">
          {related.data?.rows?.slice(0, 8).map((paper) => (
            <article key={paper.id}>
              <div className="flex items-center justify-between gap-2">
                <PaperLink id={paper.id} title={paper.title} />
                <button
                  className="text-xs px-2 py-0.5 rounded border border-line hover:bg-surface-elevated shrink-0"
                  onClick={() => addToQueue.mutate({ paperId: paper.id, status: 'review_later' })}
                  disabled={addToQueue.isPending}
                  title="加入阅读队列"
                >
                  + 队列
                </button>
              </div>
              <span><EntityLink kind="venue" value={paper.venue}>{paper.venue}</EntityLink> · {paper.year} · {paperRankLabel(paper.rank)}</span>
              <p>{paper.abstract || '暂无摘要。'}</p>
            </article>
          )) ?? <p className="learning-muted">正在加载相关论文...</p>}
          {related.isError && <p className="learning-muted">相关论文加载失败。</p>}
          {related.data?.rows?.length === 0 && <p className="learning-muted">暂无相关论文。</p>}
        </div>
      </section>
    </div>
  )
}
