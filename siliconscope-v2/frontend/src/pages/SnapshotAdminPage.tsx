import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { SnapshotRefreshResult, SnapshotRow } from '../types'

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function getFreshness(updatedAt: string | undefined) {
  if (!updatedAt) return 'Unknown'
  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  const now = new Date()
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  if (diffHours <= 24) return 'Fresh'
  return 'Stale'
}

function FreshnessBadge({ updatedAt }: { updatedAt: string | undefined }) {
  const status = getFreshness(updatedAt)
  const cls =
    status === 'Fresh'
      ? 'bg-green-50 text-green-700 border-green-100'
      : status === 'Stale'
        ? 'bg-amber-50 text-amber-700 border-amber-100'
        : 'bg-surface-elevated text-ink-muted border-line-subtle'
  return <span className={`px-1.5 py-0.5 rounded border text-xs ${cls}`}>{status}</span>
}

export default function SnapshotAdminPage() {
  const [rows, setRows] = useState<SnapshotRow[]>([])
  const [query, setQuery] = useState('')
  const [keyInput, setKeyInput] = useState('all')
  const [prefixInput, setPrefixInput] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SnapshotRefreshResult[]>([])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => row.key.toLowerCase().includes(q))
  }, [query, rows])

  async function load() {
    setLoading(true)
    setError('')
    try {
      setRows(await api.snapshots())
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to load snapshots')
    } finally {
      setLoading(false)
    }
  }

  async function refresh() {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const keys = keyInput.trim() ? keyInput.split(',').map((key) => key.trim()).filter(Boolean) : ['all']
      const next = await api.refreshSnapshots({ keys })
      setResults(next)
      setMessage(`Refresh finished: ${next.filter((item) => item.ok).length}/${next.length} snapshots ok`)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to refresh snapshots')
    } finally {
      setLoading(false)
    }
  }

  async function clear(mode: 'all' | 'key' | 'prefix', value = '') {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const payload = mode === 'key' ? { key: value } : mode === 'prefix' ? { prefix: value } : {}
      const result = await api.clearSnapshots(payload)
      setMessage(`Cleared ${result.deleted} snapshot(s) by ${result.mode}`)
      setResults([])
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to clear snapshots')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div className="flex justify-between gap-4 items-start flex-wrap">
          <div>
            <p className="profile-kicker">Admin cache</p>
            <h1 className="text-2xl font-bold text-ink-text">Snapshot Admin</h1>
            <p className="text-sm text-ink-muted mt-1">
              Manage computed_snapshots used by heavy profile, geo, venue, topic, and mentor pages.
            </p>
            <p className="text-sm text-ink-subtle mt-1">
              Snapshots are precomputed intelligence caches. Refresh them after alias edits, imports, or metadata corrections.
            </p>
          </div>
          <button onClick={load} disabled={loading} className="px-3 py-2 rounded-lg bg-surface-elevated border border-line text-sm disabled:opacity-50">
            Reload
          </button>
        </div>
      </section>

      {(error || message) && (
        <div className={`rounded-xl border p-3 text-sm ${error ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
          {error || message}
        </div>
      )}

      <section className="grid md:grid-cols-3 gap-4">
        <div className="bg-surface-panel border border-line rounded-xl p-4">
          <div className="text-xs text-ink-subtle">Snapshot count</div>
          <div className="text-3xl font-bold mt-1">{rows.length}</div>
        </div>
        <div className="bg-surface-panel border border-line rounded-xl p-4">
          <div className="text-xs text-ink-subtle">Total JSON size</div>
          <div className="text-3xl font-bold mt-1">{formatBytes(rows.reduce((sum, row) => sum + Number(row.bytes || 0), 0))}</div>
        </div>
        <div className="bg-surface-panel border border-line rounded-xl p-4">
          <div className="text-xs text-ink-subtle">Visible rows</div>
          <div className="text-3xl font-bold mt-1">{filtered.length}</div>
        </div>
      </section>

      <section className="bg-surface-panel border border-line rounded-xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold text-ink-text">Refresh / clear</h2>
        <div className="grid md:grid-cols-[1fr_auto_auto] gap-2">
          <input
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
            className="px-3 py-2 rounded-lg border border-line text-sm"
            placeholder="all or comma-separated keys"
          />
          <button onClick={refresh} disabled={loading} className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm disabled:opacity-50">
            Refresh
          </button>
          <button onClick={() => clear('all')} disabled={loading} className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm disabled:opacity-50">
            Clear all
          </button>
        </div>
        <div className="grid md:grid-cols-[1fr_auto] gap-2">
          <input
            value={prefixInput}
            onChange={(event) => setPrefixInput(event.target.value)}
            className="px-3 py-2 rounded-lg border border-line text-sm"
            placeholder="Clear by prefix, e.g. profile:institution:"
          />
          <button onClick={() => clear('prefix', prefixInput)} disabled={loading || !prefixInput.trim()} className="px-3 py-2 rounded-lg bg-surface-elevated border border-line text-sm disabled:opacity-50">
            Clear prefix
          </button>
        </div>
      </section>

      {!!results.length && (
        <section className="bg-surface-panel border border-line rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-ink-text mb-3">Last refresh result</h2>
          <div className="space-y-2 max-h-72 overflow-auto text-sm">
            {results.map((result) => (
              <div key={result.key} className="grid md:grid-cols-[1fr_80px_100px] gap-2 border-b border-line-subtle pb-2">
                <span className="font-mono break-all">{result.key}</span>
                <span className={result.ok ? 'text-green-700' : 'text-red-700'}>{result.ok ? 'ok' : 'failed'}</span>
                <span>{result.ms} ms</span>
                {result.error && <span className="md:col-span-3 text-red-700">{result.error}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-surface-panel border border-line rounded-xl p-4 shadow-sm">
        <div className="flex justify-between gap-3 items-center mb-3">
          <h2 className="font-semibold text-ink-text">Snapshots</h2>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="px-3 py-2 rounded-lg border border-line text-sm"
            placeholder="Filter key"
          />
        </div>
        <div className="space-y-2 max-h-[620px] overflow-auto">
          {!filtered.length && <p className="text-sm text-ink-muted">No snapshots found.</p>}
          {filtered.map((row) => (
            <div key={row.key} className="grid md:grid-cols-[1fr_90px_170px_110px_auto] gap-2 items-center border border-line rounded-lg p-3 text-sm">
              <span className="font-mono break-all">{row.key}</span>
              <FreshnessBadge updatedAt={row.updatedAt || row.updated_at} />
              <span className="text-ink-muted">{row.updatedAt || row.updated_at || '-'}</span>
              <span>{formatBytes(Number(row.bytes || 0))}</span>
              <button onClick={() => clear('key', row.key)} disabled={loading} className="px-2 py-1 rounded-lg bg-surface-elevated border border-line text-xs disabled:opacity-50">
                Clear
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
