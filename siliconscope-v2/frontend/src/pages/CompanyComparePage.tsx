import { useEffect, useState, useMemo } from 'react'
import { api } from '../api'
import type { CompanyRow, CompanyCompareResult } from '../types'
import { friendlyError } from '../utils/errorMessages'

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
      setError(friendlyError(err, '加载公司失败'))
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
      setCompareError('请选择 2–4 家公司进行对比。')
      return
    }
    setCompareLoading(true)
    setCompareError('')
    try {
      const result = await api.compareCompanies(ids)
      setCompareResult(result)
    } catch (err: any) {
      setCompareError(friendlyError(err, '公司对比失败'))
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
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">公司对比</p>
          <h1 className="text-2xl font-bold text-ink-text mt-0.5">半导体公司横向对比</h1>
          <p className="text-sm text-ink-muted mt-1">
            选择 2–4 家公司，对比产业链类型、技术方向、产品线和学习/岗位匹配线索。结果不是投资建议，也不是雇主排名。
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-secondary">
            <span className="px-2 py-0.5 rounded border border-line bg-surface-elevated">公开来源</span>
            <span className="px-2 py-0.5 rounded border border-line bg-surface-elevated">字段完整度</span>
            <span className="px-2 py-0.5 rounded border border-line bg-surface-elevated">非投资/求职结论</span>
          </div>
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
            选择公司{' '}
            <span className="text-ink-muted font-normal">
              (已选 {selectedIds.size})
            </span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={clearSelection}
              disabled={loading || selectedIds.size === 0}
              className="px-3 py-2 rounded-lg bg-surface-elevated border border-line text-sm text-ink-secondary disabled:opacity-50 hover:bg-surface-soft transition-colors"
            >
              清空
            </button>
            <button
              onClick={handleCompare}
              disabled={!canCompare || compareLoading}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-brand-700 transition-colors"
            >
              {compareLoading ? '对比中...' : '开始对比'}
            </button>
          </div>
        </div>

        {loading && companies.length === 0 && (
          <p className="text-sm text-ink-muted">正在加载公司...</p>
        )}

        {!loading && companies.length === 0 && (
          <p className="text-sm text-ink-muted">暂无可选公司。</p>
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
                      {company.companyType || '未知类型'} · {company.country || '未知国家/地区'}
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
                  aria-label={`移除 ${c.name}`}
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
            <h2 className="font-semibold text-ink-text mb-4">基础信息</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line-strong text-left text-xs text-ink-subtle uppercase tracking-wide">
                  <th className="py-2 pr-4 font-medium">指标</th>
                  {compareResult.companies.map((c) => (
                    <th key={c.id} className="py-2 pr-4 font-medium">{c.name || '-'}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">类型</td>
                  {compareResult.companies.map((c) => (
                    <td key={c.id} className="py-2 pr-4 text-ink-secondary">{c.companyType || '-'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">国家/地区</td>
                  {compareResult.companies.map((c) => (
                    <td key={c.id} className="py-2 pr-4 text-ink-secondary">{c.country || '-'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">成立年份</td>
                  {compareResult.companies.map((c) => (
                    <td key={c.id} className="py-2 pr-4 text-ink-secondary">{formatNumber(c.foundedYear)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">员工规模</td>
                  {compareResult.companies.map((c) => (
                    <td key={c.id} className="py-2 pr-4 text-ink-secondary">{c.employeeCount || '-'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-ink-subtle">来源可信度</td>
                  {compareResult.companies.map((c) => (
                    <td key={c.id} className="py-2 pr-4 text-ink-secondary">{formatConfidence(c.dataConfidence)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Domains */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-ink-text mb-4">IC 技术方向</h2>

            {compareResult.sharedDomains.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-ink-subtle mb-2 uppercase tracking-wide">共同方向</p>
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
              <p className="text-xs text-ink-subtle uppercase tracking-wide">各公司方向</p>
              {compareResult.companies.map((c) => {
                return (
                  <div key={c.id} className="flex flex-wrap gap-2 items-start">
                    <span className="text-sm font-medium text-ink-text min-w-[120px]">{c.name}:</span>
                    <div className="flex flex-wrap gap-2">
                      {(c.domains || []).length === 0 && (
                        <span className="text-sm text-ink-muted">暂无方向数据</span>
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
            <h2 className="font-semibold text-ink-text mb-4">产品线</h2>
            {compareResult.sharedProductLines.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-ink-subtle mb-2 uppercase tracking-wide">共同产品线</p>
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
              <p className="text-xs text-ink-subtle uppercase tracking-wide">各公司产品线</p>
              {compareResult.companies.map((c) => (
                <div key={c.id} className="flex flex-wrap gap-2 items-start">
                  <span className="text-sm font-medium text-ink-text min-w-[120px]">{c.name}:</span>
                  <div className="flex flex-wrap gap-2">
                    {(c.productLines || []).length === 0 && (
                      <span className="text-sm text-ink-muted">暂无产品线数据</span>
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
              <h2 className="font-semibold text-ink-text mb-4">方向匹配</h2>
              <div className="space-y-3">
                {Object.entries(compareResult.fitMatching).map(([category, companyNames]) => (
                  <div key={category} className="flex flex-wrap gap-2 items-start">
                    <span className="text-sm font-medium text-ink-text min-w-[140px]">{category}</span>
                    <div className="flex flex-wrap gap-2">
                      {companyNames.map((name) => (
                        <Badge key={name} tone="amber">
                          更匹配 {name}
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
            选择 2–4 家公司后开始对比。
          </p>
        </div>
      )}

      {/* Caveat */}
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <p className="text-xs text-ink-subtle leading-relaxed">
          公司对比基于公开元数据和本地整理字段，可能不完整或滞后。来源可信度表示字段完整度和可追溯性，不代表公司综合表现。它用于产业研究和学习方向匹配，不构成投资建议、薪资判断或最终雇主排名。
        </p>
      </section>
    </div>
  )
}
