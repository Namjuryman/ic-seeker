import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import type { OperationStatus } from '../types'

const statusLabel: Record<OperationStatus, string> = {
  ok: '正常',
  warning: '需关注',
  error: '失败',
  running: '运行中',
  idle: '待启用',
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
    return <div className="learning-muted">任务运行台账暂不可用。</div>
  }

  const data = overview.data

  return (
    <div className="jobops-page">
      <section className="jobops-hero">
        <div>
          <span>JOB OPERATIONS</span>
          <h1>任务运行台账</h1>
          <p>
            面向独立域名部署的统一运维视图：把定时任务、维护任务、备份、快照、数据质量和未来的论文导入流水线放到同一张运行表里。
          </p>
        </div>
        <div className={`jobops-runtime jobops-runtime-${data.runtimeStatus}`}>
          <strong>{data.runtimeStatus.toUpperCase()}</strong>
          <span>next run {formatTime(data.nextRunAt)}</span>
        </div>
      </section>

      <section className="jobops-counts">
        <div><span>定时任务</span><strong>{data.counts.enabledSchedulerJobs}/{data.counts.schedulerJobs}</strong></div>
        <div><span>维护运行</span><strong>{data.counts.maintenanceRuns}</strong></div>
        <div><span>失败运行</span><strong>{data.counts.failedRuns}</strong></div>
        <div><span>备份</span><strong>{data.counts.backups}</strong></div>
        <div><span>快照</span><strong>{data.counts.snapshots}</strong></div>
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
            <h2>最近运行事件</h2>
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
          {!data.timeline.length && <p className="learning-muted">还没有运行事件。先在维护任务里创建一次备份。</p>}
        </div>
      </section>

      <p className="jobops-caveat">{data.caveat}</p>
    </div>
  )
}
