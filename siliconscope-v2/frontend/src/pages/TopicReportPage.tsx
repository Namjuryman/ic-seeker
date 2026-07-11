import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import type { TopicReport } from '../types'
import { friendlyError } from '../utils/errorMessages'
import { searchPath, topicPath, companyPath, roadmapPath } from '../utils/routes'

export default function TopicReportPage() {
  const params = useParams()
  const routeField = params.field ? decodeURIComponent(params.field) : ''
  const [field, setField] = useState(routeField)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<TopicReport | null>(null)
  const navigate = useNavigate()

  async function loadReport(target: string, replaceUrl: boolean) {
    const trimmed = target.trim()
    if (!trimmed) {
      setResult(null)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await api.topicReport(trimmed)
      setResult(data)
      setField(trimmed)
      if (replaceUrl) {
        navigate(`/reports/topics/${encodeURIComponent(trimmed)}`, { replace: true })
      }
    } catch (err: any) {
      setError(friendlyError(err, '生成方向报告失败'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (routeField && routeField !== result?.field) {
      loadReport(routeField, false)
    }
    // result is intentionally excluded so a loaded report does not retrigger itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeField])

  async function handleGenerate() {
    const target = field.trim()
    if (!target) {
      setError('请输入一个研究方向。')
      return
    }
    await loadReport(target, true)
  }

  const suggestedFields = [
    'Low Power Design',
    'RISC-V',
    'Analog Circuit',
    'Hardware Security',
    'Memory System',
    'Computer Architecture',
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">情报分析</p>
          <h1 className="text-2xl font-bold text-ink-text mt-0.5">方向报告</h1>
          <p className="text-sm text-ink-muted mt-1">
            输入研究方向，生成趋势、主要会议/期刊、作者线索、机构线索、相关公司和学习路线入口。
          </p>
          <p className="text-xs text-ink-subtle mt-2">
            报告来自论文元数据聚合，用于整理检索入口和候选线索，不替代人工综述或方向判断。
          </p>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border p-3 text-sm bg-red-50 text-red-700 border-red-100">
          {error}
        </div>
      )}

      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div className="flex gap-2">
          <input
            type="text"
            value={field}
            onChange={(e) => setField(e.target.value)}
            placeholder="输入研究方向，例如 Low Power Design / RISC-V"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            className="flex-1 px-3 py-2 rounded-lg border border-line bg-surface-elevated text-sm text-ink-text focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300"
          />
          <button
            onClick={handleGenerate}
            disabled={!field.trim() || loading}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-brand-700 transition-colors"
          >
            {loading ? '生成中...' : '生成报告'}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-ink-subtle mr-1">建议方向：</span>
          {suggestedFields.map((f) => (
            <button
              key={f}
            onClick={() => { setField(f); loadReport(f, true) }}
              className="px-2 py-0.5 rounded border text-xs bg-surface-elevated text-ink-secondary border-line hover:bg-surface-soft transition-colors"
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      {result && (
        <section className="space-y-5">
          {/* Overview */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-ink-text">{result.field}</h2>
              <Link to={topicPath(result.field)} className="text-sm text-brand-600 hover:underline">
                查看方向详情
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-surface-elevated rounded-lg p-3 border border-line">
                <p className="text-xs text-ink-subtle">论文总数</p>
                <p className="text-xl font-bold text-ink-text">{result.overview.totalPapers.toLocaleString()}</p>
              </div>
              <div className="bg-surface-elevated rounded-lg p-3 border border-line">
                <p className="text-xs text-ink-subtle">近年论文</p>
                <p className="text-xl font-bold text-ink-text">{result.overview.recentPapers.toLocaleString()}</p>
              </div>
              <div className="bg-surface-elevated rounded-lg p-3 border border-line">
                <p className="text-xs text-ink-subtle">年份范围</p>
                <p className="text-xl font-bold text-ink-text">{result.overview.yearRange || '-'}</p>
              </div>
              <div className="bg-surface-elevated rounded-lg p-3 border border-line">
                <p className="text-xs text-ink-subtle">主要会议/期刊</p>
                <p className="text-xl font-bold text-ink-text">{result.topVenues.length}</p>
              </div>
            </div>
          </div>

          {/* Trend */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-ink-text mb-4">论文趋势</h2>
            <div className="flex flex-wrap gap-2">
              {result.trend.map((t) => (
                <span key={t.year} className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-surface-elevated text-ink-secondary border-line">
                  {t.year}: {t.count}
                </span>
              ))}
              {result.trend.length === 0 && <span className="text-xs text-ink-muted">暂无趋势数据</span>}
            </div>
          </div>

          {/* Top Venues */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">主要会议/期刊</h2>
            <div className="flex flex-wrap gap-2">
              {result.topVenues.map((v) => (
                <span key={v.key} className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-surface-elevated text-ink-secondary border-line">
                  {v.key} ({v.count})
                </span>
              ))}
              {result.topVenues.length === 0 && <span className="text-xs text-ink-muted">暂无会议/期刊数据</span>}
            </div>
          </div>

          {/* Active Authors */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">作者线索</h2>
            <div className="flex flex-wrap gap-2">
              {result.activeAuthors.map((a) => (
                <span key={a.name} className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-surface-elevated text-ink-secondary border-line">
                  {a.name} ({a.papers} 篇)
                </span>
              ))}
              {result.activeAuthors.length === 0 && <span className="text-xs text-ink-muted">暂无作者数据</span>}
            </div>
          </div>

          {/* Institution Leads */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">机构线索</h2>
            <div className="flex flex-wrap gap-2">
              {result.strongInstitutions.map((i) => (
                <span key={i.name} className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-surface-elevated text-ink-secondary border-line">
                  {i.name} ({i.papers} 篇)
                </span>
              ))}
              {result.strongInstitutions.length === 0 && <span className="text-xs text-ink-muted">暂无机构数据</span>}
            </div>
          </div>

          {/* Related Companies */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">相关公司</h2>
            <div className="flex flex-wrap gap-2">
              {result.relatedCompanies.map((c) => (
                <Link
                  key={c.id}
                  to={companyPath(c.id)}
                  className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-green-50 text-green-700 border-green-100 hover:bg-green-100 transition-colors"
                >
                  {c.name}
                </Link>
              ))}
              {result.relatedCompanies.length === 0 && <span className="text-xs text-ink-muted">暂无相关公司</span>}
            </div>
          </div>

          {/* Related Roadmaps */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">相关学习路线</h2>
            <div className="flex flex-wrap gap-2">
              {result.relatedRoadmaps.map((r) => (
                <Link
                  key={r.slug}
                  to={roadmapPath(r.slug)}
                  className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 transition-colors"
                >
                  {r.title}
                </Link>
              ))}
              {result.relatedRoadmaps.length === 0 && <span className="text-xs text-ink-muted">暂无相关路线</span>}
            </div>
          </div>

          {/* Suggested Searches */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">推荐检索</h2>
            <div className="flex flex-wrap gap-2">
              {result.suggestedSearches.map((s) => (
                <Link
                  key={s.label}
                  to={searchPath(s.params)}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg border text-sm bg-brand-50 text-brand-700 border-brand-100 hover:bg-brand-100 transition-colors"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {!result && !loading && (
        <div className="bg-surface-panel border border-line rounded-xl p-8 shadow-sm text-center">
          <p className="text-ink-muted text-sm">输入研究方向即可生成报告，也可以直接打开类似 /reports/topics/Power%20Management 的链接。</p>
        </div>
      )}

      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <p className="text-xs text-ink-subtle leading-relaxed">
          {result?.caveat || '本报告基于结构化论文元数据生成，用于方向探索、检索和对比，不代表最终方向排名或学术结论。'}
        </p>
      </section>
    </div>
  )
}
