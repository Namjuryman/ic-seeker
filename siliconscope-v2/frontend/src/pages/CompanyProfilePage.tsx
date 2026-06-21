import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { PaperLink } from '../components/PaperLink'
import { searchPath, roadmapPath } from '../utils/routes'
import type { CompanyRow, PaperRow, SearchResult } from '../types'

interface RelatedRoadmap {
  slug: string
  title: string
  domain: string
  level: string
  score: number
}

function confidenceBadge(value: number | undefined | null): string {
  if (value === undefined || value === null) return 'bg-surface-elevated text-ink-muted'
  if (value >= 80) return 'bg-emerald-500/10 text-emerald-600'
  if (value >= 50) return 'bg-amber-500/10 text-amber-600'
  return 'bg-rose-500/10 text-rose-600'
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
}

export default function CompanyProfilePage() {
  const { companyId } = useParams<{ companyId: string }>()
  const navigate = useNavigate()

  const [company, setCompany] = useState<CompanyRow | null>(null)
  const [papers, setPapers] = useState<SearchResult | null>(null)
  const [roadmaps, setRoadmaps] = useState<RelatedRoadmap[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!companyId) {
      setLoading(false)
      setError('Missing company ID')
      return
    }

    setLoading(true)
    setError('')

    Promise.all([
      api.company(companyId),
      api.companyRelatedPapers(companyId, 20),
      api.companyRelatedRoadmaps(companyId),
    ])
      .then(([c, p, r]) => {
        setCompany(c)
        setPapers(p)
        setRoadmaps(r)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载企业详情失败')
        setCompany(null)
      })
      .finally(() => setLoading(false))
  }, [companyId])

  if (loading) {
    return (
      <div className="ss-skeleton-page">
        <div />
        <p>Loading company profile...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ss-empty-state">
        {error}
        <div className="mt-4">
          <button className="ss-button-secondary" onClick={() => navigate('/companies')}>
            Back to companies
          </button>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="ss-empty-state">
        Company not found.
        <div className="mt-4">
          <button className="ss-button-secondary" onClick={() => navigate('/companies')}>
            Back to companies
          </button>
        </div>
      </div>
    )
  }

  const displayName = company.name || '—'
  const displayType = company.companyType || 'Company'
  const displayCountry = company.country || '—'
  const displayCity = company.city || '—'
  const displayWebsite = company.website
  const confidence = company.dataConfidence
  const aliases = (company.aliases || []).filter(Boolean)

  return (
    <div className="ss-profile-page">
      <button className="ss-back-button" onClick={() => navigate('/companies')}>
        Back to companies
      </button>

      {/* Hero Section */}
      <section className="ss-profile-hero">
        <div>
          <p className="ss-kicker">{displayType}</p>
          <h1>{displayName}</h1>
          <div className="ss-chip-row">
            {company.companyType && <span className="ss-chip">{company.companyType}</span>}
            <span>{displayCountry}{company.city ? `, ${displayCity}` : ''}</span>
            {confidence !== undefined && confidence !== null && (
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${confidenceBadge(confidence)}`}>
                Confidence: {confidence}
              </span>
            )}
            {displayWebsite && (
              <a
                href={displayWebsite.startsWith('http') ? displayWebsite : `https://${displayWebsite}`}
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Website
              </a>
            )}
          </div>
          {aliases.length > 0 && (
            <p className="text-sm text-ink-muted mt-2">
              Also known as: {aliases.join(', ')}
            </p>
          )}
        </div>
        <div className="ss-profile-actions">
          <button className="ss-button" disabled title="Coming soon">
            Watch company
          </button>
        </div>
      </section>

      <section className="ss-caveat">
        Company data is collected from public sources and may be incomplete or stale. Verify critical decisions manually.
      </section>

      <div className="ss-profile-grid">
        <main className="ss-profile-main">
          {/* Basic Facts */}
          <section className="ss-panel">
            <div className="ss-panel-head">
              <div>
                <p>Overview</p>
                <h2>Basic Facts</h2>
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-ink-muted">Founded</span>
                <div className="font-medium text-ink-text">{company.foundedYear ?? '—'}</div>
              </div>
              <div>
                <span className="text-ink-muted">Registered Capital</span>
                <div className="font-medium text-ink-text">{company.registeredCapital || '—'}</div>
              </div>
              <div>
                <span className="text-ink-muted">Employees</span>
                <div className="font-medium text-ink-text">{company.employeeCount || company.employeeCountRange || '—'}</div>
              </div>
              <div>
                <span className="text-ink-muted">Status</span>
                <div className="font-medium text-ink-text">{company.status || '—'}</div>
              </div>
              <div>
                <span className="text-ink-muted">Stock Ticker</span>
                <div className="font-medium text-ink-text">
                  {company.stockTicker ? `${company.stockTicker}${company.exchange ? ` (${company.exchange})` : ''}` : '—'}
                </div>
              </div>
              <div>
                <span className="text-ink-muted">Last Enriched</span>
                <div className="font-medium text-ink-text">{formatDate(company.lastEnrichedAt)}</div>
              </div>
              {company.description && (
                <div className="sm:col-span-2">
                  <span className="text-ink-muted">Description</span>
                  <div className="font-medium text-ink-text mt-1 leading-relaxed">{company.description}</div>
                </div>
              )}
            </div>
          </section>

          {/* Business Directions */}
          <section className="ss-panel">
            <div className="ss-panel-head">
              <div>
                <p>Business</p>
                <h2>Business Directions</h2>
              </div>
            </div>
            <div className="p-4 space-y-4 text-sm">
              {company.domains && company.domains.length > 0 && (
                <div>
                  <span className="text-ink-muted block mb-1">Domains</span>
                  <div className="flex flex-wrap gap-2">
                    {company.domains.map((d) => (
                      <Link
                        key={d}
                        className="ss-chip hover:bg-surface-elevated"
                        to={searchPath({ q: d })}
                      >
                        {d}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {company.productLines && company.productLines.length > 0 && (
                <div>
                  <span className="text-ink-muted block mb-1">Product Lines</span>
                  <div className="flex flex-wrap gap-2">
                    {company.productLines.map((pl) => (
                      <span key={pl} className="ss-chip">{pl}</span>
                    ))}
                  </div>
                </div>
              )}
              {company.technologyKeywords && company.technologyKeywords.length > 0 && (
                <div>
                  <span className="text-ink-muted block mb-1">Technology Keywords</span>
                  <div className="flex flex-wrap gap-2">
                    {company.technologyKeywords.map((kw) => (
                      <Link
                        key={kw}
                        className="ss-chip hover:bg-surface-elevated"
                        to={searchPath({ q: kw })}
                      >
                        {kw}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {company.applicationMarkets && company.applicationMarkets.length > 0 && (
                <div>
                  <span className="text-ink-muted block mb-1">Application Markets</span>
                  <div className="flex flex-wrap gap-2">
                    {company.applicationMarkets.map((m) => (
                      <span key={m} className="ss-chip">{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {(!company.domains || company.domains.length === 0) &&
               (!company.productLines || company.productLines.length === 0) &&
               (!company.technologyKeywords || company.technologyKeywords.length === 0) &&
               (!company.applicationMarkets || company.applicationMarkets.length === 0) && (
                <div className="text-ink-muted">No business direction data available.</div>
              )}
            </div>
          </section>

          {/* Career Intelligence */}
          <section className="ss-panel">
            <div className="ss-panel-head">
              <div>
                <p>Talent</p>
                <h2>Career Intelligence</h2>
              </div>
            </div>
            <div className="p-4 space-y-4 text-sm">
              {company.careerRoles && company.careerRoles.length > 0 && (
                <div>
                  <span className="text-ink-muted block mb-1">Career Roles</span>
                  <ul className="list-disc list-inside text-ink-text">
                    {company.careerRoles.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {company.hiringSignals && company.hiringSignals.length > 0 && (
                <div>
                  <span className="text-ink-muted block mb-1">Hiring Signals</span>
                  <ul className="list-disc list-inside text-ink-text">
                    {company.hiringSignals.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {roadmaps.length > 0 && (
                <div>
                  <span className="text-ink-muted block mb-1">Suggested Learning Roadmaps</span>
                  <div className="ss-link-list">
                    {roadmaps.map((r) => (
                      <Link key={r.slug} to={roadmapPath(r.slug)} className="block">
                        <span>{r.title}</span>
                        <span className="text-ink-muted text-xs">{r.domain} · {r.level}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {(!company.careerRoles || company.careerRoles.length === 0) &&
               (!company.hiringSignals || company.hiringSignals.length === 0) &&
               roadmaps.length === 0 && (
                <div className="text-ink-muted">No career intelligence data available.</div>
              )}
            </div>
          </section>

          {/* Research Links */}
          <section className="ss-panel">
            <div className="ss-panel-head">
              <div>
                <p>Research</p>
                <h2>Related Papers</h2>
              </div>
              <span>{papers?.total ?? 0} matched</span>
            </div>
            <div className="p-4 text-sm">
              {papers?.rows && papers.rows.length > 0 ? (
                <div className="ss-mini-list">
                  {papers.rows.map((paper: PaperRow) => (
                    <article key={paper.id} className="ss-mini-paper">
                      <div>
                        <h4><PaperLink id={paper.id} title={paper.title} /></h4>
                        <p>{paper.authors || '-'}</p>
                      </div>
                      <div className="ss-mini-meta">
                        <span>{paper.venue}</span>
                        <span>{paper.year}</span>
                        <span>{paper.rank}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="text-ink-muted">No papers matched by affiliation text.</div>
              )}
              <p className="mt-3 text-xs text-ink-muted">
                This is based on affiliation text matching and may miss subsidiaries or aliases.
              </p>
            </div>
          </section>
        </main>

        <aside className="ss-profile-side">
          {/* Source Provenance */}
          <section className="ss-panel">
            <div className="ss-panel-head compact">
              <h2>Source Provenance</h2>
            </div>
            <div className="p-4">
              {company.sources && company.sources.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="border-b border-line">
                      <tr>
                        <th className="py-1 pr-2 text-ink-secondary font-medium">Type</th>
                        <th className="py-1 pr-2 text-ink-secondary font-medium">Name</th>
                        <th className="py-1 pr-2 text-ink-secondary font-medium">Conf.</th>
                        <th className="py-1 pr-2 text-ink-secondary font-medium">Fetched</th>
                      </tr>
                    </thead>
                    <tbody>
                      {company.sources.slice(0, 20).map((s) => (
                        <tr key={s.id} className="border-b border-line last:border-b-0">
                          <td className="py-2 pr-2 text-ink-text">{s.sourceType}</td>
                          <td className="py-2 pr-2 text-ink-text">
                            {s.sourceUrl ? (
                              <a
                                href={s.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brand-600 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {s.sourceName}
                              </a>
                            ) : (
                              s.sourceName
                            )}
                          </td>
                          <td className="py-2 pr-2 text-ink-secondary">{s.confidence}</td>
                          <td className="py-2 text-ink-muted">{formatDate(s.fetchedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {company.sources.length > 20 && (
                    <p className="text-xs text-ink-muted mt-2">+{company.sources.length - 20} more sources</p>
                  )}
                </div>
              ) : (
                <div className="text-ink-muted text-sm">No source data available.</div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
