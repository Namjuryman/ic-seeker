import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { SchedulerJob } from '../types'
import { friendlyError } from '../utils/errorMessages'

function formatTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function formatInterval(minutes: number) {
  if (minutes >= 24 * 60 && minutes % (24 * 60) === 0) return `${minutes / (24 * 60)} 天`
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60} 小时`
  return `${minutes} 分钟`
}

const jobCopy: Record<SchedulerJob['id'], { title: string; description: string }> = {
  'daily-backup': {
    title: '每日备份',
    description: '按计划创建数据库恢复点，为导入、部署和结构维护留出回滚空间。',
  },
  'core-snapshots': {
    title: '核心快照刷新',
    description: '刷新公共页面依赖的核心情报快照，降低用户访问时的计算压力。',
  },
  'data-quality': {
    title: '数据质量检查',
    description: '定期扫描重复、错配、低置信和需要人工复核的数据线索。',
  },
}

const runStatusLabel: Record<string, string> = {
  success: '成功',
  failure: '失败',
  running: '运行中',
}

function schedulerRunStatusLabel(status?: string | null) {
  return status ? runStatusLabel[status] || '状态待确认' : '-'
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
          <h3>{jobCopy[job.id]?.title || job.title}</h3>
          <p>{jobCopy[job.id]?.description || job.description}</p>
        </div>
        <strong>{job.enabled ? '已启用' : '手动'}</strong>
      </div>

      <div className="scheduler-card-stats">
        <div><span>间隔</span><strong>{formatInterval(job.intervalMinutes)}</strong></div>
        <div><span>下次运行</span><strong>{formatTime(job.nextRunAt)}</strong></div>
        <div><span>上次运行</span><strong>{formatTime(job.lastRunAt)}</strong></div>
        <div><span>状态</span><strong>{schedulerRunStatusLabel(job.lastStatus)}</strong></div>
      </div>

      <div className="scheduler-actions">
        <button onClick={() => runNow.mutate()} disabled={runNow.isPending}>
          {runNow.isPending ? '运行中...' : '立即运行'}
        </button>
        <button className="subtle" onClick={() => toggle.mutate()} disabled={toggle.isPending}>
          {job.enabled ? '停用' : '启用'}
        </button>
      </div>

      {runNow.data && (
        <div className={`scheduler-result scheduler-result-${runNow.data.status}`}>
          任务运行编号 {runNow.data.id}：{schedulerRunStatusLabel(runNow.data.status)}
        </div>
      )}
      {(runNow.error || toggle.error) && (
        <div className="scheduler-result scheduler-result-failure">
          {friendlyError(runNow.error || toggle.error, '操作失败')}
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
    return <div className="learning-muted">正在加载计划任务...</div>
  }

  if (!status.data) {
    return <div className="learning-muted">计划任务状态暂不可用。</div>
  }

  const data = status.data

  return (
    <div className="scheduler-page">
      <section className="scheduler-hero">
        <div>
          <span>计划运维</span>
          <h1>维护任务调度器</h1>
          <p>
            按服务器时钟执行备份、缓存刷新和数据质量检查。公开部署可启用自动调度；本地开发默认保持手动模式。
          </p>
        </div>
        <div className={`scheduler-live ${data.enabled ? 'is-enabled' : ''}`}>
          <strong>{data.enabled ? '开启' : '关闭'}</strong>
          <span>{data.running ? '计时器运行中' : '手动模式'}</span>
        </div>
      </section>

      <section className="scheduler-summary">
        <div><span>已配置任务</span><strong>{data.jobs.length}</strong></div>
        <div><span>已启用任务</span><strong>{data.jobs.filter((job) => job.enabled).length}</strong></div>
        <div><span>下次运行</span><strong>{formatTime(data.nextRunAt)}</strong></div>
      </section>

      <section className="scheduler-grid">
        {data.jobs.map((job) => <SchedulerCard key={job.id} job={job} />)}
      </section>
    </div>
  )
}
