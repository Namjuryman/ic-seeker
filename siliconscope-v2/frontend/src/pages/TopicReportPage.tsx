import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import type { TopicReport } from '../types'
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
      setError(err?.response?.data?.error || err.message || 'Failed to generate topic report')
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
      setError('Please enter a topic field.')
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
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Intelligence</p>
          <h1 className="text-2xl font-bold text-ink-text mt-0.5">Topic Report</h1>
          <p className="text-sm text-ink-muted mt-1">
            Generate a comprehensive report for any research topic including trends, key venues, and related companies.
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
            placeholder="Enter a research topic (e.g., Low Power Design, RISC-V)"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            className="flex-1 px-3 py-2 rounded-lg border border-line bg-surface-elevated text-sm text-ink-text focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300"
          />
          <button
            onClick={handleGenerate}
            disabled={!field.trim() || loading}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-brand-700 transition-colors"
          >
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-ink-subtle mr-1">Suggested:</span>
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
                View Topic Detail
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-surface-elevated rounded-lg p-3 border border-line">
                <p className="text-xs text-ink-subtle">Total Papers</p>
                <p className="text-xl font-bold text-ink-text">{result.overview.totalPapers.toLocaleString()}</p>
              </div>
              <div className="bg-surface-elevated rounded-lg p-3 border border-line">
                <p className="text-xs text-ink-subtle">Recent Papers</p>
                <p className="text-xl font-bold text-ink-text">{result.overview.recentPapers.toLocaleString()}</p>
              </div>
              <div className="bg-surface-elevated rounded-lg p-3 border border-line">
                <p className="text-xs text-ink-subtle">Year Range</p>
                <p className="text-xl font-bold text-ink-text">{result.overview.yearRange || '-'}</p>
              </div>
              <div className="bg-surface-elevated rounded-lg p-3 border border-line">
                <p className="text-xs text-ink-subtle">Top Venues</p>
                <p className="text-xl font-bold text-ink-text">{result.topVenues.length}</p>
              </div>
            </div>
          </div>

          {/* Trend */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">Publication Trend</h2>
            <div className="flex flex-wrap gap-2">
              {result.trend.map((t) => (
                <span key={t.year} className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-surface-elevated text-ink-secondary border-line">
                  {t.year}: {t.count}
                </span>
              ))}
              {result.trend.length === 0 && <span className="text-xs text-ink-muted">No trend data</span>}
            </div>
          </div>

          {/* Top Venues */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">Top Venues</h2>
            <div className="flex flex-wrap gap-2">
              {result.topVenues.map((v) => (
                <span key={v.key} className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-surface-elevated text-ink-secondary border-line">
                  {v.key} ({v.count})
                </span>
              ))}
              {result.topVenues.length === 0 && <span className="text-xs text-ink-muted">No venue data</span>}
            </div>
          </div>

          {/* Active Authors */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">Active Authors</h2>
            <div className="flex flex-wrap gap-2">
              {result.activeAuthors.map((a) => (
                <span key={a.name} className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-surface-elevated text-ink-secondary border-line">
                  {a.name} ({a.papers} papers)
                </span>
              ))}
              {result.activeAuthors.length === 0 && <span className="text-xs text-ink-muted">No author data</span>}
            </div>
          </div>

          {/* Strong Institutions */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">Strong Institutions</h2>
            <div className="flex flex-wrap gap-2">
              {result.strongInstitutions.map((i) => (
                <span key={i.name} className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-surface-elevated text-ink-secondary border-line">
                  {i.name} ({i.papers} papers)
                </span>
              ))}
              {result.strongInstitutions.length === 0 && <span className="text-xs text-ink-muted">No institution data</span>}
            </div>
          </div>

          {/* Related Companies */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">Related Companies</h2>
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
              {result.relatedCompanies.length === 0 && <span className="text-xs text-ink-muted">No related companies</span>}
            </div>
          </div>

          {/* Related Roadmaps */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">Related Learning Roadmaps</h2>
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
              {result.relatedRoadmaps.length === 0 && <span className="text-xs text-ink-muted">No related roadmaps</span>}
            </div>
          </div>

          {/* Suggested Searches */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">Suggested Searches</h2>
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
          <p className="text-ink-muted text-sm">Enter a research topic above to generate a report, or open a direct URL such as /reports/topics/Power%20Management.</p>
        </div>
      )}

      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <p className="text-xs text-ink-subtle leading-relaxed">
          {result?.caveat || 'This report is based on structured publication metadata, not AI-generated analysis. It is intended for directional research exploration, not as a definitive topic ranking.'}
        </p>
      </section>
    </div>
  )
}
