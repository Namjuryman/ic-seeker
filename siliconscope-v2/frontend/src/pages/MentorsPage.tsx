import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { PaperLink } from '../components/PaperLink'
import { EmptyState, ErrorState, SkeletonState } from '../components/StatusState'
import { paperRankLabel } from '../utils/displayLabels'
import { friendlyError } from '../utils/errorMessages'
import type { AuthorProfileMetadata, MentorAuthor, MentorDetail, MentorInstitution, MentorProfile, MentorReview, MentorReviewStats, PaperRow } from '../types'

const scoreFields = [
  ['mentorship', '指导支持'],
  ['researchFit', '方向匹配'],
  ['publicationSupport', '论文支持'],
  ['tapeoutOpportunity', '流片/实验机会'],
  ['fundingStability', '经费稳定'],
  ['graduationPredictability', '毕业可预期'],
  ['labCulture', '组内氛围'],
  ['workloadIntensity', '工作强度'],
  ['careerSupport', '升学/就业支持'],
]

const relationshipOptions = [
  { value: 'Former Group Member', label: '曾经组内成员' },
  { value: 'Current Group Member', label: '当前组内成员' },
  { value: 'Applicant', label: '申请/套磁经历' },
  { value: 'Collaborator', label: '合作经历' },
  { value: 'Other', label: '其他' },
]

type MentorProfileWithReviews = MentorProfile & { reviews?: MentorReview[]; reviewStats?: MentorReviewStats }

const INITIAL_INSTITUTION_RENDER_COUNT = 90
const INSTITUTION_RENDER_STEP = 90
const DIRECTORY_CACHE_TTL = 120_000

type CachedValue<T> = { expiresAt: number; value: T }

const mentorInstitutionCache = new Map<string, CachedValue<MentorInstitution[]>>()
const mentorInstitutionPending = new Map<string, Promise<MentorInstitution[]>>()
const mentorDetailCache = new Map<string, CachedValue<MentorDetail>>()
const mentorProfileCache = new Map<string, CachedValue<MentorProfileWithReviews>>()

function readCache<T>(cache: Map<string, CachedValue<T>>, key: string) {
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.value
  cache.delete(key)
  return null
}

function writeCache<T>(cache: Map<string, CachedValue<T>>, key: string, value: T) {
  cache.set(key, { value, expiresAt: Date.now() + DIRECTORY_CACHE_TTL })
  return value
}

function mentorInstitutionKey(query: string) {
  return JSON.stringify({ q: query, limit: query ? 300 : 240 })
}

async function loadMentorInstitutions(query: string) {
  const key = mentorInstitutionKey(query)
  const cached = readCache(mentorInstitutionCache, key)
  if (cached) return cached
  const pending = mentorInstitutionPending.get(key)
  if (pending) return pending
  const request = api.mentorInstitutions({ limit: query ? 300 : 240, q: query })
    .then((rows) => writeCache(mentorInstitutionCache, key, rows))
    .finally(() => mentorInstitutionPending.delete(key))
  mentorInstitutionPending.set(key, request)
  return request
}

async function loadMentorDetail(name: string) {
  const cached = readCache(mentorDetailCache, name)
  if (cached) return cached
  const detail = await api.mentorDetail(name)
  return writeCache(mentorDetailCache, name, detail)
}

async function loadMentorProfile(name: string) {
  const cached = readCache(mentorProfileCache, name)
  if (cached) return cached
  const profile = await api.mentorProfile(name)
  return writeCache(mentorProfileCache, name, profile)
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

function ScholarAvatar({
  name,
  profile,
  className = 'ss-avatar',
}: {
  name: string
  profile?: AuthorProfileMetadata | null
  className?: string
}) {
  const photoUrl = profile?.photoUrl?.trim()

  return (
    <span className={className} aria-label={name}>
      {photoUrl && <img src={photoUrl} alt={name} loading="lazy" onError={(event) => { event.currentTarget.hidden = true }} />}
      <span>{initials(name) || 'M'}</span>
    </span>
  )
}

function trendText(trend?: string) {
  if (trend === 'rising') return '近年上升'
  if (trend === 'cooling') return '近年放缓'
  return '稳定活跃'
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

function ReviewSection({ mentorName, profile }: { mentorName: string; profile: MentorProfileWithReviews }) {
  const [reviews, setReviews] = useState<MentorReview[]>(profile.reviews || [])
  const [stats, setStats] = useState<MentorReviewStats>(profile.reviewStats || { total: 0, verified: 0, approved: 0, pending: 0 })
  const [relationshipType, setRelationshipType] = useState('Former Group Member')
  const [scores, setScores] = useState<Record<string, number>>(() => Object.fromEntries(scoreFields.map(([key]) => [key, 3])))
  const [strengthsText, setStrengthsText] = useState('')
  const [cautionsText, setCautionsText] = useState('')
  const [fitText, setFitText] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setReviews(profile.reviews || [])
    setStats(profile.reviewStats || { total: 0, verified: 0, approved: 0, pending: 0 })
  }, [profile])

  async function refresh() {
    const data = await api.mentorProfile(mentorName)
    setReviews(data.reviews || [])
    setStats(data.reviewStats || { total: 0, verified: 0, approved: 0, pending: 0 })
  }

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      await api.addMentorReview(mentorName, { relationshipType, scores, strengthsText, cautionsText, fitText })
      setStrengthsText('')
      setCautionsText('')
      setFitText('')
      setMessage('评价已提交，审核通过后会进入匿名统计。')
      await refresh()
    } catch (err: any) {
      setError(friendlyError(err, '提交失败，请确认已登录后再试。'))
    } finally {
      setSubmitting(false)
    }
  }

  const approvedCount = stats.approved ?? stats.total ?? 0
  const aggregate = scoreFields.map(([key, label]) => {
    const values = reviews.map((review) => Number((review.scores || {})[key])).filter((value) => Number.isFinite(value) && value > 0)
    const avg = values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null
    return { key, label, avg }
  })

  return (
    <section className="ss-panel ss-review-panel">
      <div className="ss-panel-head">
        <div>
          <p>匿名评价</p>
          <h2>研究者/课题组评价</h2>
        </div>
        <span>{approvedCount} 已公开 / {stats.pending || 0} 待审核</span>
      </div>

      <div className="ss-caveat compact">
        评价用于了解课题组体验和匹配度，不用于人身攻击。公开统计只展示通过审核的匿名评价。
      </div>

      {approvedCount < 3 ? (
        <EmptyState title="样本仍然不足" description={`当前只有 ${approvedCount} 条通过审核的评价，暂不公开聚合分数。`} />
      ) : (
        <div className="ss-review-grid">
          {aggregate.map((item) => (
            <div key={item.key}>
              <span>{item.label}</span>
              <strong>{item.avg ?? '-'}</strong>
            </div>
          ))}
        </div>
      )}

      {approvedCount >= 5 && (
        <div className="ss-review-summary">
          <h3>评价摘要</h3>
          {reviews.slice(0, 6).map((review) => (
            <div className="ss-text-block" key={review.id}>
              <h4>{review.publicAlias || review.public_alias || '匿名评价者'}</h4>
              <p><strong>优势：</strong>{review.strengthsText || review.strengths_text || '-'}</p>
              <p><strong>注意：</strong>{review.cautionsText || review.cautions_text || '-'}</p>
              <p><strong>适合：</strong>{review.fitText || review.fit_text || '-'}</p>
            </div>
          ))}
        </div>
      )}

      <div className="ss-review-form">
        <select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)}>
          {relationshipOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <div className="ss-score-grid">
          {scoreFields.map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                type="number"
                min={1}
                max={5}
                value={scores[key] || 3}
                onChange={(event) => setScores((prev) => ({ ...prev, [key]: Math.max(1, Math.min(5, Number(event.target.value) || 3)) }))}
              />
            </label>
          ))}
        </div>
        <div className="ss-textarea-grid">
          <textarea value={strengthsText} onChange={(event) => setStrengthsText(event.target.value)} placeholder="这个组做得好的地方" />
          <textarea value={cautionsText} onChange={(event) => setCautionsText(event.target.value)} placeholder="申请者需要注意什么" />
          <textarea value={fitText} onChange={(event) => setFitText(event.target.value)} placeholder="适合什么类型的学生" />
        </div>
        {message && <p className="ss-form-message good">{message}</p>}
        {error && <p className="ss-form-message bad">{error}</p>}
        <button type="button" onClick={submit} disabled={submitting}>{submitting ? '提交中...' : '提交匿名评价'}</button>
      </div>
    </section>
  )
}

export default function MentorsPage() {
  const [institutions, setInstitutions] = useState<MentorInstitution[]>([])
  const [detail, setDetail] = useState<MentorDetail | null>(null)
  const [profile, setProfile] = useState<MentorProfileWithReviews | null>(null)
  const [loadingInstitutions, setLoadingInstitutions] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [visibleInstitutionCount, setVisibleInstitutionCount] = useState(INITIAL_INSTITUTION_RENDER_COUNT)
  const [recentOnly, setRecentOnly] = useState(false)
  const deferredQuery = useDeferredValue(debouncedQuery)
  const institutionRequestId = useRef(0)
  const detailRequestId = useRef(0)
  const profileRequestId = useRef(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const params = useParams()
  const pathSegments = (params['*'] || '').split('/').filter(Boolean)
  const pathKind = pathSegments[0]?.toLowerCase()
  const pathValue = pathSegments.slice(1).join('/')
  const routeInstitution = pathKind === 'institutions' ? decodeURIComponent(pathValue) : ''
  const routeMentor = pathKind === 'authors'
    ? decodeURIComponent(pathValue)
    : pathSegments.length === 1
      ? pathSegments[0]
      : ''
  const institution = searchParams.get('institution') || routeInstitution
  const mentor = routeMentor && !['mentors', 'mentor', 'mentor profile', 'mentor intelligence', 'authors', 'institutions'].includes(routeMentor.toLowerCase())
    ? routeMentor
    : ''

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 180)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const normalized = deferredQuery.trim()
    const requestId = ++institutionRequestId.current
    setLoadingInstitutions(true)
    setError('')
    loadMentorInstitutions(normalized)
      .then((rows) => {
        if (requestId === institutionRequestId.current) setInstitutions(rows)
      })
      .catch((err) => {
        if (requestId === institutionRequestId.current) setError(friendlyError(err, '加载机构列表失败'))
      })
      .finally(() => {
        if (requestId === institutionRequestId.current) setLoadingInstitutions(false)
      })
  }, [deferredQuery])

  useEffect(() => {
    setVisibleInstitutionCount(INITIAL_INSTITUTION_RENDER_COUNT)
  }, [deferredQuery])

  useEffect(() => {
    if (!institution) {
      setDetail(null)
      return
    }
    const requestId = ++detailRequestId.current
    setLoadingDetail(true)
    setError('')
    loadMentorDetail(institution)
      .then((row) => {
        if (requestId === detailRequestId.current) setDetail(row)
      })
      .catch((err) => {
        if (requestId === detailRequestId.current) setError(friendlyError(err, '加载研究者列表失败'))
      })
      .finally(() => {
        if (requestId === detailRequestId.current) setLoadingDetail(false)
      })
  }, [institution])

  useEffect(() => {
    if (!mentor) {
      setProfile(null)
      return
    }
    const requestId = ++profileRequestId.current
    setLoadingProfile(true)
    setError('')
    loadMentorProfile(mentor)
      .then((row) => {
        if (requestId === profileRequestId.current) setProfile(row)
      })
      .catch((err) => {
        if (requestId === profileRequestId.current) setError(friendlyError(err, '加载研究者画像失败'))
      })
      .finally(() => {
        if (requestId === profileRequestId.current) setLoadingProfile(false)
      })
  }, [mentor])

  const filteredInstitutions = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase()
    const rows = normalized ? institutions.filter((item) => item.name.toLowerCase().includes(normalized)) : institutions
    return [...rows].sort((a, b) => b.institutionScore - a.institutionScore)
  }, [institutions, deferredQuery])

  const visibleInstitutions = useMemo(
    () => filteredInstitutions.slice(0, visibleInstitutionCount),
    [filteredInstitutions, visibleInstitutionCount]
  )

  const mentors = useMemo(() => {
    const rows = detail?.mentors || []
    const source = recentOnly ? rows.filter((item) => item.recentPapers > 0) : rows
    return [...source].sort((a, b) => b.authorScore - a.authorScore)
  }, [detail, recentOnly])

  if (mentor && loadingProfile) {
    return <SkeletonState variant="detail" title="正在加载研究者画像" description="整理论文流、职业阶段和评价摘要。" />
  }

  if (mentor && error) {
    return <ErrorState title="研究者画像加载失败" description={error} onRetry={() => window.location.reload()} />
  }

  if (mentor && profile) {
    return (
      <div className="ss-profile-page">
        <button className="ss-back-button" onClick={() => navigate(`/mentors?institution=${encodeURIComponent(institution || '')}`)}>
          返回研究者列表
        </button>

        <section className="ss-profile-hero">
          <ScholarAvatar name={profile.name} profile={profile.profile} />
          <div>
            <p className="ss-kicker">研究者画像</p>
            <h1>{profile.name}</h1>
            <div className="ss-chip-row">
              {profile.profile?.title && <span>{profile.profile.title}</span>}
              {profile.profile?.affiliation && <span>{profile.profile.affiliation}</span>}
              <span>{profile.paperCount} 篇论文</span>
              <span>元数据信号 {profile.authorScore}</span>
              <span>论文画像</span>
              <span>研究者身份待核验</span>
              <span>{profile.roleStage || '阶段待校验'}</span>
              <span>{profile.firstYear || '-'} - {profile.lastYear || '-'}</span>
            </div>
          </div>
          {(profile.profile?.homepageUrl || profile.profile?.sourceUrl) && (
            <div className="ss-profile-actions">
              {profile.profile.homepageUrl && <a href={profile.profile.homepageUrl} target="_blank" rel="noreferrer">个人主页</a>}
              {profile.profile.sourceUrl && <a href={profile.profile.sourceUrl} target="_blank" rel="noreferrer">照片来源</a>}
            </div>
          )}
        </section>

        <section className="ss-caveat">
          研究者画像由论文元数据、作者归一和已审核匿名评价共同生成；它是申请前的研究线索，不是官方身份、录取概率或评价排名。
        </section>

        <div className="ss-profile-grid">
          <main className="ss-profile-main">
            <section className="ss-panel">
              <div className="ss-panel-head">
                <div>
                  <p>论文流</p>
                  <h2>论文与方向</h2>
                </div>
                <span>{profile.papers?.length || 0} 篇已载入</span>
              </div>
              <div className="ss-mini-list">
                {profile.papers?.length ? (
                  profile.papers.slice(0, 60).map((paper) => <MiniPaper key={paper.id} paper={paper} />)
                ) : (
                  <EmptyState title="暂无论文" description="当前研究者画像没有匹配到论文。" />
                )}
              </div>
            </section>
          </main>

          <aside className="ss-profile-side">
            <section className="ss-panel">
              <div className="ss-panel-head compact"><h2>生涯推测</h2></div>
              <div className="ss-fact-grid one">
                <div><span>首次收录</span><strong>{profile.firstYear || '-'}</strong></div>
                <div><span>最近收录</span><strong>{profile.lastYear || '-'}</strong></div>
                <div><span>跨度</span><strong>{profile.careerSpan || 0} 年</strong></div>
                <div><span>判断</span><strong>{profile.roleStage || '待校验'}</strong></div>
              </div>
            </section>
          </aside>
        </div>

        <ReviewSection mentorName={mentor} profile={profile} />
      </div>
    )
  }

  if (institution && loadingDetail) {
    return <SkeletonState variant="list" title="正在加载机构研究者列表" description="按机构论文和研究者候选重新排序。" />
  }

  if (institution && error) {
    return <ErrorState title="机构研究者列表加载失败" description={error} onRetry={() => window.location.reload()} />
  }

  if (institution && detail) {
    return (
      <div className="ss-directory-page">
        <button className="ss-back-button" onClick={() => setSearchParams({})}>返回机构列表</button>
        <section className="ss-directory-hero slim">
          <div>
            <p className="ss-kicker">机构研究者</p>
            <h1>{detail.institution}</h1>
            <p>
              {detail.mentorCandidateCount} 位 IC 人员线索，已过滤 {detail.excludedLikelyStudentCount} 位疑似学生作者。是否为现任教师仍应以学院主页、ORCID 或官网人员名单为准。
            </p>
            <div className="ss-chip-row">
              <span>{detail.mentorCountSource === 'official-roster' ? '官网名单核验' : '论文估计'}</span>
              <span>非完整教师名录</span>
              <span>需人工复核</span>
            </div>
          </div>
          <label className="ss-toggle">
            <input type="checkbox" checked={recentOnly} onChange={(event) => setRecentOnly(event.target.checked)} />
            <span>仅看近年活跃</span>
          </label>
        </section>

        <section className="ss-caveat compact">
          {detail.mentorCountSource === 'official-roster' ? '当前列表已按官网人员名单核验。' : '当前列表是“近期活跃人员线索”：优先要求近年机构论文和资深作者位证据。'}
          历史资深作者 {detail.historicalSeniorAuthorCount || 0} 位，疑似学生/协作者 {detail.excludedLikelyStudentCount} 位；退休、跳槽和兼职情况仍需人工复核。
        </section>

        <div className="ss-chip-row wide">
          {detail.domains.slice(0, 10).map((domain) => <span key={domain.key}>{domain.key} ({domain.count})</span>)}
        </div>

        <section className="ss-card-grid">
          {mentors.map((item: MentorAuthor, index) => (
            <button key={item.name} className="ss-mentor-card" onClick={() => navigate(`/mentors/${encodeURIComponent(item.name)}?institution=${encodeURIComponent(institution)}`)}>
              <span className="ss-rank">{index + 1}</span>
              <ScholarAvatar name={item.name} profile={item.profile} className="ss-mentor-avatar" />
              <div>
                <h3>{item.name}</h3>
                <p>元数据信号 {item.authorScore} · {item.papers} 篇论文 · {trendText(item.trend)}</p>
                <em>{rankLine(item)}</em>
                <div>
                  {item.rosterVerification?.status === 'verified_current' && <span>官网核验</span>}
                  <span>资深作者证据 · {item.seniorAuthorPapers || 0}</span>
                  {item.topDomains.slice(0, 3).map((domain) => <span key={domain.key}>{domain.key} · {domain.count}</span>)}
                </div>
              </div>
            </button>
          ))}
          {!mentors.length && <EmptyState title="暂无研究者候选" description="当前筛选条件下没有可展示研究者。" />}
        </section>
      </div>
    )
  }

  return (
    <div className="ss-directory-page">
      <section className="ss-directory-hero">
        <div>
          <p className="ss-kicker">研究者情报</p>
          <h1>研究者/机构</h1>
          <p>以机构为入口查看 IC 研究者和产业作者线索、研究方向、近年活跃度和匿名评价。官网核验优先；论文估计不直接等同于现任教师名录。</p>
          <div className="ss-chip-row">
            <span>元数据线索</span>
            <span>官网核验优先</span>
            <span>非录取建议</span>
          </div>
        </div>
        <div className="ss-directory-search">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索机构..." />
          <span>{filteredInstitutions.length} 个机构</span>
        </div>
      </section>

      {error && <ErrorState title="研究者机构加载失败" description={error} />}

      <section className="ss-card-grid institution">
        {loadingInstitutions && <SkeletonState variant="list" title="正在加载研究者机构" description="按 IC 论文产出、人员线索和 QS 信息排序。" />}
        {!loadingInstitutions && visibleInstitutions.map((item, index) => (
          <button key={item.name} className="ss-institution-card" onClick={() => setSearchParams({ institution: item.name })}>
            <div className="ss-card-head">
              <span className="ss-rank">{index + 1}</span>
              {item.qs?.qs_world_rank && <em>QS {item.qs.qs_world_rank}</em>}
            </div>
            <h3>{item.name}</h3>
            <div className="ss-fact-grid">
              <div><span>人员线索</span><strong>{item.mentorCount}</strong></div>
              <div><span>IC 论文</span><strong>{item.papers}</strong></div>
              <div><span>元数据信号</span><strong>{item.institutionScore}</strong></div>
              <div><span>等级</span><strong>{rankLine(item)}</strong></div>
            </div>
          </button>
        ))}
        {!loadingInstitutions && !filteredInstitutions.length && (
          <EmptyState title="没有匹配机构" description="换一个学校英文名、缩写或地区线索试试。" />
        )}
      </section>
      {!loadingInstitutions && visibleInstitutions.length < filteredInstitutions.length && (
        <div className="ss-load-more">
          <button type="button" onClick={() => setVisibleInstitutionCount((count) => count + INSTITUTION_RENDER_STEP)}>
            再显示 {Math.min(INSTITUTION_RENDER_STEP, filteredInstitutions.length - visibleInstitutions.length)} 个
          </button>
          <span>{visibleInstitutions.length} / {filteredInstitutions.length}</span>
        </div>
      )}
    </div>
  )
}
