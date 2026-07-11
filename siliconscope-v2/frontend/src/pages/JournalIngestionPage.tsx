import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { IngestionJob, IngestionJobEvent, IngestionJobStatus } from '../types'
import { providerLabel } from '../utils/displayLabels'
import { friendlyError } from '../utils/errorMessages'

const providerOptions = ['openalex', 'crossref', 'ieee', 'semantic-scholar', 'dblp', 'csv', 'scholar-csv', 'aminer', 'pdf', 'manual'] as const
const runnableProviders = new Set(['openalex', 'crossref', 'ieee', 'semantic-scholar', 'dblp', 'csv', 'scholar-csv', 'aminer'])
const statusOptions: IngestionJobStatus[] = ['queued', 'running', 'succeeded', 'failed', 'review_required', 'cancelled']
const modeOptions = ['metadata_sync', 'dry_run', 'full', 'incremental', 'manual', 'retry'] as const

const statusLabel: Record<IngestionJobStatus, string> = {
  queued: '排队中',
  running: '运行中',
  succeeded: '已完成',
  failed: '失败',
  review_required: '需复核',
  cancelled: '已取消',
}

function formatTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function scopeText(scope: Record<string, unknown>) {
  const parts = [
    scope.yearFrom && scope.yearTo ? `${scope.yearFrom}-${scope.yearTo}` : null,
    Array.isArray(scope.venues) ? scope.venues.join(', ') : null,
    scope.query ? String(scope.query) : null,
    scope.retryOf ? `重试自任务 ${scope.retryOf}` : null,
  ].filter(Boolean)
  return parts.join(' / ') || '手动范围'
}

function statusClass(status: string) {
  if (status === 'running' || status === 'queued') return 'running'
  if (status === 'failed') return 'error'
  if (status === 'review_required') return 'warning'
  return 'ok'
}

function modeLabel(mode: string) {
  const labels: Record<string, string> = {
    metadata_sync: '元数据同步',
    dry_run: '试运行',
    full: '全量导入',
    incremental: '增量导入',
    manual: '手动登记',
    retry: '重试',
  }
  return labels[mode] || mode.replace(/[_-]/g, ' ')
}

function eventLabel(event: IngestionJobEvent) {
  const labels: Record<string, string> = {
    created: '已创建',
    queued: '已排队',
    started: '开始运行',
    progress: '进度更新',
    completed: '已完成',
    succeeded: '已成功',
    failed: '失败',
    cancelled: '已取消',
    review_required: '需要复核',
    retry: '重试',
    note: '备注',
  }
  return labels[event.eventType] || event.eventType.replace(/[_-]/g, ' ')
}

function eventMessage(event: IngestionJobEvent) {
  const message = String(event.message || '').trim()
  if (!message) return ''
  const retrySource = message.match(/^Created retry from ingestion job #(\d+)\.$/)
  if (retrySource) return `已从任务 ${retrySource[1]} 创建重试任务。`
  const retryTarget = message.match(/^Retry job #(\d+) was created\.$/)
  if (retryTarget) return `已创建重试任务 ${retryTarget[1]}。`
  const statusUpdate = message.match(/^任务状态已从 ([a-z_]+) 更新为 ([a-z_]+)。$/)
  if (statusUpdate) {
    const from = statusLabel[statusUpdate[1] as IngestionJobStatus] || statusUpdate[1]
    const to = statusLabel[statusUpdate[2] as IngestionJobStatus] || statusUpdate[2]
    return `任务状态已从 ${from} 更新为 ${to}。`
  }
  return message
}

function IngestionCreateForm({ onCreated }: { onCreated: (job: IngestionJob) => void }) {
  const [provider, setProvider] = useState<(typeof providerOptions)[number]>('openalex')
  const [mode, setMode] = useState('metadata_sync')
  const [yearFrom, setYearFrom] = useState(2025)
  const [yearTo, setYearTo] = useState(2026)
  const [venues, setVenues] = useState('ISSCC,JSSC,CICC,VLSI,ASSCC,ESSCIRC')
  const [query, setQuery] = useState('integrated circuit OR solid-state circuit')
  const [limit, setLimit] = useState(5)
  const [dryRun, setDryRun] = useState(false)
  const [refreshTopics, setRefreshTopics] = useState(false)
  const [includeLowRelevance, setIncludeLowRelevance] = useState(false)
  const [notes, setNotes] = useState('周更元数据导入候选。PDF 仍仅保留出版方跳转或人工本地处理。')

  const mutation = useMutation({
    mutationFn: () => api.createIngestionJob({
      provider,
      mode,
      notes,
      scope: {
        yearFrom,
        yearTo,
        venues: venues.split(',').map((item) => item.trim()).filter(Boolean),
        query: query.trim(),
        limit,
        dryRun,
        refreshTopics,
        includeLowRelevance,
      },
    }),
    onSuccess: onCreated,
  })

  return (
    <section className="ingestion-form">
      <div className="ingestion-section-head">
        <span>登记任务</span>
        <h2>新建导入边界</h2>
      </div>
      <label>
        数据源
        <select value={provider} onChange={(event) => setProvider(event.target.value as typeof provider)}>
          {providerOptions.map((option) => <option key={option} value={option}>{providerLabel(option)}</option>)}
        </select>
      </label>
      <label>
        模式
        <select value={mode} onChange={(event) => setMode(event.target.value)}>
          {modeOptions.map((option) => <option key={option} value={option}>{modeLabel(option)}</option>)}
        </select>
      </label>
      <div className="ingestion-form-pair">
        <label>
          起始年份
          <input type="number" value={yearFrom} onChange={(event) => setYearFrom(Number(event.target.value))} />
        </label>
        <label>
          结束年份
          <input type="number" value={yearTo} onChange={(event) => setYearTo(Number(event.target.value))} />
        </label>
      </div>
      <label>
        会议/期刊
        <input value={venues} onChange={(event) => setVenues(event.target.value)} />
      </label>
      <label>
        查询词
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <label>
        本次上限
        <input type="number" min={1} max={500} value={limit} onChange={(event) => setLimit(Number(event.target.value))} />
      </label>
      <div className="ingestion-checks">
        <label>
          <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />
          仅试运行
        </label>
        <label>
          <input type="checkbox" checked={refreshTopics} onChange={(event) => setRefreshTopics(event.target.checked)} />
          刷新主题分类
        </label>
        <label>
          <input type="checkbox" checked={includeLowRelevance} onChange={(event) => setIncludeLowRelevance(event.target.checked)} />
          包含低相关行
        </label>
      </div>
      <label>
        备注
        <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? '登记中...' : '创建导入任务'}
      </button>
      {mutation.error && <p className="ingestion-error">创建失败：{friendlyError(mutation.error, '导入任务创建失败')}</p>}
    </section>
  )
}

function IngestionEventPanel({ selectedJob }: { selectedJob: IngestionJob | null }) {
  const events = useQuery({
    queryKey: ['ingestion-job-events', selectedJob?.id],
    queryFn: () => api.ingestionJobEvents(selectedJob!.id),
    enabled: Boolean(selectedJob),
    refetchInterval: selectedJob?.status === 'running' || selectedJob?.status === 'queued' ? 10_000 : false,
  })

  if (!selectedJob) {
    return (
      <aside className="ingestion-events">
        <div className="ingestion-section-head">
          <span>时间线</span>
          <h2>选择一个任务</h2>
        </div>
        <p className="learning-muted">点击任务行查看状态变化、重试记录、复核备注和执行进度。</p>
      </aside>
    )
  }

  return (
    <aside className="ingestion-events">
        <div className="ingestion-section-head">
          <span>时间线</span>
          <h2>任务编号 {selectedJob.id}</h2>
        </div>
      <p className="learning-muted">{scopeText(selectedJob.scope)}</p>
      <div className="ingestion-event-list">
        {events.data?.rows.map((event) => (
          <article className={`ingestion-event ingestion-event-${statusClass(event.eventType)}`} key={event.id}>
            <strong>{eventLabel(event)}</strong>
            <small>{formatTime(event.createdAt)}</small>
            {eventMessage(event) && <p>{eventMessage(event)}</p>}
          </article>
        ))}
        {events.isLoading && <p className="learning-muted">正在加载事件...</p>}
        {!events.isLoading && !events.data?.rows.length && <p className="learning-muted">暂无事件记录。</p>}
      </div>
    </aside>
  )
}

function JobActions({ job, onSelected }: { job: IngestionJob; onSelected: (job: IngestionJob) => void }) {
  const queryClient = useQueryClient()
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] })
    queryClient.invalidateQueries({ queryKey: ['ingestion-job-events', job.id] })
    queryClient.invalidateQueries({ queryKey: ['job-operations'] })
    queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
  }
  const start = useMutation({ mutationFn: () => api.startIngestionJob(job.id), onSuccess: (updated) => { onSelected(updated); invalidate() } })
  const cancel = useMutation({ mutationFn: () => api.cancelIngestionJob(job.id), onSuccess: (updated) => { onSelected(updated); invalidate() } })
  const retry = useMutation({ mutationFn: () => api.retryIngestionJob(job.id), onSuccess: (updated) => { onSelected(updated); invalidate() } })
  const status = useMutation({
    mutationFn: (next: IngestionJobStatus) => api.updateIngestionJob(job.id, { status: next }),
    onSuccess: (updated) => { onSelected(updated); invalidate() },
  })

  const busy = start.isPending || cancel.isPending || retry.isPending || status.isPending
  const canRun = runnableProviders.has(job.provider)

  return (
    <div className="ingestion-actions" onClick={(event) => event.stopPropagation()}>
      <button
        disabled={busy || !canRun || (job.status !== 'queued' && job.status !== 'review_required')}
        title={canRun ? '运行这个元数据导入任务' : '该数据源当前只记录任务，暂不自动抓取'}
        onClick={() => start.mutate()}
      >
        开始
      </button>
      <button className="subtle" disabled={busy || job.status === 'succeeded' || job.status === 'cancelled'} onClick={() => cancel.mutate()}>取消</button>
      <button className="subtle" disabled={busy || job.status === 'running'} onClick={() => retry.mutate()}>重试</button>
      <select value={job.status} disabled={busy} onChange={(event) => status.mutate(event.target.value as IngestionJobStatus)}>
        {statusOptions.map((option) => <option key={option} value={option}>{statusLabel[option]}</option>)}
      </select>
    </div>
  )
}

function IngestionJobRow({
  job,
  selected,
  onSelect,
}: {
  job: IngestionJob
  selected: boolean
  onSelect: (job: IngestionJob) => void
}) {
  const totalTouched = job.counts.inserted + job.counts.updated + job.counts.review
  return (
    <article className={`ingestion-row ${selected ? 'is-selected' : ''}`} onClick={() => onSelect(job)}>
      <div>
        <strong>任务 {job.id} · {providerLabel(job.provider)}</strong>
        <small>{modeLabel(job.mode)}</small>
      </div>
      <span className={`pill pill-${statusClass(job.status)}`}>{statusLabel[job.status]}</span>
      <div>
        <p>{scopeText(job.scope)}</p>
        <small>{job.notes || '无备注'}</small>
      </div>
      <div>
        <strong>{totalTouched.toLocaleString()}</strong>
        <small>{job.counts.inserted} 新增 / {job.counts.updated} 更新 / {job.counts.review} 待复核</small>
      </div>
      <div>
        <strong>{formatTime(job.updatedAt)}</strong>
        <small>创建于 {formatTime(job.createdAt)}</small>
      </div>
      <JobActions job={job} onSelected={onSelect} />
    </article>
  )
}

export default function JournalIngestionPage() {
  const queryClient = useQueryClient()
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)
  const jobs = useQuery({
    queryKey: ['ingestion-jobs'],
    queryFn: () => api.ingestionJobs({ limit: 80 }),
    refetchInterval: 30_000,
  })

  const stats = useMemo(() => {
    const rows = jobs.data?.rows || []
    return {
      total: jobs.data?.total || 0,
      active: rows.filter((job) => job.status === 'queued' || job.status === 'running').length,
      failed: rows.filter((job) => job.status === 'failed').length,
      review: rows.filter((job) => job.status === 'review_required').length,
    }
  }, [jobs.data])

  const selectedJob = useMemo(() => {
    const rows = jobs.data?.rows || []
    return rows.find((job) => job.id === selectedJobId) || rows[0] || null
  }, [jobs.data, selectedJobId])

  function handleCreated(job: IngestionJob) {
    setSelectedJobId(job.id)
    queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] })
    queryClient.invalidateQueries({ queryKey: ['job-operations'] })
    queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
  }

  return (
    <div className="ingestion-page">
      <section className="ingestion-hero">
        <div>
          <span>导入控制台</span>
          <h1>周更导入任务</h1>
          <p>
            把 IEEE、OpenAlex、Crossref、CSV 和本地元数据导入登记为可审计任务。每次运行都会记录来源范围、
            数量、错误和复核状态，让周更数据库可追踪、可回滚。
          </p>
        </div>
        <div className="ingestion-hero-card">
          <strong>{stats.total.toLocaleString()}</strong>
          <span>{stats.active} 个活跃 / {stats.failed} 个失败 / {stats.review} 个需复核</span>
        </div>
      </section>

      <section className="ingestion-grid">
        <IngestionCreateForm onCreated={handleCreated} />
        <div className="ingestion-policy">
          <div className="ingestion-section-head">
            <span>导入策略</span>
            <h2>先保证元数据安全</h2>
          </div>
          <ul>
            <li>元数据导入应能按数据源、会议期刊、年份、DOI 和来源版本重复执行。</li>
            <li>PDF 采集保持本地/私有或跳转出版方，公开页面只展示 DOI、摘要等允许范围。</li>
            <li>大批量导入前先备份；别名和会议期刊复核后再刷新快照。</li>
            <li>失败或高风险行进入“需复核”，不要静默改变排序快照或对比结果。</li>
          </ul>
        </div>
      </section>

      <section className="ingestion-workbench">
        <div className="ingestion-board">
          <div className="ingestion-board-head">
            <div>
              <span>任务</span>
              <h2>{stats.total.toLocaleString()} 个已登记任务</h2>
            </div>
            <strong>{jobs.isFetching ? '刷新中' : '本地任务库'}</strong>
          </div>
          <div className="ingestion-table">
            {jobs.data?.rows.map((job) => (
              <IngestionJobRow
                key={job.id}
                job={job}
                selected={selectedJob?.id === job.id}
                onSelect={(next) => setSelectedJobId(next.id)}
              />
            ))}
            {jobs.isLoading && <p className="learning-muted">正在加载导入任务...</p>}
            {!jobs.isLoading && !jobs.data?.rows.length && <p className="learning-muted">还没有导入任务。可以先在上方登记第一个导入边界。</p>}
          </div>
        </div>
        <IngestionEventPanel selectedJob={selectedJob} />
      </section>
    </div>
  )
}
