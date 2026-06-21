import { Link } from 'react-router-dom'

export default function ComparePage() {
  const cards = [
    {
      to: '/compare/companies',
      title: '企业对比',
      description: 'Select 2–4 companies to compare directions, domains, and fit.',
      icon: 'C',
      color: 'bg-blue-50 text-blue-700 border-blue-100',
      iconBg: 'bg-blue-100',
    },
    {
      to: '/compare/institutions',
      title: '机构对比',
      description: 'Compare academic institutions by publication volume, quality, and active authors.',
      icon: 'I',
      color: 'bg-green-50 text-green-700 border-green-100',
      iconBg: 'bg-green-100',
    },
    {
      to: '/compare/authors',
      title: '学者对比',
      description: 'Compare researchers by publication output, venues, and collaboration networks.',
      icon: 'A',
      color: 'bg-amber-50 text-amber-700 border-amber-100',
      iconBg: 'bg-amber-100',
    },
    {
      to: '/compare/mentors',
      title: '导师对比',
      description: 'Compare mentors using verified anonymous reviews with threshold protection.',
      icon: 'M',
      color: 'bg-purple-50 text-purple-700 border-purple-100',
      iconBg: 'bg-purple-100',
    },
    {
      to: '/reports/topics',
      title: 'Topic Report',
      description: 'Generate comprehensive reports for any research topic with trends and related companies.',
      icon: 'T',
      color: 'bg-rose-50 text-rose-700 border-rose-100',
      iconBg: 'bg-rose-100',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Intelligence</p>
          <h1 className="text-2xl font-bold text-ink-text mt-0.5">Compare & Reports</h1>
          <p className="text-sm text-ink-muted mt-1">
            Side-by-side comparison tools and topic intelligence reports.
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
          All comparisons are based on available metadata and are intended for directional exploration only. They do not represent final rankings or definitive evaluations.
        </p>
      </section>
    </div>
  )
}
