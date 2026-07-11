import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import type { OperationLane, OperationStatus } from '../types'

const statusLabel: Record<OperationStatus, string> = {
  ok: '正常',
  warning: '需关注',
  error: '失败',
  running: '运行中',
  idle: '空闲',
}

const laneLabel: Record<OperationLane, string> = {
  scheduler: '计划',
  maintenance: '维护',
  backup: '备份',
  snapshot: '快照',
  quality: '数据质量',
  ingestion: '导入',
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
    return <div className="learning-muted">正在加载任务台账...</div>
  }

  if (!overview.data) {
    return <div className="learning-muted">任务台账暂不可用。</div>
  }

  const data = overview.data

  return (
    <div className="jobops-page">
      <section className="jobops-hero">
        <div>
          <span>任务运维</span>
          <h1>任务台账</h1>
          <p>
            集中查看计划任务、维护运行、备份、快照、数据质量扫描和导入任务。周更导入或公开发布前，
            先在这里确认最近一次运行状态。
          </p>
        </div>
        <div className={`jobops-runtime jobops-runtime-${data.runtimeStatus}`}>
          <strong>{data.runtimeStatus === 'ok' ? '正常' : data.runtimeStatus === 'warn' ? '警告' : '异常'}</strong>
          <span>下次运行 {formatTime(data.nextRunAt)}</span>
        </div>
      </section>

      <section className="jobops-counts">
        <div><span>计划任务</span><strong>{data.counts.enabledSchedulerJobs}/{data.counts.schedulerJobs}</strong></div>
        <div><span>维护运行</span><strong>{data.counts.maintenanceRuns}</strong></div>
        <div><span>失败</span><strong>{data.counts.failedRuns}</strong></div>
        <div><span>备份</span><strong>{data.counts.backups}</strong></div>
        <div><span>导入</span><strong>{data.counts.ingestionJobs ?? 0}</strong></div>
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
            <span>最近活动</span>
            <h2>最近任务事件</h2>
          </div>
          <strong>{data.timeline.length} 条</strong>
        </div>
        <div className="jobops-timeline">
          {data.timeline.map((item) => (
            <Link to={item.href} className={`jobops-event jobops-event-${item.status}`} key={item.id}>
              <i>{laneLabel[item.lane]}</i>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <span>{formatTime(item.at)}</span>
            </Link>
          ))}
          {!data.timeline.length && <p className="learning-muted">暂无任务事件。可以先创建一次备份或导入任务。</p>}
        </div>
      </section>

      <p className="jobops-caveat">{data.caveat}</p>
    </div>
  )
}
