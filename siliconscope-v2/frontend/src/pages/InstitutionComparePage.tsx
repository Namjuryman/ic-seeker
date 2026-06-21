import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { AutocompleteInput } from '../components/AutocompleteInput'
import type { InstitutionCompareResult } from '../types'
import { institutionPath } from '../utils/routes'

interface InstitutionListItem {
  name: string
  papers: number
  institutionScore: number
  sPlus: number
  s: number
  a: number
  citations: number
}

export default function InstitutionComparePage() {
  const [names, setNames] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<InstitutionCompareResult | null>(null)
  const [institutions, setInstitutions] = useState<InstitutionListItem[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState('')

  useEffect(() => {
    setSuggestionsLoading(true)
    api.institutions({ limit: 300, minPapers: 2 })
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setInstitutions(list as InstitutionListItem[])
        setSuggestionsError('')
      })
      .catch((err) => {
        setSuggestionsError(err?.response?.data?.error || err.message || '加载机构列表失败')
      })
      .finally(() => setSuggestionsLoading(false))
  }, [])

  const autocompleteOptions = useMemo(() => {
    return institutions.map((i) => ({
      label: i.name,
      value: i.name,
      subtitle: `${i.papers} papers · Score ${i.institutionScore}`,
    }))
  }, [institutions])

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
      setError('At least 2 institution names are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await api.compareInstitutions(validNames)
      setResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to compare institutions')
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
          <h1 className="text-2xl font-bold text-ink-text mt-0.5">Compare Institutions</h1>
          <p className="text-sm text-ink-muted mt-1">
            Enter 2–4 institution names to compare publication volume, quality, and active authors.
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
              <AutocompleteInput
                value={name}
                onChange={(val) => updateName(index, val)}
                onSelect={(val) => updateName(index, val)}
                options={autocompleteOptions}
                loading={suggestionsLoading}
                placeholder={`Institution name ${index + 1}`}
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
          {suggestionsError && (
            <p className="text-sm text-red-600">{suggestionsError}</p>
          )}
          {!suggestionsLoading && !suggestionsError && autocompleteOptions.length === 0 && (
            <p className="text-sm text-ink-muted">未加载到机构数据，您可以继续手动输入。</p>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={addField}
            disabled={!canAdd}
            className="px-3 py-2 rounded-lg bg-surface-elevated border border-line text-sm text-ink-secondary disabled:opacity-50 hover:bg-surface-soft transition-colors"
          >
            Add Institution
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

      {result && result.institutions.length > 0 && (
        <section className="space-y-5">
          {/* Basic Info Table */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm overflow-x-auto">
            <h2 className="font-semibold text-ink-text mb-4">Overview</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line-strong text-left text-xs text-ink-subtle uppercase tracking-wide">
                  <th className="py-2 pr-4 font-medium">Attribute</th>
                  {result.institutions.map((inst) => (
                    <th key={inst.name} className="py-2 pr-4 font-medium">
                      <Link to={institutionPath(inst.name)} className="hover:text-brand-600 transition-colors">
                        {inst.name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">Total Papers</td>
                  {result.institutions.map((inst) => (
                    <td key={inst.name} className="py-2 pr-4 text-ink-secondary">{inst.totalPapers}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">Recent Papers (5y)</td>
                  {result.institutions.map((inst) => (
                    <td key={inst.name} className="py-2 pr-4 text-ink-secondary">{inst.recentPapers}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">Avg Score</td>
                  {result.institutions.map((inst) => (
                    <td key={inst.name} className="py-2 pr-4 text-ink-secondary">{inst.avgScore}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">Citations</td>
                  {result.institutions.map((inst) => (
                    <td key={inst.name} className="py-2 pr-4 text-ink-secondary">{inst.citations.toLocaleString()}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">Country</td>
                  {result.institutions.map((inst) => (
                    <td key={inst.name} className="py-2 pr-4 text-ink-secondary">{inst.country || '-'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">City</td>
                  {result.institutions.map((inst) => (
                    <td key={inst.name} className="py-2 pr-4 text-ink-secondary">{inst.city || '-'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">QS World Rank</td>
                  {result.institutions.map((inst) => (
                    <td key={inst.name} className="py-2 pr-4 text-ink-secondary">{inst.qs?.qsWorldRank ?? '-'}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Top Fields */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">Top Fields</h2>
            <div className="space-y-3">
              {result.institutions.map((inst) => (
                <div key={inst.name}>
                  <p className="text-sm font-medium text-ink-text mb-1">{inst.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {inst.topFields.slice(0, 6).map((f) => (
                      <span key={f.key} className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-surface-elevated text-ink-secondary border-line">
                        {f.key} ({f.count})
                      </span>
                    ))}
                    {inst.topFields.length === 0 && <span className="text-xs text-ink-muted">No data</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Authors */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">Active Authors</h2>
            <div className="space-y-3">
              {result.institutions.map((inst) => (
                <div key={inst.name}>
                  <p className="text-sm font-medium text-ink-text mb-1">{inst.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {inst.activeAuthors.slice(0, 8).map((a) => (
                      <span key={a.name} className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-surface-elevated text-ink-secondary border-line">
                        {a.name} ({a.count})
                      </span>
                    ))}
                    {inst.activeAuthors.length === 0 && <span className="text-xs text-ink-muted">No data</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Venue Rank Distribution */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">Venue Rank Distribution</h2>
            <div className="space-y-3">
              {result.institutions.map((inst) => (
                <div key={inst.name}>
                  <p className="text-sm font-medium text-ink-text mb-1">{inst.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {inst.venueRankDistribution.map((r) => (
                      <span key={r.key} className={`inline-flex items-center px-2 py-0.5 rounded border text-xs ${
                        r.key === 'S+' ? 'bg-green-50 text-green-700 border-green-100' :
                        r.key === 'S' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        r.key === 'A' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-surface-elevated text-ink-secondary border-line'
                      }`}>
                        {r.key}: {r.count}
                      </span>
                    ))}
                    {inst.venueRankDistribution.length === 0 && <span className="text-xs text-ink-muted">No data</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeNames.length === 0 && !result && (
        <div className="bg-surface-panel border border-line rounded-xl p-8 shadow-sm text-center">
          <p className="text-ink-muted text-sm">Enter 2–4 institution names to begin a comparison.</p>
        </div>
      )}

      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <p className="text-xs text-ink-subtle leading-relaxed">
          {result?.caveat || 'This comparison is based on available publication metadata and institution name normalization. It is not a final ranking of academic strength.'}
        </p>
      </section>
    </div>
  )
}
