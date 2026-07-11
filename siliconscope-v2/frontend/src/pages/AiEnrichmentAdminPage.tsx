import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { PaperAiAnnotationRow, PaperAiRunResult, PaperAiTopicHit } from '../types'
import { aiModelLabel, providerLabel } from '../utils/displayLabels'
import { friendlyError } from '../utils/errorMessages'

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{typeof value === 'number' ? value.toLocaleString() : value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  )
}

function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function TopicChips({ topics }: { topics: PaperAiTopicHit[] }) {
  if (!topics.length) return <span className="learning-muted">暂无方向关联</span>
  return (
    <div className="company-tags">
      {topics.slice(0, 4).map((topic) => (
        <em key={`${topic.topicId}-${topic.confidence}`}>
          {topic.label} {Math.round(Number(topic.confidence || 0) * 100)}%
        </em>
      ))}
    </div>
  )
}

function aiJobStatusLabel(status?: string) {
  if (!status) return '暂无'
  const labels: Record<string, string> = {
    success: '成功',
    succeeded: '成功',
    complete: '已完成',
    completed: '已完成',
    ready: '已完成',
    running: '运行中',
    queued: '排队中',
    pending: '待处理',
    skipped: '已跳过',
    failed: '失败',
    error: '异常',
    weak: '低置信度',
    missing: '缺少标注',
    stale: '输入已变化',
  }
  return labels[status] || '状态待确认'
}

function aiScopeLabel(scope?: string) {
  if (!scope) return '-'
  const labels: Record<string, string> = {
    weak: '低置信度或噪声行',
    missing: '缺少标注',
    stale: '输入已变化',
    all: '全部行',
  }
  return labels[scope] || '范围待确认'
}

function AnnotationRow({ row }: { row: PaperAiAnnotationRow }) {
  const topics = parseJson<PaperAiTopicHit[]>(row.topics_json, [])
  const needsReview = row.needs_review === true || row.needs_review === 1
  return (
    <article className={`admin-op ${needsReview ? 'admin-op-warn' : 'admin-op-ready'}`}>
      <div className="admin-op-head">
        <span>{row.venue || row.domain || '论文'}</span>
        <strong>{Math.round(Number(row.confidence || 0) * 100)}%</strong>
      </div>
      <h3>{row.title}</h3>
      <p>{row.summary_zh || row.summary_en || '尚未生成摘要。'}</p>
      <TopicChips topics={topics} />
      <div className="admin-mini-list mt-3">
        <li><span>论文</span><small>论文 {row.paper_id || row.paperId}</small></li>
        <li><span>年份</span><small>{row.year || '-'}</small></li>
        <li><span>状态</span><small>{needsReview ? '需复核' : aiJobStatusLabel(row.status)}</small></li>
      </div>
    </article>
  )
}

function RunResultPanel({ result }: { result: PaperAiRunResult }) {
  return (
    <section className={`rounded-xl border p-4 text-sm ${result.ok ? 'border-green-100 bg-green-50 text-green-800' : 'border-red-100 bg-red-50 text-red-800'}`}>
      <div className="flex justify-between gap-4 flex-wrap">
        <div>
          <strong>{result.dryRun ? '试运行完成' : '批处理完成'}</strong>
          <p className="mt-1">
            排队 {result.queued.toLocaleString()}，处理 {result.processed.toLocaleString()}，失败 {result.failed.toLocaleString()}，
            写入方向关联 {result.topicEdgesWritten.toLocaleString()}
          </p>
        </div>
        <span>{providerLabel(result.provider)} / {aiModelLabel(result.model)}</span>
      </div>
      {!!result.samples.length && (
        <div className="mt-3 grid md:grid-cols-2 gap-2">
          {result.samples.slice(0, 6).map((sample) => (
            <div key={sample.paperId} className="rounded-lg bg-white/70 border border-white p-3">
              <div className="font-semibold text-ink-text line-clamp-2">{sample.title}</div>
              <div className="text-xs mt-1 text-ink-muted">
                论文 {sample.paperId} · {Math.round(sample.confidence * 100)}% · {sample.needsReview ? '需复核' : '通过'}
              </div>
              <TopicChips topics={sample.topics} />
            </div>
          ))}
        </div>
      )}
      {!!result.errors.length && (
        <ul className="mt-3 grid gap-1">
          {result.errors.slice(0, 4).map((error, index) => (
            <li key={`${index}-${error}`}>{friendlyError(error, '部分论文处理失败，请查看任务日志。')}</li>
          ))}
          {result.errors.length > 4 && <li>还有 {result.errors.length - 4} 条失败记录，已保留在任务日志中。</li>}
        </ul>
      )}
    </section>
  )
}

export default function AiEnrichmentAdminPage() {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState('weak')
  const [provider, setProvider] = useState('rule-local')
  const [model, setModel] = useState('heuristic-v1')
  const [limit, setLimit] = useState(100)
  const [minTopicConfidence, setMinTopicConfidence] = useState(55)
  const [dryRun, setDryRun] = useState(true)
  const [writeTopicEdges, setWriteTopicEdges] = useState(true)
  const [needsReviewOnly, setNeedsReviewOnly] = useState(true)
  const [lastResult, setLastResult] = useState<PaperAiRunResult | null>(null)

  const overview = useQuery({
    queryKey: ['paper-ai-overview'],
    queryFn: () => api.paperAiOverview(),
  })
  const annotations = useQuery({
    queryKey: ['paper-ai-annotations', needsReviewOnly],
    queryFn: () => api.paperAiAnnotations({ limit: 40, needsReview: needsReviewOnly }),
  })
  const runBatch = useMutation({
    mutationFn: () => api.runPaperAiEnrichment({ mode, provider, model, limit, minTopicConfidence, dryRun, writeTopicEdges }),
    onSuccess: (result) => {
      setLastResult(result)
      queryClient.invalidateQueries({ queryKey: ['paper-ai-overview'] })
      queryClient.invalidateQueries({ queryKey: ['paper-ai-annotations'] })
    },
  })

  const latestJob = overview.data?.latestJob
  const coverageLabel = useMemo(() => `${overview.data?.coverage ?? 0}%`, [overview.data?.coverage])

  function handleProviderChange(nextProvider: string) {
    setProvider(nextProvider)
    if (nextProvider === 'rule-local') {
      setModel('heuristic-v1')
    } else if (model === 'heuristic-v1') {
      setModel('')
    }
  }

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <span>论文标注流水线</span>
          <h1>论文 AI 辅助标注</h1>
          <p>
            基于元数据生成摘要线索、主题路径、指标和复核标记。当前本地规则提供稳定试运行；
            外部模型接入后仍通过同一任务台账审计。
          </p>
        </div>
        <div className={`admin-health ${(overview.data?.needsReview || 0) > 0 ? 'admin-health-warn' : 'admin-health-ok'}`}>
          <strong>{coverageLabel}</strong>
          <span>{providerLabel(overview.data?.provider || 'rule-local')} / {aiModelLabel(overview.data?.model)}</span>
        </div>
      </section>

      {(overview.isError || annotations.isError || runBatch.isError) && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {friendlyError(overview.error || annotations.error || runBatch.error, 'AI 标注管理任务失败。')}
        </div>
      )}

      <section className="admin-status-strip">
        <StatCard label="已标注论文" value={overview.data?.annotatedPapers ?? 0} sub={`共 ${overview.data?.totalPapers?.toLocaleString() || 0} 篇`} />
        <StatCard label="标注记录" value={overview.data?.annotations ?? 0} sub={overview.data?.promptVersion || '-'} />
        <StatCard label="需复核" value={overview.data?.needsReview ?? 0} sub="低置信度 / 异常线索" />
        <StatCard label="最近任务" value={aiJobStatusLabel(latestJob?.status)} sub={latestJob ? `${latestJob.processed}/${latestJob.queued}` : '尚未运行批处理'} />
      </section>

      <section className="admin-grid">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>运行控制</span>
              <h2>批量标注</h2>
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-ink-text">
              范围
              <select value={mode} onChange={(event) => setMode(event.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2">
                <option value="weak">低置信度或噪声行</option>
                <option value="missing">缺少标注</option>
                <option value="stale">输入已变化</option>
                <option value="all">全部行</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-ink-text">
              提供方
              <select value={provider} onChange={(event) => handleProviderChange(event.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2">
                <option value="rule-local">本地规则（免费、可复现）</option>
                <option value="openai-compatible">OpenAI 兼容接口</option>
              </select>
            </label>
            {provider === 'rule-local' ? (
              <div className="rounded-lg border border-line bg-surface-elevated px-3 py-2 text-sm text-ink-muted">
                <span className="block font-semibold text-ink-text">模型</span>
                <strong className="mt-1 block text-ink-text">本地规则标注</strong>
                <p className="mt-1">使用固定规则和元数据线索，不调用外部模型，也不会产生付费请求。</p>
              </div>
            ) : (
              <label className="block text-sm font-semibold text-ink-text">
                模型
                <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="例如 gpt-4.1-mini" className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
              </label>
            )}
            <label className="block text-sm font-semibold text-ink-text">
              本次上限
              <input type="number" min={1} max={5000} value={limit} onChange={(event) => setLimit(Number(event.target.value || 1))} className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
            </label>
            <label className="block text-sm font-semibold text-ink-text">
              最低主题置信度
              <input type="number" min={0} max={99} value={minTopicConfidence} onChange={(event) => setMinTopicConfidence(Number(event.target.value || 55))} className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-text">
              <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />
              先试运行
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-text">
              <input type="checkbox" checked={writeTopicEdges} onChange={(event) => setWriteTopicEdges(event.target.checked)} />
              写入派生方向关联
            </label>
            <button type="button" onClick={() => runBatch.mutate()} disabled={runBatch.isPending} className="w-full rounded-lg bg-brand-600 px-4 py-3 text-white font-semibold disabled:opacity-50">
              {runBatch.isPending ? '运行中...' : dryRun ? '运行试算' : '运行批处理'}
            </button>
            <p className="learning-muted">
              建议先试运行。外部模型接入需要先在后端运维配置中填写兼容接口和访问密钥；本地规则不会调用付费 API。
            </p>
          </div>
        </div>

        <div className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>复核队列</span>
              <h2>最近标注</h2>
            </div>
            <button type="button" onClick={() => setNeedsReviewOnly((value) => !value)}>
              {needsReviewOnly ? '显示全部' : '仅看需复核'}
            </button>
          </div>
          {lastResult && <RunResultPanel result={lastResult} />}
          <div className="admin-ops mt-4">
            {(annotations.data?.rows || []).map((row) => <AnnotationRow key={row.id} row={row} />)}
            {!annotations.data?.rows?.length && (
              <p className="learning-muted">{annotations.isLoading ? '正在加载标注...' : '暂无标注记录。运行批处理后会进入这里。'}</p>
            )}
          </div>
        </div>

        <aside className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>任务台账</span>
              <h2>最近运行</h2>
            </div>
          </div>
          <ul className="admin-mini-list">
            <li><span>状态</span><small>{aiJobStatusLabel(latestJob?.status)}</small></li>
            <li><span>范围</span><small>{aiScopeLabel(latestJob?.scope)}</small></li>
            <li><span>排队</span><small>{latestJob?.queued?.toLocaleString() || '0'}</small></li>
            <li><span>已处理</span><small>{latestJob?.processed?.toLocaleString() || '0'}</small></li>
            <li><span>失败</span><small>{latestJob?.failed?.toLocaleString() || '0'}</small></li>
            <li><span>成本</span><small>${Number(latestJob?.actual_cost_usd || 0).toFixed(4)}</small></li>
          </ul>
          <div className="mt-4 rounded-xl border border-line-subtle bg-surface-elevated p-3 text-sm text-ink-muted">
            外部模型接入时必须保留预算上限、结构校验和来源约束提示。这里是模型适配器的后台控制入口。
          </div>
        </aside>
      </section>
    </div>
  )
}
