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
        <span>{metric === 'count' ? '流量' : '延迟'}</span>
        <h2>{title}</h2>
      </div>
      <div className="observability-table">
        <div className="observability-row observability-row-head">
          <span>路由</span>
          <span>次数</span>
          <span>平均</span>
          <span>最大</span>
          <span>错误</span>
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
        {!rows.length && <p className="learning-muted">暂未捕获流量。</p>}
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
    return <div className="learning-muted">正在加载运行观测数据...</div>
  }

  if (!query.data) {
    return <div className="learning-muted">运行观测快照暂不可用。</div>
  }

  const data = query.data
  const statusTotal = Object.values(data.statusBuckets).reduce((sum, value) => sum + value, 0)

  return (
    <div className="observability-page">
      <section className="observability-hero">
        <div>
          <span>运行观测</span>
          <h1>生产流量控制台</h1>
          <p>
            为当前私有/VPS 版本提供轻量请求遥测。在完整接入 Prometheus、Grafana、Sentry 和日志聚合前，
            可先用这里观察流量、错误和限流。
          </p>
        </div>
        <div className="observability-live">
          <strong>{data.requestsLastMinute}</strong>
          <span>次请求 / 分钟</span>
        </div>
      </section>

      <section className="observability-stats">
        <div><span>总请求</span><strong>{data.totalRequests.toLocaleString()}</strong><small>自 {formatTime(data.startedAt)}</small></div>
        <div><span>错误率</span><strong>{formatPercent(data.errorRate)}</strong><small>{data.totalErrors} 个错误</small></div>
        <div><span>限流</span><strong>{data.totalRateLimited.toLocaleString()}</strong><small>HTTP 429</small></div>
        <div><span>平均延迟</span><strong>{data.averageDurationMs}ms</strong><small>最大 {data.maxDurationMs}ms</small></div>
        <div><span>最近 5 分钟</span><strong>{data.requestsLastFiveMinutes}</strong><small>滚动窗口</small></div>
      </section>

      <section className="observability-grid">
        <div className="observability-panel">
          <div className="observability-panel-head">
            <span>状态</span>
            <h2>响应分布</h2>
          </div>
          <div className="observability-buckets">
            {Object.entries(data.statusBuckets).map(([bucket, value]) => (
              <div key={bucket}>
                <strong>{bucket}</strong>
                <span>{value.toLocaleString()}</span>
                <i style={{ width: `${statusTotal ? Math.max(4, Math.round((value / statusTotal) * 100)) : 0}%` }} />
              </div>
            ))}
            {!Object.keys(data.statusBuckets).length && <p className="learning-muted">暂无响应状态分布。</p>}
          </div>
        </div>

        <div className="observability-panel">
          <div className="observability-panel-head">
            <span>最近</span>
            <h2>错误与限流</h2>
          </div>
          <div className="observability-errors">
            {data.recentErrors.map((item) => (
              <div key={`${item.at}-${item.requestId || item.path}`}>
                <strong>状态 {item.status} · {item.method} {item.path}</strong>
                <span>{item.durationMs}ms · {formatTime(item.at)}</span>
                <small>{item.requestId || '无请求 ID'}</small>
              </div>
            ))}
            {!data.recentErrors.length && <p className="learning-muted">最近没有错误或限流事件。</p>}
          </div>
        </div>
      </section>

      <section className="observability-grid">
        <RouteTable title="高频路由" rows={data.hotRoutes} metric="count" />
        <RouteTable title="慢路由" rows={data.slowRoutes} metric="latency" />
      </section>
    </div>
  )
}
