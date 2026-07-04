import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { PaperLink } from '../components/PaperLink'
import { searchPath } from '../utils/routes'
import type { InstitutionProfile, PaperRow } from '../types'

interface InstitutionListItem {
  name: string
  papers: number
  institutionScore: number
  sPlus: number
  s: number
  a: number
  citations: number
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function MiniPaper({ paper }: { paper: PaperRow }) {
  return (
    <article className="ss-mini-paper">
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
  )
}

function rankLine(item: { sPlus?: number; s?: number; a?: number }) {
  return `S+ ${item.sPlus ?? 0} / S ${item.s ?? 0} / A ${item.a ?? 0}`
}

export default function InstitutionsPage() {
  const [list, setList] = useState<InstitutionListItem[]>([])
  const [detail, setDetail] = useState<InstitutionProfile | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const params = useParams()
  const navigate = useNavigate()
  const rawName = params['*']?.trim()
  const name = rawName && !['institutions', 'institution', 'institution profile', 'institution graph'].includes(rawName.toLowerCase())
    ? rawName
    : ''

  useEffect(() => {
    setLoadingList(true)
    setError('')
    api.institutions({ limit: 80, minPapers: 2 })
      .then((data) => setList(data as InstitutionListItem[]))
      .catch((err) => setError(err instanceof Error ? err.message : '加载机构列表失败'))
      .finally(() => setLoadingList(false))
  }, [])

  useEffect(() => {
    if (!name) {
      setDetail(null)
      return
    }
    setLoadingDetail(true)
    setError('')
    api.institutionProfile(name).then(setDetail).catch((err) => setError(err instanceof Error ? err.message : '加载机构画像失败')).finally(() => setLoadingDetail(false))
  }, [name])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return list
    return list.filter((item) => item.name.toLowerCase().includes(normalized))
  }, [list, query])

  if (name && loadingDetail) {
    return <div className="ss-skeleton-page"><div /><p>正在加载机构画像...</p></div>
  }

  if (name && error) {
    return <div className="ss-empty-state">{error}</div>
  }

  if (name && detail) {
    return (
      <div className="ss-profile-page">
        <button className="ss-back-button" onClick={() => navigate('/institutions')}>返回机构列表</button>

        <section className="ss-profile-hero">
          <div className="ss-avatar">{initials(detail.name)}</div>
          <div>
            <p className="ss-kicker">Institution profile</p>
            <h1>{detail.name}</h1>
            <div className="ss-chip-row">
              <span>{detail.paperCount ?? 0} papers</span>
              <span>Score {detail.institutionScore ?? 0}</span>
              <span>{rankLine(detail.ranks)}</span>
              {detail.identity?.countryName && (
                <span
                  className="cursor-pointer hover:text-brand-600"
                  onClick={() => navigate(searchPath({ country: detail.identity?.countryCode || detail.identity?.countryName }))}
                >
                  {detail.identity.countryName}
                </span>
              )}
              {detail.qs?.qs_world_rank && <span>QS {detail.qs.qs_world_rank}</span>}
            </div>
          </div>
        </section>

        <section className="ss-caveat">
          机构归一化仍会受到分校、实验室、企业团队和历史名称影响。当前结果用于探索，不作为最终排名；未来会结合 IEEE affiliation、机构官网和人工 alias 审核。
        </section>
        <section className="ss-caveat">
          Institution profiles depend on affiliation parsing and alias normalization. Verify names before using for decisions.
        </section>

        <div className="ss-profile-grid">
          <main className="ss-profile-main">
            <section className="ss-panel">
              <div className="ss-panel-head">
                <div>
                  <p>Publication stream</p>
                  <h2>机构论文</h2>
                </div>
                <span>{detail.papers.length} loaded</span>
              </div>
              <div className="ss-mini-list">
                {detail.papers.slice(0, 60).map((paper) => <MiniPaper key={paper.id} paper={paper} />)}
              </div>
            </section>
          </main>

          <aside className="ss-profile-side">
            <section className="ss-panel">
              <div className="ss-panel-head compact"><h2>活跃学者</h2></div>
              <div className="ss-link-list">
                {detail.authors.slice(0, 12).map((item) => (
                  <button key={item.key} onClick={() => navigate(`/authors/${encodeURIComponent(item.key)}`)}>
                    <span>{item.key}</span>
                    <strong>{item.count ?? 0}</strong>
                  </button>
                ))}
              </div>
            </section>

            <section className="ss-panel">
              <div className="ss-panel-head compact"><h2>方向分布</h2></div>
              <div className="ss-bar-list">
                {detail.byDomain.slice(0, 8).map((item) => (
                  <div
                    key={item.key}
                    className="cursor-pointer hover:bg-surface-elevated"
                    onClick={() => navigate(searchPath({ institution: detail.name, field: item.key }))}
                  >
                    <span>{item.key}</span>
                    <strong>{item.count ?? 0}</strong>
                    <i style={{ width: `${Math.min(100, (item.count / Math.max(1, detail.byDomain[0]?.count || 1)) * 100)}%` }} />
                  </div>
                ))}
              </div>
            </section>

            {detail.byYear && detail.byYear.length > 0 && (
              <section className="ss-panel">
                <div className="ss-panel-head compact"><h2>年度趋势</h2></div>
                <div className="ss-bar-list">
                  {detail.byYear.slice(0, 8).map((item) => (
                    <div
                      key={item.key}
                      className="cursor-pointer hover:bg-surface-elevated"
                      onClick={() => navigate(searchPath({ yearFrom: item.key, yearTo: item.key, institution: detail.name }))}
                    >
                      <span>{item.key}</span>
                      <strong>{item.count ?? 0}</strong>
                      <i style={{ width: `${Math.min(100, (item.count / Math.max(1, detail.byYear[0]?.count || 1)) * 100)}%` }} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="ss-panel">
              <div className="ss-panel-head compact"><h2>会议/期刊</h2></div>
              <div className="ss-link-list">
                {detail.byVenue.slice(0, 10).map((item) => (
                  <button key={item.key} onClick={() => navigate(`/?venue=${encodeURIComponent(item.key)}`)}>
                    <span>{item.key}</span>
                    <strong>{item.count ?? 0}</strong>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    )
  }

  return (
    <div className="ss-directory-page">
      <section className="ss-directory-hero">
        <div>
          <p className="ss-kicker">Institution graph</p>
          <h1>机构实力</h1>
          <p>按 IC 论文产出、S+ / S / A 分布和引用表现浏览高校、研究所与企业团队。当前排名以后会继续过滤非 IC 期刊噪声。</p>
        </div>
        <div className="ss-directory-search">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索机构名称..." />
          <span>{filtered.length} results</span>
        </div>
      </section>

      {error && <div className="ss-empty-state">{error}</div>}

      <section className="ss-rank-table">
        <header>
          <span>Rank</span>
          <span>Institution</span>
          <span>Papers</span>
          <span>S+</span>
          <span>Citations</span>
          <span>Score</span>
        </header>
        {loadingList && <div className="ss-table-loading">正在加载机构排行...</div>}
        {!loadingList && filtered.map((institution, index) => (
          <button key={institution.name} onClick={() => navigate(`/institutions/${encodeURIComponent(institution.name)}`)}>
            <span>{index + 1}</span>
            <span>
              <i>{initials(institution.name)}</i>
              <strong>{institution.name}</strong>
              <em>{rankLine(institution)}</em>
            </span>
            <span>{institution.papers ?? 0}</span>
            <span>{institution.sPlus ?? 0}</span>
            <span>{institution.citations ?? 0}</span>
            <span>{institution.institutionScore ?? 0}</span>
          </button>
        ))}
      </section>
    </div>
  )
}
