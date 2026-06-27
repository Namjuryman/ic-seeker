import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import type { OperationStatus } from '../types'

const statusLabel: Record<OperationStatus, string> = {
  ok: 'OK',
  warning: 'Attention',
  error: 'Failed',
  running: 'Running',
  idle: 'Idle',
}

function formatTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export default function JobOperationsPage() {
  const overview = useQuery({
    queryKey: ['job-operations'],
    queryFn: () => api.jobOperations(),
    refetchInterval: 30_000,
  })

  if (overview.isLoading) {
    return <div className="learning-muted">Loading operations ledger...</div>
  }

  if (!overview.data) {
    return <div className="learning-muted">Operations ledger is not available.</div>
  }

  const data = overview.data

  return (
    <div className="jobops-page">
      <section className="jobops-hero">
        <div>
          <span>JOB OPERATIONS</span>
          <h1>Operations ledger</h1>
          <p>
            A production-facing view for scheduled jobs, maintenance runs, backups, snapshots, data-quality scans,
            and ingestion jobs. This is the admin page to check before weekly imports and public announcements.
          </p>
        </div>
        <div className={`jobops-runtime jobops-runtime-${data.runtimeStatus}`}>
          <strong>{data.runtimeStatus.toUpperCase()}</strong>
          <span>next run {formatTime(data.nextRunAt)}</span>
        </div>
      </section>

      <section className="jobops-counts">
        <div><span>Scheduler</span><strong>{data.counts.enabledSchedulerJobs}/{data.counts.schedulerJobs}</strong></div>
        <div><span>Maintenance</span><strong>{data.counts.maintenanceRuns}</strong></div>
        <div><span>Failed</span><strong>{data.counts.failedRuns}</strong></div>
        <div><span>Backups</span><strong>{data.counts.backups}</strong></div>
        <div><span>Ingestion</span><strong>{data.counts.ingestionJobs ?? 0}</strong></div>
      </section>

      <section className="jobops-lanes">
        {data.lanes.map((lane) => (
          <Link to={lane.href} className={`jobops-lane jobops-lane-${lane.status}`} key={lane.lane}>
            <div>
              <span>{statusLabel[lane.status]}</span>
              <strong>{lane.metric}</strong>
            </div>
            <h2>{lane.title}</h2>
            <p>{lane.detail}</p>
          </Link>
        ))}
      </section>

      <section className="jobops-board">
        <div className="jobops-board-head">
          <div>
            <span>RECENT ACTIVITY</span>
            <h2>Recent operation events</h2>
          </div>
          <strong>{data.timeline.length} loaded</strong>
        </div>
        <div className="jobops-timeline">
          {data.timeline.map((item) => (
            <Link to={item.href} className={`jobops-event jobops-event-${item.status}`} key={item.id}>
              <i>{item.lane}</i>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <span>{formatTime(item.at)}</span>
            </Link>
          ))}
          {!data.timeline.length && <p className="learning-muted">No operation event yet. Create a backup or ingestion job first.</p>}
        </div>
      </section>

      <p className="jobops-caveat">{data.caveat}</p>
    </div>
  )
}
