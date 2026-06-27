import { Link, useParams } from 'react-router-dom'

type LegalDoc = {
  slug: string
  title: string
  summary: string
  sections: Array<{ heading: string; body: string }>
}

const docs: LegalDoc[] = [
  {
    slug: 'terms',
    title: 'Terms of Service',
    summary: 'SiliconScope is an IC research, learning, application, and career intelligence workspace.',
    sections: [
      {
        heading: 'Product boundary',
        body: 'SiliconScope provides metadata exploration, saved workspace tools, comparisons, reports, and learning navigation. It is not a PDF redistribution service, mentor blacklist, company blacklist, school ranking list, recruiting crawler, or investment advice tool.',
      },
      {
        heading: 'Acceptable use',
        body: 'Do not upload unlawful content, attempt to extract hidden user data, scrape restricted sources through the service, or use comparison pages as final evaluations of people, schools, or companies.',
      },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    summary: 'This placeholder defines the data categories SiliconScope expects to process before public launch.',
    sections: [
      {
        heading: 'User workspace data',
        body: 'Accounts, watchlists, reading queues, notes, comments, reviews, and usage events are user data. Public launch should support access, export, correction, deletion, and retention rules before inviting broad users.',
      },
      {
        heading: 'Admin separation',
        body: 'Administrative workflows are separated into the private admin application and should be protected by login plus an external access layer such as Cloudflare Access, VPN, or equivalent controls.',
      },
    ],
  },
  {
    slug: 'copyright',
    title: 'Copyright and Data Source Policy',
    summary: 'SiliconScope should expose metadata, DOI links, source links, and user-owned notes instead of redistributing publisher PDFs.',
    sections: [
      {
        heading: 'Metadata-first policy',
        body: 'Paper records should come from allowed metadata sources, DOI links, official publisher pages, manual CSV imports, or user-provided private libraries. Public pages should not redistribute copyrighted PDFs.',
      },
      {
        heading: 'Takedown and correction',
        body: 'A public deployment should provide a contact channel for metadata corrections, copyright complaints, source attribution issues, and removal requests.',
      },
    ],
  },
  {
    slug: 'ai-disclaimer',
    title: 'AI Disclaimer',
    summary: 'Future paid AI reports must be explainable, source-backed, and reviewable.',
    sections: [
      {
        heading: 'Generated report limits',
        body: 'AI reports should summarize selected metadata and user inputs with sources, caveats, generatedAt, model/prompt version, and report inputs. They should not make absolute claims about the best mentor, school, company, or career decision.',
      },
      {
        heading: 'Human review',
        body: 'AI output is a research assistant layer, not a final authority. Users should verify important claims against official sources, papers, and institutional pages.',
      },
    ],
  },
  {
    slug: 'community-guidelines',
    title: 'Community and Review Policy',
    summary: 'Discussion and mentor review features need moderation, thresholds, and abuse prevention.',
    sections: [
      {
        heading: 'Public discussion',
        body: 'Paper discussions should be visible only when approved or visible, support reporting, and avoid personal attacks, harassment, or hidden identity exposure.',
      },
      {
        heading: 'Mentor reviews',
        body: 'Mentor review summaries should use approved reviews only, apply sample-size thresholds, avoid small-sample free-text exposure, and present fit-oriented signals rather than blacklists or rankings.',
      },
    ],
  },
]

export default function LegalPage() {
  const params = useParams()
  const selected = docs.find((doc) => doc.slug === params.slug) || docs[0]

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Policy</p>
        <h1 className="text-2xl font-bold text-ink-text mt-0.5">Legal and product boundaries</h1>
        <p className="text-sm text-ink-muted mt-1">
          Draft public-facing policies for the pre-production version. These are product guardrails, not legal advice.
        </p>
      </section>

      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-5">
        <aside className="bg-surface-panel border border-line rounded-xl p-4 shadow-sm h-fit">
          <nav className="grid gap-2">
            {docs.map((doc) => (
              <Link
                key={doc.slug}
                to={`/legal/${doc.slug}`}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${doc.slug === selected.slug ? 'bg-brand-50 text-brand-700 border-brand-100' : 'bg-surface-elevated text-ink-secondary border-line'}`}
              >
                {doc.title}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="bg-surface-panel border border-line rounded-xl p-6 shadow-sm">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">Draft policy</p>
          <h2 className="text-3xl font-bold text-ink-text mt-1">{selected.title}</h2>
          <p className="text-sm text-ink-muted mt-2 leading-relaxed">{selected.summary}</p>

          <div className="mt-6 space-y-5">
            {selected.sections.map((section) => (
              <section key={section.heading} className="border-t border-line pt-5">
                <h3 className="font-semibold text-ink-text">{section.heading}</h3>
                <p className="text-sm text-ink-muted mt-2 leading-relaxed">{section.body}</p>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
