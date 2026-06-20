import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { PaperLink } from '../components/PaperLink'
import type { AuthorProfile, PaperRow } from '../types'

interface AuthorListItem {
  name: string
  papers: number
  authorScore: number
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

function rankLine(item: { sPlus?: number; s?: number; a?: number }) {
  return `S+ ${item.sPlus || 0} / S ${item.s || 0} / A ${item.a || 0}`
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

export default function AuthorsPage() {
  const [list, setList] = useState<AuthorListItem[]>([])
  const [detail, setDetail] = useState<AuthorProfile | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [query, setQuery] = useState('')
  const params = useParams()
  const navigate = useNavigate()
  const name = params['*']

  useEffect(() => {
    setLoadingList(true)
    api.professors({ limit: 80, minPapers: 2 })
      .then((data) => setList(data as AuthorListItem[]))
      .finally(() => setLoadingList(false))
  }, [])

  useEffect(() => {
    if (!name) {
      setDetail(null)
      return
    }
    setLoadingDetail(true)
    api.authorProfile(name).then(setDetail).finally(() => setLoadingDetail(false))
  }, [name])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return list
    return list.filter((item) => item.name.toLowerCase().includes(normalized))
  }, [list, query])

  if (name && loadingDetail) {
    return <div className="ss-skeleton-page"><div /><p>正在加载学者画像...</p></div>
  }

  if (name && detail) {
    return (
      <div className="ss-profile-page">
        <button className="ss-back-button" onClick={() => navigate('/authors')}>返回学者列表</button>

        <section className="ss-profile-hero">
          <div className="ss-avatar">{initials(detail.name)}</div>
          <div>
            <p className="ss-kicker">Author profile</p>
            <h1>{detail.name}</h1>
            <div className="ss-chip-row">
              <span>{detail.paperCount} papers</span>
              <span>Score {detail.authorScore}</span>
              <span>{rankLine(detail.ranks)}</span>
              {detail.primaryInstitution && <span>{detail.primaryInstitution}</span>}
              {detail.qs?.qs_world_rank && <span>QS {detail.qs.qs_world_rank}</span>}
            </div>
          </div>
          <div className="ss-profile-actions">
            <a href={detail.external?.googleScholar} target="_blank" rel="noreferrer">Scholar</a>
            <a href={detail.external?.webSearch} target="_blank" rel="noreferrer">Web search</a>
          </div>
        </section>

        <section className="ss-caveat">
          作者归一化仍依赖论文元数据和 alias 表。这里显示的是本地数据库画像，不等同于最终学术评价；未来接入 IEEE API、ORCID 和主页爬虫后会继续校准。
        </section>

        <div className="ss-profile-grid">
          <main className="ss-profile-main">
            <section className="ss-panel">
              <div className="ss-panel-head">
                <div>
                  <p>Publication stream</p>
                  <h2>代表论文</h2>
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
              <div className="ss-panel-head compact"><h2>方向分布</h2></div>
              <div className="ss-bar-list">
                {detail.byDomain.slice(0, 8).map((item) => (
                  <div key={item.key}>
                    <span>{item.key}</span>
                    <strong>{item.count}</strong>
                    <i style={{ width: `${Math.min(100, (item.count / Math.max(1, detail.byDomain[0]?.count || 1)) * 100)}%` }} />
                  </div>
                ))}
              </div>
            </section>

            <section className="ss-panel">
              <div className="ss-panel-head compact"><h2>合作者</h2></div>
              <div className="ss-link-list">
                {detail.coauthors.slice(0, 12).map((item) => (
                  <button key={item.key} onClick={() => navigate(`/authors/${encodeURIComponent(item.key)}`)}>
                    <span>{item.key}</span>
                    <strong>{item.count}</strong>
                  </button>
                ))}
              </div>
            </section>

            <section className="ss-panel">
              <div className="ss-panel-head compact"><h2>机构线索</h2></div>
              <div className="ss-link-list">
                {detail.institutions.slice(0, 8).map((item) => (
                  <button key={item.key} onClick={() => navigate(`/institutions/${encodeURIComponent(item.key)}`)}>
                    <span>{item.key}</span>
                    <strong>{item.count}</strong>
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
          <p className="ss-kicker">Scholar graph</p>
          <h1>学者画像</h1>
          <p>按论文质量、方向覆盖和近年活跃度浏览 IC 相关学者。当前为本地元数据评分，后续会继续接入 IEEE / ORCID / 学院主页校验。</p>
        </div>
        <div className="ss-directory-search">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索学者姓名..." />
          <span>{filtered.length} results</span>
        </div>
      </section>

      <section className="ss-rank-table">
        <header>
          <span>Rank</span>
          <span>Scholar</span>
          <span>Papers</span>
          <span>S+</span>
          <span>Citations</span>
          <span>Score</span>
        </header>
        {loadingList && <div className="ss-table-loading">正在加载学者排行...</div>}
        {!loadingList && filtered.map((author, index) => (
          <button key={author.name} onClick={() => navigate(`/authors/${encodeURIComponent(author.name)}`)}>
            <span>{index + 1}</span>
            <span>
              <i>{initials(author.name)}</i>
              <strong>{author.name}</strong>
              <em>{rankLine(author)}</em>
            </span>
            <span>{author.papers}</span>
            <span>{author.sPlus}</span>
            <span>{author.citations}</span>
            <span>{author.authorScore}</span>
          </button>
        ))}
      </section>
    </div>
  )
}
