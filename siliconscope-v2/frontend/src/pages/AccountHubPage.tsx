import { Link } from 'react-router-dom'

const accountLinks = [
  { to: '/billing', label: '订阅配额', desc: '查看计划、配额和未来付费功能边界。' },
  { to: '/platform', label: '平台中枢', desc: '查看数据、部署、运行时和产品成熟度概览。' },
  { to: '/legal', label: '政策边界', desc: '服务条款、隐私、版权、AI 声明和社区准则。' },
  { to: '/request-access', label: '申请访问', desc: '私测、团队或后续商业访问申请入口。' },
]

export default function AccountHubPage() {
  return (
    <div className="hub-page">
      <section className="hub-hero">
        <span>Account hub</span>
        <h1>账户与平台</h1>
        <p>把订阅、合规、平台状态和访问申请收在一个地方，避免这些边界信息散落在主工作流里。</p>
      </section>

      <section className="hub-grid hub-grid-compact">
        {accountLinks.map((link) => (
          <Link className="hub-tile" to={link.to} key={link.to}>
            <strong>{link.label}</strong>
            <span>{link.desc}</span>
          </Link>
        ))}
      </section>
    </div>
  )
}
