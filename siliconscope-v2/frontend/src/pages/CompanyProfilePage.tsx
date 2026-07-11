import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { PaperLink } from '../components/PaperLink'
import { paperRankLabel } from '../utils/displayLabels'
import { friendlyError } from '../utils/errorMessages'
import { searchPath, roadmapPath } from '../utils/routes'
import type { CompanyRow, PaperRow, SearchResult, CompanyFieldFact } from '../types'

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

function companyStatusLabel(status?: string | null) {
  if (!status) return '—'
  const labels: Record<string, string> = {
    active: '活跃 / 正常经营',
    private: '未上市 / 私有公司',
    public: '上市公司',
    dissolved: '已注销或解散',
    acquired: '已被收购',
    merged: '已合并',
    unknown: '状态待核验',
  }
  return labels[status] || '状态待核验'
}

function roadmapLevelLabel(level?: string | null) {
  if (!level) return '未标注'
  const labels: Record<string, string> = {
    intro: '入门',
    beginner: '入门',
    core: '核心',
    intermediate: '进阶',
    advanced: '深入',
    project: '项目',
  }
  return labels[level] || '阶段待确认'
}

function findFieldFact(fieldFacts: CompanyFieldFact[] | undefined, fieldName: string): CompanyFieldFact | undefined {
  return fieldFacts?.find((f) => f.fieldName === fieldName)
}

function FieldProvenance({ fieldFacts, fieldName }: { fieldFacts: CompanyFieldFact[] | undefined; fieldName: string }) {
  const fact = findFieldFact(fieldFacts, fieldName)
  if (!fact || !fact.sourceName) {
    return <span className="text-xs text-ink-subtle">来源未核验</span>
  }
  return (
    <span className="text-xs text-ink-secondary">
      {fact.sourceUrl ? (
        <a
          href={fact.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-brand-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {fact.sourceName}
        </a>
      ) : (
        <span>{fact.sourceName}</span>
      )}
      {' · '}
      <span className={confidenceBadge(fact.confidence)}>{fact.confidence}% 可信度</span>
      {' · '}
      <span>{formatDate(fact.fetchedAt)}</span>
    </span>
  )
}

export default function CompanyProfilePage() {
  const { companyId } = useParams<{ companyId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [company, setCompany] = useState<CompanyRow | null>(null)
  const [papers, setPapers] = useState<SearchResult | null>(null)
  const [roadmaps, setRoadmaps] = useState<RelatedRoadmap[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const watchQuery = useQuery({
    queryKey: ['is-watched-company', companyId],
    queryFn: () => api.isWatchedCompany(companyId || '').catch(() => ({ watched: false })),
    enabled: !!companyId,
  })
  const watched = watchQuery.data?.watched || false

  const watchMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('缺少企业 ID')
      if (watched) return api.unwatchCompany(companyId)
      return api.watchCompany(companyId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-watched-company', companyId] })
      queryClient.invalidateQueries({ queryKey: ['watchlist-companies-ids'] })
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      setMessage(watched ? '已取消关注' : '已关注')
      setTimeout(() => setMessage(''), 1400)
    },
    onError: (err: any) => {
      setError(friendlyError(err, '更新关注失败'))
    },
  })

  useEffect(() => {
    if (!companyId) {
      setLoading(false)
      setError('缺少企业 ID')
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
        setError(friendlyError(err, '加载企业详情失败'))
        setCompany(null)
      })
      .finally(() => setLoading(false))
  }, [companyId])

  if (loading) {
    return (
      <div className="ss-skeleton-page">
        <p>正在加载企业画像...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ss-empty-state">
        {error}
        <div className="mt-4">
          <button className="ss-button-secondary" onClick={() => navigate('/companies')}>
            返回企业列表
          </button>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="ss-empty-state">
        未找到该企业。
        <div className="mt-4">
          <button className="ss-button-secondary" onClick={() => navigate('/companies')}>
            返回企业列表
          </button>
        </div>
      </div>
    )
  }

  const displayName = company.name || '—'
  const displayType = company.companyType || '企业'
  const displayCountry = company.country || '—'
  const displayCity = company.city || '—'
  const displayWebsite = company.website
  const confidence = company.dataConfidence
  const aliases = (company.aliases || []).filter(Boolean)

  return (
    <div className="ss-profile-page">
      {message && (
        <div className="rounded-xl border p-2 text-sm bg-emerald-50 text-emerald-700 border-emerald-100 mb-4">
          {message}
        </div>
      )}

      <button className="ss-back-button" onClick={() => navigate('/companies')}>
        返回企业列表
      </button>

      {/* Hero Section */}
      <section className="ss-profile-hero">
        <div>
          <p className="ss-kicker">{displayType}</p>
          <h1>{displayName}</h1>
          <div className="ss-chip-row">
            {company.companyType && <span className="ss-chip">{company.companyType}</span>}
            <span>{displayCountry}{company.city ? `, ${displayCity}` : ''}</span>
            <span>公开来源画像</span>
            <span>非投资建议</span>
            {confidence !== undefined && confidence !== null && (
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${confidenceBadge(confidence)}`}>
                来源可信度：{confidence}%
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
                官网
              </a>
            )}
          </div>
          <p className="text-xs text-ink-subtle mt-2">
            来源可信度表示字段完整度和来源可追溯性，不代表公司综合表现、薪资水平或雇主质量。
          </p>
          {aliases.length > 0 && (
            <p className="text-sm text-ink-muted mt-2">
              别名/曾用名：{aliases.join(', ')}
            </p>
          )}
        </div>
        <div className="ss-profile-actions">
          <button
            className={`ss-button ${watched ? 'ss-button-secondary' : ''}`}
            disabled={watchMutation.isPending}
            onClick={() => watchMutation.mutate()}
            title={watched ? '取消关注该企业' : '关注该企业'}
          >
            {watchMutation.isPending ? '...' : watched ? '取消关注' : '关注企业'}
          </button>
        </div>
      </section>

      <section className="ss-caveat">
        企业数据来自公开来源和本地整理，可能不完整或滞后；用于产业研究和学习方向参考，不构成投资建议、求职结论或雇主评价。
      </section>

      <div className="ss-profile-grid">
        <main className="ss-profile-main">
          {/* Basic Facts */}
          <section className="ss-panel">
            <div className="ss-panel-head">
              <div>
                <p>概览</p>
                <h2>基础信息</h2>
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-ink-muted">成立时间</span>
                <div className="font-medium text-ink-text">{company.foundedYear ?? '—'}</div>
                <FieldProvenance fieldFacts={company.fieldFacts} fieldName="foundedYear" />
              </div>
              <div>
                <span className="text-ink-muted">注册资本</span>
                <div className="font-medium text-ink-text">{company.registeredCapital || '—'}</div>
                <FieldProvenance fieldFacts={company.fieldFacts} fieldName="registeredCapital" />
              </div>
              <div>
                <span className="text-ink-muted">员工规模</span>
                <div className="font-medium text-ink-text">{company.employeeCount || company.employeeCountRange || '—'}</div>
                <FieldProvenance fieldFacts={company.fieldFacts} fieldName="employees" />
              </div>
              <div>
                <span className="text-ink-muted">状态</span>
                <div className="font-medium text-ink-text">{companyStatusLabel(company.status)}</div>
                <FieldProvenance fieldFacts={company.fieldFacts} fieldName="status" />
              </div>
              <div>
                <span className="text-ink-muted">股票代码</span>
                <div className="font-medium text-ink-text">
                  {company.stockTicker ? `${company.stockTicker}${company.exchange ? ` (${company.exchange})` : ''}` : '—'}
                </div>
              </div>
              <div>
                <span className="text-ink-muted">最近更新</span>
                <div className="font-medium text-ink-text">{formatDate(company.lastEnrichedAt)}</div>
              </div>
              {company.description && (
                <div className="sm:col-span-2">
                  <span className="text-ink-muted">简介</span>
                  <div className="font-medium text-ink-text mt-1 leading-relaxed">{company.description}</div>
                </div>
              )}
            </div>
          </section>

          {/* Business Directions */}
          <section className="ss-panel">
            <div className="ss-panel-head">
              <div>
                <p>业务</p>
                <h2>业务方向</h2>
              </div>
            </div>
            <div className="p-4 space-y-4 text-sm">
              {company.domains && company.domains.length > 0 && (
                <div>
                  <span className="text-ink-muted block mb-1">技术方向</span>
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
                  <FieldProvenance fieldFacts={company.fieldFacts} fieldName="domains" />
                </div>
              )}
              {company.productLines && company.productLines.length > 0 && (
                <div>
                  <span className="text-ink-muted block mb-1">产品线</span>
                  <div className="flex flex-wrap gap-2">
                    {company.productLines.map((pl) => (
                      <span key={pl} className="ss-chip">{pl}</span>
                    ))}
                  </div>
                </div>
              )}
              {company.technologyKeywords && company.technologyKeywords.length > 0 && (
                <div>
                  <span className="text-ink-muted block mb-1">技术关键词</span>
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
                  <span className="text-ink-muted block mb-1">应用市场</span>
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
                <div className="text-ink-muted">暂无业务方向数据。</div>
              )}
            </div>
          </section>

          {/* Career Intelligence */}
          <section className="ss-panel">
            <div className="ss-panel-head">
              <div>
                <p>人才</p>
                <h2>岗位与学习线索</h2>
              </div>
            </div>
            <div className="p-4 space-y-4 text-sm">
              {company.careerRoles && company.careerRoles.length > 0 && (
                <div>
                  <span className="text-ink-muted block mb-1">相关岗位</span>
                  <ul className="list-disc list-inside text-ink-text">
                    {company.careerRoles.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {company.hiringSignals && company.hiringSignals.length > 0 && (
                <div>
                  <span className="text-ink-muted block mb-1">招聘线索</span>
                  <ul className="list-disc list-inside text-ink-text">
                    {company.hiringSignals.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {roadmaps.length > 0 && (
                <div>
                  <span className="text-ink-muted block mb-1">建议学习路线</span>
                  <div className="ss-link-list">
                    {roadmaps.map((r) => (
                      <Link key={r.slug} to={roadmapPath(r.slug)} className="block">
                        <span>{r.title}</span>
                        <span className="text-ink-muted text-xs">{r.domain} · {roadmapLevelLabel(r.level)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {(!company.careerRoles || company.careerRoles.length === 0) &&
               (!company.hiringSignals || company.hiringSignals.length === 0) &&
               roadmaps.length === 0 && (
                <div className="text-ink-muted">暂无岗位与学习线索。</div>
              )}
            </div>
          </section>

          {/* Research Links */}
          <section className="ss-panel">
            <div className="ss-panel-head">
              <div>
                <p>研究</p>
                <h2>相关论文</h2>
              </div>
              <span>{papers?.total ?? 0} 条匹配</span>
            </div>
            <div className="p-4 text-sm">
              {papers?.rows && papers.rows.length > 0 ? (
                <div className="ss-mini-list">
                  {papers.rows.map((paper: PaperRow) => (
                    <article key={paper.id} className="ss-mini-paper">
                      <div>
                        <h4><PaperLink id={paper.id} title={paper.title} /></h4>
                        <p>{paper.authors || '-'}</p>
                        {paper.matchReason && (
                          <span className="text-xs text-ink-subtle">匹配原因：{paper.matchReason}</span>
                        )}
                      </div>
                      <div className="ss-mini-meta">
                        <span>{paper.venue}</span>
                        <span>{paper.year}</span>
                        <span>{paperRankLabel(paper.rank)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="text-ink-muted">暂无通过 affiliation 文本匹配到的论文。</div>
              )}
              <p className="mt-3 text-xs text-ink-muted">
                论文匹配基于 affiliation 文本，可能漏掉子公司、实验室别名或历史名称，也可能混入同名实体；请结合来源记录复核。
              </p>
            </div>
          </section>
        </main>

        <aside className="ss-profile-side">
          {/* Source Provenance */}
          <section className="ss-panel">
            <div className="ss-panel-head compact">
              <h2>来源记录</h2>
            </div>
            <div className="p-4">
              {company.sources && company.sources.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="border-b border-line">
                      <tr>
                        <th className="py-1 pr-2 text-ink-secondary font-medium">类型</th>
                        <th className="py-1 pr-2 text-ink-secondary font-medium">来源</th>
                        <th className="py-1 pr-2 text-ink-secondary font-medium">可信度</th>
                        <th className="py-1 pr-2 text-ink-secondary font-medium">抓取时间</th>
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
                    <p className="text-xs text-ink-muted mt-2">另有 {company.sources.length - 20} 条来源</p>
                  )}
                </div>
              ) : (
                <div className="text-ink-muted text-sm">暂无来源数据。</div>
              )}

              {company.fieldFacts && company.fieldFacts.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wide mb-2">字段证据</h3>
                  <table className="w-full text-sm text-left">
                    <thead className="border-b border-line">
                      <tr>
                        <th className="py-1 pr-2 text-ink-secondary font-medium">字段</th>
                        <th className="py-1 pr-2 text-ink-secondary font-medium">值</th>
                        <th className="py-1 pr-2 text-ink-secondary font-medium">来源</th>
                        <th className="py-1 pr-2 text-ink-secondary font-medium">可信度</th>
                        <th className="py-1 pr-2 text-ink-secondary font-medium">抓取时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {company.fieldFacts.slice(0, 20).map((f) => (
                        <tr key={f.id} className="border-b border-line last:border-b-0">
                          <td className="py-2 pr-2 text-ink-text">{f.fieldName}</td>
                          <td className="py-2 pr-2 text-ink-text">{f.fieldValue}</td>
                          <td className="py-2 pr-2 text-ink-text">
                            {f.sourceUrl ? (
                              <a
                                href={f.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brand-600 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {f.sourceName || '—'}
                              </a>
                            ) : (
                              f.sourceName || '—'
                            )}
                          </td>
                          <td className="py-2 pr-2 text-ink-secondary">{f.confidence}</td>
                          <td className="py-2 text-ink-muted">{formatDate(f.fetchedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {company.fieldFacts.length > 20 && (
                    <p className="text-xs text-ink-muted mt-2">另有 {company.fieldFacts.length - 20} 条字段证据</p>
                  )}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
