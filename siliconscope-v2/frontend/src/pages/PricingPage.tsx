import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LanguageToggle, useI18n } from '../i18n'
import { setPageMeta } from '../utils/pageMeta'

function copy(language: 'zh' | 'en') {
  if (language === 'en') {
    return {
      request: 'Request access',
      landing: 'Landing',
      legal: 'Legal',
      kicker: 'PRICING',
      title: 'Make the commercial boundary clear before payments are connected',
      body: 'SiliconScope keeps IC paper search, learning routes, and basic reading management usable. Paid features should only cover clear productivity layers such as AI reports, advanced export, team spaces, and private-library workflows.',
      boundaryKicker: 'BOUNDARY',
      boundaryTitle: 'Not everything belongs behind a paywall',
      trial: 'Request trial',
      waitlist: 'Join waitlist',
      plans: [
        {
          name: 'Free',
          price: '$0',
          audience: 'Personal learning, paper search, and direction exploration',
          features: ['Paper search and details', 'Learning routes and daily circuits', 'Basic favorites and reading queue', 'Public company and institution intelligence'],
          note: 'Core workspace is free.',
        },
        {
          name: 'Pro',
          price: 'TBD',
          audience: 'High-frequency research, applications, and personal productivity',
          features: ['AI structured reports', 'Advanced export', 'Larger reading and watch quotas', 'Private tags and batch organization'],
          note: 'Payment provider is not connected yet.',
        },
        {
          name: 'Lab / Team',
          price: 'Custom',
          audience: 'Research groups, labs, and corporate intelligence teams',
          features: ['Team workspace', 'Private paper library and local PDF indexing', 'Member permissions', 'Controlled API and deployment support'],
          note: 'Invite-only for early pilots.',
        },
      ],
      boundaries: [
        'Search, foundational learning routes, paper details, and basic compare should remain free.',
        'Paid features focus on AI-generated reports, advanced exports, team collaboration, private libraries, and controlled APIs.',
        'SiliconScope does not host copyrighted PDFs. Full text should open through DOI, publishers, or user-owned local PDF indexes.',
      ],
    }
  }
  return {
    request: '申请访问',
    landing: '首页',
    legal: '法律',
    kicker: 'PRICING',
    title: '商业边界先清楚，后面接 Stripe / Paddle 才不会乱',
    body: 'SiliconScope 的核心目标是让 IC 论文检索、路线学习和基础阅读管理保持可用；收费只放在明显节省时间的效率层。',
    boundaryKicker: 'BOUNDARY',
    boundaryTitle: '不会把所有东西都塞进付费墙',
    trial: '申请试用',
    waitlist: '加入候补',
    plans: [
      {
        name: 'Free',
        price: '$0',
        audience: '个人学习、论文检索、方向探索',
        features: ['论文检索与详情', '学习路线与每日电路', '基础收藏与阅读队列', '公开公司与机构情报'],
        note: 'Core workspace is free.',
      },
      {
        name: 'Pro',
        price: 'TBD',
        audience: '高频研究、申请、课题组个人效率',
        features: ['AI 结构化报告', '高级导出', '更大的阅读与关注配额', '私有标签和批量整理'],
        note: 'Payment provider is not connected yet.',
      },
      {
        name: 'Lab / Team',
        price: 'Custom',
        audience: '课题组、实验室、企业情报团队',
        features: ['团队空间', '私有论文库和 PDF 本地索引', '成员权限', '受控 API 与部署支持'],
        note: 'Invite-only for early pilots.',
      },
    ],
    boundaries: [
      '搜索、基础学习路线、论文详情和基础 compare 不收费。',
      '付费功能集中在 AI 生成报告、高级导出、团队协作、私有库和受控 API。',
      '不托管版权 PDF；阅读全文跳转 DOI、出版社或用户本地 PDF 索引。',
    ],
  }
}

export default function PricingPage() {
  const { language } = useI18n()
  const text = useMemo(() => copy(language), [language])

  useEffect(() => {
    setPageMeta({
      title: 'Pricing',
      description: 'SiliconScope pricing plans for IC paper search, AI reports, exports, private workspaces and lab teams.',
      path: '/pricing',
    })
  }, [])

  return (
    <main className="pricing-page">
      <nav className="landing-nav" aria-label="Public navigation">
        <Link className="landing-brand" to="/">
          <span>S</span>
          <strong>SiliconScope</strong>
        </Link>
        <div>
          <LanguageToggle compact />
          <Link to="/">{text.landing}</Link>
          <Link to="/legal">{text.legal}</Link>
          <Link className="landing-nav-primary" to="/request-access">{text.request}</Link>
        </div>
      </nav>

      <section className="pricing-hero">
        <span className="landing-kicker">{text.kicker}</span>
        <h1>{text.title}</h1>
        <p>{text.body}</p>
      </section>

      <section className="pricing-grid">
        {text.plans.map((plan) => (
          <article className={`pricing-card ${plan.name === 'Pro' ? 'featured' : ''}`} key={plan.name}>
            <span>{plan.name}</span>
            <strong>{plan.price}</strong>
            <p>{plan.audience}</p>
            <ul>
              {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <em>{plan.note}</em>
            <Link to="/request-access">{plan.name === 'Free' ? text.trial : text.waitlist}</Link>
          </article>
        ))}
      </section>

      <section className="pricing-boundary">
        <div>
          <span className="landing-kicker">{text.boundaryKicker}</span>
          <h2>{text.boundaryTitle}</h2>
        </div>
        <ul>
          {text.boundaries.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </main>
  )
}
