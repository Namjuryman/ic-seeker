import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { AuthorCompareResult } from '../types'
import { authorPath } from '../utils/routes'

export default function AuthorComparePage() {
  const [names, setNames] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AuthorCompareResult | null>(null)

  const canAdd = names.length < 4 && names[names.length - 1]?.trim()
  const canCompare = names.filter((n) => n.trim()).length >= 2

  function addField() {
    if (canAdd) setNames([...names, ''])
  }

  function updateName(index: number, value: string) {
    const next = [...names]
    next[index] = value
    setNames(next)
  }

  function removeName(index: number) {
    const next = names.filter((_, i) => i !== index)
    if (next.length === 0) next.push('')
    setNames(next)
  }

  async function handleCompare() {
    const validNames = names.map((n) => n.trim()).filter(Boolean)
    if (validNames.length < 2) {
      setError('At least 2 author names are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await api.compareAuthors(validNames)
      setResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to compare authors')
    } finally {
      setLoading(false)
    }
  }

  const activeNames = useMemo(() => names.map((n) => n.trim()).filter(Boolean), [names])

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Intelligence</p>
          <h1 className="text-2xl font-bold text-ink-text mt-0.5">Compare Authors</h1>
          <p className="text-sm text-ink-muted mt-1">
            Enter 2–4 author names to compare publication output, venues, and collaboration networks.
          </p>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border p-3 text-sm bg-red-50 text-red-700 border-red-100">
          {error}
        </div>
      )}

      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div className="space-y-3">
          {names.map((name, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => updateName(index, e.target.value)}
                placeholder={`Author name ${index + 1}`}
                className="flex-1 px-3 py-2 rounded-lg border border-line bg-surface-elevated text-sm text-ink-text focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300"
              />
              {names.length > 1 && (
                <button
                  onClick={() => removeName(index)}
                  className="px-3 py-2 rounded-lg bg-surface-elevated border border-line text-sm text-ink-secondary hover:bg-surface-soft transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={addField}
            disabled={!canAdd}
            className="px-3 py-2 rounded-lg bg-surface-elevated border border-line text-sm text-ink-secondary disabled:opacity-50 hover:bg-surface-soft transition-colors"
          >
            Add Author
          </button>
          <button
            onClick={handleCompare}
            disabled={!canCompare || loading}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-brand-700 transition-colors"
          >
            {loading ? 'Comparing...' : 'Compare'}
          </button>
        </div>
      </section>

      {result && result.authors.length > 0 && (
        <section className="space-y-5">
          {/* Basic Info Table */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm overflow-x-auto">
            <h2 className="font-semibold text-ink-text mb-4">Overview</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line-strong text-left text-xs text-ink-subtle uppercase tracking-wide">
                  <th className="py-2 pr-4 font-medium">Attribute</th>
                  {result.authors.map((a) => (
                    <th key={a.name} className="py-2 pr-4 font-medium">
                      <Link to={authorPath(a.name)} className="hover:text-brand-600 transition-colors">
                        {a.name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">Total Papers</td>
                  {result.authors.map((a) => (
                    <td key={a.name} className="py-2 pr-4 text-ink-secondary">{a.totalPapers}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">Recent Papers (5y)</td>
                  {result.authors.map((a) => (
                    <td key={a.name} className="py-2 pr-4 text-ink-secondary">{a.recentPapers}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">Avg Score</td>
                  {result.authors.map((a) => (
                    <td key={a.name} className="py-2 pr-4 text-ink-secondary">{a.avgScore}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">Citations</td>
                  {result.authors.map((a) => (
                    <td key={a.name} className="py-2 pr-4 text-ink-secondary">{a.citations.toLocaleString()}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">Aliases</td>
                  {result.authors.map((a) => (
                    <td key={a.name} className="py-2 pr-4 text-ink-secondary">
                      {a.aliases.length > 0 ? a.aliases.slice(0, 3).join(', ') : '-'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Top Fields */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">Top Fields</h2>
            <div className="space-y-3">
              {result.authors.map((a) => (
                <div key={a.name}>
                  <p className="text-sm font-medium text-ink-text mb-1">{a.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {a.topFields.slice(0, 6).map((f) => (
                      <span key={f.key} className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-surface-elevated text-ink-secondary border-line">
                        {f.key} ({f.count})
                      </span>
                    ))}
                    {a.topFields.length === 0 && <span className="text-xs text-ink-muted">No data</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coauthors */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">Top Coauthors</h2>
            <div className="space-y-3">
              {result.authors.map((a) => (
                <div key={a.name}>
                  <p className="text-sm font-medium text-ink-text mb-1">{a.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {a.coauthors.slice(0, 8).map((c) => (
                      <span key={c.name} className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-surface-elevated text-ink-secondary border-line">
                        {c.name} ({c.count})
                      </span>
                    ))}
                    {a.coauthors.length === 0 && <span className="text-xs text-ink-muted">No data</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Institutions */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">Affiliated Institutions</h2>
            <div className="space-y-3">
              {result.authors.map((a) => (
                <div key={a.name}>
                  <p className="text-sm font-medium text-ink-text mb-1">{a.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {a.institutions.slice(0, 6).map((i) => (
                      <span key={i.name} className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-surface-elevated text-ink-secondary border-line">
                        {i.name} ({i.count})
                      </span>
                    ))}
                    {a.institutions.length === 0 && <span className="text-xs text-ink-muted">No data</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Venue Rank Distribution */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">Venue Rank Distribution</h2>
            <div className="space-y-3">
              {result.authors.map((a) => (
                <div key={a.name}>
                  <p className="text-sm font-medium text-ink-text mb-1">{a.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {a.venueRankDistribution.map((r) => (
                      <span key={r.key} className={`inline-flex items-center px-2 py-0.5 rounded border text-xs ${
                        r.key === 'S+' ? 'bg-green-50 text-green-700 border-green-100' :
                        r.key === 'S' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        r.key === 'A' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-surface-elevated text-ink-secondary border-line'
                      }`}>
                        {r.key}: {r.count}
                      </span>
                    ))}
                    {a.venueRankDistribution.length === 0 && <span className="text-xs text-ink-muted">No data</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeNames.length === 0 && !result && (
        <div className="bg-surface-panel border border-line rounded-xl p-8 shadow-sm text-center">
          <p className="text-ink-muted text-sm">Enter 2–4 author names to begin a comparison.</p>
        </div>
      )}

      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <p className="text-xs text-ink-subtle leading-relaxed">
          {result?.caveat || 'Author comparison is based on publication metadata and name-based normalization. It is not a final evaluation of academic quality.'}
        </p>
      </section>
    </div>
  )
}
