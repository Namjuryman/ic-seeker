import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'

function statusClass(status: string) {
  if (status === 'complete') return 'admin-op-ready'
  if (status === 'wired') return 'admin-op-planned'
  return 'admin-op-warn'
}

function JsonPreview({ value }: { value: unknown }) {
  return <pre className="admin-log-preview">{JSON.stringify(value, null, 2)}</pre>
}

export default function CompletionReportAdminPage() {
  const queryClient = useQueryClient()
  const report = useQuery({ queryKey: ['completion-report'], queryFn: () => api.completionReport(), refetchInterval: 60_000 })
  const runs = useQuery({ queryKey: ['paper-ingestion-runs'], queryFn: () => api.paperIngestionRuns({ limit: 8 }) })
  const dedupe = useQuery({ queryKey: ['paper-dedupe'], queryFn: () => api.paperDedupe({ limit: 8, status: 'open' }) })
  const pdfs = useQuery({ queryKey: ['local-pdfs'], queryFn: () => api.localPdfs({ limit: 8, status: 'all' }) })
  const authorCandidates = useQuery({ queryKey: ['identity-candidates', 'author'], queryFn: () => api.identityCandidates('author', { limit: 5 }) })
  const institutionCandidates = useQuery({ queryKey: ['identity-candidates', 'institution'], queryFn: () => api.identityCandidates('institution', { limit: 5 }) })

  const scanDedupe = useMutation({
    mutationFn: () => api.scanPaperDedupe({ limit: 100, persist: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paper-dedupe'] }),
  })

  const dryRunIngestion = useMutation({
    mutationFn: () => api.runPaperIngestion({ dryRun: true, query: 'integrated circuit', yearFrom: 2024, limitPerSource: 5 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paper-ingestion-runs'] }),
  })

  const data = report.data

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <span>20-task delivery</span>
          <h1>SiliconScope v2 completion cockpit</h1>
          <p>
            Tracks the 20 requested workstreams as implemented product surfaces: ingestion, provenance, taxonomy,
            learning, reading workflow, PDF local index, identity normalization, intelligence pages, search, snapshots,
            admin operations, billing boundaries, production readiness, and UI.
          </p>
        </div>
        <div className={`admin-health ${data?.releaseDecision?.includes('not') ? 'admin-health-warn' : 'admin-health-ok'}`}>
          <strong>{data?.summary?.complete ?? 0}/{data?.summary?.total ?? 20}</strong>
          <span>{data?.releaseDecision || 'checking'}</span>
        </div>
      </section>

      {data && (
        <section className="admin-status-strip">
          <div><span>Complete</span><strong>{data.summary.complete}</strong></div>
          <div><span>Wired</span><strong>{data.summary.wired}</strong></div>
          <div><span>Runtime pending</span><strong>{data.summary.pendingRuntime}</strong></div>
          <div><span>Generated</span><strong>{new Date(data.generatedAt).toLocaleString()}</strong></div>
        </section>
      )}

      <section className="admin-grid">
        <div className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>Tasks</span>
              <h2>20 workstreams</h2>
            </div>
          </div>
          <div className="admin-ops">
            {(data?.tasks || []).map((task) => (
              <article key={task.id} className={`admin-op ${statusClass(task.status)}`}>
                <div className="admin-op-head">
                  <span>{task.status}</span>
                  <strong>#{task.id}</strong>
                </div>
                <h3>{task.title}</h3>
                <ul className="admin-mini-list">
                  {task.evidence.map((line) => <li key={line}><span>{line}</span></li>)}
                </ul>
              </article>
            ))}
            {!data && <p className="learning-muted">Loading completion report...</p>}
          </div>
        </div>

        <aside className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>Caveats</span>
              <h2>Release guardrails</h2>
            </div>
          </div>
          <ul className="admin-mini-list">
            {(data?.caveats || ['Loading runtime caveats...']).map((line) => <li key={line}><span>{line}</span></li>)}
          </ul>
          {data && <JsonPreview value={{ tables: data.tables, counters: data.counters }} />}
        </aside>
      </section>

      <section className="admin-grid">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>Ingestion</span>
              <h2>Multi-source paper pipeline</h2>
            </div>
            <button type="button" disabled={dryRunIngestion.isPending} onClick={() => dryRunIngestion.mutate()}>
              {dryRunIngestion.isPending ? 'Running...' : 'Dry-run'}
            </button>
          </div>
          <ul className="admin-mini-list">
            {(runs.data?.rows || []).map((row: any) => (
              <li key={row.id}><span>{row.status}</span><small>{row.mode} · {row.created_at || row.createdAt}</small></li>
            ))}
            {!runs.data?.rows?.length && <li><span>No ingestion runs recorded yet.</span></li>}
          </ul>
          {dryRunIngestion.data && <JsonPreview value={dryRunIngestion.data} />}
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>Dedupe</span>
              <h2>Duplicate candidates</h2>
            </div>
            <button type="button" disabled={scanDedupe.isPending} onClick={() => scanDedupe.mutate()}>
              {scanDedupe.isPending ? 'Scanning...' : 'Scan'}
            </button>
          </div>
          <ul className="admin-mini-list">
            {(dedupe.data?.rows || dedupe.data?.candidates || []).map((item) => (
              <li key={item.id}><span>{item.candidateType}</span><small>{item.paperIds.join(', ')} · {item.confidence}</small></li>
            ))}
            {!(dedupe.data?.rows || dedupe.data?.candidates || []).length && <li><span>No open duplicate candidates.</span></li>}
          </ul>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>Local PDFs</span>
              <h2>Personal local index</h2>
            </div>
          </div>
          <ul className="admin-mini-list">
            {(pdfs.data?.rows || []).map((row) => (
              <li key={row.id}><span>{row.matchStatus}</span><small>{row.titleGuess || row.filePath}</small></li>
            ))}
            {!pdfs.data?.rows?.length && <li><span>No local PDF index items yet. Run npm run pdf:scan locally.</span></li>}
          </ul>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>Identity</span>
              <h2>Merge/split candidates</h2>
            </div>
          </div>
          <h3>Authors</h3>
          <ul className="admin-mini-list">
            {(authorCandidates.data?.rows || []).map((row: any) => <li key={`a-${row.id}`}><span>{row.canonical_name || row.canonicalName}</span><small>{row.confidence}</small></li>)}
            {!authorCandidates.data?.rows?.length && <li><span>No author candidates.</span></li>}
          </ul>
          <h3>Institutions</h3>
          <ul className="admin-mini-list">
            {(institutionCandidates.data?.rows || []).map((row: any) => <li key={`i-${row.id}`}><span>{row.canonical_name || row.canonicalName}</span><small>{row.confidence}</small></li>)}
            {!institutionCandidates.data?.rows?.length && <li><span>No institution candidates.</span></li>}
          </ul>
        </div>
      </section>
    </div>
  )
}
