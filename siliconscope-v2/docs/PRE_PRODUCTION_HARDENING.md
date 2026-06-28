# SiliconScope v2 Pre-Production Hardening

SiliconScope v2 is now a high-density pre-production prototype, not a small demo. The next work should prioritize runtime proof, data trust, permissions, legal boundaries, and product clarity before adding more isolated features.

## Product Positioning

SiliconScope is an IC research, learning, application, and career intelligence workspace.

It is not:

- a public PDF warehouse
- a mentor blacklist
- a company blacklist
- a school ranking list
- a recruiting crawler
- an investment advice tool
- an unauthorized database redistribution product

## Public / Admin Boundary

The mature deployment model is split by hostname:

- `www.example.com`: public product frontend
- `admin.example.com`: private admin control plane
- `api.example.com`: backend API

The public frontend should not bundle admin pages or expose direct admin workflow links. If a public page needs to mention maintenance, it should link to `ADMIN_SITE_URL` as an external admin console entry only.

Production admin access should require:

- backend `requireAdmin`
- `IC_SEEKER_REQUIRE_LOGIN=1`
- `IC_SEEKER_LOCAL_ADMIN=0`
- a strong `JWT_SECRET`
- an external access layer such as Cloudflare Access, VPN, or equivalent protection

Local `IC_SEEKER_LOCAL_ADMIN=1` is only for development.

## Free vs Paid Boundary

Free core workspace:

- paper search
- paper detail metadata and DOI links
- learning roadmaps
- basic topic pages
- basic company pages
- watchlist
- reading queue
- basic compare
- basic export

Potential paid layer:

- AI-generated structured reports
- advanced exports
- team workspace
- batch comparison reports
- custom private deployment or lab workflows

Paid features should monetize workflow efficiency and AI assistance, not copyrighted PDFs, hidden data, or absolute rankings.

## Data Trust Rules

- Public paper pages should expose metadata, DOI, official source links, and short summaries only.
- Publisher PDFs should not be redistributed publicly.
- Company intelligence is curated employer / industry metadata, not an automatic unauthorized company crawler.
- Company related papers are heuristic affiliation matches and must keep a caveat.
- Compare pages are side-by-side metadata tools, not rankings or blacklists.
- Mentor review summaries must use approved reviews only and keep threshold protection.

## Immediate Hardening Checklist

- [x] Remove admin page bundling from the public frontend.
- [x] Keep `frontend-admin` as the independent admin app.
- [x] Route public `/admin/*` to an external admin-domain handoff page instead of bundling admin modules.
- [x] Add `/reports/topics` and direct `/reports/topics/:field` loading.
- [x] Point public platform admin actions to `ADMIN_SITE_URL`, not public internal routes.
- [x] Clarify billing copy: core free, paid AI reports / advanced export / team workspace.
- [x] Add draft legal and product boundary pages.
- [x] Add admin-managed site settings for private beta, maintenance, paid-feature gates, community features, and data-readiness copy.
- [x] Add Export Center MVP for topic reports and compare pages with quota-aware Markdown/CSV/JSON output.
- [x] Add public `/request-access` outside the login wall and admin-only `/access-requests` approval queue.
- [ ] Run full runtime QA with a real non-LFS-pointer SQLite database.
- [ ] Record results in `docs/RUNTIME_QA_RESULTS.md`.
- [ ] Split Reading Queue long-term model into `readingStatus`, `flags`, and `useCases`.
- [ ] Design the first paid AI report pipeline with input snapshot, sources, caveats, generatedAt, prompt/model version, quota, and feedback.

## Runtime QA Must Prove

Build success is not enough. Before public beta, verify with the real database:

- SQLite opens and is not a Git LFS pointer.
- `npm run companies:seed` is idempotent.
- public frontend, admin frontend, and backend all run together.
- search, paper detail, learning, companies, watchlist, reading queue, compare, topic report, and admin APIs return real data.
- backup, maintenance, scheduler, snapshots, and audit logs execute real operations.
- admin domain isolation and cookie/CORS behavior work in deployment mode.
- payment disabled state is explicit and does not pretend real checkout is available.
- site settings reflect the intended launch mode and every mutation appears in admin audit logs.
- export endpoints produce metadata-only files and increment export usage.
- public access requests can be submitted without login, while review/approval remains admin-only.

## Legal / Policy Pages Needed

The current app includes draft public pages for:

- Terms of Service
- Privacy Policy
- Copyright and Data Source Policy
- AI Disclaimer
- Community and Review Policy

Before public launch, these drafts need legal review and a contact/takedown path.
