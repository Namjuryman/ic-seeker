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
          <tr>{columns.map((column) => <th key={column.key} className="px-3 py-2 text-left font-medium">{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line-subtle">
          {rows.map((row, idx) => (
            <tr key={idx} className="align-top">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-2 text-ink-secondary max-w-md">
                  {column.render ? column.render(row) : String(row[column.key] ?? '')}
                </td>
              ))}
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
        <p className="text-sm text-ink-muted mt-1">
          This page scans the local paper database on demand. Use it to inspect duplicates, weak topics,
          venue/publication-title mismatches, affiliation gaps, institution aliases, author ambiguity,
          and AI-enrichment review samples.
        </p>
      </div>

      <section className="bg-surface-panel border border-line rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-end gap-3">
        <div>
          <label className="text-xs text-ink-subtle block mb-1">Scan rows</label>
          <select value={scanLimit} onChange={(event) => setScanLimit(Number(event.target.value))} className="px-3 py-2 rounded-lg border border-line bg-white text-sm">
            {[5000, 12000, 25000, 50000].map((value) => <option key={value} value={value}>{value.toLocaleString()}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-ink-subtle block mb-1">Samples per issue</label>
          <select value={sampleLimit} onChange={(event) => setSampleLimit(Number(event.target.value))} className="px-3 py-2 rounded-lg border border-line bg-white text-sm">
            {[25, 50, 100, 200].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <button onClick={runAnalysis} disabled={loading} className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm disabled:opacity-50">
          {loading ? 'Running analysis...' : 'Run analysis'}
        </button>
        {report && <span className="text-xs text-ink-muted">Latest: {report.generatedAt} · scanned {report.scannedRows ?? '-'} rows</span>}
      </section>

      {error && <div className="rounded-xl border p-3 text-sm bg-red-50 text-red-700 border-red-100">{error}</div>}
      {!report && !loading && !error && (
        <div className="text-sm text-ink-muted bg-surface-panel border border-line rounded-xl p-4">
          No report has been generated yet. Click Run analysis when you want a bounded database scan.
        </div>
      )}
      {loading && <div className="text-sm text-ink-muted bg-surface-panel border border-line rounded-xl p-4">Analyzing database... large datasets may take a few seconds.</div>}

      {report && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Card title="Papers" value={report.totalPapers} hint="current SQLite snapshot" />
            <Card title="Scanned rows" value={report.scannedRows ?? '-'} hint="bounded for speed" />
            <Card title="Duplicate DOI" value={report.duplicateDoi.length} hint="duplicate groups" />
            <Card title="Missing affiliation" value={report.missingAffiliations} hint="affects geo/profiles" />
            <Card title="Venue mismatch" value={report.venuePublicationMismatches?.length ?? 0} hint="rank/source risk" />
            <Card title="AI review" value={report.aiReviewQueue?.length ?? 0} hint="low-confidence annotations" />
          </div>

          <Section title="Recommendations">
            <ul className="list-disc pl-5 text-sm text-ink-secondary space-y-1">
              {report.recommendations.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Section>

          <Section title="Duplicate DOI candidates">
            <SmallTable rows={report.duplicateDoi} columns={[{ key: 'key', label: 'DOI' }, { key: 'count', label: 'Count' }, { key: 'samples', label: 'Samples', render: (row) => <span className="break-words">{row.samples}</span> }]} />
          </Section>

          <Section title="Duplicate title + year candidates">
            <SmallTable rows={report.duplicateTitleYear} columns={[{ key: 'key', label: 'Title/year key' }, { key: 'count', label: 'Count' }, { key: 'samples', label: 'Samples', render: (row) => <span className="break-words">{row.samples}</span> }]} />
          </Section>

          <Section title="Unknown or weak venue mapping">
            <SmallTable rows={report.unknownVenues} columns={[{ key: 'venue', label: 'Venue' }, { key: 'rank', label: 'Rank' }, { key: 'count', label: 'Count' }, { key: 'avgScore', label: 'Avg score' }]} />
          </Section>

          <Section title="Low-confidence topic groups">
            <SmallTable rows={report.lowConfidenceTopics} columns={[{ key: 'field', label: 'Field' }, { key: 'count', label: 'Count' }, { key: 'avgHits', label: 'Avg hits' }, { key: 'samples', label: 'Samples', render: (row) => <span className="break-words">{row.samples}</span> }]} />
          </Section>

          <Section title="Venue / publication-title mismatches">
            <SmallTable
              rows={report.venuePublicationMismatches || []}
              columns={[
                { key: 'id', label: 'Paper' },
                { key: 'venue', label: 'Venue' },
                { key: 'publicationTitle', label: 'Publication title' },
                { key: 'domain', label: 'Domain' },
                { key: 'title', label: 'Title', render: (row) => <span className="break-words">{row.title}</span> },
              ]}
            />
          </Section>

          <Section title="AI enrichment review queue">
            <SmallTable
              rows={report.aiReviewQueue || []}
              columns={[
                { key: 'paperId', label: 'Paper' },
                { key: 'venue', label: 'Venue' },
                { key: 'confidence', label: 'Conf.', render: (row) => `${Math.round(Number(row.confidence || 0) * 100)}%` },
                { key: 'primaryDomain', label: 'Domain' },
                { key: 'title', label: 'Title', render: (row) => <span className="break-words">{row.title}</span> },
                { key: 'summary', label: 'Summary', render: (row) => <span className="break-words">{row.summary || '-'}</span> },
              ]}
            />
          </Section>

          <Section title="Institution alias candidates">
            <SmallTable rows={report.institutionVariants} columns={[{ key: 'key', label: 'Normalized key' }, { key: 'count', label: 'Count' }, { key: 'variants', label: 'Variants', render: (row) => <div className="space-y-1">{row.variants.map((value: string) => <div key={value}>{value}</div>)}</div> }]} />
          </Section>

          <Section title="Ambiguous author-name candidates">
            <SmallTable rows={report.ambiguousAuthors} columns={[{ key: 'key', label: 'Name key' }, { key: 'count', label: 'Count' }, { key: 'variants', label: 'Variants', render: (row) => <div>{row.variants.join(' / ')}</div> }, { key: 'venues', label: 'Venues', render: (row) => <div>{row.venues.join(', ')}</div> }]} />
          </Section>
        </>
      )}
    </div>
  )
}
