import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { MaintenanceJob, MaintenanceRun } from '../types'

function statusClass(status?: string | null) {
  if (status === 'success') return 'ok'
  if (status === 'failure') return 'bad'
  if (status === 'running') return 'run'
  return 'idle'
}

function ms(value: number | null) {
  if (value == null) return '-'
  if (value < 1000) return `${value} ms`
  return `${(value / 1000).toFixed(1)} s`
}

function Summary({ run }: { run: MaintenanceRun }) {
  if (run.error) return <p className="maintenance-error">{run.error}</p>
  if (!run.summary) return <p className="maintenance-muted">No summary.</p>
  return (
    <div className="maintenance-summary">
      {Object.entries(run.summary).slice(0, 8).map(([key, value]) => (
        <span key={key}><b>{key}</b>{Array.isArray(value) ? value.length : String(value)}</span>
      ))}
    </div>
  )
}

function JobCard({ job }: { job: MaintenanceJob }) {
  const queryClient = useQueryClient()
  const [label, setLabel] = useState(String(job.defaultPayload?.label || 'admin-maintenance'))
  const run = useMutation({
    mutationFn: () => {
      const payload = job.id === 'backup' ? { label } : job.defaultPayload || {}
      return api.runMaintenanceJob(job.id, payload)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['maintenance-runs'] })
      queryClient.invalidateQueries({ queryKey: ['admin-backups'] })
      queryClient.invalidateQueries({ queryKey: ['snapshots'] })
    },
  })
  const last = job.lastRun
  return (
    <article className="maintenance-job">
      <div className="maintenance-job-head">
        <span>{job.category}</span>
        <em className={job.risk === 'medium' ? 'risk-medium' : 'risk-low'}>{job.risk}</em>
      </div>
      <h2>{job.title}</h2>
      <p>{job.description}</p>
      <div className="maintenance-meta">
        <span>Duration: {job.expectedDuration}</span>
        <span className={`maintenance-status ${statusClass(last?.status)}`}>{last?.status || 'never run'}</span>
      </div>
      {job.id === 'backup' && (
        <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="backup label" />
      )}
      <button disabled={run.isPending} onClick={() => run.mutate()}>
        {run.isPending ? 'Running...' : 'Run now'}
      </button>
      {run.data && <Summary run={run.data} />}
      {run.error && <p className="maintenance-error">{(run.error as any)?.response?.data?.error || (run.error as Error).message}</p>}
    </article>
  )
}

export default function MaintenanceAdminPage() {
  const jobs = useQuery({ queryKey: ['maintenance-jobs'], queryFn: api.maintenanceJobs })
  const runs = useQuery({ queryKey: ['maintenance-runs'], queryFn: () => api.maintenanceRuns({ limit: 40 }) })
  const grouped = useMemo(() => {
    const items = jobs.data || []
    return {
      backup: items.filter((job) => job.category === 'backup'),
      cache: items.filter((job) => job.category === 'cache'),
      quality: items.filter((job) => job.category === 'quality'),
    }
  }, [jobs.data])

  if (jobs.isLoading) return <div className="ss-loading">Loading maintenance jobs...</div>

  return (
    <div className="maintenance-page">
      <section className="maintenance-hero">
        <div>
          <span>OPERATIONS PIPELINE</span>
          <h1>维护任务中心</h1>
          <p>把周更前备份、核心快照刷新、完整缓存刷新和数据质量扫描收束到一个后台入口。现在是同步执行，后续可接 Redis/BullMQ 变成真正队列。</p>
        </div>
        <div className="maintenance-hero-card">
          <span>Total runs</span>
          <strong>{runs.data?.total ?? 0}</strong>
          <em>{runs.data?.rows[0] ? `${runs.data.rows[0].jobId} · ${runs.data.rows[0].status}` : 'No run yet'}</em>
        </div>
      </section>

      {(['backup', 'cache', 'quality'] as const).map((group) => (
        <section className="maintenance-group" key={group}>
          <div className="maintenance-group-title">
            <span>{group}</span>
            <h2>{group === 'backup' ? '备份与恢复点' : group === 'cache' ? '缓存与快照' : '数据质量'}</h2>
          </div>
          <div className="maintenance-grid">
            {grouped[group].map((job) => <JobCard job={job} key={job.id} />)}
          </div>
        </section>
      ))}

      <section className="maintenance-runs">
        <div className="maintenance-runs-head">
          <span>Recent runs</span>
          <strong>{runs.data?.rows.length || 0} loaded</strong>
        </div>
        <div className="maintenance-run-row maintenance-run-head">
          <span>Job</span>
          <span>Status</span>
          <span>Time</span>
          <span>Summary</span>
        </div>
        {(runs.data?.rows || []).map((run) => (
          <div className="maintenance-run-row" key={run.id}>
            <div>
              <strong>{run.jobId}</strong>
              <small>#{run.id}</small>
            </div>
            <span className={`maintenance-status ${statusClass(run.status)}`}>{run.status}</span>
            <div>
              <strong>{ms(run.durationMs)}</strong>
              <small>{new Date(run.startedAt).toLocaleString()}</small>
            </div>
            <Summary run={run} />
          </div>
        ))}
        {!runs.data?.rows.length && <p className="maintenance-empty">还没有维护任务记录。</p>}
      </section>
    </div>
  )
}
