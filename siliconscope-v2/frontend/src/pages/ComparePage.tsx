import { Link } from 'react-router-dom'

const cards = [
  {
    to: '/compare/companies',
    title: '企业画像对比',
    description: '横向比较公司类型、技术方向、产品领域、岗位线索和学习路线关联。',
    icon: '企',
    color: 'bg-blue-50 text-blue-700 border-blue-100',
    iconBg: 'bg-blue-100',
  },
  {
    to: '/compare/institutions',
    title: '机构画像对比',
    description: '比较机构在论文覆盖、方向、作者线索和代表成果上的结构化差异。',
    icon: '机',
    color: 'bg-green-50 text-green-700 border-green-100',
    iconBg: 'bg-green-100',
  },
  {
    to: '/compare/authors',
    title: '作者画像对比',
    description: '比较研究者的论文方向、会议/期刊分布、合作网络和代表论文。',
    icon: '作',
    color: 'bg-amber-50 text-amber-700 border-amber-100',
    iconBg: 'bg-amber-100',
  },
  {
    to: '/compare/mentors',
    title: '研究者/课题组体验线索',
    description: '使用通过审核且达到阈值的匿名评价，并结合公开论文线索做并列查看。',
    icon: '研',
    color: 'bg-purple-50 text-purple-700 border-purple-100',
    iconBg: 'bg-purple-100',
  },
  {
    to: '/reports/topics',
    title: '方向报告',
    description: '生成方向报告，包含趋势、代表论文、机构、作者、企业和学习路线入口。',
    icon: '向',
    color: 'bg-rose-50 text-rose-700 border-rose-100',
    iconBg: 'bg-rose-100',
  },
]

export default function ComparePage() {
  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">对比与报告</p>
          <h1 className="text-2xl font-bold text-ink-text mt-0.5">对比中心</h1>
          <p className="text-sm text-ink-muted mt-1">
            面向科研、申请和职业规划的并列比较与方向报告。这里做结构化辅助判断，不做单一高低裁决。
          </p>
        </div>
      </section>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className={`block bg-surface-panel border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow ${card.color}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${card.iconBg}`}>
                {card.icon}
              </div>
              <h2 className="font-semibold text-lg">{card.title}</h2>
            </div>
            <p className="text-sm opacity-80 leading-relaxed">{card.description}</p>
          </Link>
        ))}
      </div>

      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <p className="text-xs text-ink-subtle leading-relaxed">
          对比结果基于可用论文元数据、公开企业字段和通过审核的用户信号。它们是并列探索工具，不是投资、录取或就业建议，也不是对个人、机构或公司的定性裁决。
        </p>
      </section>
    </div>
  )
}
