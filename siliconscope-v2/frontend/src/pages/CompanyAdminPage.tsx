import { useEffect, useState, useMemo } from 'react'
import { api } from '../api'
import type { CompanyRow } from '../types'

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
      setError(err?.response?.data?.error || err.message || 'Failed to load companies')
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
      console.error('Failed to load company types:', err)
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
      setError('Company name is required.')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const body = buildBody(form)
      await api.createCompany(body)
      setSuccess('Company created successfully.')
      resetForm()
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to create company')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate() {
    if (!editingId) return
    if (!form.name.trim()) {
      setError('Company name is required.')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const body = buildBody(form)
      await api.updateCompany(editingId, body)
      setSuccess('Company updated successfully.')
      resetForm()
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to update company')
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
      setSuccess('Company deleted successfully.')
      if (editingId === id) resetForm()
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to delete company')
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
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Admin</p>
          <h1 className="text-2xl font-bold text-ink-text mt-0.5">Company Admin</h1>
          <p className="text-sm text-ink-muted mt-1">Manually create and edit company records.</p>
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
            {editingId ? 'Edit Company' : 'Create Company'}
          </h2>
          <button
            onClick={() => setFormExpanded((v) => !v)}
            className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-line text-sm text-ink-secondary hover:bg-surface-soft transition-colors"
          >
            {formExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {formExpanded && (
          <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Required */}
            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">
                Name <span className="text-semantic-danger">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="Company name"
              />
            </div>

            {/* Optional text fields */}
            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Legal Name</label>
              <input
                value={form.legalName}
                onChange={(e) => updateForm('legalName', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="Legal name"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Aliases (comma separated)</label>
              <input
                value={form.aliases}
                onChange={(e) => updateForm('aliases', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="Alias 1, Alias 2"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Country</label>
              <input
                value={form.country}
                onChange={(e) => updateForm('country', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="e.g. China"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">City</label>
              <input
                value={form.city}
                onChange={(e) => updateForm('city', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="e.g. Shenzhen"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Website</label>
              <input
                value={form.website}
                onChange={(e) => updateForm('website', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Company Type</label>
              <select
                value={form.companyType}
                onChange={(e) => updateForm('companyType', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">— Select —</option>
                {companyTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Status</label>
              <select
                value={form.status}
                onChange={(e) => updateForm('status', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Founded Year</label>
              <input
                type="number"
                value={form.foundedYear}
                onChange={(e) => updateForm('foundedYear', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="e.g. 2000"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Registered Capital</label>
              <input
                value={form.registeredCapital}
                onChange={(e) => updateForm('registeredCapital', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="e.g. 100M CNY"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Employee Count</label>
              <input
                value={form.employeeCount}
                onChange={(e) => updateForm('employeeCount', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="e.g. 5000"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Employee Count Range</label>
              <select
                value={form.employeeCountRange}
                onChange={(e) => updateForm('employeeCountRange', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                {employeeCountRangeOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Stock Ticker</label>
              <input
                value={form.stockTicker}
                onChange={(e) => updateForm('stockTicker', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="e.g. AAPL"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Exchange</label>
              <input
                value={form.exchange}
                onChange={(e) => updateForm('exchange', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="e.g. NASDAQ"
              />
            </div>

            <div className="space-y-1 md:col-span-2 lg:col-span-3">
              <label className="text-xs text-ink-subtle">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300 resize-y"
                placeholder="Short description of the company..."
              />
            </div>

            {/* Comma separated lists */}
            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Product Lines (comma separated)</label>
              <input
                value={form.productLines}
                onChange={(e) => updateForm('productLines', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="PMIC, MCU, Sensor..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Domains (comma separated)</label>
              <input
                value={form.domains}
                onChange={(e) => updateForm('domains', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="Analog, Power, RF..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Technology Keywords (comma separated)</label>
              <input
                value={form.technologyKeywords}
                onChange={(e) => updateForm('technologyKeywords', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="FinFET, GaN, SiC..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Application Markets (comma separated)</label>
              <input
                value={form.applicationMarkets}
                onChange={(e) => updateForm('applicationMarkets', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="Automotive, Consumer, AI..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Career Roles (comma separated)</label>
              <input
                value={form.careerRoles}
                onChange={(e) => updateForm('careerRoles', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="Analog Designer, IC Layout..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Hiring Signals (comma separated)</label>
              <input
                value={form.hiringSignals}
                onChange={(e) => updateForm('hiringSignals', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-surface-panel focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="RF Engineer, IC Verification..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-subtle">Data Confidence (0–100)</label>
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
                  {loading ? 'Updating...' : 'Update Company'}
                </button>
                <button
                  onClick={resetForm}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-surface-elevated border border-line text-sm text-ink-secondary disabled:opacity-50 hover:bg-surface-soft transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleCreate}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-brand-700 transition-colors"
              >
                {loading ? 'Creating...' : 'Create Company'}
              </button>
            )}
          </div>
        )}
      </section>

      {/* Company List */}
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-ink-text">Companies</h2>
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-surface-elevated border border-line text-sm text-ink-secondary disabled:opacity-50 hover:bg-surface-soft transition-colors"
          >
            Reload
          </button>
        </div>

        {loading && rows.length === 0 && (
          <p className="text-sm text-ink-muted">Loading companies...</p>
        )}

        {!loading && rows.length === 0 && (
          <p className="text-sm text-ink-muted">No companies found.</p>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line-strong text-left text-xs text-ink-subtle uppercase tracking-wide">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Country</th>
                  <th className="py-2 pr-3 font-medium">Confidence</th>
                  <th className="py-2 pr-3 font-medium">Updated</th>
                  <th className="py-2 pr-3 font-medium text-right">Actions</th>
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
                          Edit
                        </button>
                        {deleteConfirmId === row.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDelete(row.id)}
                              disabled={loading}
                              className="px-2 py-1 rounded-lg bg-red-600 text-white text-xs disabled:opacity-50"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={loading}
                              className="px-2 py-1 rounded-lg bg-surface-elevated border border-line text-xs text-ink-secondary disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(row.id)}
                            disabled={loading}
                            className="px-2 py-1 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700 disabled:opacity-50 hover:bg-red-100 transition-colors"
                          >
                            Delete
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
        <h2 className="font-semibold text-ink-text mb-2">CSV Import</h2>
        <p className="text-sm text-ink-muted mb-2">
          Coming soon — bulk CSV import will be supported via the admin API.
        </p>
        <p className="text-xs text-ink-subtle">
          Template fields: name, legalName, country, city, website, companyType, domains, registeredCapital, employeeCount, sourceUrl, notes
        </p>
      </section>
    </div>
  )
}
