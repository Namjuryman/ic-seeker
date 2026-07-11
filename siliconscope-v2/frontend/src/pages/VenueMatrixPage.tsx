import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { VenueMatrixItem } from '../types'
import { friendlyError } from '../utils/errorMessages'
import { searchPath } from '../utils/routes'

const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019]
const rankOrder = ['All', 'SSS', 'SS+', 'S+', 'S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'User', '-']

function rankLabel(rank: string) {
  if (rank === 'All') return '全部等级'
  if (rank === 'User') return '自定义'
  if (rank === '-') return '未标注'
  return rank
}

function rankTone(rank: string) {
  if (['SSS', 'SS+', 'S+'].includes(rank)) return 'bg-indigo-50 text-indigo-700 border-indigo-100'
  if (rank === 'S') return 'bg-red-50 text-red-700 border-red-100'
  if (rank.startsWith('A')) return 'bg-emerald-50 text-emerald-700 border-emerald-100'
  if (rank.startsWith('B')) return 'bg-amber-50 text-amber-700 border-amber-100'
  return 'bg-surface-elevated text-ink-secondary border-line-subtle'
}

export default function VenueMatrixPage() {
  const [rows, setRows] = useState<VenueMatrixItem[]>([])
  const [query, setQuery] = useState('')
  const [rankFilter, setRankFilter] = useState('All')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    api.venueMatrix().then(setRows).catch((err) => {
      setError(friendlyError(err, '加载会议/期刊矩阵失败'))
    }).finally(() => setLoading(false))
  }, [])

  const ranks = useMemo(() => {
    const seen = new Set(rows.map((row) => row.rank || '-'))
    return rankOrder.filter((rank) => rank === 'All' || seen.has(rank)).concat(
      [...seen].filter((rank) => !rankOrder.includes(rank)).sort(),
    )
  }, [rows])

  const rankCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of rows) counts.set(row.rank || '-', (counts.get(row.rank || '-') || 0) + 1)
    return counts
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (rankFilter !== 'All' && (row.rank || '-') !== rankFilter) return false
      if (!q) return true
      return [row.name, row.rank, row.primaryDomain, ...(row.allDomains || [])]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [query, rankFilter, rows])

  const visibleRows = filtered.slice(0, 250)

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <section className="hero-panel venue-hero">
        <div>
          <p className="profile-kicker">覆盖情报</p>
          <h1>会议/期刊矩阵</h1>
          <p>按会议/期刊、等级、年份和主方向查看数据库覆盖情况。等级和覆盖数是检索口径，不是期刊评价或投稿建议。</p>
        </div>
        <div className="hero-metrics">
          <div><span>会议/期刊</span><strong>{rows.length}</strong></div>
          <div><span>当前显示</span><strong>{filtered.length}</strong></div>
          <div><span>等级数</span><strong>{Math.max(0, ranks.length - 1)}</strong></div>
        </div>
      </section>

      {loading && <div className="ss-skeleton-page"><p>正在加载会议/期刊矩阵...</p></div>}
      {error && <div className="ss-empty-state">{error}</div>}

      {!loading && !error && (
      <>
      <section className="bg-surface-panel border border-line rounded-xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,1fr)_auto] gap-3 items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="过滤会议/期刊、等级或方向"
            className="px-3 py-2 rounded-lg border border-line bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <select
            value={rankFilter}
            onChange={(event) => setRankFilter(event.target.value)}
            className="px-3 py-2 rounded-lg border border-line bg-white text-sm min-w-36"
          >
            {ranks.map((rank) => (
              <option key={rank} value={rank}>{rank === 'All' ? '全部等级' : `等级 ${rankLabel(rank)}`}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {ranks.filter((rank) => rank !== 'All').map((rank) => (
            <button
              key={rank}
              onClick={() => setRankFilter(rankFilter === rank ? 'All' : rank)}
              className={`px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors ${rankTone(rank)} ${rankFilter === rank ? 'ring-2 ring-brand-500/20' : ''}`}
            >
              {rankLabel(rank)} · {rankCounts.get(rank) || 0}
            </button>
          ))}
        </div>
      </section>

      <div className="text-xs text-ink-muted px-1">
        正在显示 {visibleRows.length} / {filtered.length} 条匹配结果。点击会议/期刊、等级或年份数字可以跳回论文搜索。
      </div>

      <div className="bg-surface-panel border border-line rounded-xl overflow-auto shadow-sm max-h-[72vh]">
        <table className="w-full text-xs min-w-[920px]">
          <thead className="bg-surface-elevated text-ink-secondary sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">会议/期刊</th>
              <th className="text-left px-3 py-2 font-semibold">等级</th>
              <th className="text-right px-3 py-2 font-semibold">总数</th>
              <th className="text-left px-3 py-2 font-semibold">主要方向</th>
              {years.map((year) => <th key={year} className="text-right px-2 py-2 font-semibold">{year}</th>)}
              <th className="text-right px-2 py-2 font-semibold">更早</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-subtle">
            {visibleRows.map((row) => (
              <tr key={row.name} className="hover:bg-surface-elevated">
                <td className="px-3 py-2 font-medium">
                  <Link className="text-brand-600 hover:text-brand-700" to={searchPath({ venue: row.name })}>{row.name}</Link>
                </td>
                <td className="px-3 py-2">
                  <Link to={searchPath({ rank: row.rank })} className={`px-2 py-0.5 rounded border font-semibold ${rankTone(row.rank || '-')}`}>{rankLabel(row.rank || '-')}</Link>
                </td>
                <td className="px-3 py-2 text-right">
                  <Link className="text-brand-600 hover:text-brand-700" to={searchPath({ venue: row.name })}>{row.total}</Link>
                </td>
                <td className="px-3 py-2 text-ink-secondary">
                  <Link className="text-brand-600 hover:text-brand-700" to={searchPath({ venue: row.name, field: row.primaryDomain })}>{row.primaryDomain}</Link>
                  <div className="text-[10px] text-ink-subtle">{row.allDomains?.join(' · ')}</div>
                </td>
                {years.map((year) => (
                  <td key={year} className="px-2 py-2 text-right text-ink-secondary">
                    {(row.yearCounts?.[year] || 0) > 0 ? (
                      <Link className="text-brand-600 hover:text-brand-700" to={searchPath({ venue: row.name, yearFrom: year, yearTo: year })}>{row.yearCounts?.[year] || 0}</Link>
                    ) : 0}
                  </td>
                ))}
                <td className="px-2 py-2 text-right text-ink-secondary">
                  {(row.earlier || 0) > 0 ? <Link className="text-brand-600 hover:text-brand-700" to={searchPath({ venue: row.name, yearTo: 2018 })}>{row.earlier}</Link> : 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  )
}
