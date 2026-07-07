import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { PaperLink } from '../components/PaperLink'
import { EntityLink } from '../components/EntityLink'
import { searchPath } from '../utils/routes'
import type { ApiKeyInfo, PaperComment, PaperRow, PdfInboxInfo, SearchResult, SearchSuggestion, StatsData } from '../types'

const PAGE_SIZE = 20
const COMMENT_LIMIT = 12
const SEARCH_HISTORY_KEY = 'siliconscope.search.history.v1'

type SearchControls = {
  q: string
  venue: string
  field: string
  rank: string
  yearFrom: string
  yearTo: string
  sort: string
  semantic: boolean
  hasPdf: boolean
  favorite: boolean
  author: string
  institution: string
  country: string
  minScore: string
  minCitations: string
}

const defaultControls: SearchControls = {
  q: '',
  venue: '',
  field: '',
  rank: '',
  yearFrom: '2000',
  yearTo: '2026',
  sort: 'relevance',
  semantic: true,
  hasPdf: false,
  favorite: false,
  author: '',
  institution: '',
  country: '',
  minScore: '',
  minCitations: '',
}

const readingOptions = [
  ['unread', '未读'],
  ['reading', '在读'],
  ['read', '已读'],
  ['important', '重点'],
  ['skip', '跳过'],
]

const tabs = [
  { to: '/', label: '全部' },
  { to: searchPath({ rank: 'S+' }), label: '论文(S+)' },
  { to: '/mentors', label: '导师/机构' },
  { to: '/topics', label: '方向' },
  { to: '/geo', label: 'Geo' },
  { to: '/authors', label: '专家' },
  { to: '/institutions', label: '机构' },
  { to: '/venue-matrix', label: '会议/期刊' },
]

const topicShortcuts = ['ADC', 'PLL', 'DC-DC', 'LDO', 'RF', 'SerDes', 'SRAM', 'Bandgap']

function splitAuthors(authors: string) {
  return String(authors || '').split(';').map((author) => author.trim()).filter(Boolean)
}

function formatNumber(value: number | string | undefined) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n.toLocaleString() : '-'
}

function cleanText(value: string | undefined) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function csvValues(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function toggleCsvValue(value: string, item: string) {
  const next = new Set(csvValues(value))
  if (next.has(item)) next.delete(item)
  else next.add(item)
  return [...next].join(',')
}

function loadSearchHistory() {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    return raw ? JSON.parse(raw).filter(Boolean).slice(0, 8) as string[] : []
  } catch {
    return []
  }
}

function saveSearchHistory(query: string) {
  const trimmed = query.trim()
  if (!trimmed) return loadSearchHistory()
  const next = [trimmed, ...loadSearchHistory().filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8)
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next))
  return next
}

function highlightParts(text: string | undefined, query: string) {
  const value = cleanText(text)
  const terms = query
    .split(/\s+/)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter((term) => term.length >= 2)
    .slice(0, 8)

  if (!value || !terms.length) return value

  const matcher = new RegExp(`(${terms.join('|')})`, 'ig')
  const exact = new RegExp(`^(${terms.join('|')})$`, 'i')
  return value.split(matcher).map((part, index) => (
    exact.test(part) ? <mark key={`${part}-${index}`} className="ss-hit">{part}</mark> : part
  ))
}

function controlsFromParams(params: URLSearchParams): SearchControls {
  return {
    ...defaultControls,
    q: params.get('q') || '',
    venue: params.get('venue') || '',
    field: params.get('field') || '',
    rank: params.get('rank') || '',
    yearFrom: params.get('yearFrom') || defaultControls.yearFrom,
    yearTo: params.get('yearTo') || defaultControls.yearTo,
    sort: params.get('sort') || defaultControls.sort,
    semantic: params.get('semantic') !== '0',
    hasPdf: params.get('hasPdf') === '1',
    favorite: params.get('favorite') === '1',
    author: params.get('author') || '',
    institution: params.get('institution') || '',
    country: params.get('country') || '',
    minScore: params.get('minScore') || '',
    minCitations: params.get('minCitations') || '',
  }
}

function paramsFromControls(controls: SearchControls, page = 1) {
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries(controls)) {
    if (typeof value === 'boolean') {
      if (value !== defaultControls[key as keyof SearchControls]) next[key] = value ? '1' : '0'
      continue
    }
    if (value && value !== defaultControls[key as keyof SearchControls]) next[key] = String(value)
  }
  if (page > 1) next.page = String(page)
  return next
}

function activeFilterChips(controls: SearchControls) {
  const chips: Array<{ key: keyof SearchControls; label: string; value: string; removeValue?: string }> = []
  for (const venue of csvValues(controls.venue)) {
    chips.push({ key: 'venue', label: 'Venue', value: venue, removeValue: venue })
  }
  const labels: Partial<Record<keyof SearchControls, string>> = {
    field: 'Direction',
    rank: 'Rank',
    yearFrom: 'From',
    yearTo: 'To',
    author: 'Author',
    institution: 'Institution',
    country: 'Region',
    minScore: 'Min score',
    minCitations: 'Min citations',
  }
  for (const [key, label] of Object.entries(labels) as Array<[keyof SearchControls, string]>) {
    const value = controls[key]
    if (typeof value === 'string' && value && value !== defaultControls[key]) {
      chips.push({ key, label, value })
    }
  }
  if (!controls.semantic) chips.push({ key: 'semantic', label: 'Semantic', value: 'off' })
  if (controls.hasPdf) chips.push({ key: 'hasPdf', label: 'PDF', value: 'local only' })
  if (controls.favorite) chips.push({ key: 'favorite', label: 'Saved', value: 'favorites only' })
  return chips
}

function citationText(paper: PaperRow, format: 'ieee' | 'apa' | 'bibtex') {
  const authors = splitAuthors(paper.authors)
  const authorText = authors.length ? authors.slice(0, 6).join(', ') + (authors.length > 6 ? ', et al.' : '') : 'Unknown Author'
  const title = cleanText(paper.title)
  if (format === 'apa') return `${authorText} (${paper.year}). ${title}. ${paper.venue}. ${paper.doi ? `https://doi.org/${paper.doi}` : ''}`.trim()
  if (format === 'bibtex') {
    const key = `${authors[0]?.split(' ').pop() || 'paper'}${paper.year}`.replace(/[^A-Za-z0-9]/g, '')
    return `@article{${key},\n  title={${title}},\n  author={${authors.join(' and ')}},\n  journal={${paper.venue}},\n  year={${paper.year}},\n  doi={${paper.doi || ''}}\n}`
  }
  return `${authorText}, "${title}," ${paper.venue}, ${paper.year}${paper.doi ? `, doi: ${paper.doi}` : ''}.`
}

function Metric({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: 'good' | 'warn' }) {
  return (
    <div className={`ss-status-card ${tone || ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <em>{hint}</em>}
    </div>
  )
}

const PaperCard = memo(function PaperCard({
  row,
  index,
  selected,
  query,
  onOpen,
}: {
  row: PaperRow
  index: number
  selected: boolean
  query: string
  onOpen: (id: number) => void
}) {
  const authors = splitAuthors(row.authors)

  return (
    <article className={`ss-paper-row ${selected ? 'active' : ''}`} onClick={() => onOpen(row.id)}>
      <div className="ss-row-index">{index}</div>
      <div className="ss-paper-main">
        <h3>
          <PaperLink id={row.id} title={cleanText(row.title)} onClick={(event) => event.stopPropagation()}>
            {highlightParts(row.title, query)}
          </PaperLink>
        </h3>
        <p className="ss-authors">
          {authors.slice(0, 10).map((author, authorIndex) => (
            <span key={`${author}-${authorIndex}`}>
              <EntityLink kind="author" value={author}>{author}</EntityLink>
              {authorIndex < Math.min(authors.length, 10) - 1 ? '; ' : ''}
            </span>
          ))}
          {authors.length > 10 ? ' ...' : ''}
        </p>
        <p className="ss-abstract">{highlightParts(row.abstract, query) || '暂无摘要。'}</p>
        <div className="ss-paper-meta">
          <span className="rank">{row.rank || '-'}</span>
          <EntityLink kind="venue" value={row.venue} params={{ yearFrom: row.year, yearTo: row.year }}>{row.venue || '-'}</EntityLink>
          <EntityLink kind="topic" value={row.field || 'General IC'}>{row.field || 'General IC'}</EntityLink>
          <span>{row.year}</span>
          <span>score {Number(row.score || 0).toFixed(1)}</span>
          <span>{row.citationCount || 0} citations</span>
          {row.favorite && <span className="favorite">已收藏</span>}
          {row.matchReason && <span className="ss-match-reason">{row.matchReason}</span>}
        </div>
      </div>
      <div className="ss-paper-actions">
        <button type="button" onClick={(event) => { event.stopPropagation(); onOpen(row.id) }}>论文</button>
        <button type="button" onClick={(event) => event.stopPropagation()}>AI</button>
        <button type="button" onClick={(event) => event.stopPropagation()}>收藏</button>
      </div>
    </article>
  )
})

function Pagination({ total, page, loading, onPage }: { total: number; page: number; loading: boolean; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const start = Math.max(1, Math.min(page - 3, Math.max(1, pages - 6)))
  const end = Math.min(pages, start + 6)
  const items = []
  if (start > 1) items.push(1)
  for (let p = start; p <= end; p += 1) items.push(p)
  if (end < pages) items.push(pages)

  return (
    <nav className="ss-pagination" aria-label="Paper pagination">
      <button onClick={() => onPage(Math.max(1, page - 1))} disabled={loading || page <= 1}>上一页</button>
      {items.map((item, idx) => (
        <button key={`${item}-${idx}`} className={item === page ? 'active' : ''} onClick={() => onPage(item)} disabled={loading || item === page}>
          {item}
        </button>
      ))}
      <button onClick={() => onPage(Math.min(pages, page + 1))} disabled={loading || page >= pages}>下一页</button>
      <span>第 {page} / {pages} 页</span>
    </nav>
  )
}

function PaperDetailRail({ paperId, onClose, onUpdated }: { paperId: number | null; onClose: () => void; onUpdated: (paper: PaperRow) => void }) {
  const [paper, setPaper] = useState<(PaperRow & { note?: string }) | null>(null)
  const [comments, setComments] = useState<PaperComment[]>([])
  const [note, setNote] = useState('')
  const [tagText, setTagText] = useState('')
  const [readingStatus, setReadingStatus] = useState('unread')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!paperId) {
      setPaper(null)
      return
    }
    let alive = true
    async function load() {
      const [data, nextComments] = await Promise.all([
        api.paper(paperId!),
        api.paperComments(paperId!, { limit: COMMENT_LIMIT, offset: 0 }).catch(() => []),
      ])
      if (!alive) return
      setPaper(data)
      setNote(data.note || '')
      setReadingStatus(data.readingStatus || 'unread')
      setTagText((data.tags || []).map((tag) => tag.name).join(', '))
      setComments(nextComments)
    }
    load().catch(console.error)
    return () => { alive = false }
  }, [paperId])

  async function saveState(nextFavorite = paper?.favorite) {
    if (!paper) return
    const updated = await api.updatePaperState(paper.id, {
      favorite: nextFavorite,
      readingStatus,
      note,
      tags: tagText.split(',').map((tag) => tag.trim()).filter(Boolean),
    })
    setPaper(updated)
    onUpdated(updated)
    setMessage('已保存')
    setTimeout(() => setMessage(''), 1400)
  }

  async function copyCitation(format: 'ieee' | 'apa' | 'bibtex') {
    if (!paper) return
    await navigator.clipboard.writeText(citationText(paper, format))
    setMessage(`已复制 ${format.toUpperCase()}`)
    setTimeout(() => setMessage(''), 1400)
  }

  if (!paperId) {
    return (
      <aside className="ss-detail empty">
        <h2>论文详情</h2>
        <p>点击中间列表中的论文后，这里会显示 DOI、摘要、来源、阅读状态、笔记和快捷引用。</p>
      </aside>
    )
  }

  if (!paper) return <aside className="ss-detail"><div className="ss-detail-loading">Loading paper...</div></aside>

  const authors = splitAuthors(paper.authors)

  return (
    <aside className="ss-detail">
      <div className="ss-detail-head">
        <strong>论文详情</strong>
        <div>
          <Link to={`/papers/${paper.id}`}>打开完整页</Link>
          <button onClick={onClose}>关闭</button>
        </div>
      </div>
      <h2>{cleanText(paper.title)}</h2>
      <p className="ss-detail-authors">{authors.slice(0, 12).join('; ')}{authors.length > 12 ? ' ...' : ''}</p>
      <div className="ss-paper-meta detail-meta">
        <span className="rank">{paper.rank || '-'}</span>
        <span>{paper.venue || '-'}</span>
        <span>{paper.field || 'General IC'}</span>
        <span>{paper.year}</span>
        <span>score {Number(paper.score || 0).toFixed(1)}</span>
      </div>
      <div className="ss-detail-buttons">
        {paper.doi && <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer">打开 DOI</a>}
        {paper.pdfLink && <a href={paper.pdfLink} target="_blank" rel="noreferrer">打开 PDF</a>}
        {paper.sourceUrl && <a href={paper.sourceUrl} target="_blank" rel="noreferrer">来源</a>}
      </div>
      <dl className="ss-detail-facts">
        <dt>DOI</dt><dd>{paper.doi || '-'}</dd>
        <dt>作者</dt><dd>{authors.slice(0, 8).join('; ') || '-'}</dd>
        <dt>机构</dt><dd>{paper.affiliations || '-'}</dd>
        <dt>PDF 状态</dt><dd>{paper.downloadStatus || '-'}</dd>
        <dt>数据源</dt><dd>{paper.collectionMethod || '-'}</dd>
        <dt>引用数</dt><dd>{paper.citationCount || 0}</dd>
      </dl>
      <section>
        <h3>摘要</h3>
        <p className="ss-detail-abstract">{cleanText(paper.abstract) || '暂无摘要。'}</p>
      </section>
      <section>
        <h3>快捷引用</h3>
        <div className="ss-citation-buttons">
          <button onClick={() => copyCitation('ieee')}>IEEE</button>
          <button onClick={() => copyCitation('apa')}>APA</button>
          <button onClick={() => copyCitation('bibtex')}>BibTeX</button>
        </div>
      </section>
      <section className="ss-reading-box">
        <h3>阅读与笔记</h3>
        <label>
          <span>状态</span>
          <select value={readingStatus} onChange={(event) => setReadingStatus(event.target.value)}>
            {readingOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label><span>标签</span><input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="PMIC, must-read" /></label>
        <label><span>笔记</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="写一点自己的阅读笔记..." /></label>
        <div className="ss-detail-buttons">
          <button onClick={() => saveState(!paper.favorite)}>{paper.favorite ? '取消收藏' : '收藏'}</button>
          <button onClick={() => saveState()}>保存</button>
        </div>
      </section>
      <section>
        <h3>讨论</h3>
        <div className="ss-comment-list">
          {comments.length ? comments.map((comment) => (
            <div key={comment.id}>
              <strong>{comment.displayName || comment.nickname || 'User'}</strong>
              <span>{comment.comment_type || comment.commentType || 'Comment'}</span>
              <p>{comment.body}</p>
            </div>
          )) : <p>暂无评论。</p>}
        </div>
      </section>
      {message && <div className="ss-toast">{message}</div>}
    </aside>
  )
}

function AdminTools({ onImported }: { onImported: (paper: PaperRow) => void }) {
  const [doi, setDoi] = useState('')
  const [keys, setKeys] = useState<ApiKeyInfo[]>([])
  const [pdfInbox, setPdfInbox] = useState<PdfInboxInfo | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.apiKeys().then(setKeys).catch(() => setKeys([]))
    api.pdfInbox().then(setPdfInbox).catch(() => setPdfInbox(null))
  }, [])

  async function importDoi() {
    if (!doi.trim()) return
    const paper = await api.importDoi(doi.trim())
    onImported(paper)
    setDoi('')
    setMessage('DOI 导入完成')
    setTimeout(() => setMessage(''), 1600)
  }

  return (
    <section className="ss-tool-panel">
      <h3>私人工具</h3>
      <p>只导入 metadata；PDF 接入走本地私库或出版社官网跳转。</p>
      <div className="ss-inline-form">
        <input value={doi} onChange={(event) => setDoi(event.target.value)} placeholder="10.xxxx/..." />
        <button onClick={importDoi}>导入 DOI</button>
      </div>
      <div className="ss-tool-meta">
        <span>PDF inbox: {pdfInbox ? `${pdfInbox.count} files` : '-'}</span>
        <span>Keys: {keys.length ? keys.map((key) => key.provider).slice(0, 4).join(', ') : 'none'}</span>
      </div>
      {message && <div className="ss-toast inline">{message}</div>}
    </section>
  )
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [controls, setControls] = useState<SearchControls>(() => controlsFromParams(searchParams))
  const [results, setResults] = useState<SearchResult | null>(null)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [saveMessage, setSaveMessage] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [emptyHint, setEmptyHint] = useState('')
  const [history, setHistory] = useState<string[]>(() => loadSearchHistory())
  const requestId = useRef(0)
  const didMount = useRef(false)

  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const venueOptions = useMemo(() => (stats?.venues || []).filter(Boolean).slice(0, 120), [stats])
  const fieldOptions = useMemo(() => (stats?.fields || []).filter(Boolean).slice(0, 120), [stats])
  const rankOptions = useMemo(() => (stats?.ranks || []).filter(Boolean).slice(0, 40), [stats])
  const rows = results?.rows || []
  const controlsSignature = useMemo(() => JSON.stringify(controls), [controls])
  const activeChips = useMemo(() => activeFilterChips(controls), [controls])

  const runSearch = useCallback(async (nextControls: SearchControls, nextPage = 1) => {
    const id = ++requestId.current
    setLoading(true)
    setError('')
    try {
      const res = await api.search({
        ...nextControls,
        semantic: nextControls.semantic ? 1 : 0,
        hasPdf: nextControls.hasPdf ? 1 : 0,
        favorite: nextControls.favorite ? 1 : 0,
        limit: PAGE_SIZE,
        offset: (nextPage - 1) * PAGE_SIZE,
      })
      if (id !== requestId.current) return
      setResults(res)
      setSelectedId((current) => (current && res.rows.some((row) => row.id === current) ? current : res.rows[0]?.id ?? null))

      const query = nextControls.q.trim()
      if (query && res.rows.length) {
        setHistory(saveSearchHistory(query))
      }
      if (query && !res.rows.length) {
        const hint = await api.searchSuggestions({ q: query }).catch(() => null)
        if (id === requestId.current) {
          setSuggestions(hint?.rows || [])
          setEmptyHint(hint?.emptyState || '换一个电路模块、会议或作者试试。')
        }
      } else {
        setSuggestions([])
        setEmptyHint('')
      }
    } catch (err) {
      if (id === requestId.current) {
        setError(err instanceof Error ? err.message : '搜索失败')
        console.error(err)
      }
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    api.stats().then(setStats).catch((err) => {
      console.error(err)
      setError(err instanceof Error ? err.message : '统计数据加载失败')
    })
  }, [])

  useEffect(() => {
    const next = controlsFromParams(searchParams)
    setControls(next)
    runSearch(next, Math.max(1, Number(searchParams.get('page') || 1)))
  }, [runSearch, searchParams])

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }
    const timer = window.setTimeout(() => {
      const urlControls = controlsFromParams(searchParams)
      if (JSON.stringify(urlControls) !== controlsSignature) {
        setSearchParams(paramsFromControls(controls, 1), { replace: true })
      }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [controls, controlsSignature, searchParams, setSearchParams])

  function updateControl<K extends keyof SearchControls>(key: K, value: SearchControls[K]) {
    setControls((prev) => ({ ...prev, [key]: value }))
  }

  function submit(nextPage = 1, nextControls = controls) {
    setSearchParams(paramsFromControls(nextControls, nextPage))
  }

  function applyShortcut(label: string) {
    const next = {
      ...controls,
      q: label,
      field: label === 'DC-DC' ? 'Power Management' : label === 'PLL' ? 'Clocking & Frequency Generation' : controls.field,
    }
    setControls(next)
    submit(1, next)
  }

  function applyQuery(query: string) {
    const next = { ...controls, q: query }
    setControls(next)
    submit(1, next)
  }

  function removeFilter(chip: { key: keyof SearchControls; removeValue?: string }) {
    const next = { ...controls }
    if (chip.removeValue && chip.key === 'venue') {
      next.venue = toggleCsvValue(next.venue, chip.removeValue)
    } else {
      next[chip.key] = defaultControls[chip.key] as never
    }
    setControls(next)
    submit(1, next)
  }

  async function copySearchLink() {
    const url = new URL(window.location.href)
    url.search = new URLSearchParams(paramsFromControls(controls, page)).toString()
    await navigator.clipboard.writeText(url.toString())
    setSaveMessage('搜索链接已复制')
    setTimeout(() => setSaveMessage(''), 1400)
  }

  async function saveSearch() {
    try {
      const params = paramsFromControls(controls)
      const label = controls.q || Object.entries(params).map(([key, value]) => `${key}:${value}`).join(' ') || 'all papers'
      const data = await api.addWatchlistItem('search', label, params)
      setSaveMessage(data.alreadyExists ? '搜索已保存（已存在）' : '搜索已保存')
      setTimeout(() => setSaveMessage(''), 1400)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || '保存失败')
    }
  }

  function updateRow(paper: PaperRow) {
    setResults((prev) => prev ? { ...prev, rows: prev.rows.map((row) => row.id === paper.id ? { ...row, ...paper } : row) } : prev)
  }

  function appendImported(paper: PaperRow) {
    setResults((prev) => prev ? { ...prev, total: prev.total + 1, rows: [paper, ...prev.rows] } : { total: 1, limit: PAGE_SIZE, offset: 0, engine: 'manual', rows: [paper] })
    setSelectedId(paper.id)
  }

  const selectedVenues = csvValues(controls.venue)

  return (
    <div className="ss-search-page">
      <header className="ss-home-topbar">
        <Link className="ss-home-logo" to="/">
          <span>S</span>
          <strong>SiliconScope</strong>
        </Link>
        <form className="ss-searchbar" onSubmit={(event) => { event.preventDefault(); submit(1) }}>
          <select aria-label="search scope"><option>全部</option><option>论文</option><option>作者</option><option>机构</option></select>
          <input
            value={controls.q}
            onChange={(event) => updateControl('q', event.target.value)}
            placeholder="integrated circuit mmWave phased array transceiver"
          />
          <button disabled={loading}>{loading ? '搜索中...' : '搜索'}</button>
          <button type="button" className="ghost">高级搜索</button>
        </form>
        <div className="ss-home-actions">
          <Link to="/watchlist">收藏夹</Link>
          <button type="button">?</button>
          <span>RP</span>
        </div>
      </header>

      {(history.length > 0 || suggestions.length > 0) && (
        <div className="ss-search-assist">
          {history.slice(0, 5).map((item) => (
            <button key={`history-${item}`} onClick={() => applyQuery(item)}>历史：{item}</button>
          ))}
          {suggestions.slice(0, 5).map((item) => (
            <button key={`suggestion-${item.query}`} onClick={() => applyQuery(item.query)}>建议：{item.label}</button>
          ))}
        </div>
      )}

      <nav className="ss-tabs">
        {tabs.map((item) => (
          <NavLink key={item.to + item.label} to={item.to} end={item.to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>
            {item.label}
          </NavLink>
        ))}
        <i />
        {topicShortcuts.map((item) => (
          <button key={item} onClick={() => applyShortcut(item)}>{item}</button>
        ))}
      </nav>

      <section className="ss-command-strip">
        <Metric label="时间范围" value={`${controls.yearFrom || '-'}-${controls.yearTo || '-'}`} hint="可在左侧调整" />
        <Metric label="结果数量" value={formatNumber(results?.total ?? stats?.total)} hint={results?.engine || 'sqlite'} />
        <Metric label="PDF 私库" value={`${stats?.pdfs || 0}`} hint="已匹配" />
        <Metric label="IEEE 精修" value="待接入" hint="API key 后启用" tone="warn" />
        <Metric label="数据可信度" value="80%" hint="机构/作者消歧待加强" tone="good" />
      </section>

      <div className="ss-content-grid">
        <aside className="ss-filter-panel">
          <div className="ss-filter-head">
            <strong>精炼搜索</strong>
            <button onClick={() => { setControls(defaultControls); setSearchParams({}) }}>清空</button>
          </div>
          <div className="ss-year-grid">
            <label><span>开始年份</span><input value={controls.yearFrom} onChange={(event) => updateControl('yearFrom', event.target.value)} /></label>
            <label><span>结束年份</span><input value={controls.yearTo} onChange={(event) => updateControl('yearTo', event.target.value)} /></label>
          </div>
          <div className="ss-filter-shortcuts horizontal">
            <button onClick={() => submit(1, { ...controls, yearFrom: '2022' })}>近 5 年</button>
            <button onClick={() => submit(1, { ...controls, yearFrom: '2017' })}>近 10 年</button>
            <button onClick={() => submit(1, { ...controls, yearFrom: '2012' })}>近 15 年</button>
          </div>
          <label>
            <span>会议/期刊</span>
            <select value="" onChange={(event) => event.target.value && updateControl('venue', toggleCsvValue(controls.venue, event.target.value))}>
              <option value="">添加会议/期刊</option>
              {venueOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          {selectedVenues.length > 0 && (
            <div className="ss-filter-chips">
              {selectedVenues.map((item) => (
                <button key={item} onClick={() => updateControl('venue', toggleCsvValue(controls.venue, item))}>{item} ×</button>
              ))}
            </div>
          )}
          <label><span>研究方向</span><select value={controls.field} onChange={(event) => updateControl('field', event.target.value)}><option value="">全部</option>{fieldOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>期刊/会议等级</span><select value={controls.rank} onChange={(event) => updateControl('rank', event.target.value)}><option value="">全部</option>{rankOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>作者</span><input value={controls.author} onChange={(event) => updateControl('author', event.target.value)} placeholder="Rui P. Martins" /></label>
          <label><span>机构</span><input value={controls.institution} onChange={(event) => updateControl('institution', event.target.value)} placeholder="University of Macau" /></label>
          <label><span>国家/地区</span><input value={controls.country} onChange={(event) => updateControl('country', event.target.value)} placeholder="China / United States" /></label>
          <div className="ss-year-grid">
            <label><span>最低分</span><input value={controls.minScore} onChange={(event) => updateControl('minScore', event.target.value)} /></label>
            <label><span>最低引用</span><input value={controls.minCitations} onChange={(event) => updateControl('minCitations', event.target.value)} /></label>
          </div>
          <label className="ss-check"><input type="checkbox" checked={controls.semantic} onChange={(event) => updateControl('semantic', event.target.checked)} /> 语义扩展</label>
          <label className="ss-check"><input type="checkbox" checked={controls.hasPdf} onChange={(event) => updateControl('hasPdf', event.target.checked)} /> 仅看本地 PDF</label>
          <label className="ss-check"><input type="checkbox" checked={controls.favorite} onChange={(event) => updateControl('favorite', event.target.checked)} /> 仅看收藏</label>
          <button className="ss-apply-filter" onClick={() => submit(1)}>应用筛选</button>
          <AdminTools onImported={appendImported} />
          <section className="ss-tool-panel ss-company-entry">
            <h3>Company Intelligence</h3>
            <p>Explore IC industry employers and research labs.</p>
            <Link to="/companies">Explore companies →</Link>
          </section>
        </aside>

        <main className="ss-result-panel">
          {error && <div className="ss-error-banner">{error}</div>}
          <div className="ss-result-head">
            <div>
              <strong>{formatNumber(results?.total)} 条结果</strong>
              <span>{results?.expandedQuery ? `扩展查询：${results.expandedQuery}` : results?.engine || 'sqlite'}</span>
              {typeof results?.durationMs === 'number' && <span>{results.durationMs} ms</span>}
              {saveMessage && <span className="ss-save-message">{saveMessage}</span>}
            </div>
            <div className="ss-result-tools">
              <select value={controls.sort} onChange={(event) => { const next = { ...controls, sort: event.target.value }; setControls(next); submit(1, next) }}>
                <option value="relevance">相关度</option>
                <option value="score">综合</option>
                <option value="year">最新</option>
                <option value="citations">引用数</option>
                <option value="title">标题</option>
              </select>
              <button type="button" onClick={copySearchLink}>复制链接</button>
              <button type="button" onClick={saveSearch}>保存搜索</button>
              <button type="button">列表</button>
              <button type="button">导出</button>
            </div>
          </div>
          {activeChips.length > 0 && (
            <div className="ss-active-filters" aria-label="Active search filters">
              {activeChips.map((chip) => (
                <button key={`${chip.key}-${chip.value}`} type="button" onClick={() => removeFilter(chip)}>
                  <span>{chip.label}</span>
                  <strong>{chip.value}</strong>
                  <em>×</em>
                </button>
              ))}
            </div>
          )}
          <div className="ss-paper-list">
            {rows.map((row, index) => (
              <PaperCard
                key={row.id}
                row={row}
                index={(page - 1) * PAGE_SIZE + index + 1}
                selected={selectedId === row.id}
                query={controls.q}
                onOpen={setSelectedId}
              />
            ))}
            {!loading && rows.length === 0 && (
              <div className="ss-empty-state">
                <strong>没有匹配论文</strong>
                <p>{emptyHint || '试试放宽年份、会议或语义条件。'}</p>
                {suggestions.length > 0 && (
                  <div className="ss-empty-suggestions">
                    {suggestions.map((item) => (
                      <button key={item.query} onClick={() => applyQuery(item.query)}>{item.label}<span>{item.detail}</span></button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {results && <Pagination total={results.total} page={page} loading={loading} onPage={(nextPage) => submit(nextPage)} />}
        </main>

        <PaperDetailRail paperId={selectedId} onClose={() => setSelectedId(null)} onUpdated={updateRow} />
      </div>
    </div>
  )
}
