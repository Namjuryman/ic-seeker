import { Link } from 'react-router-dom'

const sections = [
  {
    title: '画像与排名',
    subtitle: '围绕作者、导师、机构、企业建立 IC intelligence 视图。',
    links: [
      { to: '/authors', label: '学者画像', desc: '作者代表作、方向分布、合作关系与机构线索。' },
      { to: '/mentors', label: '导师档案', desc: '导师候选、近期活跃度、方向画像与评价入口。' },
      { to: '/institutions', label: '机构实力', desc: '机构论文、活跃学者、会议/期刊构成和趋势。' },
      { to: '/companies', label: '企业情报', desc: '半导体公司、产业链类型、技术方向和相关论文。' },
    ],
  },
  {
    title: '领域与地域',
    subtitle: '从方向、地理和会议矩阵观察 IC 研究格局。',
    links: [
      { to: '/topics', label: '方向洞察', desc: 'Analog、PMIC、RF、Memory 等方向的主题入口。' },
      { to: '/reports/topics', label: 'Topic report', desc: '围绕特定方向生成结构化论文与机构视图。' },
      { to: '/geo', label: '区域地图', desc: '国家/地区、城市热点和机构分布的地理视图。' },
      { to: '/venue-matrix', label: '会议/期刊', desc: '核心 venue 的年份覆盖、等级和导入状态。' },
    ],
  },
  {
    title: '对比分析',
    subtitle: '把候选作者、学校和公司放到同一张表里比较。',
    links: [
      { to: '/compare', label: '对比中心', desc: '选择实体类型后进入统一对比工作台。' },
      { to: '/compare/authors', label: '作者对比', desc: '对比学者论文数、等级、方向和近期走势。' },
      { to: '/compare/institutions', label: '机构对比', desc: '对比高校/机构的 IC 实力结构。' },
      { to: '/compare/companies', label: '公司对比', desc: '对比公司类型、国家、技术方向和市场信号。' },
    ],
  },
]

export default function IntelligenceHubPage() {
  return (
    <div className="hub-page">
      <section className="hub-hero">
        <span>Intelligence hub</span>
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
