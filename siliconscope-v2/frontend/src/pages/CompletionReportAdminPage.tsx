import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { localPdfMatchStatusLabel } from '../utils/displayLabels'

function statusClass(status: string) {
  if (status === 'complete') return 'admin-op-ready'
  if (status === 'wired') return 'admin-op-planned'
  return 'admin-op-warn'
}

const statusLabel: Record<string, string> = {
  complete: '已完成',
  wired: '已接线',
  pending_runtime: '运行待验证',
}

const runStatusLabel: Record<string, string> = {
  success: '成功',
  succeeded: '成功',
  failed: '失败',
  error: '异常',
  running: '运行中',
  queued: '排队中',
  dry_run: '试运行',
}

const runModeLabel: Record<string, string> = {
  dry_run: '试运行',
  incremental: '增量导入',
  full: '全量导入',
  manual: '手动导入',
}

const dedupeCandidateTypeLabel: Record<string, string> = {
  doi: 'DOI 重复',
  title_year: '标题/年份重复',
  source_id: '来源 ID 重复',
}

function numberText(value: unknown) {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num.toLocaleString() : '-'
}

function readableFallback(value?: string | null) {
  return value ? String(value).replace(/[_-]/g, ' ') : '-'
}

function formatConfidence(value: unknown) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  return num <= 1 ? `${Math.round(num * 100)}%` : `${Math.round(num)}%`
}

function IngestionRunPreview({ value }: { value: Record<string, any> }) {
  const upsert = value.upsert || {}
  const sources = Array.isArray(value.sources) ? value.sources : []
  return (
    <ul className="admin-mini-list">
      <li><span>运行状态</span><small>{runStatusLabel[value.status] || readableFallback(value.status)}</small></li>
      <li><span>运行方式</span><small>{value.dryRun ? '试运行，未写入数据库' : '正式写入'}</small></li>
      <li><span>来源</span><small>{sources.map((source: any) => `${source.source} ${numberText(source.fetched)} 条`).join('，') || '-'}</small></li>
      <li><span>候选论文</span><small>抓取 {numberText(value.raw)}，合并 {numberText(value.merged)}，保留 {numberText(value.kept)}，过滤 {numberText(value.filtered)}</small></li>
      <li><span>复核线索</span><small>低置信 {numberText(value.lowConfidence)}，重复候选 {numberText(value.dedupeCandidates)}</small></li>
      <li><span>写入结果</span><small>新增 {numberText(upsert.inserted)}，更新 {numberText(upsert.updated)}，跳过 {numberText(upsert.skipped)}</small></li>
      <li><span>完成时间</span><small>{value.finishedAt ? new Date(value.finishedAt).toLocaleString() : '-'}</small></li>
    </ul>
  )
}

const tableLabels: Record<string, string> = {
  papers: '论文主表',
  paperSources: '论文来源表',
  metadataAudits: '元数据审计表',
  topicEdges: '论文-方向关联',
  aiAnnotations: 'AI 标注表',
  readingWorkflow: '阅读工作流',
  localPdf: '本地 PDF 索引',
  authorCandidates: '作者身份候选',
  institutionCandidates: '机构身份候选',
  geoPoints: '机构地理点',
  snapshots: '计算快照',
  searchDocs: '搜索文档',
  entitlements: '权益表',
}

const counterLabels: Record<string, string> = {
  papers: '论文',
  paperSources: '来源记录',
  metadataAudits: '元数据审计',
  lowConfidence: '低置信元数据',
  topicEdges: '方向关联',
  aiAnnotations: 'AI 标注',
  readingWorkflow: '阅读工作流项',
  localPdf: '本地 PDF',
  authorCandidates: '作者候选',
  institutionCandidates: '机构候选',
  geoPoints: '地理点',
  snapshots: '快照',
  searchDocs: '搜索文档',
  companies: '企业',
}

function ReadinessPreview({ tables, counters }: { tables: Record<string, unknown>; counters: Record<string, unknown> }) {
  const missingTables = Object.entries(tables).filter(([, value]) => !value).map(([key]) => tableLabels[key] || key)
  return (
    <div className="admin-mini-list">
      <li><span>数据表</span><small>{Object.entries(tables).filter(([, value]) => Boolean(value)).length}/{Object.keys(tables).length} 已存在</small></li>
      {!!missingTables.length && <li><span>缺失表</span><small>{missingTables.slice(0, 4).join('、')}</small></li>}
      {Object.entries(counters).slice(0, 8).map(([key, value]) => (
        <li key={key}><span>{counterLabels[key] || key}</span><small>{Number(value || 0).toLocaleString()}</small></li>
      ))}
    </div>
  )
}

function releaseDecisionLabel(value?: string) {
  const labels: Record<string, string> = {
    runtime_qa_required: '需要运行时 QA',
    blocked_until_real_database_and_runtime_qa: '等待真实数据库与运行时 QA',
  }
  return value ? labels[value] || value.replace(/[_-]/g, ' ') : '检查中'
}

export default function CompletionReportAdminPage() {
  const queryClient = useQueryClient()
  const report = useQuery({ queryKey: ['completion-report'], queryFn: () => api.completionReport(), refetchInterval: 60_000 })
  const runs = useQuery({ queryKey: ['paper-ingestion-runs'], queryFn: () => api.paperIngestionRuns({ limit: 8 }) })
  const dedupe = useQuery({ queryKey: ['paper-dedupe'], queryFn: () => api.paperDedupe({ limit: 8, status: 'open' }) })
  const pdfs = useQuery({ queryKey: ['local-pdfs'], queryFn: () => api.localPdfs({ limit: 8, status: 'all' }) })
  const authorCandidates = useQuery({ queryKey: ['identity-candidates', 'author'], queryFn: () => api.identityCandidates('author', { limit: 5 }) })
  const institutionCandidates = useQuery({ queryKey: ['identity-candidates', 'institution'], queryFn: () => api.identityCandidates('institution', { limit: 5 }) })

  const scanDedupe = useMutation({
    mutationFn: () => api.scanPaperDedupe({ limit: 100, persist: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paper-dedupe'] }),
  })

  const dryRunIngestion = useMutation({
    mutationFn: () => api.runPaperIngestion({ dryRun: true, query: 'integrated circuit', yearFrom: 2024, limitPerSource: 5 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paper-ingestion-runs'] }),
  })

  const data = report.data

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <span>交付完成度</span>
          <h1>SiliconScope v2 完成度看板</h1>
          <p>
            跟踪 20 个工作流在产品侧的落地情况：导入、来源追踪、主题分类、学习、阅读流、PDF 本地索引、
            实体归一、情报页面、搜索、快照、后台运维、商业边界、上线准备和 UI。
          </p>
        </div>
        <div className={`admin-health ${data?.releaseDecision === 'runtime_qa_required' ? 'admin-health-ok' : 'admin-health-warn'}`}>
          <strong>{data?.summary?.complete ?? 0}/{data?.summary?.total ?? 20}</strong>
          <span>{releaseDecisionLabel(data?.releaseDecision)}</span>
        </div>
      </section>

      {data && (
        <section className="admin-status-strip">
          <div><span>已完成</span><strong>{data.summary.complete}</strong></div>
          <div><span>已接线</span><strong>{data.summary.wired}</strong></div>
          <div><span>运行待验证</span><strong>{data.summary.pendingRuntime}</strong></div>
          <div><span>生成时间</span><strong>{new Date(data.generatedAt).toLocaleString()}</strong></div>
        </section>
      )}

      <section className="admin-grid">
        <div className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>任务</span>
              <h2>20 个工作流</h2>
            </div>
          </div>
          <div className="admin-ops">
            {(data?.tasks || []).map((task) => (
              <article key={task.id} className={`admin-op ${statusClass(task.status)}`}>
                <div className="admin-op-head">
                  <span>{statusLabel[task.status] || readableFallback(task.status)}</span>
                  <strong>任务 {task.id}</strong>
                </div>
                <h3>{task.title}</h3>
                <ul className="admin-mini-list">
                  {task.evidence.map((line) => <li key={line}><span>{line}</span></li>)}
                </ul>
              </article>
            ))}
            {!data && <p className="learning-muted">正在加载完成度报告...</p>}
          </div>
        </div>

        <aside className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>边界</span>
              <h2>发布护栏</h2>
            </div>
          </div>
          <ul className="admin-mini-list">
            {(data?.caveats || ['正在加载运行边界...']).map((line) => <li key={line}><span>{line}</span></li>)}
          </ul>
          {data && <ReadinessPreview tables={data.tables} counters={data.counters} />}
        </aside>
      </section>

      <section className="admin-grid">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>导入</span>
              <h2>多源论文流水线</h2>
            </div>
            <button type="button" disabled={dryRunIngestion.isPending} onClick={() => dryRunIngestion.mutate()}>
              {dryRunIngestion.isPending ? '运行中...' : '试运行'}
            </button>
          </div>
          <ul className="admin-mini-list">
            {(runs.data?.rows || []).map((row: any) => (
              <li key={row.id}><span>{runStatusLabel[row.status] || readableFallback(row.status)}</span><small>{runModeLabel[row.mode] || readableFallback(row.mode)} · {row.created_at || row.createdAt}</small></li>
            ))}
            {!runs.data?.rows?.length && <li><span>暂无导入运行记录。</span></li>}
          </ul>
          {dryRunIngestion.data && <IngestionRunPreview value={dryRunIngestion.data} />}
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>去重</span>
              <h2>重复候选</h2>
            </div>
            <button type="button" disabled={scanDedupe.isPending} onClick={() => scanDedupe.mutate()}>
              {scanDedupe.isPending ? '扫描中...' : '扫描'}
            </button>
          </div>
          <ul className="admin-mini-list">
            {(dedupe.data?.rows || dedupe.data?.candidates || []).map((item) => (
              <li key={item.id}><span>{dedupeCandidateTypeLabel[item.candidateType] || readableFallback(item.candidateType)}</span><small>论文 ID {item.paperIds.join(', ')} · 置信度 {formatConfidence(item.confidence)}</small></li>
            ))}
            {!(dedupe.data?.rows || dedupe.data?.candidates || []).length && <li><span>暂无待处理重复候选。</span></li>}
          </ul>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>本地 PDF</span>
              <h2>个人本地索引</h2>
            </div>
          </div>
          <ul className="admin-mini-list">
            {(pdfs.data?.rows || []).map((row) => (
              <li key={row.id}><span>{localPdfMatchStatusLabel(row.matchStatus)}</span><small>{row.titleGuess || row.filePath}</small></li>
            ))}
            {!pdfs.data?.rows?.length && <li><span>暂无本地 PDF 索引项。可在本地运行 npm run pdf:scan。</span></li>}
          </ul>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>实体归一</span>
              <h2>合并/拆分候选</h2>
            </div>
          </div>
          <h3>作者</h3>
          <ul className="admin-mini-list">
            {(authorCandidates.data?.rows || []).map((row: any) => <li key={`a-${row.id}`}><span>{row.canonical_name || row.canonicalName}</span><small>{row.confidence}</small></li>)}
            {!authorCandidates.data?.rows?.length && <li><span>暂无作者候选。</span></li>}
          </ul>
          <h3>机构</h3>
          <ul className="admin-mini-list">
            {(institutionCandidates.data?.rows || []).map((row: any) => <li key={`i-${row.id}`}><span>{row.canonical_name || row.canonicalName}</span><small>{row.confidence}</small></li>)}
            {!institutionCandidates.data?.rows?.length && <li><span>暂无机构候选。</span></li>}
          </ul>
        </div>
      </section>
    </div>
  )
}
