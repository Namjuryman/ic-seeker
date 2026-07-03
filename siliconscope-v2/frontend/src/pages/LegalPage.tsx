import { Link, useParams } from 'react-router-dom'

type LegalDoc = {
  slug: string
  title: string
  summary: string
  sections: Array<{ heading: string; body: string }>
}

const contacts = {
  support: 'support@siliconscope.example',
  privacy: 'privacy@siliconscope.example',
  copyright: 'copyright@siliconscope.example',
  corrections: 'corrections@siliconscope.example',
  moderation: 'moderation@siliconscope.example',
}

const aiReportDisclaimer = 'Generated from SiliconScope metadata and user-selected inputs. Verify papers, companies, institutions, and mentor-related information manually before making decisions.'

const docs: LegalDoc[] = [
  {
    slug: 'terms',
    title: 'Terms of Service',
    summary: 'SiliconScope is an IC research, learning, application, and career decision-support workspace.',
    sections: [
      {
        heading: 'Product boundary',
        body: 'SiliconScope provides metadata exploration, saved workspace tools, comparisons, reports, and learning navigation. It is not a PDF redistribution service, mentor blacklist, company blacklist, school ranking list, recruiting crawler, investment advice tool, or unauthorized database resale product.',
      },
      {
        heading: 'Metadata-based indicators',
        body: 'Compare, report, score, and rank-like labels are directional metadata-based indicators. They reflect source coverage, provenance, and selected filters, not final academic evaluation, employment advice, admission guarantees, or investment advice.',
      },
      {
        heading: 'Acceptable use',
        body: 'Do not upload unlawful content, attempt to extract hidden user data, scrape restricted sources through the service, identify anonymous reviewers, or use the platform to harass people, schools, labs, or companies.',
      },
      {
        heading: 'Contact',
        body: `General product and account requests: ${contacts.support}.`,
      },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    summary: 'This policy shell defines expected data categories and request channels before public launch.',
    sections: [
      {
        heading: 'User workspace data',
        body: 'Accounts, watchlists, saved searches, reading queues, notes, tags, comments, mentor reviews, usage events, billing events, and admin audit logs may be processed to operate the product.',
      },
      {
        heading: 'Deletion and export',
        body: `Users should be able to request account deletion, personal data export, review removal, correction of user-submitted content, and billing-data questions through ${contacts.privacy}.`,
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
    summary: 'SiliconScope exposes metadata, DOI links, source links, and user-owned notes instead of redistributing publisher PDFs.',
    sections: [
      {
        heading: 'Metadata-first policy',
        body: 'Paper records should come from allowed metadata sources, DOI links, official publisher pages, manual CSV imports, or user-provided private libraries. Public pages should not redistribute copyrighted PDFs.',
      },
      {
        heading: 'Local PDFs',
        body: 'Local PDF matching is a private personal indexing workflow. The system may store local paths, hashes, DOI guesses, and reading progress, but should not upload or sell copyrighted PDFs.',
      },
      {
        heading: 'Takedown and source disputes',
        body: `Copyright complaints, takedown notices, source-attribution disputes, and metadata removal requests should go to ${contacts.copyright}. Include the target URL, claimed right, requested action, and contact information.`,
      },
    ],
  },
  {
    slug: 'ai-disclaimer',
    title: 'AI Disclaimer',
    summary: 'Future paid AI reports must be explainable, source-backed, and reviewable.',
    sections: [
      {
        heading: 'Required disclaimer',
        body: aiReportDisclaimer,
      },
      {
        heading: 'Generated report limits',
        body: 'AI reports should summarize selected metadata and user inputs with sources, caveats, generatedAt, model or prompt version, and report inputs. They should not make absolute claims about the best mentor, school, company, or career decision.',
      },
      {
        heading: 'Human review',
        body: 'AI output is a research assistant layer, not a final authority. Users should verify important claims against official sources, papers, institutional pages, lab pages, company filings, and direct communication where appropriate.',
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
        body: 'Paper discussions should be visible only when approved, support reporting, and avoid personal attacks, harassment, doxxing, private identity exposure, discrimination, or unsupported allegations.',
      },
      {
        heading: 'Mentor reviews',
        body: 'Mentor review summaries must use approved reviews only, apply backend sample-size thresholds, avoid small-sample free-text exposure, and present fit-oriented signals rather than blacklists or rankings.',
      },
      {
        heading: 'Moderation contact',
        body: `Abuse, privacy, safety, or reviewer-identification concerns should go to ${contacts.moderation}. Urgent privacy or safety reports should be hidden first and reviewed later.`,
      },
    ],
  },
  {
    slug: 'contact-takedown',
    title: 'Contact, Correction, and Takedown',
    summary: 'Operational policy for correction requests, takedown notices, source disputes, and data removal.',
    sections: [
      {
        heading: 'Metadata corrections',
        body: `Paper, author, institution, venue, company, topic, and provenance corrections should go to ${contacts.corrections}. Include the wrong field, the proposed correction, and source links.`,
      },
      {
        heading: 'Request tracking',
        body: 'Each request should be tracked with target URL, requester contact, category, status, decision, timestamp, and admin notes. Repeated unresolved source conflicts should become admin content-quality findings.',
      },
      {
        heading: 'Data deletion',
        body: `Account, workspace, review, and personal-data deletion requests should go to ${contacts.privacy}.`,
      },
    ],
  },
  {
    slug: 'mentor-review-policy',
    title: 'Mentor Review Policy',
    summary: 'Mentor content should be moderated, thresholded, and fit-oriented rather than used as a blacklist.',
    sections: [
      {
        heading: 'Visibility thresholds',
        body: 'Public mentor summaries require enough approved reviews before showing aggregate claims. Less than three approved reviews should show no aggregate, summary, or comments. Three to four should show aggregate only. Five to nine should show structured sanitized summary only. Ten or more may show curated anonymous comments after moderation.',
      },
      {
        heading: 'Allowed review focus',
        body: 'Reviews should focus on mentoring style, research fit, communication, workload, funding/process clarity, and lab practices. Personal attacks, doxxing, discrimination, health speculation, and unverifiable accusations should be removed or hidden.',
      },
    ],
  },
  {
    slug: 'company-data-policy',
    title: 'Company Data Source Policy',
    summary: 'Company Intelligence is a curated public-metadata directory, not automated surveillance or investment recommendation.',
    sections: [
      {
        heading: 'Allowed sources',
        body: 'Company facts should come from official websites, public filings, official registries, annual reports, manually reviewed CSV imports, admin-reviewed source URLs, or licensed datasets where terms allow.',
      },
      {
        heading: 'Company caveat',
        body: 'Company pages are for career and industry understanding. They are not company blacklists, employee review walls, recruiting crawlers, or investment advice tools.',
      },
      {
        heading: 'Market data caveat',
        body: 'Ticker, market cap, stock price, and change fields are source-stamped reference fields. They may be stale, incomplete, or unavailable and should never be treated as financial advice.',
      },
    ],
  },
  {
    slug: 'service-limits',
    title: 'Service Limits and Liability',
    summary: 'SiliconScope should be presented as a research workspace with explicit limits.',
    sections: [
      {
        heading: 'No professional advice',
        body: 'SiliconScope does not provide legal, financial, admission, employment, immigration, publication, or investment advice. Users should verify decisions against official sources and professional counsel where needed.',
      },
      {
        heading: 'Data uncertainty',
        body: 'Classifications, entity matching, company profiles, topic reports, comparisons, geographies, snapshots, and AI summaries can be incomplete or wrong. Production pages should show source, confidence, generatedAt, filters, caveats, and correction paths.',
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
          Draft public-facing policies for the pre-production version. Replace example addresses with real production contacts before launch.
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
