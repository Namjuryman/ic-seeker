import { useState } from 'react'
import { api } from '../api'
import type { DataQualityReport } from '../types'

function Card({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-surface-panel border border-line rounded-xl p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-ink-subtle">{title}</div>
      <div className="text-2xl font-bold text-ink-text mt-1">{value}</div>
      {hint && <div className="text-xs text-ink-muted mt-1">{hint}</div>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-panel border border-line rounded-xl p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-text mb-3">{title}</h2>
      {children}
    </section>
  )
}

function SmallTable({ rows, columns }: { rows: any[]; columns: Array<{ key: string; label: string; render?: (row: any) => React.ReactNode }> }) {
  if (!rows.length) return <p className="text-sm text-ink-muted">No issues found.</p>
  return (
    <div className="overflow-auto rounded-lg border border-line max-h-[420px]">
      <table className="min-w-full text-xs">
        <thead className="bg-surface-soft text-ink-subtle sticky top-0">
          <tr>{columns.map((c) => <th key={c.key} className="px-3 py-2 text-left font-medium">{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line-subtle">
          {rows.map((row, idx) => (
            <tr key={idx} className="align-top">
              {columns.map((c) => <td key={c.key} className="px-3 py-2 text-ink-secondary max-w-md">{c.render ? c.render(row) : String(row[c.key] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DataQualityPage() {
  const [report, setReport] = useState<DataQualityReport | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanLimit, setScanLimit] = useState(12000)
  const [sampleLimit, setSampleLimit] = useState(50)

  const runAnalysis = async () => {
    setLoading(true)
    setError('')
    try {
      setReport(await api.dataQuality({ scanLimit, sampleLimit }))
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-text">Data Quality</h1>
        <p className="text-sm text-ink-muted mt-1">这个页面会扫描数据库，所以不再进入页面就自动运行。点击按钮后再检查重复论文、低置信 topic、机构别名和作者重名。</p>
      </div>

      <section className="bg-surface-panel border border-line rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-end gap-3">
        <div>
          <label className="text-xs text-ink-subtle block mb-1">Scan rows</label>
          <select value={scanLimit} onChange={(e) => setScanLimit(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-line bg-white text-sm">
            {[5000, 12000, 25000, 50000].map((n) => <option key={n} value={n}>{n.toLocaleString()}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-ink-subtle block mb-1">Samples per issue</label>
          <select value={sampleLimit} onChange={(e) => setSampleLimit(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-line bg-white text-sm">
            {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button onClick={runAnalysis} disabled={loading} className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm disabled:opacity-50">
          {loading ? 'Running analysis...' : 'Run analysis'}
        </button>
        {report && <span className="text-xs text-ink-muted">Latest: {report.generatedAt} · scanned {report.scannedRows ?? '-'} rows</span>}
      </section>

      {error && <div className="rounded-xl border p-3 text-sm bg-red-50 text-red-700 border-red-100">{error}</div>}
      {!report && !loading && !error && <div className="text-sm text-ink-muted bg-surface-panel border border-line rounded-xl p-4">尚未运行分析。先点 Run analysis，避免打开页面时卡住浏览器和本地数据库。</div>}
      {loading && <div className="text-sm text-ink-muted bg-surface-panel border border-line rounded-xl p-4">Analyzing database... large datasets may take a few seconds.</div>}

      {report && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card title="Papers" value={report.totalPapers} hint="current SQLite snapshot" />
            <Card title="Scanned rows" value={report.scannedRows ?? '-'} hint="bounded for speed" />
            <Card title="Duplicate DOI" value={report.duplicateDoi.length} hint="high-confidence duplicate groups" />
            <Card title="Missing affiliation" value={report.missingAffiliations} hint="affects geo/profiles" />
          </div>

          <Section title="Recommendations">
            <ul className="list-disc pl-5 text-sm text-ink-secondary space-y-1">
              {report.recommendations.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Section>

          <Section title="Duplicate DOI candidates">
            <SmallTable rows={report.duplicateDoi} columns={[{ key: 'key', label: 'DOI' }, { key: 'count', label: 'Count' }, { key: 'samples', label: 'Samples', render: (r) => <span className="break-words">{r.samples}</span> }]} />
          </Section>

          <Section title="Duplicate title + year candidates">
            <SmallTable rows={report.duplicateTitleYear} columns={[{ key: 'key', label: 'Title/year key' }, { key: 'count', label: 'Count' }, { key: 'samples', label: 'Samples', render: (r) => <span className="break-words">{r.samples}</span> }]} />
          </Section>

          <Section title="Unknown or weak venue mapping">
            <SmallTable rows={report.unknownVenues} columns={[{ key: 'venue', label: 'Venue' }, { key: 'rank', label: 'Rank' }, { key: 'count', label: 'Count' }, { key: 'avgScore', label: 'Avg score' }]} />
          </Section>

          <Section title="Low-confidence topic groups">
            <SmallTable rows={report.lowConfidenceTopics} columns={[{ key: 'field', label: 'Field' }, { key: 'count', label: 'Count' }, { key: 'avgHits', label: 'Avg hits' }, { key: 'samples', label: 'Samples', render: (r) => <span className="break-words">{r.samples}</span> }]} />
          </Section>

          <Section title="Institution alias candidates">
            <SmallTable rows={report.institutionVariants} columns={[{ key: 'key', label: 'Normalized key' }, { key: 'count', label: 'Count' }, { key: 'variants', label: 'Variants', render: (r) => <div className="space-y-1">{r.variants.map((v: string) => <div key={v}>{v}</div>)}</div> }]} />
          </Section>

          <Section title="Ambiguous author-name candidates">
            <SmallTable rows={report.ambiguousAuthors} columns={[{ key: 'key', label: 'Name key' }, { key: 'count', label: 'Count' }, { key: 'variants', label: 'Variants', render: (r) => <div>{r.variants.join(' / ')}</div> }, { key: 'venues', label: 'Venues', render: (r) => <div>{r.venues.join(', ')}</div> }]} />
          </Section>
        </>
      )}
    </div>
  )
}
