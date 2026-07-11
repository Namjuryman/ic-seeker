import { Link } from 'react-router-dom'

const tools = [
  { to: '/watchlist', label: '关注列表', desc: '长期跟踪论文、作者、机构和企业。' },
  { to: '/reading-queue', label: '阅读队列', desc: '把论文按未读、阅读中、复习、项目用途管理起来。' },
  { to: '/notifications', label: '通知中心', desc: '查看导入、关注和系统提醒。' },
  { to: '/exports', label: '导出中心', desc: '导出引用、阅读材料和报告素材。' },
  { to: '/reports', label: '报告中心', desc: '围绕方向或实体生成可复用研究报告入口。' },
]

export default function WorkspaceHubPage() {
  return (
    <div className="hub-page">
      <section className="hub-hero">
        <span>工作台入口</span>
        <h1>个人工作台</h1>
        <p>这里放和你自己阅读、收藏、导出、跟踪相关的东西，和公开检索/情报视图区分开。</p>
      </section>

      <section className="hub-grid hub-grid-compact">
        {tools.map((tool) => (
          <Link className="hub-tile" to={tool.to} key={tool.to}>
            <strong>{tool.label}</strong>
            <span>{tool.desc}</span>
          </Link>
        ))}
      </section>
    </div>
  )
}
