import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'

function statusLabel(status?: boolean) {
  return status ? 'online' : 'offline'
}

export default function SearchIndexAdminPage() {
  const queryClient = useQueryClient()
  const status = useQuery({
    queryKey: ['search-index'],
    queryFn: () => api.searchIndexStatus(),
    refetchInterval: 30_000,
  })

  const rebuild = useMutation({
    mutationFn: (target: string) => api.rebuildSearchIndex(target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-index'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
    },
  })

  const data = status.data

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <span>Search Engine</span>
          <h1>Search Index Control</h1>
          <p>
            Optional Meilisearch adapter for production search. SQLite FTS remains the fallback when the external search engine is not configured.
          </p>
        </div>
        <div className={`admin-health ${data?.reachable ? 'admin-health-ok' : 'admin-health-warn'}`}>
          <strong>{data?.provider || 'sqlite'}</strong>
          <span>{data?.configured ? statusLabel(data.reachable) : 'fallback active'}</span>
        </div>
      </section>

      {rebuild.isError && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {(rebuild.error as Error)?.message || 'Search index rebuild failed.'}
        </div>
      )}

      {rebuild.data && (
        <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">
          Rebuild submitted: {Object.entries(rebuild.data.indexed).map(([key, value]) => `${key} ${value}`).join(', ')}
        </div>
      )}

      <section className="admin-status-strip">
        <div><span>Provider</span><strong>{data?.provider || '-'}</strong></div>
        <div><span>Configured</span><strong>{data?.configured ? 'yes' : 'no'}</strong></div>
        <div><span>Reachable</span><strong>{data ? statusLabel(data.reachable) : '-'}</strong></div>
        <div><span>Host</span><strong>{data?.host || 'not set'}</strong></div>
      </section>

      {!data?.configured && (
        <section className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>Fallback mode</span>
              <h2>SQLite search is still serving users</h2>
            </div>
          </div>
          <p className="learning-muted">
            To enable this adapter, start the infra compose service and set SEARCH_ENGINE=meilisearch,
            MEILISEARCH_HOST=http://127.0.0.1:7700, and MEILISEARCH_API_KEY to the Meilisearch master key.
          </p>
        </section>
      )}

      <section className="admin-grid">
        <div className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>Indexes</span>
              <h2>Production search documents</h2>
            </div>
            <button
              type="button"
              disabled={!data?.configured || rebuild.isPending}
              onClick={() => rebuild.mutate('all')}
            >
              {rebuild.isPending ? 'Rebuilding...' : 'Rebuild all'}
            </button>
          </div>
          <div className="admin-ops">
            {(data?.indexes || []).map((index) => (
              <article key={index.uid} className={`admin-op ${index.exists ? 'admin-op-ready' : 'admin-op-planned'}`}>
                <div className="admin-op-head">
                  <span>{index.exists ? 'ready' : 'missing'}</span>
                  <strong>{index.documents.toLocaleString()}</strong>
                </div>
                <h3>{index.label}</h3>
                <p>
                  uid: {index.uid} · primary key: {index.primaryKey}
                  {index.isIndexing ? ' · indexing' : ''}
                </p>
                <button
                  type="button"
                  disabled={!data?.configured || rebuild.isPending}
                  onClick={() => rebuild.mutate(index.uid)}
                >
                  Rebuild {index.uid}
                </button>
              </article>
            ))}
            {!data?.indexes?.length && <p className="learning-muted">Loading search index status...</p>}
          </div>
        </div>

        <aside className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>Scope</span>
              <h2>Indexed entities</h2>
            </div>
          </div>
          <ul className="admin-mini-list">
            <li><span>Papers</span><small>title, abstract, authors, DOI, venue, rank, field</small></li>
            <li><span>Companies</span><small>aliases, domains, products, careers, regions</small></li>
            <li><span>Learning routes</span><small>route title, domain, family, search terms</small></li>
          </ul>
          <p className="learning-muted">
            Next step: route public search through this adapter when Meilisearch is healthy, then add authors, institutions, venues, and topics.
          </p>
        </aside>
      </section>
    </div>
  )
}
