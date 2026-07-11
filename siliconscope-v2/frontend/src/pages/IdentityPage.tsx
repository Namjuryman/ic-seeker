import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { IdentityAliasInput, IdentityAliasRow, IdentityCandidateRow } from '../types'
import { friendlyError } from '../utils/errorMessages'

type AliasType = 'author' | 'institution'
type CandidateStatus = 'pending' | 'all' | 'auto' | 'merged' | 'rejected' | 'split_required'
type CandidateAction = 'apply' | 'reject' | 'undo' | 'split-required'

const emptyForm: IdentityAliasInput = {
  alias: '',
  canonicalName: '',
  institutionHint: '',
  countryCode: '',
  countryName: '',
  city: '',
  source: 'manual',
  confidence: 100,
}

const typeLabel: Record<AliasType, string> = {
  author: '作者',
  institution: '机构',
}

const candidateStatusLabel: Record<CandidateStatus, string> = {
  pending: '待复核',
  all: '全部',
  auto: '自动候选',
  merged: '已合并',
  rejected: '已拒绝',
  split_required: '需拆分',
}

const actionLabel: Record<CandidateAction, string> = {
  apply: '应用合并',
  reject: '拒绝',
  undo: '撤销',
  'split-required': '标记需拆分',
}

function sourceLabel(value?: string | null) {
  const raw = String(value || 'manual')
  const labels: Record<string, string> = {
    manual: '人工维护',
    'candidate-review': '候选复核',
    import: '导入',
    crawler: '采集',
  }
  return labels[raw] || '来源待确认'
}

function AliasBadge({ row }: { row: IdentityAliasRow }) {
  return (
    <div className="identity-alias-card">
      <div className="min-w-0">
        <p className="profile-kicker">{sourceLabel(row.source)} / 置信度 {row.confidence}%</p>
        <h3>{row.canonicalName}</h3>
        <p className="hint break-all">别名键：{row.alias}</p>
        {row.institutionHint && <p className="hint">机构线索：{row.institutionHint}</p>}
        {(row.countryName || row.city) && <p className="hint">{[row.countryName, row.city].filter(Boolean).join(' / ')}</p>}
      </div>
      <span>{row.updatedAt || '已更新'}</span>
    </div>
  )
}

function CandidateCard({
  row,
  busy,
  onAction,
}: {
  row: IdentityCandidateRow
  busy: boolean
  onAction: (row: IdentityCandidateRow, action: CandidateAction) => void
}) {
  const detail = row.type === 'author'
    ? [
      row.institutionHistory?.length ? `机构线索 ${row.institutionHistory.slice(0, 3).join(' / ')}` : '',
      row.coauthorSignature?.length ? `合作者 ${row.coauthorSignature.slice(0, 4).join(' / ')}` : '',
    ].filter(Boolean).join(' · ')
    : [
      [row.countryName, row.city].filter(Boolean).join(' / '),
      row.parentInstitution ? `上级机构 ${row.parentInstitution}` : '',
      row.labOrSchool ? `学院/实验室 ${row.labOrSchool}` : '',
    ].filter(Boolean).join(' · ')

  return (
    <article className="identity-candidate-card">
      <div className="identity-candidate-main">
        <div>
          <p className="profile-kicker">{candidateStatusLabel[row.reviewStatus as CandidateStatus] || row.reviewStatus} / {row.paperCount} 篇论文 / 置信度 {row.confidence}%</p>
          <h3>{row.canonicalName}</h3>
          <p className="hint break-all">归一键：{row.normalizedKey}</p>
          {detail && <p className="hint">{detail}</p>}
        </div>
        <div className="identity-candidate-score">{row.confidence}%</div>
      </div>
      <div className="identity-candidate-aliases">
        {(row.aliases || []).slice(0, 10).map((alias) => <span key={alias}>{alias}</span>)}
      </div>
      <div className="identity-row-actions">
        <button disabled={busy} onClick={() => onAction(row, 'apply')}>应用合并</button>
        <button disabled={busy} onClick={() => onAction(row, 'reject')}>拒绝</button>
        <button disabled={busy} onClick={() => onAction(row, 'split-required')}>需拆分</button>
        <button disabled={busy} className="danger" onClick={() => onAction(row, 'undo')}>撤销</button>
      </div>
    </article>
  )
}

export default function IdentityPage() {
  const [type, setType] = useState<AliasType>('author')
  const [candidateStatus, setCandidateStatus] = useState<CandidateStatus>('pending')
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<IdentityAliasRow[]>([])
  const [candidates, setCandidates] = useState<IdentityCandidateRow[]>([])
  const [candidateTotal, setCandidateTotal] = useState(0)
  const [form, setForm] = useState<IdentityAliasInput>(emptyForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [candidateBusyId, setCandidateBusyId] = useState('')

  const modeLabel = useMemo(() => typeLabel[type], [type])

  const loadAliases = async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await api.identityAliases(type, { q: query, limit: 80 }))
    } catch (err: any) {
      setError(friendlyError(err, '加载别名失败'))
    } finally {
      setLoading(false)
    }
  }

  const loadCandidates = async () => {
    setError('')
    try {
      const result = await api.identityCandidates(type, { status: candidateStatus, limit: 30 })
      setCandidates(result.rows)
      setCandidateTotal(result.total)
    } catch (err: any) {
      setError(friendlyError(err, '加载候选失败，请先运行身份候选扫描。'))
      setCandidates([])
      setCandidateTotal(0)
    }
  }

  const reload = async () => {
    await Promise.all([loadAliases(), loadCandidates()])
  }

  useEffect(() => {
    reload().catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, candidateStatus])

  const save = async () => {
    setError('')
    setMessage('')
    try {
      const saved = await api.saveIdentityAlias(type, form)
      setMessage(`已保存别名：${saved.alias} -> ${saved.canonicalName}`)
      setForm({ ...emptyForm, source: 'manual', confidence: 100 })
      await reload()
    } catch (err: any) {
      setError(friendlyError(err, '保存失败'))
    }
  }

  const remove = async (alias: string) => {
    setError('')
    setMessage('')
    try {
      await api.deleteIdentityAlias(type, alias)
      setMessage(`已删除别名：${alias}`)
      await reload()
    } catch (err: any) {
      setError(friendlyError(err, '删除失败'))
    }
  }

  const reviewCandidate = async (row: IdentityCandidateRow, action: CandidateAction) => {
    setError('')
    setMessage('')
    setCandidateBusyId(row.id)
    try {
      const result = await api.reviewIdentityCandidate(type, row.id, action)
      setMessage(`候选 ${row.canonicalName} 已执行“${actionLabel[action]}”，写入 ${result.aliasesWritten} 条，回滚 ${result.aliasesDeleted} 条。`)
      await reload()
    } catch (err: any) {
      setError(friendlyError(err, '候选复核失败'))
    } finally {
      setCandidateBusyId('')
    }
  }

  const edit = (row: IdentityAliasRow) => {
    setForm({
      alias: row.alias,
      canonicalName: row.canonicalName,
      institutionHint: row.institutionHint || '',
      countryCode: row.countryCode || '',
      countryName: row.countryName || '',
      city: row.city || '',
      source: row.source || 'manual',
      confidence: row.confidence || 100,
    })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <section className="hero-panel identity-hero">
        <div>
          <p className="profile-kicker">实体归一</p>
          <h1>身份消歧与别名管理</h1>
          <p>这里处理作者和机构的元数据归一。它不是最终身份认证，仍需要 IEEE affiliation、ORCID、ROR 和人工审核持续校准。</p>
        </div>
        <div className="hero-metrics">
          <div><span>模式</span><strong>{modeLabel}</strong></div>
          <div><span>别名</span><strong>{rows.length}</strong></div>
          <div><span>候选</span><strong>{candidateTotal}</strong></div>
        </div>
      </section>

      <section className="identity-workbench">
        <div className="identity-toolbar">
          <div className="flex gap-2 flex-wrap">
            <button className={`profile-filter ${type === 'author' ? 'active' : ''}`} onClick={() => setType('author')}>作者别名</button>
            <button className={`profile-filter ${type === 'institution' ? 'active' : ''}`} onClick={() => setType('institution')}>机构别名</button>
          </div>
          <div className="identity-search">
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadAliases()} placeholder="搜索别名 / 标准名 / 国家地区" />
            <button onClick={loadAliases} disabled={loading}>{loading ? '加载中...' : '搜索'}</button>
          </div>
        </div>

        {(message || error) && (
          <div className={`identity-notice ${error ? 'danger' : ''}`}>{error || message}</div>
        )}

        <div className="identity-review-grid">
          <div className="identity-list">
            <div className="identity-list-head">
              <div>
                <p className="profile-kicker">复核队列</p>
                <h2>候选合并复核</h2>
              </div>
              <select className="workbench-input" value={candidateStatus} onChange={(e) => setCandidateStatus(e.target.value as CandidateStatus)}>
                <option value="pending">待复核</option>
                <option value="all">全部</option>
                <option value="auto">自动候选</option>
                <option value="merged">已合并</option>
                <option value="rejected">已拒绝</option>
                <option value="split_required">需拆分</option>
              </select>
            </div>
            {!candidates.length && <div className="empty">没有候选。可以运行 backend 的 identity:candidates 生成，或切换状态查看历史。</div>}
            {candidates.map((row) => (
              <CandidateCard key={row.id} row={row} busy={candidateBusyId === row.id} onAction={reviewCandidate} />
            ))}
          </div>

          <form className="identity-form" onSubmit={(e) => { e.preventDefault(); save() }}>
            <h2>{type === 'author' ? '人工作者合并 / 拆分' : '人工机构映射'}</h2>
            <p className="hint">合并：把某个别名指向标准名。拆分：删除错误别名，或改到新的标准名。</p>
            <label>别名 / 原始写法<input value={form.alias} onChange={(e) => setForm((prev) => ({ ...prev, alias: e.target.value }))} placeholder={type === 'author' ? '例如 R. P. Martins' : '例如 CUHK Shenzhen'} /></label>
            <label>标准名<input value={form.canonicalName} onChange={(e) => setForm((prev) => ({ ...prev, canonicalName: e.target.value }))} placeholder={type === 'author' ? '例如 Rui P. Martins' : '例如 The Chinese University of Hong Kong, Shenzhen'} /></label>
            {type === 'author' ? (
              <label>机构线索<input value={form.institutionHint || ''} onChange={(e) => setForm((prev) => ({ ...prev, institutionHint: e.target.value }))} placeholder="可选的消歧线索" /></label>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label>国家/地区代码<input value={form.countryCode || ''} onChange={(e) => setForm((prev) => ({ ...prev, countryCode: e.target.value.toUpperCase() }))} placeholder="MO" /></label>
                <label>国家/地区<input value={form.countryName || ''} onChange={(e) => setForm((prev) => ({ ...prev, countryName: e.target.value }))} placeholder="Macau" /></label>
                <label>城市<input value={form.city || ''} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} placeholder="Macau" /></label>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label>来源<input value={form.source || 'manual'} onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))} /></label>
              <label>置信度<input type="number" min={0} max={100} value={form.confidence ?? 100} onChange={(e) => setForm((prev) => ({ ...prev, confidence: Number(e.target.value) }))} /></label>
            </div>
            <button type="submit" disabled={!form.alias.trim() || !form.canonicalName.trim()}>保存别名</button>
          </form>
        </div>

        <div className="identity-list mt-4">
          <div className="identity-list-head"><h2>当前映射</h2><span>{rows.length} 条</span></div>
          {!rows.length && <div className="empty">没有找到别名。可以在上方新增，或换个关键词搜索。</div>}
          {rows.map((row) => (
            <div key={row.alias} className="identity-row-shell">
              <AliasBadge row={row} />
              <div className="identity-row-actions">
                <button onClick={() => edit(row)}>编辑</button>
                <button className="danger" onClick={() => remove(row.alias)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
