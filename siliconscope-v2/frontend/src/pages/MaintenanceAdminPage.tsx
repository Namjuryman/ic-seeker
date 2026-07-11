import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { MaintenanceJob, MaintenanceRun } from '../types'
import { friendlyError } from '../utils/errorMessages'

function statusClass(status?: string | null) {
  if (status === 'success') return 'ok'
  if (status === 'failure') return 'bad'
  if (status === 'running') return 'run'
  return 'idle'
}

const categoryLabel: Record<MaintenanceJob['category'], string> = {
  backup: '备份',
  cache: '缓存',
  quality: '数据质量',
}

const riskLabel: Record<MaintenanceJob['risk'], string> = {
  low: '低风险',
  medium: '中风险',
}

const statusLabel: Record<string, string> = {
  success: '成功',
  failure: '失败',
  running: '运行中',
}

function maintenanceStatusLabel(status?: string | null) {
  return status ? statusLabel[status] || '状态待确认' : '尚未运行'
}

const jobCopy: Record<string, { title: string; description: string }> = {
  backup: {
    title: '创建数据库恢复点',
    description: '在导入、部署或结构维护前，创建一致性的数据库备份和清单。',
  },
  'snapshot-core': {
    title: '刷新核心快照',
    description: '刷新首页、地图、机构、作者和主题等高频页面依赖的核心快照。',
  },
  'snapshot-full': {
    title: '刷新完整快照',
    description: '刷新核心快照以及重点画像、主题、地图和研究者详情缓存，适合大批量导入后执行。',
  },
  'data-quality': {
    title: '运行数据质量扫描',
    description: '检查 DOI 重复、机构别名、主题置信度和需要人工复核的数据线索。',
  },
}

function ms(value: number | null) {
  if (value == null) return '-'
  if (value < 1000) return `${value} ms`
  return `${(value / 1000).toFixed(1)} s`
}

function formatBytes(value: unknown) {
  const bytes = Number(value || 0)
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024).toLocaleString()} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function maintenanceJobLabel(jobId: string) {
  return jobCopy[jobId]?.title || jobId.replace(/-/g, ' ')
}

function summaryKeyLabel(key: string) {
  const labels: Record<string, string> = {
    id: '备份编号',
    dbBytes: '数据库体积',
    manifestBytes: '清单体积',
    requested: '请求项',
    total: '总数',
    ok: '成功',
    failed: '失败',
    failures: '失败样本',
    totalPapers: '论文总数',
    scannedRows: '扫描行数',
    duplicateDoiGroups: '重复 DOI 组',
    duplicateTitleYearGroups: '重复标题/年份组',
    unknownVenues: '来源待映射',
    lowConfidenceTopics: '低置信方向',
    institutionVariants: '机构变体',
    ambiguousAuthors: '作者歧义',
    missingAffiliations: '缺失机构',
  }
  return labels[key] || key.replace(/[._-]/g, ' ')
}

function summaryValueLabel(key: string, value: unknown) {
  if (key === 'dbBytes' || key === 'manifestBytes') return formatBytes(value)
  if (Array.isArray(value)) return `${value.length.toLocaleString()} 项`
  if (typeof value === 'number') return value.toLocaleString()
  return String(value)
}

function Summary({ run }: { run: MaintenanceRun }) {
  if (run.error) return <p className="maintenance-error">{friendlyError(run.error, '维护任务运行失败')}</p>
  if (!run.summary) return <p className="maintenance-muted">暂无摘要。</p>
  return (
    <div className="maintenance-summary">
      {Object.entries(run.summary).slice(0, 8).map(([key, value]) => (
        <span key={key}><b>{summaryKeyLabel(key)}</b>{summaryValueLabel(key, value)}</span>
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
  const copy = jobCopy[job.id] || { title: job.title, description: job.description }
  return (
    <article className="maintenance-job">
      <div className="maintenance-job-head">
        <span>{categoryLabel[job.category]}</span>
        <em className={job.risk === 'medium' ? 'risk-medium' : 'risk-low'}>{riskLabel[job.risk]}</em>
      </div>
      <h2>{copy.title}</h2>
      <p>{copy.description}</p>
      <div className="maintenance-meta">
        <span>预计耗时：{job.expectedDuration}</span>
        <span className={`maintenance-status ${statusClass(last?.status)}`}>{maintenanceStatusLabel(last?.status)}</span>
      </div>
      {job.id === 'backup' && (
        <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="备份标签" />
      )}
      <button disabled={run.isPending} onClick={() => run.mutate()}>
        {run.isPending ? '运行中...' : '立即运行'}
      </button>
      {run.data && <Summary run={run.data} />}
      {run.error && <p className="maintenance-error">{friendlyError(run.error, '维护任务运行失败')}</p>}
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

  if (jobs.isLoading) return <div className="ss-loading">正在加载维护任务...</div>

  return (
    <div className="maintenance-page">
      <section className="maintenance-hero">
        <div>
          <span>运维流水线</span>
          <h1>维护任务中心</h1>
          <p>把周更前备份、核心快照刷新、完整缓存刷新和数据质量扫描收束到一个后台入口，并记录可审计的执行结果。</p>
        </div>
        <div className="maintenance-hero-card">
          <span>运行总数</span>
          <strong>{runs.data?.total ?? 0}</strong>
          <em>{runs.data?.rows[0] ? `${maintenanceJobLabel(runs.data.rows[0].jobId)} · ${maintenanceStatusLabel(runs.data.rows[0].status)}` : '尚未运行'}</em>
        </div>
      </section>

      {(['backup', 'cache', 'quality'] as const).map((group) => (
        <section className="maintenance-group" key={group}>
          <div className="maintenance-group-title">
            <span>{categoryLabel[group]}</span>
            <h2>{group === 'backup' ? '备份与恢复点' : group === 'cache' ? '缓存与快照' : '数据质量'}</h2>
          </div>
          <div className="maintenance-grid">
            {grouped[group].map((job) => <JobCard job={job} key={job.id} />)}
          </div>
        </section>
      ))}

      <section className="maintenance-runs">
        <div className="maintenance-runs-head">
          <span>最近运行</span>
          <strong>{runs.data?.rows.length || 0} 条</strong>
        </div>
        <div className="maintenance-run-row maintenance-run-head">
          <span>任务</span>
          <span>状态</span>
          <span>耗时</span>
          <span>摘要</span>
        </div>
        {(runs.data?.rows || []).map((run) => (
          <div className="maintenance-run-row" key={run.id}>
            <div>
              <strong>{maintenanceJobLabel(run.jobId)}</strong>
              <small>运行 {run.id}</small>
            </div>
            <span className={`maintenance-status ${statusClass(run.status)}`}>{maintenanceStatusLabel(run.status)}</span>
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
