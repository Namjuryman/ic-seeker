import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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

  const page = Math.max(1, Number(searchParams.get('page') || 1))

  const companies = useQuery({
    queryKey: ['companies', q, domain, page],
    queryFn: () => {
      const params: Record<string, string | number> = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }
      if (q) params.q = q
      if (domain) params.domain = domain
      return api.companies(params)
    },
    enabled: true,
  })

  const domains = useQuery({
    queryKey: ['company-domains'],
    queryFn: () => api.companyDomains(),
  })

  const total = companies.data?.total || 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function submit(nextPage = 1) {
    const params: Record<string, string> = {}
    if (q) params.q = q
    if (domain) params.domain = domain
    if (nextPage > 1) params.page = String(nextPage)
    setSearchParams(params)
  }

  const rows = companies.data?.rows || []
  const topCountries = [...new Set(rows.map((row) => row.country).filter(Boolean))].slice(0, 6)

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
            <button onClick={() => { setQ(''); setDomain(''); setSearchParams({}) }}>清空</button>
          </div>

          <label>
            <span>关键词</span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
              placeholder="TSMC / 长鑫 / RF / DC-DC"
          />
          </label>

          <label>
            <span>技术方向</span>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          >
            <option value="">All domains</option>
            {domains.data?.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          </label>

          <button className="company-primary" onClick={() => submit(1)}>搜索</button>

          <div className="company-filter-hints">
            <span>当前地区</span>
            {topCountries.length ? topCountries.map((country) => <em key={country}>{country}</em>) : <p>暂无结果</p>}
          </div>
        </aside>

        <main className="company-results">
          <div className="company-results-head">
            <div>
              <span>Results</span>
              <h2>{total.toLocaleString()} companies</h2>
            </div>
            <p>第 {page} / {pages} 页</p>
          </div>

          <div className="company-list">
          {rows.map((company) => (
              <Link className="company-row" key={company.id} to={companyPath(company.id)}>
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
                    {company.employeeCount && <em>{company.employeeCount}</em>}
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
          ))}
        </div>
        {rows.length === 0 && !companies.isLoading && <p className="learning-muted">No companies found.</p>}
        {companies.isLoading && <p className="learning-muted">Loading...</p>}

        {pages > 1 && (
          <nav className="ss-pagination" style={{ marginTop: '1rem' }}>
            <button onClick={() => submit(Math.max(1, page - 1))} disabled={page <= 1}>Prev</button>
            <span>Page {page} / {pages}</span>
            <button onClick={() => submit(Math.min(pages, page + 1))} disabled={page >= pages}>Next</button>
          </nav>
        )}
        </main>
      </div>
    </div>
  )
}
