import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { companyPath } from '../utils/routes'

const PAGE_SIZE = 20

const typeLabels: Record<string, string> = {
  'Fabless IC Design': 'IC 设计',
  Foundry: '晶圆代工',
  IDM: 'IDM',
  'OSAT / Packaging': '封装测试',
  Equipment: '半导体设备',
  Materials: '材料',
  'Semiconductor IP': 'IP',
  EDA: 'EDA',
}

export default function CompaniesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') || '')
  const [domain, setDomain] = useState(searchParams.get('domain') || '')
  const [message, setMessage] = useState('')
  const queryClient = useQueryClient()

  const page = Math.max(1, Number(searchParams.get('page') || 1))

  const companies = useQuery({
    queryKey: ['companies', q, domain, page],
    queryFn: () => {
      const params: Record<string, string | number> = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }
      if (q) params.q = q
      if (domain) params.domain = domain
      return api.companies(params)
    },
  })

  const domains = useQuery({
    queryKey: ['company-domains'],
    queryFn: () => api.companyDomains(),
  })

  const watchedIds = useQuery({
    queryKey: ['watchlist-companies-ids'],
    queryFn: async () => {
      const rows = await api.watchlistCompanies()
      return new Set(rows.map((company) => company.id))
    },
  })

  const watchMutation = useMutation({
    mutationFn: async ({ id, watch }: { id: string; watch: boolean }) => {
      if (watch) return api.watchCompany(id)
      return api.unwatchCompany(id)
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-companies-ids'] })
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      setMessage(vars.watch ? '已关注该企业' : '已取消关注')
      setTimeout(() => setMessage(''), 1400)
    },
  })

  const rows = companies.data?.rows || []
  const total = companies.data?.total || 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const topCountries = [...new Set(rows.map((row) => row.country).filter(Boolean))].slice(0, 6)
  const watchedSet = watchedIds.data || new Set<string>()

  function submit(nextPage = 1) {
    const params: Record<string, string> = {}
    if (q) params.q = q
    if (domain) params.domain = domain
    if (nextPage > 1) params.page = String(nextPage)
    setSearchParams(params)
  }

  function clearFilters() {
    setQ('')
    setDomain('')
    setSearchParams({})
  }

  return (
    <div className="company-page">
      <section className="company-hero">
        <div>
          <span>Company Intelligence</span>
          <h1>半导体企业情报</h1>
          <p>按产业链、国家地区和技术方向浏览主要 IC 公司，后续可接岗位、论文和学习路线。</p>
        </div>
        <div className="company-hero-actions">
          <Link to="/compare/companies">公司对比</Link>
          <Link to="/admin/companies">维护数据</Link>
        </div>
      </section>

      <section className="company-stats">
        <div><span>公司总数</span><strong>{total.toLocaleString()}</strong></div>
        <div><span>当前页</span><strong>{rows.length}</strong></div>
        <div><span>覆盖地区</span><strong>{topCountries.length || '-'}</strong></div>
        <div><span>数据状态</span><strong>Seeded</strong></div>
      </section>

      <div className="company-layout">
        <aside className="company-filter">
          <div className="company-filter-head">
            <div>
              <span>Refine</span>
              <h2>筛选企业</h2>
            </div>
            <button onClick={clearFilters}>清空</button>
          </div>

          <label>
            <span>关键词</span>
            <input
              type="text"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="TSMC / 长鑫 / RF / DC-DC"
            />
          </label>

          <label>
            <span>技术方向</span>
            <select value={domain} onChange={(event) => setDomain(event.target.value)}>
              <option value="">All domains</option>
              {domains.data?.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <button className="company-primary" onClick={() => submit(1)}>搜索</button>

          <div className="company-filter-hints">
            <span>当前地区</span>
            {topCountries.length ? topCountries.map((country) => <em key={country}>{country}</em>) : <p>暂无结果</p>}
          </div>
        </aside>

        <main className="company-results">
          {message && (
            <div className="company-toast">
              {message}
            </div>
          )}

          <div className="company-results-head">
            <div>
              <span>Results</span>
              <h2>{total.toLocaleString()} companies</h2>
            </div>
            <p>第 {page} / {pages} 页</p>
          </div>

          <div className="company-list">
            {rows.map((company) => {
              const isWatched = watchedSet.has(company.id)
              return (
                <div className="company-row" key={company.id}>
                  <Link to={companyPath(company.id)} className="company-row-link">
                    <div className="company-avatar">{(company.legalName || company.name || 'C').slice(0, 1)}</div>
                    <div className="company-row-main">
                      <div className="company-row-title">
                        <strong>{company.name}</strong>
                        {company.legalName && <span>{company.legalName}</span>}
                      </div>
                      <p>{company.description || 'No description available.'}</p>
                      <div className="company-tags">
                        <em>{typeLabels[company.companyType || ''] || company.companyType || 'Company'}</em>
                        <em>{company.country || '-'}</em>
                        {company.city && <em>{company.city}</em>}
                        {(company.employeeCount || company.employeeCountRange) && (
                          <em>{company.employeeCount || company.employeeCountRange}</em>
                        )}
                      </div>
                    </div>
                    <div className="company-row-side">
                      <span>{company.dataConfidence ?? '-'}%</span>
                      <small>confidence</small>
                      <div>
                        {company.domains?.slice(0, 2).map((item) => <i key={item}>{item}</i>)}
                      </div>
                    </div>
                  </Link>
                  <button
                    className={`company-watch-button ${isWatched ? 'active' : ''}`}
                    onClick={() => watchMutation.mutate({ id: company.id, watch: !isWatched })}
                    disabled={watchMutation.isPending}
                    title={isWatched ? '取消关注' : '关注该企业'}
                  >
                    {isWatched ? '已关注' : '关注'}
                  </button>
                </div>
              )
            })}
          </div>

          {rows.length === 0 && !companies.isLoading && (
            <div className="learning-muted">
              {total === 0 ? (
                <div>
                  <p>No company data yet.</p>
                  <p className="mt-2">
                    Run <code>npm run companies:seed</code> or{' '}
                    <Link to="/admin/companies" className="text-brand-600 hover:underline">add companies in Admin</Link>.
                  </p>
                </div>
              ) : (
                'No companies found.'
              )}
            </div>
          )}
          {companies.isLoading && <p className="learning-muted">Loading...</p>}

          {pages > 1 && (
            <nav className="ss-pagination" style={{ marginTop: '1rem' }}>
              <button onClick={() => submit(Math.max(1, page - 1))} disabled={page <= 1}>上一页</button>
              <span>Page {page} / {pages}</span>
              <button onClick={() => submit(Math.min(pages, page + 1))} disabled={page >= pages}>下一页</button>
            </nav>
          )}
        </main>
      </div>
    </div>
  )
}
