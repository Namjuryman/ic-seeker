import { useEffect, useState } from 'react'
import { api } from '../api'
import type { IdentityAliasInput, IdentityAliasRow } from '../types'

type AliasType = 'author' | 'institution'

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
        <p className="profile-kicker">{row.source || 'manual'} · confidence {row.confidence}%</p>
        <h3>{row.canonicalName}</h3>
        <p className="hint break-all">alias key: {row.alias}</p>
        {row.institutionHint && <p className="hint">institution hint: {row.institutionHint}</p>}
        {(row.countryName || row.city) && <p className="hint">{[row.countryName, row.city].filter(Boolean).join(' · ')}</p>}
      </div>
      <span>{row.updatedAt || 'updated'}</span>
    </div>
  )
}

export default function IdentityPage() {
  const [type, setType] = useState<AliasType>('author')
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<IdentityAliasRow[]>([])
  const [form, setForm] = useState<IdentityAliasInput>(emptyForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
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

  useEffect(() => {
    load().catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  const save = async () => {
    setError('')
    setMessage('')
    try {
      const saved = await api.saveIdentityAlias(type, form)
      setMessage(`已保存 alias: ${saved.alias} → ${saved.canonicalName}`)
      setForm({ ...emptyForm, source: 'manual', confidence: 100 })
      await load()
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
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || '删除失败')
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
          <h1>Alias 管理</h1>
          <p>手动维护 author_aliases / institution_aliases。这里做的是 metadata normalization，不是绝对身份认证；profile 页面仍会显示 caveat。</p>
        </div>
        <div className="hero-metrics">
          <div><span>Mode</span><strong>{type === 'author' ? 'Author' : 'Inst.'}</strong></div>
          <div><span>Loaded</span><strong>{rows.length}</strong></div>
          <div><span>Policy</span><strong>Manual</strong></div>
        </div>
      </section>

      <section className="identity-workbench">
        <div className="identity-toolbar">
          <div className="flex gap-2 flex-wrap">
            <button className={`profile-filter ${type === 'author' ? 'active' : ''}`} onClick={() => setType('author')}>Author aliases</button>
            <button className={`profile-filter ${type === 'institution' ? 'active' : ''}`} onClick={() => setType('institution')}>Institution aliases</button>
          </div>
          <div className="identity-search">
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} placeholder="Search alias / canonical / country" />
            <button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Search'}</button>
          </div>
        </div>

        <div className="identity-grid">
          <form className="identity-form" onSubmit={(e) => { e.preventDefault(); save() }}>
            <h2>{type === 'author' ? 'Manual author merge / split' : 'Manual institution mapping'}</h2>
            <p className="hint">Merge：把某个 alias 指向 canonical。Split：删除错误 alias 或改到新的 canonical。</p>
            <label>Alias / raw spelling<input value={form.alias} onChange={(e) => setForm((prev) => ({ ...prev, alias: e.target.value }))} placeholder={type === 'author' ? 'e.g. J. Doe' : 'e.g. CUHK Shenzhen'} /></label>
            <label>Canonical name<input value={form.canonicalName} onChange={(e) => setForm((prev) => ({ ...prev, canonicalName: e.target.value }))} placeholder={type === 'author' ? 'e.g. John Doe' : 'e.g. The Chinese University of Hong Kong, Shenzhen'} /></label>
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
            {message && <p className="text-xs text-green-700">{message}</p>}
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button type="submit" disabled={!form.alias.trim() || !form.canonicalName.trim()}>Save alias</button>
          </form>

          <div className="identity-list">
            <div className="identity-list-head"><h2>Current mappings</h2><span>{rows.length} rows</span></div>
            {!rows.length && <div className="empty">No aliases found. Add one on the left, or search a different keyword.</div>}
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
        </div>
      </section>
    </div>
  )
}
