import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setPageMeta } from '../utils/pageMeta'

const plans = [
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
]

const boundaries = [
  '搜索、基础学习路线、论文详情和基础 compare 不收费。',
  '付费功能集中在 AI 生成报告、高级导出、团队协作、私有库和受控 API。',
  '不托管版权 PDF；阅读全文跳转 DOI、出版社或用户本地 PDF 索引。',
]

export default function PricingPage() {
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
          <Link to="/">Landing</Link>
          <Link to="/legal">Legal</Link>
          <Link className="landing-nav-primary" to="/request-access">申请访问</Link>
        </div>
      </nav>

      <section className="pricing-hero">
        <span className="landing-kicker">PRICING</span>
        <h1>商业边界先清楚，后面接 Stripe / Paddle 才不乱</h1>
        <p>
          SiliconScope 的核心目标是让 IC 论文检索、路线学习和基础阅读管理保持可用；收费只放在明显节省时间的效率层。
        </p>
      </section>

      <section className="pricing-grid">
        {plans.map((plan) => (
          <article className={`pricing-card ${plan.name === 'Pro' ? 'featured' : ''}`} key={plan.name}>
            <span>{plan.name}</span>
            <strong>{plan.price}</strong>
            <p>{plan.audience}</p>
            <ul>
              {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <em>{plan.note}</em>
            <Link to="/request-access">{plan.name === 'Free' ? '申请试用' : '加入候补'}</Link>
          </article>
        ))}
      </section>

      <section className="pricing-boundary">
        <div>
          <span className="landing-kicker">BOUNDARY</span>
          <h2>不会把所有东西都塞进付费墙</h2>
        </div>
        <ul>
          {boundaries.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </main>
  )
}
