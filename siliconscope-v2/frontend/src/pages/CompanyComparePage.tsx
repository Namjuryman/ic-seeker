import { useEffect, useState, useMemo } from 'react'
import { api } from '../api'
import type { CompanyRow, CompanyCompareResult } from '../types'

function formatNumber(value: string | number | undefined): string {
  if (value === undefined || value === null) return '-'
  return String(value)
}

function formatConfidence(value: number | undefined): string {
  if (value === undefined || value === null) return '-'
  return `${value}%`
}

function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'green' | 'blue' | 'amber' }) {
  const toneMap = {
    default: 'bg-surface-elevated text-ink-secondary border-line',
    green: 'bg-green-50 text-green-700 border-green-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs ${toneMap[tone]}`}>
      {children}
    </span>
  )
}

export default function CompanyComparePage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [compareResult, setCompareResult] = useState<CompanyCompareResult | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareError, setCompareError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await api.companies({ limit: 200 })
      setCompanies(result.rows)
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to load companies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      const aName = a.name || ''
      const bName = b.name || ''
      return aName.localeCompare(bName)
    })
  }, [companies])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 4) {
        next.add(id)
      }
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setCompareResult(null)
  }

  async function handleCompare() {
    const ids = Array.from(selectedIds)
    if (ids.length < 2 || ids.length > 4) {
      setCompareError('Please select 2–4 companies to compare.')
      return
    }
    setCompareLoading(true)
    setCompareError('')
    try {
      const result = await api.compareCompanies(ids)
      setCompareResult(result)
    } catch (err: any) {
      setCompareError(err?.response?.data?.error || err.message || 'Failed to compare companies')
    } finally {
      setCompareLoading(false)
    }
  }

  const selectedCompanies = useMemo(() => {
    return Array.from(selectedIds)
      .map((id) => companies.find((c) => c.id === id))
      .filter((c): c is CompanyRow => !!c)
  }, [selectedIds, companies])

  const canCompare = selectedIds.size >= 2 && selectedIds.size <= 4

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Hero */}
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Intelligence</p>
          <h1 className="text-2xl font-bold text-ink-text mt-0.5">Compare Companies</h1>
          <p className="text-sm text-ink-muted mt-1">
            Select 2–4 companies to compare directions, domains, and fit.
          </p>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-xl border p-3 text-sm bg-red-50 text-red-700 border-red-100">
          {error}
        </div>
      )}

      {/* Selection */}
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h2 className="font-semibold text-ink-text">
            Select Companies{' '}
            <span className="text-ink-muted font-normal">
              ({selectedIds.size} selected)
            </span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={clearSelection}
              disabled={loading || selectedIds.size === 0}
              className="px-3 py-2 rounded-lg bg-surface-elevated border border-line text-sm text-ink-secondary disabled:opacity-50 hover:bg-surface-soft transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleCompare}
              disabled={!canCompare || compareLoading}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-brand-700 transition-colors"
            >
              {compareLoading ? 'Comparing...' : 'Compare'}
            </button>
          </div>
        </div>

        {loading && companies.length === 0 && (
          <p className="text-sm text-ink-muted">Loading companies...</p>
        )}

        {!loading && companies.length === 0 && (
          <p className="text-sm text-ink-muted">No companies available.</p>
        )}

        {companies.length > 0 && (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-1">
            {sortedCompanies.map((company) => {
              const isSelected = selectedIds.has(company.id)
              const disabled = !isSelected && selectedIds.size >= 4
              return (
                <label
                  key={company.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-brand-50 border-brand-200'
                      : disabled
                        ? 'bg-surface-soft border-line-subtle opacity-50 cursor-not-allowed'
                        : 'bg-surface-panel border-line hover:bg-surface-elevated'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(company.id)}
                    disabled={disabled}
                    className="mt-0.5 h-4 w-4 accent-brand-600"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink-text truncate">{company.name || '-'}</div>
                    <div className="text-xs text-ink-muted truncate">
                      {company.companyType || 'Unknown type'} · {company.country || 'Unknown country'}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        )}

        {/* Selected chips */}
        {selectedCompanies.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedCompanies.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-50 border border-brand-200 text-xs text-brand-700"
              >
                {c.name}
                <button
                  onClick={() => toggleSelect(c.id)}
                  className="ml-1 text-brand-600 hover:text-brand-800 font-bold"
                  aria-label={`Remove ${c.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Compare Error */}
      {compareError && (
        <div className="rounded-xl border p-3 text-sm bg-red-50 text-red-700 border-red-100">
          {compareError}
        </div>
      )}

      {/* Compare Results */}
      {compareResult && compareResult.companies.length > 0 && (
        <section className="space-y-5">
          {/* Basic Info Table */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm overflow-x-auto">
            <h2 className="font-semibold text-ink-text mb-4">Basic Information</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line-strong text-left text-xs text-ink-subtle uppercase tracking-wide">
                  <th className="py-2 pr-4 font-medium">Attribute</th>
                  {compareResult.companies.map((c) => (
                    <th key={c.id} className="py-2 pr-4 font-medium">{c.name || '-'}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">Type</td>
                  {compareResult.companies.map((c) => (
                    <td key={c.id} className="py-2 pr-4 text-ink-secondary">{c.companyType || '-'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">Country</td>
                  {compareResult.companies.map((c) => (
                    <td key={c.id} className="py-2 pr-4 text-ink-secondary">{c.country || '-'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">Founded Year</td>
                  {compareResult.companies.map((c) => (
                    <td key={c.id} className="py-2 pr-4 text-ink-secondary">{formatNumber(c.foundedYear)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">Employee Count</td>
                  {compareResult.companies.map((c) => (
                    <td key={c.id} className="py-2 pr-4 text-ink-secondary">{c.employeeCount || '-'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">Data Confidence</td>
                  {compareResult.companies.map((c) => (
                    <td key={c.id} className="py-2 pr-4 text-ink-secondary">{formatConfidence(c.dataConfidence)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Domains */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">IC Domains</h2>

            {compareResult.sharedDomains.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-ink-subtle mb-2 uppercase tracking-wide">Shared Domains</p>
                <div className="flex flex-wrap gap-2">
                  {compareResult.sharedDomains.map((d) => (
                    <Badge key={d} tone="green">
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs text-ink-subtle uppercase tracking-wide">Per-Company Domains</p>
              {compareResult.companies.map((c) => {
                return (
                  <div key={c.id} className="flex flex-wrap gap-2 items-start">
                    <span className="text-sm font-medium text-ink-text min-w-[120px]">{c.name}:</span>
                    <div className="flex flex-wrap gap-2">
                      {(c.domains || []).length === 0 && (
                        <span className="text-sm text-ink-muted">No domains listed</span>
                      )}
                      {(c.domains || []).map((d) => (
                        <Badge key={d} tone={compareResult.sharedDomains.includes(d) ? 'green' : 'default'}>
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Product Lines */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">Product Lines</h2>
            {compareResult.sharedProductLines.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-ink-subtle mb-2 uppercase tracking-wide">Shared Product Lines</p>
                <div className="flex flex-wrap gap-2">
                  {compareResult.sharedProductLines.map((p) => (
                    <Badge key={p} tone="blue">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-3">
              <p className="text-xs text-ink-subtle uppercase tracking-wide">Per-Company Product Lines</p>
              {compareResult.companies.map((c) => (
                <div key={c.id} className="flex flex-wrap gap-2 items-start">
                  <span className="text-sm font-medium text-ink-text min-w-[120px]">{c.name}:</span>
                  <div className="flex flex-wrap gap-2">
                    {(c.productLines || []).length === 0 && (
                      <span className="text-sm text-ink-muted">No product lines listed</span>
                    )}
                    {(c.productLines || []).map((p) => (
                      <Badge
                        key={p}
                        tone={compareResult.sharedProductLines.includes(p) ? 'blue' : 'default'}
                      >
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fit Matching */}
          {compareResult.fitMatching && Object.keys(compareResult.fitMatching).length > 0 && (
            <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-ink-text mb-4">Fit Matching</h2>
              <div className="space-y-3">
                {Object.entries(compareResult.fitMatching).map(([category, companyNames]) => (
                  <div key={category} className="flex flex-wrap gap-2 items-start">
                    <span className="text-sm font-medium text-ink-text min-w-[140px]">{category}</span>
                    <div className="flex flex-wrap gap-2">
                      {companyNames.map((name) => (
                        <Badge key={name} tone="amber">
                          Better fit for {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Empty State when no selection */}
      {selectedIds.size === 0 && !compareResult && (
        <div className="bg-surface-panel border border-line rounded-xl p-8 shadow-sm text-center">
          <p className="text-ink-muted text-sm">
            Select 2–4 companies above to begin a comparison.
          </p>
        </div>
      )}

      {/* Caveat */}
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <p className="text-xs text-ink-subtle leading-relaxed">
          This comparison is based on public metadata and may be incomplete. It is not an investment recommendation or a final employer ranking.
        </p>
      </section>
    </div>
  )
}
