import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { PaperLink } from '../components/PaperLink'
import { paperRankLabel } from '../utils/displayLabels'
import { friendlyError } from '../utils/errorMessages'
import { searchPath } from '../utils/routes'
import type { InstitutionProfile, MentorAuthor, MentorDetail, MentorInstitution, PaperRow } from '../types'

interface InstitutionListItem {
  name: string
  metadata?: InstitutionProfile['metadata']
  papers: number
  institutionScore: number
  sPlus: number
  s: number
  a: number
  citations: number
  mentorCount?: number
  mentorCountSource?: 'official-roster' | 'publication-heuristic' | 'industry-publication-heuristic'
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
        <span>{paperRankLabel(paper.rank)}</span>
      </div>
    </article>
  )
}

function rankLine(item: { sPlus?: number; s?: number; a?: number }) {
  return `S+ ${item.sPlus ?? 0} / S ${item.s ?? 0} / A ${item.a ?? 0}`
}

function mentorCountLabel(item: InstitutionListItem) {
  if (typeof item.mentorCount !== 'number') return '-'
  if (item.mentorCountSource === 'industry-publication-heuristic') return `${item.mentorCount} 产业线索`
  return item.mentorCountSource === 'official-roster' ? `${item.mentorCount} 官网核验` : `${item.mentorCount} 论文估计`
}

export default function InstitutionsPage() {
  const [list, setList] = useState<InstitutionListItem[]>([])
  const [detail, setDetail] = useState<InstitutionProfile | null>(null)
  const [mentorDetail, setMentorDetail] = useState<MentorDetail | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const listRequestId = useRef(0)
  const detailRequestId = useRef(0)
  const params = useParams()
  const navigate = useNavigate()
  const rawName = params['*']?.trim()
  const name = rawName && !['institutions', 'institution', 'institution profile', 'institution graph'].includes(rawName.toLowerCase())
    ? rawName
    : ''

  useEffect(() => {
    const requestId = ++listRequestId.current
    setLoadingList(true)
    setError('')
    Promise.all([
      api.institutions({ limit: 80, minPapers: 2 }),
      api.mentorInstitutions({ limit: 1000 }).catch(() => [] as MentorInstitution[]),
    ])
      .then(([data, mentorRows]) => {
        if (requestId !== listRequestId.current) return
        const mentorsByInstitution = new Map(mentorRows.map((row) => [row.name.toLowerCase(), row]))
        setList((data as InstitutionListItem[]).map((item) => {
          const mentorRow = mentorsByInstitution.get(item.name.toLowerCase())
          return mentorRow
            ? { ...item, mentorCount: mentorRow.mentorCount, mentorCountSource: mentorRow.mentorCountSource }
            : item
        }))
      })
      .catch((err) => {
        if (requestId === listRequestId.current) setError(friendlyError(err, '加载机构列表失败'))
      })
      .finally(() => {
        if (requestId === listRequestId.current) setLoadingList(false)
      })
  }, [])

  useEffect(() => {
    if (!name) {
      setDetail(null)
      setMentorDetail(null)
      return
    }
    const requestId = ++detailRequestId.current
    setLoadingDetail(true)
    setError('')
    api.mentorDetail(name)
      .then((row) => {
        if (requestId === detailRequestId.current) setMentorDetail(row)
      })
      .catch(() => {
        if (requestId === detailRequestId.current) setMentorDetail(null)
      })
    api.institutionProfile(name)
      .then((row) => {
        if (requestId === detailRequestId.current) setDetail(row)
      })
      .catch((err) => {
        if (requestId === detailRequestId.current) setError(friendlyError(err, '加载机构画像失败'))
      })
      .finally(() => {
        if (requestId === detailRequestId.current) setLoadingDetail(false)
      })
  }, [name])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return list
    return list.filter((item) => item.name.toLowerCase().includes(normalized))
  }, [list, query])

  if (name && loadingDetail) {
    return <div className="ss-skeleton-page"><p>正在加载机构画像...</p></div>
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
            <p className="ss-kicker">机构画像</p>
            <h1>{detail.name}</h1>
            <div className="ss-chip-row">
              <span>{detail.paperCount ?? 0} 篇论文</span>
              <span>元数据信号 {detail.institutionScore ?? 0}</span>
              <span>机构别名归一</span>
              <span>非现任名录</span>
              {detail.identity?.acronym && <span>{detail.identity.acronym}</span>}
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

        {(detail.identity?.city || detail.identity?.rorId || detail.identity?.mergedSubunits?.length) && (
          <section className="ss-panel">
            <div className="ss-panel-head compact">
              <h2>机构元数据</h2>
              <span>{detail.identity?.matchStatus || detail.identity?.source || '已归一化'}</span>
            </div>
            <div className="ss-chip-row">
              {detail.identity?.city && <span>{detail.identity.city}</span>}
              {detail.identity?.countryName && <span>{detail.identity.countryName}</span>}
              {typeof detail.identity?.latitude === 'number' && typeof detail.identity?.longitude === 'number' && (
                <span>{Number(detail.identity?.latitude).toFixed(3)}, {Number(detail.identity?.longitude).toFixed(3)}</span>
              )}
              {detail.identity?.geoConfidence && <span>地理置信度 {detail.identity.geoConfidence}%</span>}
              {detail.identity?.rorId && <span>{detail.identity.rorId.replace('https://ror.org/', 'ROR ')}</span>}
            </div>
            {detail.identity?.mergedSubunits?.length ? (
              <p className="text-xs text-ink-muted mt-3">合并别名/子机构：{detail.identity.mergedSubunits.slice(0, 8).join(' / ')}</p>
            ) : null}
          </section>
        )}

        <section className="ss-caveat">
          机构归一化仍会受到分校、实验室、企业团队、历史名称和作者跳槽影响。当前结果适合探索线索，不作为单一排序或现任教师名录。
        </section>
        <section className="ss-caveat">
          “IC 人员线索”会标注来源：官网核验优先；论文估计会过滤疑似学生作者，但仍需结合学院主页、ORCID 或人工名单复核。
        </section>

        <div className="ss-profile-grid">
          <main className="ss-profile-main">
            <section className="ss-panel">
              <div className="ss-panel-head">
                <div>
                  <p>论文流</p>
                  <h2>机构论文</h2>
                </div>
                <span>{detail.papers.length} 篇已载入</span>
              </div>
              <div className="ss-mini-list">
                {detail.papers.slice(0, 60).map((paper) => <MiniPaper key={paper.id} paper={paper} />)}
              </div>
            </section>
          </main>

          <aside className="ss-profile-side">
            {mentorDetail && (
              <section className="ss-panel">
                <div className="ss-panel-head compact">
                  <h2>{mentorDetail.entityKind === 'company' ? 'IC 产业作者线索' : 'IC 人员线索'}</h2>
                  <span>{mentorDetail.mentorCountSource === 'official-roster' ? '官网核验' : mentorDetail.mentorCountSource === 'industry-publication-heuristic' ? '产业论文线索' : '论文估计'}</span>
                </div>
                <div className="ss-caveat compact">
                  {mentorDetail.mentorCountSource === 'official-roster'
                    ? `已按官网人员名单核验 ${mentorDetail.officialRosterMatchedCount || mentorDetail.mentors.length} 位现任或公开列名人员。`
                    : mentorDetail.mentorCountSource === 'industry-publication-heuristic'
                      ? `产业论文作者候选 ${mentorDetail.mentorCandidateCount || mentorDetail.mentors.length} 位，不等同于公司员工名录。`
                      : `论文估计候选 ${mentorDetail.mentorCandidateCount || mentorDetail.mentors.length} 位，已过滤明显学生作者，但仍需官网核验。`}
                </div>
                <div className="ss-link-list">
                  {mentorDetail.mentors.slice(0, 14).map((mentor: MentorAuthor) => (
                    <button key={mentor.name} onClick={() => navigate(`/mentors/${encodeURIComponent(mentor.name)}?institution=${encodeURIComponent(detail.name)}`)}>
                      <span>{mentor.name}</span>
                      <strong>{mentor.rosterVerification?.roleTitle || `${mentor.papers || 0} 篇论文`}</strong>
                    </button>
                  ))}
                  {!mentorDetail.mentors.length && <span className="ss-muted-line">暂无可展示的 IC 候选。</span>}
                </div>
                <button className="ss-back-button" type="button" onClick={() => navigate(`/mentors?institution=${encodeURIComponent(detail.name)}`)}>
                  查看完整人员线索
                </button>
              </section>
            )}

            <section className="ss-panel">
              <div className="ss-panel-head compact"><h2>活跃作者线索</h2></div>
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
          <p className="ss-kicker">机构图谱</p>
          <h1>机构画像</h1>
          <p>按 IC 论文产出、S+ / S / A 分布、引用表现和机构归一化结果浏览高校、研究所与企业团队。人员列是作者/官网线索，不直接等同于现任教师人数。</p>
        </div>
        <div className="ss-directory-search">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索机构名称..." />
          <span>{filtered.length} 条结果</span>
        </div>
      </section>

      {error && <div className="ss-empty-state">{error}</div>}

      <section className="ss-rank-table">
        <header>
          <span>排序</span>
          <span>机构</span>
          <span>论文</span>
          <span>IC 人员线索</span>
          <span>S+</span>
          <span>引用</span>
            <span>元数据信号</span>
        </header>
        {loadingList && <div className="ss-table-loading">正在加载机构画像...</div>}
        {!loadingList && filtered.map((institution, index) => (
          <button key={institution.name} onClick={() => navigate(`/institutions/${encodeURIComponent(institution.name)}`)}>
            <span>{index + 1}</span>
            <span>
              <i>{initials(institution.name)}</i>
              <strong>{institution.name}</strong>
              <em>{[institution.metadata?.acronym, institution.metadata?.city, institution.metadata?.countryCode].filter(Boolean).join(' · ') || rankLine(institution)}</em>
            </span>
            <span>{institution.papers ?? 0}</span>
            <span title={institution.mentorCountSource === 'official-roster' ? '官网人员名单核验' : institution.mentorCountSource === 'industry-publication-heuristic' ? '产业论文作者线索' : '论文作者估计'}>{mentorCountLabel(institution)}</span>
            <span>{institution.sPlus ?? 0}</span>
            <span>{institution.citations ?? 0}</span>
            <span>{institution.institutionScore ?? 0}</span>
          </button>
        ))}
      </section>
    </div>
  )
}
