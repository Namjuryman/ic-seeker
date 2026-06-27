import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { SchedulerJob } from '../types'

function formatTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function formatInterval(minutes: number) {
  if (minutes >= 24 * 60 && minutes % (24 * 60) === 0) return `${minutes / (24 * 60)}d`
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}h`
  return `${minutes}m`
}

function SchedulerCard({ job }: { job: SchedulerJob }) {
  const queryClient = useQueryClient()
  const toggle = useMutation({
    mutationFn: () => api.updateSchedulerJob(job.id, { enabled: !job.enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-scheduler'] }),
  })
  const runNow = useMutation({
    mutationFn: () => api.runSchedulerJob(job.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-scheduler'] })
      queryClient.invalidateQueries({ queryKey: ['maintenance-runs'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  return (
    <article className={`scheduler-card ${job.enabled ? 'scheduler-card-enabled' : ''}`}>
      <div className="scheduler-card-main">
        <div>
          <span>{job.maintenanceJobId}</span>
          <h3>{job.title}</h3>
          <p>{job.description}</p>
        </div>
        <strong>{job.enabled ? 'Enabled' : 'Manual'}</strong>
      </div>

      <div className="scheduler-card-stats">
        <div><span>Interval</span><strong>{formatInterval(job.intervalMinutes)}</strong></div>
        <div><span>Next run</span><strong>{formatTime(job.nextRunAt)}</strong></div>
        <div><span>Last run</span><strong>{formatTime(job.lastRunAt)}</strong></div>
        <div><span>Status</span><strong>{job.lastStatus || '-'}</strong></div>
      </div>

      <div className="scheduler-actions">
        <button onClick={() => runNow.mutate()} disabled={runNow.isPending}>
          {runNow.isPending ? 'Running...' : 'Run now'}
        </button>
        <button className="subtle" onClick={() => toggle.mutate()} disabled={toggle.isPending}>
          {job.enabled ? 'Disable' : 'Enable'}
        </button>
      </div>

      {runNow.data && (
        <div className={`scheduler-result scheduler-result-${runNow.data.status}`}>
          Run #{runNow.data.id}: {runNow.data.status}
        </div>
      )}
      {(runNow.error || toggle.error) && (
        <div className="scheduler-result scheduler-result-failure">
          {(runNow.error as any)?.response?.data?.error || (toggle.error as any)?.response?.data?.error || 'Operation failed'}
        </div>
      )}
    </article>
  )
}

export default function SchedulerAdminPage() {
  const status = useQuery({
    queryKey: ['admin-scheduler'],
    queryFn: () => api.schedulerStatus(),
    refetchInterval: 30_000,
  })

  if (status.isLoading) {
    return <div className="learning-muted">Loading scheduler...</div>
  }

  if (!status.data) {
    return <div className="learning-muted">Scheduler status is not available.</div>
  }

  const data = status.data

  return (
    <div className="scheduler-page">
      <section className="scheduler-hero">
        <div>
          <span>Scheduled Operations</span>
          <h1>Maintenance scheduler</h1>
          <p>
            Run backup, cache refresh, and data-quality checks on a server clock. Public deployments can enable
            this with <code>SCHEDULER_ENABLED=1</code>; local development stays manual by default.
          </p>
        </div>
        <div className={`scheduler-live ${data.enabled ? 'is-enabled' : ''}`}>
          <strong>{data.enabled ? 'On' : 'Off'}</strong>
          <span>{data.running ? 'timer running' : 'manual mode'}</span>
        </div>
      </section>

      <section className="scheduler-summary">
        <div><span>Configured jobs</span><strong>{data.jobs.length}</strong></div>
        <div><span>Enabled jobs</span><strong>{data.jobs.filter((job) => job.enabled).length}</strong></div>
        <div><span>Next run</span><strong>{formatTime(data.nextRunAt)}</strong></div>
      </section>

      <section className="scheduler-grid">
        {data.jobs.map((job) => <SchedulerCard key={job.id} job={job} />)}
      </section>
    </div>
  )
}
