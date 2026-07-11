import { Link } from 'react-router-dom'

const sections = [
  {
    title: '画像与线索',
    subtitle: '围绕作者、研究者、机构、企业建立 IC 情报视图。',
    links: [
      { to: '/authors', label: '学者画像', desc: '作者代表作、方向分布、合作关系与机构线索。' },
      { to: '/mentors', label: '研究者档案', desc: '研究者候选、近期活跃度、方向画像与评价入口。' },
      { to: '/institutions', label: '机构画像', desc: '机构论文、活跃作者线索、会议/期刊构成和趋势。' },
      { to: '/companies', label: '企业情报', desc: '半导体公司、产业链类型、技术方向和相关论文。' },
    ],
  },
  {
    title: '领域与地域',
    subtitle: '从方向、地理和会议矩阵观察 IC 研究格局。',
    links: [
      { to: '/topics', label: '方向洞察', desc: 'Analog、PMIC、RF、Memory 等方向的主题入口。' },
      { to: '/reports/topics', label: '方向报告', desc: '围绕特定方向生成结构化论文与机构视图。' },
      { to: '/geo', label: '区域地图', desc: '国家/地区、城市热点和机构分布的地理视图。' },
      { to: '/venue-matrix', label: '会议/期刊', desc: '核心会议/期刊的年份覆盖、等级和导入状态。' },
    ],
  },
  {
    title: '对比分析',
    subtitle: '把候选作者、机构和公司放到同一张表里做并列探索。',
    links: [
      { to: '/compare', label: '对比中心', desc: '选择实体类型后进入统一对比工作台。' },
      { to: '/compare/authors', label: '作者画像对比', desc: '对比学者论文数、等级、方向和近期走势。' },
      { to: '/compare/institutions', label: '机构画像对比', desc: '对比高校/机构的 IC 论文结构和作者线索。' },
      { to: '/compare/companies', label: '企业画像对比', desc: '对比企业类型、国家/地区、技术方向和公开市场字段。' },
    ],
  },
]

export default function IntelligenceHubPage() {
  return (
    <div className="hub-page">
      <section className="hub-hero">
        <span>情报入口</span>
        <h1>情报中心</h1>
        <p>作者、机构、企业、领域和地域都收在这里。主导航保持简洁，细分工具按任务进入。</p>
      </section>

      <section className="hub-grid">
        {sections.map((section) => (
          <article className="hub-card" key={section.title}>
            <div>
              <span>{section.title}</span>
              <p>{section.subtitle}</p>
            </div>
            <div className="hub-link-list">
              {section.links.map((link) => (
                <Link to={link.to} key={link.to}>
                  <strong>{link.label}</strong>
                  <small>{link.desc}</small>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
