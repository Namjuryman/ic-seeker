import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { LanguageToggle, useI18n } from '../i18n'
import type { PaperRow } from '../types'
import { paperRankLabel, type DisplayLanguage } from '../utils/displayLabels'
import { setPageMeta } from '../utils/pageMeta'

function copy(language: 'zh' | 'en') {
  if (language === 'en') {
    return {
      title: 'IC paper intelligence and learning workspace',
      description: 'SiliconScope helps IC engineers and researchers search papers, map academic intelligence, build learning routes, and manage reading.',
      request: 'Request access',
      pricing: 'Pricing',
      legal: 'Legal',
      navLabel: 'Public navigation',
      kicker: 'IC PAPER INTELLIGENCE',
      headline: 'A paper intelligence workspace built for IC engineers and researchers',
      body: 'Search, track, learn, and compare across 38,000+ indexed IC paper records. Start from papers and routes, then explore author, institution, company, and regional metadata signals.',
      requestPrivate: 'Request access',
      viewPricing: 'View pricing',
      liveDemo: 'Live search',
      searching: 'searching...',
      engine: 'Local metadata index',
      searchLabel: 'Search papers, circuits, authors, DOI',
      empty: 'Enter at least two characters to preview real search results.',
      searchUnavailable: 'Search is temporarily unavailable.',
      unknownAuthors: 'Unknown authors',
      searchDemoLabel: 'Live paper search',
      capabilitiesLabel: 'Product capabilities',
      pricingKicker: 'PRICING BOUNDARY',
      pricingTitle: 'Core search and learning stay free; efficiency features become paid later',
      pricingBody: 'Free covers paper search, learning routes, and basic reading management. Pro focuses on AI structured reports, advanced export, team workspace, and private-library workflows.',
      openPricing: 'Open pricing',
      stats: [
        { label: 'indexed papers', value: '38k+' },
        { label: 'core venues', value: '16' },
        { label: 'coverage', value: '2016-2026' },
      ],
      capabilities: [
        { title: 'Search', label: 'Paper search', body: 'Find papers by DOI, authors, institutions, venues, fields, and circuit keywords.', preview: ['JSSC / ISSCC', 'ADC, PLL, PMIC', 'authors + affiliations'] },
        { title: 'Intelligence', label: 'Academic intelligence', body: 'Explore authors, institutions, regions, and companies to understand IC directions and recent changes.', preview: ['authors', 'institutions', 'geo / companies'] },
        { title: 'Learning', label: 'Learning routes', body: 'Connect papers to IC routes, daily circuits, and reading queues so learning does not stop at bookmarks.', preview: ['roadmaps', 'daily circuit', 'reading queue'] },
      ],
    }
  }
  return {
    title: 'IC 论文情报与学习平台',
    description: 'SiliconScope 为 IC 工程师与研究生提供论文检索、学术情报、学习路线和阅读管理。',
    request: '申请访问',
    pricing: '价格',
    legal: '法律',
    navLabel: '公开导航',
    kicker: 'IC 论文情报',
    headline: '为 IC 工程师与研究生打造的论文情报工作台',
    body: '围绕 38,000+ 条本地收录的 IC 论文记录完成检索、追踪、学习和对比。先从论文与路线出发，再沉淀作者、机构、公司和地域情报。',
    requestPrivate: '申请访问权限',
    viewPricing: '查看价格计划',
    liveDemo: '实时搜索',
    searching: '搜索中...',
    engine: '论文元数据检索',
    searchLabel: '搜索论文、电路方向、作者、DOI',
    empty: '输入至少两个字符查看真实检索结果。',
    searchUnavailable: '搜索暂时不可用。',
    unknownAuthors: '作者信息待补全',
    searchDemoLabel: '实时论文搜索',
    capabilitiesLabel: '产品能力',
    pricingKicker: '商业边界',
    pricingTitle: '核心检索和学习免费，效率型能力再收费',
    pricingBody: '免费层覆盖论文检索、学习路线和基础阅读管理。Pro 面向 AI 结构化报告、高级导出、团队空间和私有库工作流。',
    openPricing: '查看价格',
    stats: [
      { label: '收录论文', value: '38k+' },
      { label: '核心会议/期刊', value: '16' },
      { label: '覆盖年份', value: '2016-2026' },
    ],
    capabilities: [
      { title: '检索', label: '论文检索', body: '按 DOI、作者、机构、会议、领域和电路关键词检索，适合快速定位某条技术路线的代表论文。', preview: ['JSSC / ISSCC', 'ADC, PLL, PMIC', '作者与机构'] },
      { title: '情报', label: '学术情报', body: '围绕作者、机构、地域和公司沉淀画像，帮助判断 IC 方向、合作网络和近年变化。', preview: ['作者线索', '机构画像', '地域/企业'] },
      { title: '学习', label: '学习路线', body: '把论文库连接到 IC 路线、每日电路和阅读队列，让学习不只停留在收藏夹。', preview: ['学习路线', '每日电路', '阅读队列'] },
    ],
  }
}

function LandingSearchResult({ paper, unknownAuthors, language }: { paper: PaperRow; unknownAuthors: string; language: DisplayLanguage }) {
  return (
    <Link className="landing-result" to={`/papers/${paper.id}`}>
      <strong>{paper.title}</strong>
      <span>{paper.authors || unknownAuthors}</span>
      <div>
        <em>{paperRankLabel(paper.rank, language)}</em>
        <em>{paper.venue || '-'}</em>
        <em>{paper.field || '-'}</em>
        <em>{paper.year || '-'}</em>
      </div>
    </Link>
  )
}

export default function LandingPage() {
  const { language } = useI18n()
  const text = useMemo(() => copy(language), [language])
  const [query, setQuery] = useState('mmWave phased array transceiver')
  const [rows, setRows] = useState<PaperRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const trimmedQuery = useMemo(() => query.trim(), [query])

  useEffect(() => {
    setPageMeta({ title: text.title, description: text.description, path: '/' })
  }, [text.description, text.title])

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
          setError(text.searchUnavailable)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 260)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [text.searchUnavailable, trimmedQuery])

  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label={text.navLabel}>
        <Link className="landing-brand" to="/">
          <span>S</span>
          <strong>SiliconScope</strong>
        </Link>
        <div>
          <LanguageToggle compact />
          <Link to="/pricing">{text.pricing}</Link>
          <Link to="/legal">{text.legal}</Link>
          <Link className="landing-nav-primary" to="/request-access">{text.request}</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-kicker">{text.kicker}</span>
          <h1>{text.headline}</h1>
          <p>{text.body}</p>
          <div className="landing-actions">
            <Link to="/request-access">{text.requestPrivate}</Link>
            <Link to="/pricing">{text.viewPricing}</Link>
          </div>
          <div className="landing-stats">
            {text.stats.map((item) => (
              <article key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </div>

        <section className="landing-search-demo" aria-label={text.searchDemoLabel}>
          <div className="landing-demo-head">
            <span>{text.liveDemo}</span>
            <em>{loading ? text.searching : text.engine}</em>
          </div>
          <label>
            <span>{text.searchLabel}</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="landing-results">
            {error && <p className="landing-demo-error">{error}</p>}
            {!error && rows.map((paper) => <LandingSearchResult paper={paper} key={paper.id} unknownAuthors={text.unknownAuthors} language={language} />)}
            {!error && !loading && rows.length === 0 && <p className="landing-demo-empty">{text.empty}</p>}
          </div>
        </section>
      </section>

      <section className="landing-capabilities" aria-label={text.capabilitiesLabel}>
        {text.capabilities.map((item) => (
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
          <span className="landing-kicker">{text.pricingKicker}</span>
          <h2>{text.pricingTitle}</h2>
          <p>{text.pricingBody}</p>
        </div>
        <Link to="/pricing">{text.openPricing}</Link>
      </section>
    </main>
  )
}
