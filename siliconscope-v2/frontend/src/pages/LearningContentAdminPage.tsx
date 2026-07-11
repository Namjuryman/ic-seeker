import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { friendlyError } from '../utils/errorMessages'
import type { LearningContentOverview, LearningContentRow } from '../types'

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function kindLabel(kind: string) {
  const labels: Record<string, string> = {
    roadmap: '学习路线',
    lesson: '每日课程',
    route_family: '路线族群',
    foundation_group: '通用基础',
  }
  return labels[kind] || '内容类型待确认'
}

function publishStatusLabel(status: string) {
  const labels: Record<string, string> = {
    published: '已发布',
    draft: '草稿',
    archived: '已归档',
  }
  return labels[status] || '发布状态待确认'
}

function statusClass(status: string) {
  if (status === 'published') return 'bg-green-50 text-green-700 border-green-100'
  if (status === 'draft') return 'bg-amber-50 text-amber-700 border-amber-100'
  return 'bg-surface-elevated text-ink-muted border-line-subtle'
}

function severityLabel(severity: string) {
  if (severity === 'high') return '高'
  if (severity === 'medium') return '中'
  if (severity === 'low') return '低'
  return severity
}

function RowList({
  rows,
  selectedKey,
  onSelect,
}: {
  rows: LearningContentRow[]
  selectedKey: string
  onSelect: (row: LearningContentRow) => void
}) {
  if (!rows.length) return <p className="text-sm text-ink-muted">没有内容项。</p>
  return (
    <div className="space-y-2 max-h-[560px] overflow-auto">
      {rows.map((row) => (
        <button
          key={`${row.itemKind}:${row.itemId}`}
          type="button"
          onClick={() => onSelect(row)}
          className={`w-full text-left grid lg:grid-cols-[140px_1fr_120px_120px_170px] gap-2 items-center rounded-lg border p-3 text-sm transition ${
            selectedKey === `${row.itemKind}:${row.itemId}` ? 'border-brand-400 bg-brand-50/60' : 'border-line hover:border-brand-200 hover:bg-surface-elevated'
          }`}
        >
          <span className="text-xs font-semibold text-brand-700">{kindLabel(row.itemKind)}</span>
          <div>
            <div className="font-semibold text-ink-text">{row.title || row.itemId}</div>
            <div className="text-xs text-ink-muted font-mono">{row.itemId}</div>
          </div>
          <span className={`w-fit rounded-full border px-2 py-0.5 text-xs ${statusClass(row.status)}`}>{publishStatusLabel(row.status)}</span>
          <span className="text-ink-muted">{formatBytes(row.bytes)}</span>
          <span className="text-xs text-ink-muted">{formatDate(row.updatedAt)}</span>
        </button>
      ))}
    </div>
  )
}

export default function LearningContentAdminPage() {
  const [data, setData] = useState<LearningContentOverview | null>(null)
  const [kind, setKind] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<LearningContentRow | null>(null)
  const [editorTitle, setEditorTitle] = useState('')
  const [editorStatus, setEditorStatus] = useState('published')
  const [payloadText, setPayloadText] = useState('')
  const [saving, setSaving] = useState(false)

  const rows = useMemo(() => {
    const all = data?.rows || []
    const q = query.trim().toLowerCase()
    return all.filter((row) => {
      const kindOk = kind === 'all' || row.itemKind === kind
      const qOk = !q || row.title.toLowerCase().includes(q) || row.itemId.toLowerCase().includes(q)
      return kindOk && qOk
    })
  }, [data, kind, query])

  async function load() {
    setLoading(true)
    setError('')
    try {
      setData(await api.learningContentAdmin())
    } catch (err: any) {
      setError(friendlyError(err, '学习内容加载失败。'))
    } finally {
      setLoading(false)
    }
  }

  async function syncSeed() {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const result = await api.syncLearningSeed()
      setMessage(`已同步 ${result.seedItems} 个种子内容项，变更 ${result.changedRows} 行。`)
      await load()
    } catch (err: any) {
      setError(friendlyError(err, '学习内容种子同步失败。'))
    } finally {
      setLoading(false)
    }
  }

  async function openItem(row: LearningContentRow) {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const item = await api.learningContentItem(row.itemKind, row.itemId)
      setSelected(item)
      setEditorTitle(item.title || '')
      setEditorStatus(item.status || 'published')
      setPayloadText(item.payloadJson || '')
    } catch (err: any) {
      setError(friendlyError(err, '学习内容项加载失败。'))
    } finally {
      setLoading(false)
    }
  }

  function formatPayload() {
    try {
      setPayloadText(JSON.stringify(JSON.parse(payloadText), null, 2))
      setError('')
    } catch (err: any) {
      console.error(err)
      setError('JSON 格式化失败：请检查括号、引号和逗号。')
    }
  }

  async function saveItem() {
    if (!selected) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const item = await api.updateLearningContentItem(selected.itemKind, selected.itemId, {
        title: editorTitle,
        status: editorStatus,
        payloadJson: payloadText,
      })
      setSelected(item)
      setEditorTitle(item.title || '')
      setEditorStatus(item.status || 'published')
      setPayloadText(item.payloadJson || '')
      setMessage(`已保存 ${kindLabel(item.itemKind)} / ${item.itemId}。`)
      await load()
    } catch (err: any) {
      setError(friendlyError(err, '学习内容项保存失败。'))
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const summary = data?.summary
  const projection = data?.projection
  const quality = data?.quality
  const hasProblems = Boolean(data?.validation.errors.length || data?.outOfSyncRows.length || data?.staleRows.length)

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div className="flex justify-between gap-4 items-start flex-wrap">
          <div>
            <p className="profile-kicker">学习内容库</p>
            <h1 className="text-2xl font-bold text-ink-text">学习内容管理</h1>
            <p className="text-sm text-ink-muted mt-1">
              管理学习路线、每日课程、路线族群和通用基础内容。公共学习页优先读取已发布的数据库内容。
            </p>
            <p className="text-sm text-ink-subtle mt-1">
              代码中的种子目录仅作兜底；人工校正后请同步并检查发布状态。
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="px-3 py-2 rounded-lg bg-surface-elevated border border-line text-sm disabled:opacity-50">
              重新加载
            </button>
            <button onClick={syncSeed} disabled={loading} className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm disabled:opacity-50">
              同步种子内容
            </button>
          </div>
        </div>
      </section>

      {(error || message) && (
        <div className={`rounded-xl border p-3 text-sm ${error ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
          {error || message}
        </div>
      )}

      <section className="grid md:grid-cols-4 gap-4">
        <div className="bg-surface-panel border border-line rounded-xl p-4">
          <div className="text-xs text-ink-subtle">数据库内容项</div>
          <div className="text-3xl font-bold mt-1">{summary?.dbItems ?? '-'}</div>
          <div className="text-xs text-ink-muted mt-1">{summary?.published ?? 0} 个已发布</div>
        </div>
        <div className="bg-surface-panel border border-line rounded-xl p-4">
          <div className="text-xs text-ink-subtle">种子内容项</div>
          <div className="text-3xl font-bold mt-1">{summary?.seedItems ?? '-'}</div>
          <div className="text-xs text-ink-muted mt-1">{data?.sourceVersion || '-'}</div>
        </div>
        <div className="bg-surface-panel border border-line rounded-xl p-4">
          <div className="text-xs text-ink-subtle">路线 / 课程</div>
          <div className="text-3xl font-bold mt-1">{summary ? `${summary.roadmaps}/${summary.lessons}` : '-'}</div>
          <div className="text-xs text-ink-muted mt-1">当前发布目录</div>
        </div>
        <div className={`border rounded-xl p-4 ${hasProblems ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
          <div className="text-xs text-ink-subtle">内容健康度</div>
          <div className={`text-3xl font-bold mt-1 ${hasProblems ? 'text-amber-700' : 'text-green-700'}`}>
            {hasProblems ? '需复核' : '正常'}
          </div>
          <div className="text-xs text-ink-muted mt-1">
            {data?.validation.errors.length || 0} 个错误 · {data?.validation.warnings.length || 0} 个警告
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
        <article className={`border rounded-xl p-4 ${quality && quality.score >= 80 ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
          <div className="text-xs text-ink-subtle">内容检查分</div>
          <div className="flex items-end gap-2 mt-1">
            <strong className={`text-4xl ${quality && quality.score >= 80 ? 'text-green-700' : 'text-amber-700'}`}>
              {quality?.score ?? '-'}
            </strong>
            <span className="text-sm text-ink-muted pb-1">检查等级 {quality?.grade ?? '-'}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-white/70 border border-line-subtle px-2 py-1">
              有课程的路线 <strong>{quality?.coverage.routesWithLessons ?? 0}/{quality?.coverage.roadmaps ?? 0}</strong>
            </div>
            <div className="rounded-lg bg-white/70 border border-line-subtle px-2 py-1">
              问题 <strong>{quality?.issues.length ?? 0}</strong>
            </div>
          </div>
        </article>
        <article className="bg-surface-panel border border-line rounded-xl p-4">
          <div className="flex justify-between gap-3 items-start">
            <div>
              <h2 className="font-semibold text-ink-text">内容结构缺口</h2>
              <p className="text-sm text-ink-muted">内容检查会关注路线描述过薄、缺少阶段、缺少搜索钩子、缺少会议/期刊入口和课程覆盖不足等问题。</p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="rounded-full bg-red-50 text-red-700 border border-red-100 px-2 py-1">高 {quality?.issueCounts.high ?? 0}</span>
              <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-100 px-2 py-1">中 {quality?.issueCounts.medium ?? 0}</span>
              <span className="rounded-full bg-surface-elevated text-ink-muted border border-line px-2 py-1">低 {quality?.issueCounts.low ?? 0}</span>
            </div>
          </div>
          <div className="mt-3 grid md:grid-cols-2 gap-2 text-sm max-h-48 overflow-auto">
            {(quality?.issues || []).slice(0, 12).map((issue) => (
              <div key={`${issue.target}-${issue.message}`} className="rounded-lg border border-line-subtle bg-surface-elevated px-3 py-2">
                <div className="flex justify-between gap-2">
                  <strong className="text-ink-text">{issue.target}</strong>
                  <span className={issue.severity === 'high' ? 'text-red-700' : issue.severity === 'medium' ? 'text-amber-700' : 'text-ink-muted'}>{severityLabel(issue.severity)}</span>
                </div>
                <p className="text-ink-muted mt-1">{issue.message}</p>
              </div>
            ))}
            {quality && quality.issues.length === 0 && <p className="text-green-700">未发现明显内容缺口。</p>}
          </div>
        </article>
      </section>

      <section className="grid lg:grid-cols-4 gap-4">
        <article className="bg-surface-panel border border-line rounded-xl p-4">
          <h2 className="font-semibold text-ink-text">按类型统计</h2>
          <div className="mt-3 space-y-2">
            {Object.entries(data?.byKind || {}).map(([key, count]) => (
              <div key={key} className="flex justify-between rounded-lg bg-surface-elevated border border-line-subtle px-3 py-2 text-sm">
                <span>{kindLabel(key)}</span>
                <strong>{count}</strong>
              </div>
            ))}
            {!data && <p className="text-sm text-ink-muted">正在加载...</p>}
          </div>
        </article>
        <article className="bg-surface-panel border border-line rounded-xl p-4">
          <h2 className="font-semibold text-ink-text">校验</h2>
          <div className="mt-3 space-y-2 text-sm">
            {(data?.validation.errors || []).map((item) => <p key={item} className="text-red-700">{item}</p>)}
            {(data?.validation.warnings || []).slice(0, 8).map((item) => <p key={item} className="text-amber-700">{item}</p>)}
            {data && !data.validation.errors.length && !data.validation.warnings.length && <p className="text-green-700">没有校验问题。</p>}
          </div>
        </article>
        <article className="bg-surface-panel border border-line rounded-xl p-4">
          <h2 className="font-semibold text-ink-text">同步状态</h2>
          <div className="mt-3 space-y-2 text-sm">
            <p><strong>{data?.outOfSyncRows.length || 0}</strong> 行与当前种子目录不同。</p>
            <p><strong>{data?.staleRows.length || 0}</strong> 行已不在种子目录中。</p>
            <p><strong>{formatBytes(summary?.bytes || 0)}</strong> 已存储内容体积。</p>
            <p className="text-ink-muted">下一步可在 JSON 编辑器上方增加按内容类型划分的结构化表单。</p>
          </div>
        </article>
        <article className="bg-surface-panel border border-line rounded-xl p-4">
          <h2 className="font-semibold text-ink-text">投影层</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-line-subtle bg-surface-elevated px-3 py-2">
              <div className="text-xs text-ink-muted">路线</div>
              <strong>{projection?.routes ?? '-'}</strong>
            </div>
            <div className="rounded-lg border border-line-subtle bg-surface-elevated px-3 py-2">
              <div className="text-xs text-ink-muted">课程</div>
              <strong>{projection?.lessons ?? '-'}</strong>
            </div>
            <div className="rounded-lg border border-line-subtle bg-surface-elevated px-3 py-2">
              <div className="text-xs text-ink-muted">族群</div>
              <strong>{projection?.routeFamilies ?? '-'}</strong>
            </div>
            <div className="rounded-lg border border-line-subtle bg-surface-elevated px-3 py-2">
              <div className="text-xs text-ink-muted">术语</div>
              <strong>{projection?.terms ?? '-'}</strong>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            公共页面保留完整内容体；搜索和分析功能可以读取归一化后的投影表。
          </p>
        </article>
      </section>

      <section className="grid xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] gap-4">
        <article className="bg-surface-panel border border-line rounded-xl p-4 shadow-sm">
          <div className="flex justify-between gap-3 items-center mb-3 flex-wrap">
            <div>
              <h2 className="font-semibold text-ink-text">内容台账</h2>
              <p className="text-sm text-ink-muted">{rows.length} 个可见内容项</p>
            </div>
            <div className="flex gap-2">
              <select value={kind} onChange={(event) => setKind(event.target.value)} className="px-3 py-2 rounded-lg border border-line text-sm bg-white">
                <option value="all">全部类型</option>
                <option value="route_family">路线族群</option>
                <option value="foundation_group">通用基础</option>
                <option value="roadmap">学习路线</option>
                <option value="lesson">每日课程</option>
              </select>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="px-3 py-2 rounded-lg border border-line text-sm"
                placeholder="筛选标题或 ID"
              />
            </div>
          </div>
          <RowList rows={rows} selectedKey={selected ? `${selected.itemKind}:${selected.itemId}` : ''} onSelect={openItem} />
        </article>

        <aside className="bg-surface-panel border border-line rounded-xl p-4 shadow-sm xl:sticky xl:top-4 self-start">
          <div className="flex justify-between gap-3 items-start">
            <div>
              <h2 className="font-semibold text-ink-text">编辑器</h2>
              <p className="text-sm text-ink-muted">
                {selected ? `${kindLabel(selected.itemKind)} / ${selected.itemId}` : '选择一个内容项，编辑 JSON 内容体和发布状态。'}
              </p>
            </div>
            {selected && <span className={`w-fit rounded-full border px-2 py-0.5 text-xs ${statusClass(editorStatus)}`}>{publishStatusLabel(editorStatus)}</span>}
          </div>

          {!selected ? (
            <div className="mt-4 rounded-xl border border-dashed border-line p-6 text-sm text-ink-muted">
              下一步可以给每类学习内容做结构化表单。当前 JSON 编辑器先作为安全的后台操作层。
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-xs font-semibold text-ink-muted">标题</span>
                <input
                  value={editorTitle}
                  onChange={(event) => setEditorTitle(event.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-line text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold text-ink-muted">发布状态</span>
                <select
                  value={editorStatus}
                  onChange={(event) => setEditorStatus(event.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-line text-sm bg-white"
                >
                  <option value="published">已发布</option>
                  <option value="draft">草稿</option>
                  <option value="archived">已归档</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold text-ink-muted">内容 JSON</span>
                <textarea
                  value={payloadText}
                  onChange={(event) => setPayloadText(event.target.value)}
                  spellCheck={false}
                  className="mt-1 w-full min-h-[460px] font-mono text-xs px-3 py-2 rounded-lg border border-line bg-surface-elevated"
                />
              </label>
              <div className="flex gap-2 justify-end">
                <button onClick={formatPayload} disabled={saving} className="px-3 py-2 rounded-lg border border-line bg-white text-sm disabled:opacity-50">
                  格式化 JSON
                </button>
                <button onClick={saveItem} disabled={saving} className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm disabled:opacity-50">
                  {saving ? '保存中...' : '保存内容项'}
                </button>
              </div>
              <p className="text-xs text-ink-muted">
                保存已发布内容会触发目录校验。草稿和归档内容不会进入公共学习接口。
              </p>
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}
