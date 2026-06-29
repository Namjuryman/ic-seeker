import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { PaperAiAnnotationRow, PaperAiRunResult, PaperAiTopicHit } from '../types'

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{typeof value === 'number' ? value.toLocaleString() : value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  )
}

function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function TopicChips({ topics }: { topics: PaperAiTopicHit[] }) {
  if (!topics.length) return <span className="learning-muted">No topic edge</span>
  return (
    <div className="company-tags">
      {topics.slice(0, 4).map((topic) => (
        <em key={`${topic.topicId}-${topic.confidence}`}>
          {topic.label} {topic.confidence}
        </em>
      ))}
    </div>
  )
}

function AnnotationRow({ row }: { row: PaperAiAnnotationRow }) {
  const topics = parseJson<PaperAiTopicHit[]>(row.topics_json, [])
  const needsReview = row.needs_review === true || row.needs_review === 1
  return (
    <article className={`admin-op ${needsReview ? 'admin-op-warn' : 'admin-op-ready'}`}>
      <div className="admin-op-head">
        <span>{row.venue || row.domain || 'paper'}</span>
        <strong>{Math.round(Number(row.confidence || 0) * 100)}%</strong>
      </div>
      <h3>{row.title}</h3>
      <p>{row.summary_zh || row.summary_en || 'No generated summary yet.'}</p>
      <TopicChips topics={topics} />
      <div className="admin-mini-list mt-3">
        <li><span>Paper</span><small>#{row.paper_id || row.paperId}</small></li>
        <li><span>Year</span><small>{row.year || '-'}</small></li>
        <li><span>Status</span><small>{needsReview ? 'review' : row.status}</small></li>
      </div>
    </article>
  )
}

function RunResultPanel({ result }: { result: PaperAiRunResult }) {
  return (
    <section className={`rounded-xl border p-4 text-sm ${result.ok ? 'border-green-100 bg-green-50 text-green-800' : 'border-red-100 bg-red-50 text-red-800'}`}>
      <div className="flex justify-between gap-4 flex-wrap">
        <div>
          <strong>{result.dryRun ? 'Dry-run complete' : 'Batch complete'}</strong>
          <p className="mt-1">
            queued {result.queued.toLocaleString()}, processed {result.processed.toLocaleString()}, failed {result.failed.toLocaleString()},
            topic edges {result.topicEdgesWritten.toLocaleString()}
          </p>
        </div>
        <span>{result.provider}/{result.model}</span>
      </div>
      {!!result.samples.length && (
        <div className="mt-3 grid md:grid-cols-2 gap-2">
          {result.samples.slice(0, 6).map((sample) => (
            <div key={sample.paperId} className="rounded-lg bg-white/70 border border-white p-3">
              <div className="font-semibold text-ink-text line-clamp-2">{sample.title}</div>
              <div className="text-xs mt-1 text-ink-muted">
                #{sample.paperId} · {Math.round(sample.confidence * 100)}% · {sample.needsReview ? 'review' : 'ok'}
              </div>
              <TopicChips topics={sample.topics} />
            </div>
          ))}
        </div>
      )}
      {!!result.errors.length && <pre className="mt-3 whitespace-pre-wrap">{result.errors.join('\n')}</pre>}
    </section>
  )
}

export default function AiEnrichmentAdminPage() {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState('weak')
  const [limit, setLimit] = useState(100)
  const [minTopicConfidence, setMinTopicConfidence] = useState(55)
  const [dryRun, setDryRun] = useState(true)
  const [writeTopicEdges, setWriteTopicEdges] = useState(true)
  const [needsReviewOnly, setNeedsReviewOnly] = useState(true)
  const [lastResult, setLastResult] = useState<PaperAiRunResult | null>(null)

  const overview = useQuery({
    queryKey: ['paper-ai-overview'],
    queryFn: () => api.paperAiOverview(),
  })
  const annotations = useQuery({
    queryKey: ['paper-ai-annotations', needsReviewOnly],
    queryFn: () => api.paperAiAnnotations({ limit: 40, needsReview: needsReviewOnly }),
  })
  const runBatch = useMutation({
    mutationFn: () => api.runPaperAiEnrichment({ mode, limit, minTopicConfidence, dryRun, writeTopicEdges }),
    onSuccess: (result) => {
      setLastResult(result)
      queryClient.invalidateQueries({ queryKey: ['paper-ai-overview'] })
      queryClient.invalidateQueries({ queryKey: ['paper-ai-annotations'] })
    },
  })

  const latestJob = overview.data?.latestJob
  const coverageLabel = useMemo(() => `${overview.data?.coverage ?? 0}%`, [overview.data?.coverage])

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <span>Annotation Pipeline</span>
          <h1>Paper AI Enrichment</h1>
          <p>
            Run cheap metadata-only enrichment for paper summaries, topic paths, metrics, and review flags.
            The current provider is local and deterministic; future model providers should plug into the same job ledger.
          </p>
        </div>
        <div className={`admin-health ${(overview.data?.needsReview || 0) > 0 ? 'admin-health-warn' : 'admin-health-ok'}`}>
          <strong>{coverageLabel}</strong>
          <span>{overview.data?.provider || 'rule-local'} / {overview.data?.model || 'heuristic-v1'}</span>
        </div>
      </section>

      {(overview.isError || annotations.isError || runBatch.isError) && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {(overview.error as Error)?.message || (annotations.error as Error)?.message || (runBatch.error as Error)?.message || 'AI enrichment admin failed.'}
        </div>
      )}

      <section className="admin-status-strip">
        <StatCard label="Annotated papers" value={overview.data?.annotatedPapers ?? 0} sub={`${overview.data?.totalPapers?.toLocaleString() || 0} total`} />
        <StatCard label="Annotations" value={overview.data?.annotations ?? 0} sub={overview.data?.promptVersion || '-'} />
        <StatCard label="Needs review" value={overview.data?.needsReview ?? 0} sub="low-confidence / suspicious" />
        <StatCard label="Latest job" value={latestJob?.status || 'none'} sub={latestJob ? `${latestJob.processed}/${latestJob.queued}` : 'no batch yet'} />
      </section>

      <section className="admin-grid">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>Run control</span>
              <h2>Batch annotation</h2>
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-ink-text">
              Mode
              <select value={mode} onChange={(event) => setMode(event.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2">
                <option value="weak">Weak / noisy rows</option>
                <option value="missing">Missing annotations</option>
                <option value="stale">Stale input hash</option>
                <option value="all">All rows</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-ink-text">
              Limit
              <input type="number" min={1} max={5000} value={limit} onChange={(event) => setLimit(Number(event.target.value || 1))} className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
            </label>
            <label className="block text-sm font-semibold text-ink-text">
              Min topic confidence
              <input type="number" min={0} max={99} value={minTopicConfidence} onChange={(event) => setMinTopicConfidence(Number(event.target.value || 55))} className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-text">
              <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />
              Dry-run first
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-text">
              <input type="checkbox" checked={writeTopicEdges} onChange={(event) => setWriteTopicEdges(event.target.checked)} />
              Write derived topic edges
            </label>
            <button type="button" onClick={() => runBatch.mutate()} disabled={runBatch.isPending} className="w-full rounded-lg bg-brand-600 px-4 py-3 text-white font-semibold disabled:opacity-50">
              {runBatch.isPending ? 'Running...' : dryRun ? 'Run dry-run' : 'Run batch'}
            </button>
            <p className="learning-muted">
              Start with dry-run. Disable dry-run only after samples look reasonable; the job writes versioned rows and can update non-manual topic edges.
            </p>
          </div>
        </div>

        <div className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>Review queue</span>
              <h2>Recent annotations</h2>
            </div>
            <button type="button" onClick={() => setNeedsReviewOnly((value) => !value)}>
              {needsReviewOnly ? 'Show all' : 'Needs review only'}
            </button>
          </div>
          {lastResult && <RunResultPanel result={lastResult} />}
          <div className="admin-ops mt-4">
            {(annotations.data?.rows || []).map((row) => <AnnotationRow key={row.id} row={row} />)}
            {!annotations.data?.rows?.length && (
              <p className="learning-muted">{annotations.isLoading ? 'Loading annotations...' : 'No annotations found. Run a batch to populate this queue.'}</p>
            )}
          </div>
        </div>

        <aside className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>Job ledger</span>
              <h2>Latest run</h2>
            </div>
          </div>
          <ul className="admin-mini-list">
            <li><span>Status</span><small>{latestJob?.status || '-'}</small></li>
            <li><span>Scope</span><small>{latestJob?.scope || '-'}</small></li>
            <li><span>Queued</span><small>{latestJob?.queued?.toLocaleString() || '0'}</small></li>
            <li><span>Processed</span><small>{latestJob?.processed?.toLocaleString() || '0'}</small></li>
            <li><span>Failed</span><small>{latestJob?.failed?.toLocaleString() || '0'}</small></li>
            <li><span>Cost</span><small>${Number(latestJob?.actual_cost_usd || 0).toFixed(4)}</small></li>
          </ul>
          <div className="mt-4 rounded-xl border border-line-subtle bg-surface-elevated p-3 text-sm text-ink-muted">
            Real API providers should stay behind budget limits, schema validation, and source-only prompts. This page is the control plane for that later adapter.
          </div>
        </aside>
      </section>
    </div>
  )
}
