import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { PaperRow } from '../types'
import { setPageMeta } from '../utils/pageMeta'

const stats = [
  { label: 'curated papers', value: '38k+' },
  { label: 'core venues', value: '16' },
  { label: 'coverage', value: '2016-2026' },
]

const capabilities = [
  {
    title: 'Search',
    label: '论文检索',
    body: '按 DOI、作者、机构、会议、领域和电路关键词检索，适合快速定位某条技术路线的代表论文。',
    preview: ['JSSC / ISSCC', 'ADC, PLL, PMIC', 'authors + affiliations'],
  },
  {
    title: 'Intelligence',
    label: '学术情报',
    body: '围绕作者、机构、地域和公司沉淀画像，帮助判断 IC 方向、合作网络和近年变化。',
    preview: ['authors', 'institutions', 'geo / companies'],
  },
  {
    title: 'Learning',
    label: '学习路线',
    body: '把论文库连接到 IC 路线、每日电路和阅读队列，让学习不只停留在收藏夹。',
    preview: ['roadmaps', 'daily circuit', 'reading queue'],
  },
]

function LandingSearchResult({ paper }: { paper: PaperRow }) {
  return (
    <Link className="landing-result" to={`/papers/${paper.id}`}>
      <strong>{paper.title}</strong>
      <span>{paper.authors || 'Unknown authors'}</span>
      <div>
        <em>{paper.rank || '-'}</em>
        <em>{paper.venue || '-'}</em>
        <em>{paper.field || '-'}</em>
        <em>{paper.year || '-'}</em>
      </div>
    </Link>
  )
}

export default function LandingPage() {
  const [query, setQuery] = useState('mmWave phased array transceiver')
  const [rows, setRows] = useState<PaperRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const trimmedQuery = useMemo(() => query.trim(), [query])

  useEffect(() => {
    setPageMeta({
      title: 'IC 论文情报与学习平台',
      description: 'SiliconScope 为 IC 工程师与研究生提供论文检索、学术情报、学习路线和阅读管理。',
      path: '/',
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const handle = window.setTimeout(async () => {
      if (trimmedQuery.length < 2) {
        setRows([])
        setError('')
        return
      }
      setLoading(true)
      setError('')
      try {
        const result = await api.publicSearchDemo({ q: trimmedQuery })
        if (!cancelled) setRows(result.rows.slice(0, 3))
      } catch (err: any) {
        if (!cancelled) {
          setRows([])
          setError(err?.response?.data?.error || 'Search demo is temporarily unavailable.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 260)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [trimmedQuery])

  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Public navigation">
        <Link className="landing-brand" to="/">
          <span>S</span>
          <strong>SiliconScope</strong>
        </Link>
        <div>
          <Link to="/pricing">Pricing</Link>
          <Link to="/legal">Legal</Link>
          <Link className="landing-nav-primary" to="/request-access">申请访问</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-kicker">IC PAPER INTELLIGENCE</span>
          <h1>为 IC 工程师与研究生打造的论文情报平台</h1>
          <p>
            38,000+ 篇顶会论文，检索、追踪、学习一站完成。先从论文和路线出发，再沉淀作者、机构、公司和地域情报。
          </p>
          <div className="landing-actions">
            <Link to="/request-access">申请私测访问</Link>
            <Link to="/pricing">查看价格计划</Link>
          </div>
          <div className="landing-stats">
            {stats.map((item) => (
              <article key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </div>

        <section className="landing-search-demo" aria-label="Live paper search demo">
          <div className="landing-demo-head">
            <span>Live search demo</span>
            <em>{loading ? 'searching...' : 'SQLite + metadata'}</em>
          </div>
          <label>
            <span>Search papers, circuits, authors, DOI</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="landing-results">
            {error && <p className="landing-demo-error">{error}</p>}
            {!error && rows.map((paper) => <LandingSearchResult paper={paper} key={paper.id} />)}
            {!error && !loading && rows.length === 0 && <p className="landing-demo-empty">输入至少两个字符查看真实检索结果。</p>}
          </div>
        </section>
      </section>

      <section className="landing-capabilities" aria-label="Product capabilities">
        {capabilities.map((item) => (
          <article key={item.title}>
            <span>{item.title}</span>
            <h2>{item.label}</h2>
            <p>{item.body}</p>
            <div className="landing-preview">
              {item.preview.map((entry) => <em key={entry}>{entry}</em>)}
            </div>
          </article>
        ))}
      </section>

      <section className="landing-pricing-strip">
        <div>
          <span className="landing-kicker">PRICING BOUNDARY</span>
          <h2>核心检索和学习免费，效率型能力再收费</h2>
          <p>免费层覆盖论文检索、学习路线、基础阅读管理。Pro 面向 AI 结构化报告、高级导出、团队空间和私有库工作流。</p>
        </div>
        <Link to="/pricing">打开 Pricing</Link>
      </section>
    </main>
  )
}
