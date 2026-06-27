import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import type { ObservedRoute } from '../types'

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function RouteTable({ title, rows, metric }: { title: string; rows: ObservedRoute[]; metric: 'count' | 'latency' }) {
  return (
    <section className="observability-panel">
      <div className="observability-panel-head">
        <span>{metric === 'count' ? 'Traffic' : 'Latency'}</span>
        <h2>{title}</h2>
      </div>
      <div className="observability-table">
        <div className="observability-row observability-row-head">
          <span>Route</span>
          <span>Count</span>
          <span>Avg</span>
          <span>Max</span>
          <span>Errors</span>
        </div>
        {rows.map((row) => (
          <div className="observability-row" key={row.key}>
            <strong>{row.method} {row.path}</strong>
            <span>{row.count.toLocaleString()}</span>
            <span>{row.averageDurationMs}ms</span>
            <span>{Math.round(row.maxDurationMs)}ms</span>
            <span>{row.errorCount || row.rateLimitedCount ? `${row.errorCount} / ${row.rateLimitedCount}` : '-'}</span>
          </div>
        ))}
        {!rows.length && <p className="learning-muted">No traffic captured yet.</p>}
      </div>
    </section>
  )
}

export default function ObservabilityPage() {
  const query = useQuery({
    queryKey: ['admin-observability'],
    queryFn: () => api.adminObservability(),
    refetchInterval: 10_000,
  })

  if (query.isLoading) {
    return <div className="learning-muted">Loading runtime observability...</div>
  }

  if (!query.data) {
    return <div className="learning-muted">Observability snapshot is not available.</div>
  }

  const data = query.data
  const statusTotal = Object.values(data.statusBuckets).reduce((sum, value) => sum + value, 0)

  return (
    <div className="observability-page">
      <section className="observability-hero">
        <div>
          <span>Runtime Observability</span>
          <h1>Production traffic console</h1>
          <p>
            Lightweight in-process request telemetry for the private/VPS edition. Use it before full Prometheus,
            Grafana, Sentry, and log aggregation are connected.
          </p>
        </div>
        <div className="observability-live">
          <strong>{data.requestsLastMinute}</strong>
          <span>requests / min</span>
        </div>
      </section>

      <section className="observability-stats">
        <div><span>Total requests</span><strong>{data.totalRequests.toLocaleString()}</strong><small>since {formatTime(data.startedAt)}</small></div>
        <div><span>Error rate</span><strong>{formatPercent(data.errorRate)}</strong><small>{data.totalErrors} errors</small></div>
        <div><span>Rate limited</span><strong>{data.totalRateLimited.toLocaleString()}</strong><small>HTTP 429</small></div>
        <div><span>Average latency</span><strong>{data.averageDurationMs}ms</strong><small>max {data.maxDurationMs}ms</small></div>
        <div><span>Last 5 minutes</span><strong>{data.requestsLastFiveMinutes}</strong><small>rolling window</small></div>
      </section>

      <section className="observability-grid">
        <div className="observability-panel">
          <div className="observability-panel-head">
            <span>Status</span>
            <h2>Response buckets</h2>
          </div>
          <div className="observability-buckets">
            {Object.entries(data.statusBuckets).map(([bucket, value]) => (
              <div key={bucket}>
                <strong>{bucket}</strong>
                <span>{value.toLocaleString()}</span>
                <i style={{ width: `${statusTotal ? Math.max(4, Math.round((value / statusTotal) * 100)) : 0}%` }} />
              </div>
            ))}
            {!Object.keys(data.statusBuckets).length && <p className="learning-muted">No status buckets yet.</p>}
          </div>
        </div>

        <div className="observability-panel">
          <div className="observability-panel-head">
            <span>Recent</span>
            <h2>Errors and rate limits</h2>
          </div>
          <div className="observability-errors">
            {data.recentErrors.map((item) => (
              <div key={`${item.at}-${item.requestId || item.path}`}>
                <strong>{item.status} {item.method} {item.path}</strong>
                <span>{item.durationMs}ms · {formatTime(item.at)}</span>
                <small>{item.requestId || 'no request id'}</small>
              </div>
            ))}
            {!data.recentErrors.length && <p className="learning-muted">No recent errors or rate-limit events.</p>}
          </div>
        </div>
      </section>

      <section className="observability-grid">
        <RouteTable title="Hot routes" rows={data.hotRoutes} metric="count" />
        <RouteTable title="Slow routes" rows={data.slowRoutes} metric="latency" />
      </section>
    </div>
  )
}
