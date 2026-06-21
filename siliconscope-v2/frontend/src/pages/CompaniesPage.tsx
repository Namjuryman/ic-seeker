import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { companyPath } from '../utils/routes'

const PAGE_SIZE = 20

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

  return (
    <div className="learning-page learning-workbench">
      <section className="learning-hero compact">
        <div>
          <h1>IC Industry Companies</h1>
          <p>Explore semiconductor employers, research labs, and industry players.</p>
        </div>
      </section>

      <section className="learning-section">
        <div className="learning-section-head">
          <div>
            <span>Search</span>
            <h3>Find companies</h3>
          </div>
        </div>
        <div className="learning-progress-actions" style={{ marginBottom: '0.75rem', alignItems: 'center' }}>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, domain, or product..."
            style={{ flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 12, border: '1px solid var(--line)', fontSize: 14 }}
          />
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid var(--line)', fontSize: 14, minWidth: 140 }}
          >
            <option value="">All domains</option>
            {domains.data?.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={() => submit(1)}>Search</button>
        </div>
      </section>

      <section className="learning-section">
        <div className="learning-section-head">
          <div>
            <span>Results</span>
            <h3>{total} companies</h3>
          </div>
        </div>
        <div className="learning-roadmap-grid">
          {rows.map((company) => (
            <Link className="learning-roadmap-card" key={company.id} to={companyPath(company.id)}>
              <span>{company.companyType || 'Company'}</span>
              <strong>{company.name}</strong>
              <p>{company.description || 'No description available.'}</p>
              <footer>
                <em>{company.country || '-'}</em>
                <em>{company.domains?.slice(0, 2).join(', ') || '-'}</em>
              </footer>
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
      </section>
    </div>
  )
}
