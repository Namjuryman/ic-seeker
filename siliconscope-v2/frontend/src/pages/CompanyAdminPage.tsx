import { useEffect, useState, useMemo } from 'react'
import { api } from '../api'
import type { CompanyRow } from '../types'
import { friendlyError } from '../utils/errorMessages'

interface FormState {
  name: string
  legalName: string
  aliases: string
  country: string
  city: string
  website: string
  companyType: string
  status: string
  foundedYear: string
  registeredCapital: string
  employeeCount: string
  employeeCountRange: string
  stockTicker: string
  exchange: string
  description: string
  productLines: string
  domains: string
  technologyKeywords: string
  applicationMarkets: string
  careerRoles: string
  hiringSignals: string
  dataConfidence: string
}

const emptyForm: FormState = {
  name: '',
  legalName: '',
  aliases: '',
  country: '',
  city: '',
  website: '',
  companyType: '',
  status: 'active',
  foundedYear: '',
  registeredCapital: '',
  employeeCount: '',
  employeeCountRange: 'unknown',
  stockTicker: '',
  exchange: '',
  description: '',
  productLines: '',
  domains: '',
  technologyKeywords: '',
  applicationMarkets: '',
  careerRoles: '',
  hiringSignals: '',
  dataConfidence: '50',
}

const statusOptions = ['active', 'dissolved', 'acquired', 'merged', 'unknown']
const employeeCountRangeOptions = ['exact', 'range', 'estimated', 'unknown']

const statusLabel: Record<string, string> = {
  active: '运营中',
  dissolved: '已注销',
  acquired: '已被收购',
  merged: '已合并',
  unknown: '未知',
}

const employeeRangeLabel: Record<string, string> = {
  exact: '精确值',
  range: '区间',
  estimated: '估算',
  unknown: '未知',
}

function parseCommaList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function buildBody(form: FormState): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  body.name = form.name.trim()
  if (form.legalName.trim()) body.legalName = form.legalName.trim()
  if (form.aliases.trim()) body.aliases = parseCommaList(form.aliases)
  if (form.country.trim()) body.country = form.country.trim()
  if (form.city.trim()) body.city = form.city.trim()
  if (form.website.trim()) body.website = form.website.trim()
  if (form.companyType.trim()) body.companyType = form.companyType.trim()
  if (form.status) body.status = form.status
  if (form.foundedYear.trim()) {
    const n = parseInt(form.foundedYear, 10)
    if (!Number.isNaN(n)) body.foundedYear = n
  }
  if (form.registeredCapital.trim()) body.registeredCapital = form.registeredCapital.trim()
  if (form.employeeCount.trim()) body.employeeCount = form.employeeCount.trim()
  if (form.employeeCountRange) body.employeeCountRange = form.employeeCountRange
  if (form.stockTicker.trim()) body.stockTicker = form.stockTicker.trim()
  if (form.exchange.trim()) body.exchange = form.exchange.trim()
  if (form.description.trim()) body.description = form.description.trim()
  if (form.productLines.trim()) body.productLines = parseCommaList(form.productLines)
  if (form.domains.trim()) body.domains = parseCommaList(form.domains)
  if (form.technologyKeywords.trim()) body.technologyKeywords = parseCommaList(form.technologyKeywords)
  if (form.applicationMarkets.trim()) body.applicationMarkets = parseCommaList(form.applicationMarkets)
  if (form.careerRoles.trim()) body.careerRoles = parseCommaList(form.careerRoles)
  if (form.hiringSignals.trim()) body.hiringSignals = parseCommaList(form.hiringSignals)
  if (form.dataConfidence.trim()) {
    const n = parseInt(form.dataConfidence, 10)
    if (!Number.isNaN(n)) body.dataConfidence = Math.max(0, Math.min(100, n))
  }

  return body
}

function formatDate(value: string | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

function formatConfidence(value: number | undefined): string {
  if (value === undefined || value === null) return '-'
  return `${value}%`
}

export default function CompanyAdminPage() {
  const [rows, setRows] = useState<CompanyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState<FormState>({ ...emptyForm })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [companyTypes, setCompanyTypes] = useState<string[]>([])
  const [formExpanded, setFormExpanded] = useState(false)

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await api.companies({ limit: 100 })
      setRows(result.rows)
    } catch (err: any) {
      setError(friendlyError(err, '企业数据加载失败'))
    } finally {
      setLoading(false)
    }
  }

  async function loadCompanyTypes() {
    try {
      const types = await api.companyTypes()
      setCompanyTypes(types)
    } catch (err: any) {
      // non-critical
      console.error('企业类型加载失败:', err)
    }
  }

  useEffect(() => {
    load()
    loadCompanyTypes()
  }, [])

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setForm({ ...emptyForm })
    setEditingId(null)
    setSuccess('')
    setError('')
  }

  function startEdit(row: CompanyRow) {
    setForm({
      name: row.name || '',
      legalName: row.legalName || '',
      aliases: (row.aliases || []).join(', '),
      country: row.country || '',
      city: row.city || '',
      website: row.website || '',
      companyType: row.companyType || '',
      status: row.status || 'unknown',
      foundedYear: row.foundedYear !== undefined && row.foundedYear !== null ? String(row.foundedYear) : '',
      registeredCapital: row.registeredCapital || '',
      employeeCount: row.employeeCount || '',
      employeeCountRange: row.employeeCountRange || 'unknown',
      stockTicker: row.stockTicker || '',
      exchange: row.exchange || '',
      description: row.description || '',
      productLines: (row.productLines || []).join(', '),
      domains: (row.domains || []).join(', '),
      technologyKeywords: (row.technologyKeywords || []).join(', '),
      applicationMarkets: (row.applicationMarkets || []).join(', '),
      careerRoles: (row.careerRoles || []).join(', '),
      hiringSignals: (row.hiringSignals || []).join(', '),
      dataConfidence: row.dataConfidence !== undefined && row.dataConfidence !== null ? String(row.dataConfidence) : '50',
    })
    setEditingId(row.id)
    setFormExpanded(true)
    setSuccess('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      setError('企业名称为必填项。')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const body = buildBody(form)
      await api.createCompany(body)
      setSuccess('企业已创建。')
      resetForm()
      await load()
    } catch (err: any) {
      setError(friendlyError(err, '企业创建失败'))
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate() {
    if (!editingId) return
    if (!form.name.trim()) {
      setError('企业名称为必填项。')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const body = buildBody(form)
      await api.updateCompany(editingId, body)
      setSuccess('企业已更新。')
      resetForm()
      await load()
    } catch (err: any) {
      setError(friendlyError(err, '企业更新失败'))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await api.deleteCompany(id)
      setSuccess('企业已删除。')
      if (editingId === id) resetForm()
      await load()
    } catch (err: any) {
      setError(friendlyError(err, '企业删除失败'))
    } finally {
      setLoading(false)
      setDeleteConfirmId(null)
    }
  }

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aName = a.name || ''
      const bName = b.name || ''
      return aName.localeCompare(bName)
    })
  }, [rows])

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Hero */}
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">企业数据</p>
          <h1 className="text-2xl font-bold text-ink-text mt-0.5">企业资料管理</h1>
          <p className="text-sm text-ink-muted mt-1">人工创建、校正和维护 IC 企业资料。公开页面会把这些资料当作情报线索展示，请尽量补充来源和置信度。</p>
        </div>
      </section>

      {/* Messages */}
      {(error || success) && (
        <div className={`rounded-xl border p-3 text-sm ${error ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
          {error || success}
        </div>
      )}

      {/* Form section */}
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-ink-text">
            {editingId ? '编辑企业' : '创建企业'}
          </h2>
          <button
            onClick={() => setFormExpanded((v) => !v)}
            className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-line text-sm text-ink-secondary hover:bg-surface-soft transition-colors"
          >
            {formExpanded ? '收起' : '展开'}
          </button>
        </div>

        {formExpanded && (
          <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Required */}
            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">
                企业名称 <span className="text-semantic-danger">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="例如 TSMC"
              />
            </div>

            {/* Optional text fields */}
            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">法定名称</label>
              <input
                value={form.legalName}
                onChange={(e) => updateForm('legalName', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="企业工商或注册名称"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">别名（逗号分隔）</label>
              <input
                value={form.aliases}
                onChange={(e) => updateForm('aliases', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="台积电, Taiwan Semiconductor"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">国家/地区</label>
              <input
                value={form.country}
                onChange={(e) => updateForm('country', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="例如 China"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">城市</label>
              <input
                value={form.city}
                onChange={(e) => updateForm('city', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="例如 Shenzhen"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">官网</label>
              <input
                value={form.website}
                onChange={(e) => updateForm('website', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">企业类型</label>
              <select
                value={form.companyType}
                onChange={(e) => updateForm('companyType', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">请选择</option>
                {companyTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">状态</label>
              <select
                value={form.status}
                onChange={(e) => updateForm('status', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">成立年份</label>
              <input
                type="number"
                value={form.foundedYear}
                onChange={(e) => updateForm('foundedYear', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="例如 2000"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">注册资本</label>
              <input
                value={form.registeredCapital}
                onChange={(e) => updateForm('registeredCapital', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="例如 100M CNY"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">员工数量</label>
              <input
                value={form.employeeCount}
                onChange={(e) => updateForm('employeeCount', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="例如 5000"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">员工数量类型</label>
              <select
                value={form.employeeCountRange}
                onChange={(e) => updateForm('employeeCountRange', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                {employeeCountRangeOptions.map((o) => (
                  <option key={o} value={o}>
                    {employeeRangeLabel[o]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">股票代码</label>
              <input
                value={form.stockTicker}
                onChange={(e) => updateForm('stockTicker', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="例如 AAPL"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">交易所</label>
              <input
                value={form.exchange}
                onChange={(e) => updateForm('exchange', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="例如 NASDAQ"
              />
            </div>

            <div className="space-y-1 md:col-span-2 lg:col-span-3">
              <label className="text-xs text-ink-subtle">简介</label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300 resize-y"
                placeholder="简要说明企业主营方向、代表产品或 IC 相关业务..."
              />
            </div>

            {/* Comma separated lists */}
            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">产品线（逗号分隔）</label>
              <input
                value={form.productLines}
                onChange={(e) => updateForm('productLines', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="PMIC, MCU, Sensor..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">技术领域（逗号分隔）</label>
              <input
                value={form.domains}
                onChange={(e) => updateForm('domains', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="Analog, Power, RF..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">技术关键词（逗号分隔）</label>
              <input
                value={form.technologyKeywords}
                onChange={(e) => updateForm('technologyKeywords', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="FinFET, GaN, SiC..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">应用市场（逗号分隔）</label>
              <input
                value={form.applicationMarkets}
                onChange={(e) => updateForm('applicationMarkets', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="Automotive, Consumer, AI..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">岗位方向（逗号分隔）</label>
              <input
                value={form.careerRoles}
                onChange={(e) => updateForm('careerRoles', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="Analog Designer, IC Layout..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">招聘线索（逗号分隔）</label>
              <input
                value={form.hiringSignals}
                onChange={(e) => updateForm('hiringSignals', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="RF Engineer, IC Verification..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">数据置信度（0-100）</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.dataConfidence}
                onChange={(e) => updateForm('dataConfidence', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="50"
              />
            </div>
          </div>
        )}

        {formExpanded && (
          <div className="mt-5 flex flex-wrap gap-3">
            {editingId ? (
              <>
                <button
                  onClick={handleUpdate}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-brand-700 transition-colors"
                >
                  {loading ? '更新中...' : '更新企业'}
                </button>
                <button
                  onClick={resetForm}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-surface-elevated border border-line text-sm text-ink-secondary disabled:opacity-50 hover:bg-surface-soft transition-colors"
                >
                  取消
                </button>
              </>
            ) : (
              <button
                onClick={handleCreate}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-brand-700 transition-colors"
              >
                {loading ? '创建中...' : '创建企业'}
              </button>
            )}
          </div>
        )}
      </section>

      {/* Company List */}
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-ink-text">企业列表</h2>
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-surface-elevated border border-line text-sm text-ink-secondary disabled:opacity-50 hover:bg-surface-soft transition-colors"
          >
            重新加载
          </button>
        </div>

        {loading && rows.length === 0 && (
          <p className="text-sm text-ink-muted">正在加载企业...</p>
        )}

        {!loading && rows.length === 0 && (
          <p className="text-sm text-ink-muted">没有找到企业记录。</p>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line-strong text-left text-xs text-ink-subtle uppercase tracking-wide">
                  <th className="py-2 pr-3 font-medium">名称</th>
                  <th className="py-2 pr-3 font-medium">类型</th>
                  <th className="py-2 pr-3 font-medium">国家/地区</th>
                  <th className="py-2 pr-3 font-medium">置信度</th>
                  <th className="py-2 pr-3 font-medium">更新时间</th>
                  <th className="py-2 pr-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {sortedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-elevated transition-colors">
                    <td className="py-2 pr-3 text-ink-text font-medium">{row.name || '-'}</td>
                    <td className="py-2 pr-3 text-ink-secondary">{row.companyType || '-'}</td>
                    <td className="py-2 pr-3 text-ink-secondary">{row.country || '-'}</td>
                    <td className="py-2 pr-3 text-ink-secondary">{formatConfidence(row.dataConfidence)}</td>
                    <td className="py-2 pr-3 text-ink-muted whitespace-nowrap">{formatDate(row.updatedAt)}</td>
                    <td className="py-2 pr-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => startEdit(row)}
                          disabled={loading}
                          className="px-2 py-1 rounded-lg bg-surface-elevated border border-line text-xs text-ink-secondary disabled:opacity-50 hover:bg-surface-soft transition-colors"
                        >
                          编辑
                        </button>
                        {deleteConfirmId === row.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDelete(row.id)}
                              disabled={loading}
                              className="px-2 py-1 rounded-lg bg-red-600 text-white text-xs disabled:opacity-50"
                            >
                              确认
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={loading}
                              className="px-2 py-1 rounded-lg bg-surface-elevated border border-line text-xs text-ink-secondary disabled:opacity-50"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(row.id)}
                            disabled={loading}
                            className="px-2 py-1 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700 disabled:opacity-50 hover:bg-red-100 transition-colors"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CSV Import Note */}
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <h2 className="font-semibold text-ink-text mb-2">CSV 批量导入</h2>
        <p className="text-sm text-ink-muted mb-2">
          批量导入应通过后台 API 和复核队列执行，避免别名、地区或企业状态误写入公开画像。
        </p>
        <p className="text-xs text-ink-subtle">
          模板字段：name, legalName, country, city, website, companyType, domains, registeredCapital, employeeCount, sourceUrl, notes
        </p>
      </section>
    </div>
  )
}
