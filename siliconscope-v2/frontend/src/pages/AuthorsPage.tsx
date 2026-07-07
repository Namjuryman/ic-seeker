import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { PaperLink } from '../components/PaperLink'
import { EmptyState, ErrorState, SkeletonState } from '../components/StatusState'
import { institutionPath, searchPath } from '../utils/routes'
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

const RESERVED_AUTHOR_ROUTES = new Set(['', 'authors', 'author', 'profile', 'scholar', 'scholar-graph'])

function decodeRouteName(raw?: string) {
  const value = decodeURIComponent(raw || '').trim()
  return RESERVED_AUTHOR_ROUTES.has(value.toLowerCase()) ? '' : value
}

function initials(name: string) {
  const letters = name
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return letters || 'A'
}

function rankLine(item: { sPlus?: number; s?: number; a?: number }) {
  return `S+ ${item.sPlus ?? 0} / S ${item.s ?? 0} / A ${item.a ?? 0}`
}

function MiniPaper({ paper }: { paper: PaperRow }) {
  return (
    <article className="ss-mini-paper">
      <div>
        <h4><PaperLink id={paper.id} title={paper.title} /></h4>
        <p>{paper.authors || '-'}</p>
      </div>
      <div className="ss-mini-meta">
        <span>{paper.venue || '-'}</span>
        <span>{paper.year || '-'}</span>
        <span>{paper.rank || '-'}</span>
      </div>
    </article>
  )
}

function BarList({
  rows,
  onClick,
  emptyTitle = '暂无分布数据',
}: {
  rows: Array<{ key: string; count: number }>
  onClick: (key: string) => void
  emptyTitle?: string
}) {
  const max = Math.max(1, rows[0]?.count || 1)

  if (!rows.length) {
    return <EmptyState eyebrow="No data" title={emptyTitle} description="当前画像还没有足够的聚合信息。" />
  }

  return (
    <div className="ss-bar-list">
      {rows.map((item) => (
        <button key={item.key} type="button" onClick={() => onClick(item.key)}>
          <span>{item.key}</span>
          <strong>{item.count ?? 0}</strong>
          <i style={{ width: `${Math.min(100, (item.count / max) * 100)}%` }} />
        </button>
      ))}
    </div>
  )
}

export default function AuthorsPage() {
  const [list, setList] = useState<AuthorListItem[]>([])
  const [detail, setDetail] = useState<AuthorProfile | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const params = useParams()
  const navigate = useNavigate()
  const name = decodeRouteName(params['*'])

  useEffect(() => {
    setLoadingList(true)
    setError('')
    api.professors({ limit: 120, minPapers: 2 })
      .then((data) => setList(data as AuthorListItem[]))
      .catch((err) => setError(err instanceof Error ? err.message : '加载学者列表失败'))
      .finally(() => setLoadingList(false))
  }, [])

  useEffect(() => {
    if (!name) {
      setDetail(null)
      return
    }
    setLoadingDetail(true)
    setError('')
    api.authorProfile(name)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : '加载学者画像失败'))
      .finally(() => setLoadingDetail(false))
  }, [name])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return list
    return list.filter((item) => item.name.toLowerCase().includes(normalized))
  }, [list, query])

  if (name && loadingDetail) {
    return <SkeletonState variant="detail" title="正在加载学者画像" description="整理代表论文、方向分布和合作网络。" />
  }

  if (name && error) {
    return <ErrorState title="学者画像加载失败" description={error} onRetry={() => window.location.reload()} />
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
              <span>{detail.paperCount ?? 0} papers</span>
              <span>Score {Math.round(detail.authorScore ?? 0)}</span>
              <span>{rankLine(detail.ranks)}</span>
              {detail.primaryInstitution && <button type="button" onClick={() => navigate(institutionPath(detail.primaryInstitution))}>{detail.primaryInstitution}</button>}
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
                {detail.papers.length ? (
                  detail.papers.slice(0, 80).map((paper) => <MiniPaper key={paper.id} paper={paper} />)
                ) : (
                  <EmptyState title="暂无代表论文" description="当前作者画像没有匹配到可展示论文。" />
                )}
              </div>
            </section>
          </main>

          <aside className="ss-profile-side">
            <section className="ss-panel">
              <div className="ss-panel-head compact"><h2>方向分布</h2></div>
              <BarList rows={detail.byDomain.slice(0, 8)} onClick={(key) => navigate(searchPath({ field: key }))} />
            </section>

            <section className="ss-panel">
              <div className="ss-panel-head compact"><h2>会议/期刊</h2></div>
              <BarList rows={(detail.byVenue || []).slice(0, 8)} onClick={(key) => navigate(searchPath({ venue: key }))} emptyTitle="暂无会议/期刊统计" />
            </section>

            <section className="ss-panel">
              <div className="ss-panel-head compact"><h2>年度趋势</h2></div>
              <BarList rows={(detail.byYear || []).slice(0, 10)} onClick={(key) => navigate(searchPath({ yearFrom: key, yearTo: key }))} emptyTitle="暂无年度趋势" />
            </section>

            <section className="ss-panel">
              <div className="ss-panel-head compact"><h2>合作者</h2></div>
              <div className="ss-link-list">
                {detail.coauthors.slice(0, 12).map((item) => (
                  <button key={item.key} onClick={() => navigate(`/authors/${encodeURIComponent(item.key)}`)}>
                    <span>{item.key}</span>
                    <strong>{item.count ?? 0}</strong>
                  </button>
                ))}
                {!detail.coauthors.length && <span className="ss-muted-line">暂无合作者数据。</span>}
              </div>
            </section>

            <section className="ss-panel">
              <div className="ss-panel-head compact"><h2>机构线索</h2></div>
              <div className="ss-link-list">
                {detail.institutions.slice(0, 8).map((item) => (
                  <button key={item.key} onClick={() => navigate(institutionPath(item.key))}>
                    <span>{item.key}</span>
                    <strong>{item.count ?? 0}</strong>
                  </button>
                ))}
                {!detail.institutions.length && <span className="ss-muted-line">暂无机构线索。</span>}
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

      {error && <ErrorState title="学者列表加载失败" description={error} />}

      <section className="ss-rank-table">
        <header>
          <span>Rank</span>
          <span>Scholar</span>
          <span>Papers</span>
          <span>S+</span>
          <span>Citations</span>
          <span>Score</span>
        </header>
        {loadingList && <SkeletonState variant="list" title="正在加载学者排行" description="整理作者分数、论文数和引用统计。" />}
        {!loadingList && filtered.map((author, index) => (
          <button key={author.name} onClick={() => navigate(`/authors/${encodeURIComponent(author.name)}`)}>
            <span>{index + 1}</span>
            <span>
              <i>{initials(author.name)}</i>
              <strong>{author.name}</strong>
              <em>{rankLine(author)}</em>
            </span>
            <span>{author.papers ?? 0}</span>
            <span>{author.sPlus ?? 0}</span>
            <span>{author.citations ?? 0}</span>
            <span>{Math.round(author.authorScore ?? 0)}</span>
          </button>
        ))}
        {!loadingList && !filtered.length && (
          <EmptyState title="没有匹配的学者" description="换一个姓名、缩写或机构线索试试。" />
        )}
      </section>
    </div>
  )
}
