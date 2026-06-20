import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { PaperLink } from '../components/PaperLink'
import { searchPath } from '../utils/routes'
import type { TopicSummary, TopicDetail } from '../types'

export default function TopicsPage() {
  const [list, setList] = useState<TopicSummary[]>([])
  const [detail, setDetail] = useState<TopicDetail | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const field = searchParams.get('field')

  useEffect(() => {
    api.topics().then(setList)
  }, [])

  useEffect(() => {
    if (!field) {
      setDetail(null)
      return
    }
    api.topicDetail(field).then(setDetail)
  }, [field])

  if (field && detail) {
    return (
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => setSearchParams({})}
          className="mb-4 text-sm text-brand-600 hover:text-brand-700"
        >
          ← 返回方向列表
        </button>
        <h2 className="text-2xl font-bold text-ink-text mb-1">{detail.field}</h2>
        <p className="text-sm text-ink-muted mb-2">
          {detail.papers ?? 0} 篇论文 · 平均评分 {detail.avgScore ?? '-'} · 引用 {detail.citations ?? 0}
        </p>
        <div className="mb-4 rounded-lg border border-line bg-surface-panel px-3 py-2 text-xs text-ink-muted">
          Topic scoring reflects venue/domain/citation/recency metadata and should be used as research-intelligence signal, not absolute academic judgment.
        </div>
        <div className="mb-4 rounded-lg border border-line bg-surface-panel px-3 py-2 text-xs text-ink-muted">
          Topic intelligence is generated from metadata and heuristic classification. Verify critical decisions manually.
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-surface-panel rounded-lg border border-line p-4">
            <h3 className="font-semibold text-ink-secondary mb-3">年度趋势</h3>
            <div className="space-y-1">
              {detail.byYear.map((y) => (
                <div
                  key={y.year}
                  className="flex items-center gap-2 cursor-pointer hover:bg-surface-elevated px-1 rounded"
                  onClick={() => navigate(searchPath({ field: detail.field, yearFrom: y.year, yearTo: y.year }))}
                >
                  <span className="w-10 text-xs text-ink-muted">{y.year ?? '-'}</span>
                  <div className="flex-1 h-2 bg-surface-soft rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{
                        width: `${(y.count / Math.max(...detail.byYear.map((x) => x.count))) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-ink-secondary w-8 text-right">{y.count ?? 0}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-panel rounded-lg border border-line p-4">
            <h3 className="font-semibold text-ink-secondary mb-3">主要会议/期刊</h3>
            <div className="space-y-1">
              {detail.byVenue.slice(0, 10).map((v) => (
                <div
                  key={v.key}
                  className="flex justify-between text-sm cursor-pointer hover:bg-surface-elevated px-1 rounded"
                  onClick={() => navigate(searchPath({ field: detail.field, venue: v.key }))}
                >
                  <span className="text-ink-secondary">{v.key ?? '-'}</span>
                  <span className="text-ink-subtle">{v.count ?? 0}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-panel rounded-lg border border-line p-4">
            <h3 className="font-semibold text-ink-secondary mb-3">活跃学者</h3>
            <div className="space-y-1">
              {detail.authors.slice(0, 10).map((a) => (
                <div
                  key={a.name}
                  className="flex justify-between text-sm cursor-pointer hover:bg-surface-elevated px-1 rounded"
                  onClick={() => navigate(`/authors/${encodeURIComponent(a.name)}`)}
                >
                  <span className="text-ink-secondary">{a.name ?? '-'}</span>
                  <span className="text-ink-subtle">{a.papers ?? 0} 篇</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-panel rounded-lg border border-line p-4">
            <h3 className="font-semibold text-ink-secondary mb-3">活跃机构</h3>
            <div className="space-y-1">
              {detail.institutions.slice(0, 10).map((i) => (
                <div
                  key={i.name}
                  className="flex justify-between text-sm cursor-pointer hover:bg-surface-elevated px-1 rounded"
                  onClick={() => navigate(`/institutions/${encodeURIComponent(i.name)}`)}
                >
                  <span className="text-ink-secondary">{i.name ?? '-'}</span>
                  <span className="text-ink-subtle">{i.papers ?? 0} 篇</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-surface-panel rounded-lg border border-line p-4">
          <h3 className="font-semibold text-ink-secondary mb-3">代表论文</h3>
          <div className="space-y-3">
            {detail.representativePapers.slice(0, 10).map((p) => (
              <div key={p.id} className="border-b border-line-subtle last:border-0 pb-2 last:pb-0">
                <div className="font-medium text-sm text-ink-text">
                  <PaperLink id={p.id} title={p.title ?? 'Untitled'} />
                </div>
                <div className="flex gap-2 mt-1 text-xs">
                  <span className="px-1.5 py-0.5 rounded bg-surface-soft text-ink-secondary">{p.venue ?? '-'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-700">{p.rank ?? '-'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-soft text-ink-secondary">{p.year ?? '-'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Score: {p.score ?? '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <section className="hero-panel">
        <div>
          <p className="profile-kicker">Topic intelligence</p>
          <h1>方向洞察</h1>
          <p>追踪 PMIC / ADC / PLL / RF / Memory / EDA 等方向的趋势、代表论文、活跃作者和机构。</p>
        </div>
        <div className="hero-metrics">
          <div><span>Topics</span><strong>{list.length}</strong></div>
          <div><span>Use</span><strong>Watch</strong></div>
          <div><span>Signal</span><strong>Meta</strong></div>
        </div>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((t) => (
          <div
            key={t.field}
            className="bg-surface-panel rounded-lg border border-line p-4 cursor-pointer hover:shadow-sm transition-shadow"
            onClick={() => setSearchParams({ field: t.field })}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-ink-text">{t.field}</h3>
              <span
                className="text-xs text-ink-subtle cursor-pointer hover:text-brand-600"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(searchPath({ field: t.field }))
                }}
              >
                {t.papers ?? 0} 篇
              </span>
            </div>
            <div className="flex gap-2 text-xs mb-2">
              <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-700">S+ {t.sPlus ?? 0}</span>
              <span className="px-2 py-0.5 rounded bg-surface-soft text-ink-secondary">S {t.s ?? 0}</span>
              <span className="px-2 py-0.5 rounded bg-surface-soft text-ink-secondary">A {t.a ?? 0}</span>
            </div>
            <p className="text-xs text-ink-muted">
              平均评分 {t.avgScore ?? '-'} · 活跃 {t.firstYear ?? '-'}-{t.lastYear ?? '-'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
