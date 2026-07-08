import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { IdentityAliasInput, IdentityAliasRow, IdentityCandidateRow } from '../types'

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

function AliasBadge({ row }: { row: IdentityAliasRow }) {
  return (
    <div className="identity-alias-card">
      <div className="min-w-0">
        <p className="profile-kicker">{row.source || 'manual'} / confidence {row.confidence}%</p>
        <h3>{row.canonicalName}</h3>
        <p className="hint break-all">alias key: {row.alias}</p>
        {row.institutionHint && <p className="hint">institution hint: {row.institutionHint}</p>}
        {(row.countryName || row.city) && <p className="hint">{[row.countryName, row.city].filter(Boolean).join(' / ')}</p>}
      </div>
      <span>{row.updatedAt || 'updated'}</span>
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
      row.parentInstitution ? `parent ${row.parentInstitution}` : '',
      row.labOrSchool ? `lab/school ${row.labOrSchool}` : '',
    ].filter(Boolean).join(' · ')

  return (
    <article className="identity-candidate-card">
      <div className="identity-candidate-main">
        <div>
          <p className="profile-kicker">{row.reviewStatus} / {row.paperCount} papers / confidence {row.confidence}%</p>
          <h3>{row.canonicalName}</h3>
          <p className="hint break-all">key: {row.normalizedKey}</p>
          {detail && <p className="hint">{detail}</p>}
        </div>
        <div className="identity-candidate-score">{row.confidence}%</div>
      </div>
      <div className="identity-candidate-aliases">
        {(row.aliases || []).slice(0, 10).map((alias) => <span key={alias}>{alias}</span>)}
      </div>
      <div className="identity-row-actions">
        <button disabled={busy} onClick={() => onAction(row, 'apply')}>Apply merge</button>
        <button disabled={busy} onClick={() => onAction(row, 'reject')}>Reject</button>
        <button disabled={busy} onClick={() => onAction(row, 'split-required')}>Needs split</button>
        <button disabled={busy} className="danger" onClick={() => onAction(row, 'undo')}>Undo</button>
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

  const modeLabel = useMemo(() => type === 'author' ? 'Author' : 'Institution', [type])

  const loadAliases = async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await api.identityAliases(type, { q: query, limit: 80 }))
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || '加载 alias 失败')
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
      setError(err?.response?.data?.error || err.message || '加载候选失败，请先运行 identity:candidates')
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
      setMessage(`已保存 alias: ${saved.alias} -> ${saved.canonicalName}`)
      setForm({ ...emptyForm, source: 'manual', confidence: 100 })
      await reload()
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || '保存失败')
    }
  }

  const remove = async (alias: string) => {
    setError('')
    setMessage('')
    try {
      await api.deleteIdentityAlias(type, alias)
      setMessage(`已删除 alias: ${alias}`)
      await reload()
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || '删除失败')
    }
  }

  const reviewCandidate = async (row: IdentityCandidateRow, action: CandidateAction) => {
    setError('')
    setMessage('')
    setCandidateBusyId(row.id)
    try {
      const result = await api.reviewIdentityCandidate(type, row.id, action)
      setMessage(`候选 ${row.canonicalName} 已执行 ${action}，写入 ${result.aliasesWritten} 条，回滚 ${result.aliasesDeleted} 条。`)
      await reload()
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || '候选复核失败')
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
          <p className="profile-kicker">Identity normalization</p>
          <h1>身份消歧与 Alias 管理</h1>
          <p>这里处理作者和机构的 metadata normalization。它不是最终身份认证，后续仍需要 IEEE affiliation、ORCID、ROR 和人工审核继续校准。</p>
        </div>
        <div className="hero-metrics">
          <div><span>Mode</span><strong>{modeLabel}</strong></div>
          <div><span>Aliases</span><strong>{rows.length}</strong></div>
          <div><span>Candidates</span><strong>{candidateTotal}</strong></div>
        </div>
      </section>

      <section className="identity-workbench">
        <div className="identity-toolbar">
          <div className="flex gap-2 flex-wrap">
            <button className={`profile-filter ${type === 'author' ? 'active' : ''}`} onClick={() => setType('author')}>Author aliases</button>
            <button className={`profile-filter ${type === 'institution' ? 'active' : ''}`} onClick={() => setType('institution')}>Institution aliases</button>
          </div>
          <div className="identity-search">
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadAliases()} placeholder="Search alias / canonical / country" />
            <button onClick={loadAliases} disabled={loading}>{loading ? 'Loading...' : 'Search'}</button>
          </div>
        </div>

        {(message || error) && (
          <div className={`identity-notice ${error ? 'danger' : ''}`}>{error || message}</div>
        )}

        <div className="identity-review-grid">
          <div className="identity-list">
            <div className="identity-list-head">
              <div>
                <p className="profile-kicker">Review queue</p>
                <h2>候选合并复核</h2>
              </div>
              <select className="workbench-input" value={candidateStatus} onChange={(e) => setCandidateStatus(e.target.value as CandidateStatus)}>
                <option value="pending">pending</option>
                <option value="all">all</option>
                <option value="auto">auto</option>
                <option value="merged">merged</option>
                <option value="rejected">rejected</option>
                <option value="split_required">split required</option>
              </select>
            </div>
            {!candidates.length && <div className="empty">没有候选。可以运行 backend 的 identity:candidates 生成，或切换状态查看历史。</div>}
            {candidates.map((row) => (
              <CandidateCard key={row.id} row={row} busy={candidateBusyId === row.id} onAction={reviewCandidate} />
            ))}
          </div>

          <form className="identity-form" onSubmit={(e) => { e.preventDefault(); save() }}>
            <h2>{type === 'author' ? 'Manual author merge / split' : 'Manual institution mapping'}</h2>
            <p className="hint">Merge: 把某个 alias 指向 canonical。Split: 删除错误 alias 或改到新的 canonical。</p>
            <label>Alias / raw spelling<input value={form.alias} onChange={(e) => setForm((prev) => ({ ...prev, alias: e.target.value }))} placeholder={type === 'author' ? 'e.g. R. P. Martins' : 'e.g. CUHK Shenzhen'} /></label>
            <label>Canonical name<input value={form.canonicalName} onChange={(e) => setForm((prev) => ({ ...prev, canonicalName: e.target.value }))} placeholder={type === 'author' ? 'e.g. Rui P. Martins' : 'e.g. The Chinese University of Hong Kong, Shenzhen'} /></label>
            {type === 'author' ? (
              <label>Institution hint<input value={form.institutionHint || ''} onChange={(e) => setForm((prev) => ({ ...prev, institutionHint: e.target.value }))} placeholder="optional disambiguation hint" /></label>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label>Country code<input value={form.countryCode || ''} onChange={(e) => setForm((prev) => ({ ...prev, countryCode: e.target.value.toUpperCase() }))} placeholder="MO" /></label>
                <label>Country/region<input value={form.countryName || ''} onChange={(e) => setForm((prev) => ({ ...prev, countryName: e.target.value }))} placeholder="Macau" /></label>
                <label>City<input value={form.city || ''} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} placeholder="Macau" /></label>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label>Source<input value={form.source || 'manual'} onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))} /></label>
              <label>Confidence<input type="number" min={0} max={100} value={form.confidence ?? 100} onChange={(e) => setForm((prev) => ({ ...prev, confidence: Number(e.target.value) }))} /></label>
            </div>
            <button type="submit" disabled={!form.alias.trim() || !form.canonicalName.trim()}>Save alias</button>
          </form>
        </div>

        <div className="identity-list mt-4">
          <div className="identity-list-head"><h2>Current mappings</h2><span>{rows.length} rows</span></div>
          {!rows.length && <div className="empty">No aliases found. Add one above, or search a different keyword.</div>}
          {rows.map((row) => (
            <div key={row.alias} className="identity-row-shell">
              <AliasBadge row={row} />
              <div className="identity-row-actions">
                <button onClick={() => edit(row)}>Edit</button>
                <button className="danger" onClick={() => remove(row.alias)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
