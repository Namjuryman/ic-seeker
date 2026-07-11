import { useEffect, useState } from 'react'
import { api } from '../api'
import type { ContentQualityFindingResult, DataQualityReport } from '../types'
import { paperRankLabel, targetTypeLabel } from '../utils/displayLabels'
import { friendlyError } from '../utils/errorMessages'

const severityLabels: Record<string, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
}

const findingTypeLabels: Record<string, string> = {
  duplicate_doi: '重复 DOI',
  duplicate_title_year: '重复标题/年份',
  unknown_venue: '会议/期刊待映射',
  low_confidence_topic: '方向低置信',
  missing_affiliation: '机构缺失',
  venue_publication_mismatch: '来源错配',
  low_metadata_confidence: '元数据低置信',
  ai_review: 'AI 标注待复核',
}

function Card({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-surface-panel border border-line rounded-xl p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-ink-subtle">{title}</div>
      <div className="text-2xl font-bold text-ink-text mt-1">{value}</div>
      {hint && <div className="text-xs text-ink-muted mt-1">{hint}</div>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-panel border border-line rounded-xl p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-text mb-3">{title}</h2>
      {children}
    </section>
  )
}

function SmallTable({ rows, columns }: { rows: any[]; columns: Array<{ key: string; label: string; render?: (row: any) => React.ReactNode }> }) {
  if (!rows.length) return <p className="text-sm text-ink-muted">没有发现问题。</p>
  return (
    <div className="overflow-auto rounded-lg border border-line max-h-[420px]">
      <table className="min-w-full text-xs">
        <thead className="bg-surface-soft text-ink-subtle sticky top-0">
          <tr>{columns.map((column) => <th key={column.key} className="px-3 py-2 text-left font-medium">{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line-subtle">
          {rows.map((row, idx) => (
            <tr key={idx} className="align-top">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-2 text-ink-secondary max-w-md">
                  {column.render ? column.render(row) : String(row[column.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DataQualityPage() {
  const [report, setReport] = useState<DataQualityReport | null>(null)
  const [findings, setFindings] = useState<ContentQualityFindingResult | null>(null)
  const [error, setError] = useState('')
  const [syncMessage, setSyncMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [scanLimit, setScanLimit] = useState(12000)
  const [sampleLimit, setSampleLimit] = useState(50)

  const loadFindings = async () => {
    try {
      setFindings(await api.contentQualityFindings({ status: 'open', limit: 40 }))
    } catch (err) {
      console.warn('Failed to load content-quality findings', err)
    }
  }

  useEffect(() => {
    loadFindings()
  }, [])

  const runAnalysis = async () => {
    setLoading(true)
    setError('')
    try {
      setReport(await api.dataQuality({ scanLimit, sampleLimit }))
    } catch (err: any) {
      setError(friendlyError(err, '数据质量报告加载失败'))
    } finally {
      setLoading(false)
    }
  }

  const syncFindings = async () => {
    setSyncing(true)
    setError('')
    setSyncMessage('')
    try {
      const result = await api.syncContentQualityFindings({ scanLimit, sampleLimit })
      setSyncMessage(`已同步 ${result.total} 个当前问题。待处理队列：${result.open}。`)
      await loadFindings()
    } catch (err: any) {
      setError(friendlyError(err, '数据质量状态更新失败'))
    } finally {
      setSyncing(false)
    }
  }

  const updateFinding = async (id: number, status: 'open' | 'ignored' | 'resolved') => {
    await api.updateContentQualityFinding(id, { status })
    await loadFindings()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-text">数据质量</h1>
        <p className="text-sm text-ink-muted mt-1">
          扫描本地论文库，并把重要问题同步到持久复核队列。这里覆盖重复论文、弱主题、会议期刊错配、
          机构缺失、别名归一和 AI 标注风险。
        </p>
      </div>

      <section className="bg-surface-panel border border-line rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-end gap-3">
        <div>
          <label className="text-xs text-ink-subtle block mb-1">扫描行数</label>
          <select value={scanLimit} onChange={(event) => setScanLimit(Number(event.target.value))} className="px-3 py-2 rounded-lg border border-line bg-white text-sm">
            {[5000, 12000, 25000, 50000].map((value) => <option key={value} value={value}>{value.toLocaleString()}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-ink-subtle block mb-1">每类问题样本数</label>
          <select value={sampleLimit} onChange={(event) => setSampleLimit(Number(event.target.value))} className="px-3 py-2 rounded-lg border border-line bg-white text-sm">
            {[25, 50, 100, 200].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <button onClick={runAnalysis} disabled={loading} className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm disabled:opacity-50">
          {loading ? '分析中...' : '运行分析'}
        </button>
        <button onClick={syncFindings} disabled={syncing} className="px-4 py-2 rounded-lg border border-line bg-white text-sm text-ink-text disabled:opacity-50">
          {syncing ? '同步中...' : '同步问题'}
        </button>
        {report && <span className="text-xs text-ink-muted">最近生成：{report.generatedAt} / 已扫描 {report.scannedRows ?? '-'} 行</span>}
      </section>

      {error && <div className="rounded-xl border p-3 text-sm bg-red-50 text-red-700 border-red-100">{error}</div>}
      {syncMessage && <div className="rounded-xl border p-3 text-sm bg-emerald-50 text-emerald-700 border-emerald-100">{syncMessage}</div>}
      {!report && !loading && !error && (
        <div className="text-sm text-ink-muted bg-surface-panel border border-line rounded-xl p-4">
          还没有生成报告。需要有边界地扫描数据库时，点击“运行分析”。
        </div>
      )}
      {loading && <div className="text-sm text-ink-muted bg-surface-panel border border-line rounded-xl p-4">正在分析数据库，大数据量可能需要几秒。</div>}

      <Section title={`持久复核问题${findings ? `（${findings.total} 个待处理）` : ''}`}>
        {!findings?.rows.length ? (
          <p className="text-sm text-ink-muted">暂无待处理问题。完成一次分析后可点击“同步问题”。</p>
        ) : (
          <div className="space-y-2">
            {findings.rows.map((item) => (
              <div key={item.id} className="rounded-lg border border-line p-3 bg-white flex flex-col md:flex-row md:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${item.severity === 'high' ? 'bg-red-50 text-red-700' : item.severity === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      {severityLabels[item.severity] || item.severity}
                    </span>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
                      {findingTypeLabels[item.findingType] || item.findingType}
                    </span>
                    <span className="text-xs text-ink-muted">{targetTypeLabel(item.targetType)}：{item.targetId}</span>
                  </div>
                  <div className="text-sm font-semibold text-ink-text mt-2 break-words">{item.title}</div>
                  <div className="text-xs text-ink-secondary mt-1 break-words">{item.summary}</div>
                  <div className="text-[11px] text-ink-muted mt-1">最近发现 {item.lastSeenAt}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => updateFinding(item.id, 'ignored')} className="px-3 py-1.5 rounded-lg border border-line text-xs bg-white">忽略</button>
                  <button onClick={() => updateFinding(item.id, 'resolved')} className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs">标记解决</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {report && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Card title="论文总数" value={report.totalPapers} hint="当前本地快照" />
            <Card title="扫描行数" value={report.scannedRows ?? '-'} hint="有边界扫描" />
            <Card title="重复 DOI" value={report.duplicateDoi.length} hint="重复分组" />
            <Card title="缺失机构" value={report.missingAffiliations} hint="影响地图和画像" />
            <Card title="来源错配" value={report.venuePublicationMismatches?.length ?? 0} hint="影响来源和排序信号" />
            <Card title="元数据置信度" value={report.lowMetadataConfidence?.length ?? 0} hint="低于 60 需复核" />
            <Card title="AI 复核" value={report.aiReviewQueue?.length ?? 0} hint="低置信标注" />
          </div>

          <Section title="建议">
            <ul className="list-disc pl-5 text-sm text-ink-secondary space-y-1">
              {report.recommendations.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Section>

          <Section title="重复 DOI 候选">
            <SmallTable rows={report.duplicateDoi} columns={[{ key: 'key', label: 'DOI' }, { key: 'count', label: '数量' }, { key: 'samples', label: '样本', render: (row) => <span className="break-words">{row.samples}</span> }]} />
          </Section>

          <Section title="重复标题 + 年份候选">
            <SmallTable rows={report.duplicateTitleYear} columns={[{ key: 'key', label: '标题/年份键' }, { key: 'count', label: '数量' }, { key: 'samples', label: '样本', render: (row) => <span className="break-words">{row.samples}</span> }]} />
          </Section>

          <Section title="未知或弱会议期刊映射">
            <SmallTable rows={report.unknownVenues} columns={[{ key: 'venue', label: '会议/期刊' }, { key: 'rank', label: '等级', render: (row) => paperRankLabel(row.rank) }, { key: 'count', label: '数量' }, { key: 'avgScore', label: '平均排序信号' }]} />
          </Section>

          <Section title="低置信主题分组">
            <SmallTable rows={report.lowConfidenceTopics} columns={[{ key: 'field', label: '方向' }, { key: 'count', label: '数量' }, { key: 'avgHits', label: '平均命中' }, { key: 'samples', label: '样本', render: (row) => <span className="break-words">{row.samples}</span> }]} />
          </Section>

          <Section title="低元数据置信度论文">
            <SmallTable
              rows={report.lowMetadataConfidence || []}
              columns={[
                { key: 'id', label: '论文' },
                { key: 'metadataConfidence', label: '元数据置信度' },
                { key: 'venue', label: '会议/期刊' },
                { key: 'confidenceFlags', label: '标记', render: (row) => <span className="break-words">{row.confidenceFlags || '-'}</span> },
                { key: 'title', label: '标题', render: (row) => <span className="break-words">{row.title}</span> },
              ]}
            />
          </Section>

          <Section title="会议期刊 / 出版标题错配">
            <SmallTable
              rows={report.venuePublicationMismatches || []}
              columns={[
                { key: 'id', label: '论文' },
                { key: 'venue', label: '会议/期刊' },
                { key: 'publicationTitle', label: '出版标题' },
                { key: 'domain', label: '领域' },
                { key: 'title', label: '标题', render: (row) => <span className="break-words">{row.title}</span> },
              ]}
            />
          </Section>

          <Section title="AI 标注复核队列">
            <SmallTable
              rows={report.aiReviewQueue || []}
              columns={[
                { key: 'paperId', label: '论文' },
                { key: 'venue', label: '会议/期刊' },
                { key: 'confidence', label: '置信度', render: (row) => `${Math.round(Number(row.confidence || 0) * 100)}%` },
                { key: 'primaryDomain', label: '领域' },
                { key: 'title', label: '标题', render: (row) => <span className="break-words">{row.title}</span> },
                { key: 'summary', label: '摘要', render: (row) => <span className="break-words">{row.summary || '-'}</span> },
              ]}
            />
          </Section>

          <Section title="机构别名候选">
            <SmallTable rows={report.institutionVariants} columns={[{ key: 'key', label: '归一键' }, { key: 'count', label: '数量' }, { key: 'variants', label: '变体', render: (row) => <div className="space-y-1">{row.variants.map((value: string) => <div key={value}>{value}</div>)}</div> }]} />
          </Section>

          <Section title="作者重名/歧义候选">
            <SmallTable rows={report.ambiguousAuthors} columns={[{ key: 'key', label: '姓名键' }, { key: 'count', label: '数量' }, { key: 'variants', label: '变体', render: (row) => <div>{row.variants.join(' / ')}</div> }, { key: 'venues', label: '会议/期刊', render: (row) => <div>{row.venues.join(', ')}</div> }]} />
          </Section>
        </>
      )}
    </div>
  )
}
