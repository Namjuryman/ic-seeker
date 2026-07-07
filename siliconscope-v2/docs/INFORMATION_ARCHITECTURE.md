# SiliconScope v2 Information Architecture

SiliconScope v2 uses two separate frontends:

- Public app: `frontend`, intended for `www.<domain>` or `app.<domain>`.
- Private admin app: `frontend-admin`, intended for `admin.<domain>` behind login plus an external access layer.

The public app keeps only five primary navigation hubs. Detailed tools remain reachable as deep links so existing saved URLs keep working.

## Public Hubs

| Hub | Canonical route | Purpose | Deep routes kept under the hub |
| --- | --- | --- | --- |
| Search | `/` | Paper search and paper reading entry point | `/papers/:id`, `/venue-matrix` |
| Intelligence | `/intelligence` | Author, mentor, institution, company, topic, geo, and comparison intelligence | `/authors`, `/institutions`, `/mentors`, `/companies`, `/companies/:companyId`, `/topics`, `/geo`, `/reports`, `/reports/topics`, `/reports/topics/:field`, `/compare`, `/compare/authors`, `/compare/institutions`, `/compare/mentors`, `/compare/companies` |
| Learning | `/learning` | Daily circuit workspace and full IC route library | `/daily-circuit`, `/learning-path`, `/learning/roadmaps/:slug`, `/learning/today`, `/learning/lessons/:lessonId` |
| Workspace | `/workspace` | User-owned reading and export workflows | `/watchlist`, `/reading-queue`, `/notifications`, `/exports` |
| Account | `/account` | Billing, product status, access requests, and policy pages | `/billing`, `/platform`, `/request-access`, `/legal`, `/legal/:slug` |

## Admin Routes

Admin pages are not mounted in the public app. Public `/admin/*` only renders an admin redirect page that points operators to the independent admin hostname.

The private admin app owns these routes:

| Admin area | Routes |
| --- | --- |
| Command | `/`, `/launch`, `/job-operations`, `/site-settings`, `/access-requests`, `/observability`, `/completion-report` |
| Jobs | `/journal-ingestion`, `/scheduler`, `/maintenance`, `/backups`, `/snapshots`, `/search-index`, `/ai-enrichment` |
| Governance | `/audit-logs`, `/moderation`, `/learning-content`, `/topic-taxonomy`, `/identity`, `/data-quality` |
| Business | `/billing`, `/companies`, `/notifications`, `/venue-matrix`, `/platform` |

## Redirect Policy

- Public `/admin/*` redirects users toward the independent admin deployment.
- Deep public routes are intentionally preserved rather than redirected. They are shareable entities or tools that now sit beneath one of the five hubs.
- Future deprecated public routes should map to the nearest hub here before removal.

## Bundle Boundary

The public app route table imports only public pages plus `AdminRedirectPage`. Operational pages such as `JournalIngestionPage`, `BackupAdminPage`, `SchedulerAdminPage`, `AiEnrichmentAdminPage`, and `LearningContentAdminPage` are mounted from `frontend-admin/src/main.tsx`.

Run these checks before merging information-architecture changes:

```powershell
npm run build:frontend
npm run build:admin
```

The public Vite build output should not contain generated chunks named after admin pages, except the tiny `AdminRedirectPage` chunk.
