import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{typeof value === 'number' ? value.toLocaleString() : value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  )
}

export default function TopicTaxonomyAdminPage() {
  const queryClient = useQueryClient()
  const overview = useQuery({
    queryKey: ['topic-taxonomy-admin'],
    queryFn: () => api.topicTaxonomyAdmin(),
  })
  const taxonomy = useQuery({
    queryKey: ['topic-taxonomy'],
    queryFn: () => api.topicTaxonomy(),
  })
  const sync = useMutation({
    mutationFn: () => api.syncTopicTaxonomy(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic-taxonomy-admin'] })
      queryClient.invalidateQueries({ queryKey: ['topic-taxonomy'] })
    },
  })
  const refreshEdges = useMutation({
    mutationFn: () => api.refreshPaperTopicEdges({ limit: 50000, minConfidence: 45, reset: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic-taxonomy-admin'] })
      queryClient.invalidateQueries({ queryKey: ['topic-taxonomy'] })
    },
  })

  const data = overview.data
  const tree = taxonomy.data?.tree || []

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <span>Knowledge Graph</span>
          <h1>Topic Taxonomy Control</h1>
          <p>
            Manage the curated IC topic hierarchy that will drive search filters, reports, paper-topic confidence edges,
            and future manual classification corrections.
          </p>
        </div>
        <div className={`admin-health ${data?.drift.inSync ? 'admin-health-ok' : 'admin-health-warn'}`}>
          <strong>{data?.drift.inSync ? 'in sync' : 'drift'}</strong>
          <span>{taxonomy.data?.source || 'loading'}</span>
        </div>
      </section>

      {(sync.isError || refreshEdges.isError) && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {(sync.error as Error)?.message || (refreshEdges.error as Error)?.message || 'Topic taxonomy operation failed.'}
        </div>
      )}

      {sync.data && (
        <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">
          Synced {sync.data.database.nodes} nodes, {sync.data.database.aliases} aliases, and {sync.data.database.keywordRules} keyword rules.
        </div>
      )}

      {refreshEdges.data && (
        <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">
          Refreshed {refreshEdges.data.writtenEdges.toLocaleString()} paper-topic edges from {refreshEdges.data.scannedPapers.toLocaleString()} scanned papers.
        </div>
      )}

      <section className="admin-status-strip">
        <StatCard label="Seed nodes" value={data?.seed.nodes ?? 0} sub={data?.sourceVersion || '-'} />
        <StatCard label="DB nodes" value={data?.database.nodes ?? 0} sub={`${data?.database.aliases ?? 0} aliases`} />
        <StatCard label="Keyword rules" value={data?.database.keywordRules ?? 0} sub="positive / negative" />
        <StatCard label="Paper edges" value={data?.database.paperEdges ?? 0} sub="future classifier output" />
      </section>

      <section className="admin-grid">
        <div className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>Projection</span>
              <h2>Database-backed taxonomy</h2>
            </div>
            <button type="button" onClick={() => sync.mutate()} disabled={sync.isPending}>
              {sync.isPending ? 'Syncing...' : 'Sync seed to DB'}
            </button>
            <button type="button" onClick={() => refreshEdges.mutate()} disabled={refreshEdges.isPending}>
              {refreshEdges.isPending ? 'Refreshing...' : 'Refresh paper edges'}
            </button>
          </div>
          <p className="learning-muted">
            Public taxonomy APIs now prefer the database projection and fall back to the TypeScript seed only when the projection is empty.
            This makes future manual corrections and paper-topic edge generation possible without changing code.
          </p>

          <div className="admin-ops">
            {tree.map((node) => (
              <article key={node.id} className="admin-op admin-op-ready">
                <div className="admin-op-head">
                  <span>{node.domain}</span>
                  <strong>{node.children?.length || 0}</strong>
                </div>
                <h3>{node.label}</h3>
                <p>{node.aliases.slice(0, 4).join(', ') || 'No aliases yet'}</p>
                <div className="company-tags">
                  {node.children?.slice(0, 6).map((child) => <em key={child.id}>{child.label}</em>)}
                </div>
              </article>
            ))}
            {!tree.length && <p className="learning-muted">Loading taxonomy tree...</p>}
          </div>
        </div>

        <aside className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>Drift</span>
              <h2>Seed vs DB</h2>
            </div>
          </div>
          <ul className="admin-mini-list">
            <li><span>Missing in DB</span><small>{data?.drift.missingInDb.length ?? 0}</small></li>
            <li><span>Extra in DB</span><small>{data?.drift.extraInDb.length ?? 0}</small></li>
            <li><span>Generated</span><small>{data?.generatedAt || '-'}</small></li>
          </ul>
          <div className="mt-4">
            <h3 className="font-semibold text-ink-text mb-2">Next hard steps</h3>
            <ul className="admin-mini-list">
              {(data?.next || []).map((item) => <li key={item}><span>{item}</span></li>)}
            </ul>
          </div>
          {refreshEdges.data?.topTopics?.length ? (
            <div className="mt-4">
              <h3 className="font-semibold text-ink-text mb-2">Latest edge distribution</h3>
              <ul className="admin-mini-list">
                {refreshEdges.data.topTopics.map((topic) => (
                  <li key={topic.topicId}><span>{topic.label}</span><small>{topic.count.toLocaleString()}</small></li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  )
}
