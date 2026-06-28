import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { LearningContentOverview, LearningContentRow } from '../types'

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function kindLabel(kind: string) {
  const labels: Record<string, string> = {
    roadmap: 'Route maps',
    lesson: 'Daily lessons',
    route_family: 'Route families',
    foundation_group: 'Common base',
  }
  return labels[kind] || kind
}

function statusClass(status: string) {
  if (status === 'published') return 'bg-green-50 text-green-700 border-green-100'
  if (status === 'draft') return 'bg-amber-50 text-amber-700 border-amber-100'
  return 'bg-surface-elevated text-ink-muted border-line-subtle'
}

function RowList({ rows }: { rows: LearningContentRow[] }) {
  if (!rows.length) return <p className="text-sm text-ink-muted">No items.</p>
  return (
    <div className="space-y-2 max-h-[560px] overflow-auto">
      {rows.map((row) => (
        <div key={`${row.itemKind}:${row.itemId}`} className="grid lg:grid-cols-[140px_1fr_120px_120px_170px] gap-2 items-center rounded-lg border border-line p-3 text-sm">
          <span className="text-xs font-semibold text-brand-700">{kindLabel(row.itemKind)}</span>
          <div>
            <div className="font-semibold text-ink-text">{row.title || row.itemId}</div>
            <div className="text-xs text-ink-muted font-mono">{row.itemId}</div>
          </div>
          <span className={`w-fit rounded-full border px-2 py-0.5 text-xs ${statusClass(row.status)}`}>{row.status}</span>
          <span className="text-ink-muted">{formatBytes(row.bytes)}</span>
          <span className="text-xs text-ink-muted">{formatDate(row.updatedAt)}</span>
        </div>
      ))}
    </div>
  )
}

export default function LearningContentAdminPage() {
  const [data, setData] = useState<LearningContentOverview | null>(null)
  const [kind, setKind] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const rows = useMemo(() => {
    const all = data?.rows || []
    const q = query.trim().toLowerCase()
    return all.filter((row) => {
      const kindOk = kind === 'all' || row.itemKind === kind
      const qOk = !q || row.title.toLowerCase().includes(q) || row.itemId.toLowerCase().includes(q)
      return kindOk && qOk
    })
  }, [data, kind, query])

  async function load() {
    setLoading(true)
    setError('')
    try {
      setData(await api.learningContentAdmin())
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to load learning content.')
    } finally {
      setLoading(false)
    }
  }

  async function syncSeed() {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const result = await api.syncLearningSeed()
      setMessage(`Synced ${result.seedItems} seed items. Changed rows: ${result.changedRows}.`)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to sync learning seed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const summary = data?.summary
  const hasProblems = Boolean(data?.validation.errors.length || data?.outOfSyncRows.length || data?.staleRows.length)

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div className="flex justify-between gap-4 items-start flex-wrap">
          <div>
            <p className="profile-kicker">Learning CMS</p>
            <h1 className="text-2xl font-bold text-ink-text">Learning Content Control</h1>
            <p className="text-sm text-ink-muted mt-1">
              Database-backed registry for route maps, daily lessons, route families, and common foundations.
            </p>
            <p className="text-sm text-ink-subtle mt-1">
              Public learning pages read published database rows first, with the TypeScript seed catalog as a fallback.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="px-3 py-2 rounded-lg bg-surface-elevated border border-line text-sm disabled:opacity-50">
              Reload
            </button>
            <button onClick={syncSeed} disabled={loading} className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm disabled:opacity-50">
              Sync seed to DB
            </button>
          </div>
        </div>
      </section>

      {(error || message) && (
        <div className={`rounded-xl border p-3 text-sm ${error ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
          {error || message}
        </div>
      )}

      <section className="grid md:grid-cols-4 gap-4">
        <div className="bg-surface-panel border border-line rounded-xl p-4">
          <div className="text-xs text-ink-subtle">Database items</div>
          <div className="text-3xl font-bold mt-1">{summary?.dbItems ?? '-'}</div>
          <div className="text-xs text-ink-muted mt-1">{summary?.published ?? 0} published</div>
        </div>
        <div className="bg-surface-panel border border-line rounded-xl p-4">
          <div className="text-xs text-ink-subtle">Seed items</div>
          <div className="text-3xl font-bold mt-1">{summary?.seedItems ?? '-'}</div>
          <div className="text-xs text-ink-muted mt-1">{data?.sourceVersion || '-'}</div>
        </div>
        <div className="bg-surface-panel border border-line rounded-xl p-4">
          <div className="text-xs text-ink-subtle">Routes / lessons</div>
          <div className="text-3xl font-bold mt-1">{summary ? `${summary.roadmaps}/${summary.lessons}` : '-'}</div>
          <div className="text-xs text-ink-muted mt-1">active published catalog</div>
        </div>
        <div className={`border rounded-xl p-4 ${hasProblems ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
          <div className="text-xs text-ink-subtle">Content health</div>
          <div className={`text-3xl font-bold mt-1 ${hasProblems ? 'text-amber-700' : 'text-green-700'}`}>
            {hasProblems ? 'Review' : 'OK'}
          </div>
          <div className="text-xs text-ink-muted mt-1">
            {data?.validation.errors.length || 0} errors · {data?.validation.warnings.length || 0} warnings
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <article className="bg-surface-panel border border-line rounded-xl p-4">
          <h2 className="font-semibold text-ink-text">By kind</h2>
          <div className="mt-3 space-y-2">
            {Object.entries(data?.byKind || {}).map(([key, count]) => (
              <div key={key} className="flex justify-between rounded-lg bg-surface-elevated border border-line-subtle px-3 py-2 text-sm">
                <span>{kindLabel(key)}</span>
                <strong>{count}</strong>
              </div>
            ))}
            {!data && <p className="text-sm text-ink-muted">Loading...</p>}
          </div>
        </article>
        <article className="bg-surface-panel border border-line rounded-xl p-4">
          <h2 className="font-semibold text-ink-text">Validation</h2>
          <div className="mt-3 space-y-2 text-sm">
            {(data?.validation.errors || []).map((item) => <p key={item} className="text-red-700">{item}</p>)}
            {(data?.validation.warnings || []).slice(0, 8).map((item) => <p key={item} className="text-amber-700">{item}</p>)}
            {data && !data.validation.errors.length && !data.validation.warnings.length && <p className="text-green-700">No validation issues.</p>}
          </div>
        </article>
        <article className="bg-surface-panel border border-line rounded-xl p-4">
          <h2 className="font-semibold text-ink-text">Sync state</h2>
          <div className="mt-3 space-y-2 text-sm">
            <p><strong>{data?.outOfSyncRows.length || 0}</strong> seed rows differ from the current TypeScript catalog.</p>
            <p><strong>{data?.staleRows.length || 0}</strong> old seed rows are no longer in the catalog.</p>
            <p><strong>{formatBytes(summary?.bytes || 0)}</strong> stored payload size.</p>
            <p className="text-ink-muted">Next step: add structured editing and publish workflow on top of this registry.</p>
          </div>
        </article>
      </section>

      <section className="bg-surface-panel border border-line rounded-xl p-4 shadow-sm">
        <div className="flex justify-between gap-3 items-center mb-3 flex-wrap">
          <div>
            <h2 className="font-semibold text-ink-text">Content registry</h2>
            <p className="text-sm text-ink-muted">{rows.length} visible item(s)</p>
          </div>
          <div className="flex gap-2">
            <select value={kind} onChange={(event) => setKind(event.target.value)} className="px-3 py-2 rounded-lg border border-line text-sm bg-white">
              <option value="all">All kinds</option>
              <option value="route_family">Route families</option>
              <option value="foundation_group">Common base</option>
              <option value="roadmap">Route maps</option>
              <option value="lesson">Daily lessons</option>
            </select>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="px-3 py-2 rounded-lg border border-line text-sm"
              placeholder="Filter title or id"
            />
          </div>
        </div>
        <RowList rows={rows} />
      </section>
    </div>
  )
}
