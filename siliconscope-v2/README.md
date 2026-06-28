# SiliconScope v2

SiliconScope v2 is the active frontend/backend separated edition of the IC paper search, reading-management, and academic-intelligence platform.

It builds on the original ChipSeeker-style private prototype, but v2 is now the canonical product path. New product work should happen in this folder rather than the archived `ic_seeker/` v1 app.

It uses a local SQLite database from public scholarly metadata, provides full-text and lightweight semantic search, ranks papers by configurable venue/domain rules, and profiles authors and institutions by publication strength. The current product is split into a public research frontend, an independent admin frontend, and a backend API. It is still a private MVP, not a public multi-user SaaS.

## Current Dataset

The repository includes a ready-to-use local database:

- `ic_database/ic_papers.sqlite`
- `ic_database/ic_chipseeker.csv`
- `ic_database/summary.json`
Current snapshot:

- Years: `2016-2026`
- Papers: about `38k`
- Venues: `ISSCC`, `JSSC`, `VLSI Symposium`, `CICC`, `ASSCC`, `ESSCIRC`, `ESSERC`, `IEDM`, `DAC`, `ICCAD`, `DATE`, `TCAD`, `TCAS-I`, `TCAS-II`, `TVLSI`, `ISCAS`

Publisher PDFs are not included.

### Git LFS

The SQLite database is tracked by Git LFS. If the file is only about 134 bytes and contains a pointer like `version https://git-lfs.github.com/spec/v1`, you have the LFS pointer, not the real database.

```bash
git lfs install
git lfs pull
```

## Features

- Local SQLite + FTS5 search over title, abstract, authors, venue, domain, and DOI
- Private admin login with a signed HTTP-only cookie
- Lightweight semantic search through IC-domain alias expansion
- Venue, domain, rank, year, local-PDF, and sort filters
- Paper detail view with DOI, source link, PDF link status, score, affiliations, and collection method
- Quick citation copy from the paper detail panel in IEEE, APA, and BibTeX formats
- Paper import by DOI through Crossref metadata
- Manual paper import for missing records
- Favorites, reading status, private notes, and tags
- Notification Center for system messages, moderation results, import-job receipts, weekly digests, and future subscription notices
- Subscription and quota scaffold with plan catalog, entitlement metadata, usage ledger, partial quota enforcement, admin plan management, and a payment-adapter boundary for future Stripe/Paddle integration
- Admin backup operations for SQLite private/public-beta deployments, with CLI restore-point creation and retention pruning
- Admin maintenance task center for backup, snapshot refresh, full cache refresh, and bounded data-quality scans
- Admin scheduled operations center for server-side backup, snapshot refresh, and data-quality jobs, disabled by default and enabled with `SCHEDULER_ENABLED=1`
- Admin job operations ledger for independent-domain deployments, unifying scheduler, maintenance, backup, snapshot, data-quality, and future ingestion activity
- Admin ingestion job registry for IEEE/OpenAlex/Crossref/CSV/PDF metadata imports, with provider, scope, status, counts, and audit trail before background workers are connected
- Backend API-key storage with masked display
- Author/professor leaderboard
- Clickable author profile with papers, venue/rank statistics, yearly trend, collaborators, institutions, and external Scholar search
- AMiner-style author page layout: author papers stay in the main area while the right rail shows the professor profile, inferred career stage, yearly activity, collaborators, and institutions
- Institution leaderboard for school/lab strength
- Clickable institution profile with yearly output, venues, fields, authors, and papers
- Topic intelligence page for domain strength, topic leaders, institutions, venues, and representative papers
- IC learning-roadmap workspace covering circuit design, digital systems, device/manufacturing, EDA/security, and frontier interdisciplinary tracks
- Learning foundations, route-specific prerequisites, staged goals, resources, practice projects, and paper-search links
- Daily circuit learning workspace with route pages, lesson pages, today's circuit, and related SiliconScope paper-search links
- Learning API endpoints for roadmaps, daily lessons, and related paper suggestions
- Workspace status strip for database size, PDF coverage, source readiness, and data-quality caveats
- Regional intelligence map with country hover, institution view, all-field strength, single-topic strength such as PMIC, and regional strength-change summaries
- Local Natural Earth world-country GeoJSON basemap for the regional intelligence map
- Local PDF inbox workflow for matching downloaded PDFs by DOI or IEEE article number
- CSV export compatible with ChipSeeker-like workflows
- Mobile-friendly web layout
- Independent admin frontend for operations, intended for a future `admin.siliconscope.com` deployment
- Admin audit trail, runtime readiness checks, and notification operations for production-facing maintenance
- Independent-domain deployment scaffold with production env checks, API/static frontend domain split, and Cloudflare/Caddy/Nginx templates
- Public API hardening with configurable general/auth/admin rate limits, request IDs, and production-safe error responses
- Lightweight admin observability for request volume, latency, status buckets, slow routes, hot routes, and recent errors before Prometheus/Sentry are connected
- Docker deployment

## Commercial Architecture Track

SiliconScope v2 is still runnable as a local/private SQLite MVP, but the target product architecture is tracked in [`docs/COMMERCIAL_ARCHITECTURE.md`](docs/COMMERCIAL_ARCHITECTURE.md). The SQLite-to-Postgres data split is tracked in [`docs/DATA_LAYER_MIGRATION.md`](docs/DATA_LAYER_MIGRATION.md), and the module roadmap is tracked in [`docs/PLATFORM_MODULES.md`](docs/PLATFORM_MODULES.md).

Optional local infrastructure for the future commercial stack can be started with:

```powershell
docker compose -f docker-compose.infra.yml up -d
```

This starts Postgres, Redis, Meilisearch, MinIO, and Mailpit for development. The current app does not require these services until the corresponding adapters are implemented.

## Quick Start

**Important notes:**

- **SiliconScope v2 is the canonical React + backend edition.** Legacy `ic_seeker` is kept only for reference.
- **Learning catalog canonical source is `backend/src/data/learning-catalog.ts`.**
- **Journal Ingestion is disabled until background jobs are implemented.**
- **Data Quality analysis is manual-run only.** Open the Data Quality page and click "Run analysis" when needed.

Requirements:

- Node.js `>=22.5.0`
- Windows PowerShell, macOS shell, or Linux shell

Run v2 services from this folder:

```powershell
.\start-dev.ps1
```

The dev launcher starts:

- Backend API: `http://127.0.0.1:8751`
- Public frontend: `http://localhost:5173`
- Independent admin frontend: `http://localhost:5176`

The launcher sets `IC_SEEKER_LOCAL_ADMIN=1` only for local development so the admin app can be opened on your machine. Do not enable this flag on a public server.

Or run the production-style build from this folder:

```powershell
npm start
```

Before weekly imports, crawls, or schema/data maintenance, create a restore point:

```powershell
npm run backup:create -- weekly-refresh --keep=10
```

The admin console also has a backup page for creating, listing, pruning, and deleting local restore points. Restore remains manual-first: stop the API, copy the selected `.sqlite` backup over the active database, then restart.

For manual development, run backend and frontend separately:

```powershell
cd backend
npm run dev
```

```powershell
cd frontend
npm run dev
```

For the independent admin frontend:

```powershell
cd frontend-admin
npm run dev
```

Open the development frontend:

```text
http://localhost:5173
```

Open the development admin console:

```text
http://localhost:5176
```

The backend API runs at:

```text
http://127.0.0.1:8751
```

For Docker or production-style serving, the backend currently serves `frontend/dist` as the public site after `npm run build`. The admin frontend builds separately into `frontend-admin/dist` and should be deployed behind a separate admin host.

Create `.env` from the example before exposing the site outside your own machine:

```powershell
copy .env.example .env
notepad .env
```

## Docker

Create `.env` first, then run:

```powershell
docker compose up --build
```

The Compose setup mounts `./ic_database` into the container so your SQLite database, PDF inbox, notes, tags, and imports persist locally.

For server deployment, put the app behind an HTTPS reverse proxy and keep `HOST=0.0.0.0` only inside Docker or trusted server environments.

## Public Deployment Plan

Recommended first public setup:

- Rent a small VPS with Docker support.
- Point your domain to Cloudflare DNS.
- Run the backend API with `docker compose -f docker-compose.production.yml up -d --build` on the VPS.
- Deploy the public frontend to `siliconscope.com` or `www.siliconscope.com`.
- Deploy the independent admin frontend to `admin.siliconscope.com`.
- Put Caddy, Nginx Proxy Manager, Cloudflare Tunnel, or another HTTPS reverse proxy in front of the API.
- Keep `ADMIN_PASSWORD`, `JWT_SECRET`, and future IEEE/OpenAI keys in `.env`, never in Git.
- Set `IC_SEEKER_REQUIRE_LOGIN=1` for public deployment.
- Keep `IC_SEEKER_LOCAL_ADMIN=0` on every public server. It is only for local development.
- Allow both frontend origins in `FRONTEND_ORIGINS`, for example `https://www.siliconscope.com,https://admin.siliconscope.com`.
- Back up `ic_database/ic_papers.sqlite` and `ic_database/pdfs/` regularly.
- For a public product, expose only metadata, DOI, abstracts, rankings, and links. Do not proxy or redistribute publisher PDFs.
- When traffic grows, move from SQLite-on-disk to Postgres plus object storage, and keep the current SQLite app as the private/local edition.

Active independent-domain layout:

```text
https://www.your-domain.com   -> public frontend
https://admin.your-domain.com -> independent admin frontend
https://api.your-domain.com   -> backend API
```

Before exposing the service:

```powershell
npm run deploy:init -- your-domain.com
npm run deploy:check -- .env.production
npm run build
npm run deploy:doctor -- .env.production
docker compose -f docker-compose.production.yml up -d --build
```

Ready-to-edit independent-domain templates are included under `deploy/`:

- `deploy/Caddyfile.example` for the cleanest VPS + automatic HTTPS setup.
- `deploy/Caddyfile.docker` for the production Docker Compose edge proxy.
- `deploy/nginx.siliconscope.example.conf` for a classic Nginx reverse-proxy setup.
- `deploy/production.env.example` for production API environment variables.
- `deploy/cloudflare-tunnel.example.yml` for API-only Cloudflare Tunnel ingress.
- `deploy/DOMAIN_GO_LIVE.md` for the complete go-live checklist.
- `npm run deploy:init -- your-domain.com` to generate `.env.production` with `www/admin/api` domains and strong random secrets.
- `npm run deploy:doctor -- .env.production` to check env, frontend builds, and DNS readiness before going live.
- `npm run backup:create -- pre-deploy --keep=10` before risky imports, schema work, or public deployments.

Vercel or Cloudflare Pages can host the two static frontends later. The backend API still needs a server, Docker host, or serverless-compatible rewrite because it owns SQLite/Postgres access, admin APIs, authentication cookies, and ingestion jobs.

The independent admin frontend includes a `/launch` page for production readiness and a `/job-operations` page for the operational ledger: runtime blockers, backup status, maintenance freshness, scheduler state, DNS shape, and the exact command sequence for go-live.

## Private MVP Workflow

- Search papers with the main search bar. Keep `Semantic` enabled to expand common IC terms such as PLL, ADC, LDO, and their Chinese equivalents.
- Open a paper detail page to save favorite status, reading status, tags, and notes.
- Import missing papers by DOI from the sidebar. This stores metadata only and links to the DOI/source.
- Use manual import for papers that are missing from public metadata.
- Use the admin ingestion job page to register weekly metadata jobs before running real backend workers.
- Store optional service keys from the API-key panel. Values are masked in the UI.

More detail is in [docs/PRIVATE_MVP.md](docs/PRIVATE_MVP.md).

## Company Intelligence

The Company Intelligence module is a curated employer/industry metadata directory within SiliconScope. It is designed for:

- Browsing semiconductor companies by type, region, and technology domain.
- Viewing public metadata such as company type, product lines, domains, and career signals.
- Linking companies to related research papers (via affiliation text matching) and learning roadmaps.
- Comparing companies side-by-side for competitive landscape context.

It is **not** an investment recommendation platform, a company ranking service, or a job board. All company data is sourced from public information and may be incomplete or stale; verify critical decisions independently.

### Seed the Company Directory

The company tables are auto-created on backend startup, but the directory must be seeded with initial data:

```powershell
cd backend
npm run companies:seed
```

Or from the project root:

```powershell
npm run companies:seed
```

This runs `backend/src/scripts/seed-companies.ts`, which creates the `companies`, `company_sources`, `company_aliases`, `company_field_facts`, and `company_job_signals` tables if needed, then inserts/updating the seed catalog. You can safely rerun it after updating the seed data in `backend/src/data/company-seed/`.

### Admin Operations

- Create, edit, and delete companies from the independent admin frontend (`frontend-admin`, local `http://localhost:5176`).
- CSV bulk import is planned but not yet implemented.
- All `/api/admin/*` endpoints require admin role (`requireAdmin`). In local development, the launcher sets `IC_SEEKER_LOCAL_ADMIN=1`; public deployments must keep that flag disabled and require login.

## Learning Roadmap Source

The `siliconscope-v2` frontend includes an IC learning-roadmap page inspired by the public
[Crys-Chen/ic-guide](https://github.com/Crys-Chen/ic-guide) project. The integrated content is a
curated SiliconScope summary rather than a verbatim mirror:

- General IC learning-map structure and research-direction framing are referenced.
- Fudan-specific course tables, FDU course pages, and Fudan-specific mentor lists are intentionally excluded.
- The page now organizes IC study into route families: circuit design, digital systems, device/manufacturing, EDA/security, and frontier interdisciplinary directions.
- Current tracks have been expanded from broad buckets into 24 route maps, including analog/mixed-signal, ADC/DAC, PLL/clocking, SerDes, RF/mmWave, power management, biomedical/sensor interfaces, image sensors/display drivers, digital ASIC/SoC, digital backend/signoff, verification/DFT, computer architecture accelerators, FPGA, devices/process, equipment/materials, power devices, advanced packaging, analog layout/PEX, EDA tools, hardware security, automotive reliability/safety, memory/CIM, silicon photonics, and quantum/neuromorphic IC.
- Each track includes common foundations, route-specific prerequisites, staged learning goals, representative resources, paper-search links, and small practice projects.
- External books, courses, tools, and guide links keep their original source attribution.
- The content strategy and future taxonomy work are tracked in [`docs/LEARNING_CONTENT_STRATEGY.md`](docs/LEARNING_CONTENT_STRATEGY.md).
- Future work: turn the static roadmap into a local editable database, connect each roadmap node to curated reading lists and local PDF folders, add user progress tracking, and let weekly database refreshes recommend new papers for each route.

## Learning And Daily Circuit Workspace

The v2 app now has a dedicated learning workspace:

```text
/learning                         Learning dashboard
/learning/roadmaps/:slug          Route-specific roadmap
/learning/today                   Today's circuit lesson
/learning/lessons/:lessonId       Lesson detail page
```

Backend endpoints:

```text
GET /api/learning
GET /api/learning/roadmaps
GET /api/learning/roadmaps/:slug
GET /api/learning/roadmaps/:slug/related-papers
GET /api/learning/lessons
GET /api/learning/today
GET /api/learning/lessons/:lessonId
GET /api/learning/lessons/:lessonId/related-papers
```

Current scope:

- Roadmaps and daily lessons are curated seed data, not generated long-form course chapters.
- The current seed catalog contains 24 route maps and 35 daily circuit lessons.
- Lesson pages intentionally use a structured placeholder format: intuition, key equations, design traps, paper-reading pointers, and practice prompts.
- Related papers are pulled from the local SiliconScope search service through metadata queries.
- Future work should move learning content into editable database tables, add reading progress, spaced review, saved learning plans, and weekly paper recommendations per route.

## Rebuild The Database

The default rebuild uses public metadata sources and writes into `ic_database/`:

```powershell
npm run build:database
```

Equivalent command:

```powershell
node .\scripts\build-ic-database.mjs --years=2016-2026 --max-per-venue-year=500 --max-per-venue=6000 --no-source-backfill
```

To build one venue into an isolated directory:

```powershell
node .\scripts\build-ic-database.mjs --out-root=ic_database_checks\isscc --years=2016-2026 --max-per-venue-year=500 --no-source-backfill --venues=ISSCC
```

To merge checked databases:

```powershell
node .\scripts\merge-ic-databases.mjs --out=ic_database\ic_papers.sqlite ic_database_checks\isscc\ic_papers.sqlite ic_database_checks\jssc\ic_papers.sqlite
```

To incrementally backfill the existing SQLite database for the core IC venues back to 2000 without rebuilding from scratch:

```powershell
npm run backfill:core -- --years=2000-2026
```

For a smaller controlled batch:

```powershell
npm run backfill:core -- --years=2000-2015 --venues="ISSCC,JSSC,VLSI Symposium" --max-pages-per-year=2
```

The backfill script resolves OpenAlex sources for each configured venue, imports metadata only, and skips existing rows by DOI, OpenAlex id, or title/year. It is designed to be rerun safely in batches while the future IEEE Xplore importer is being prepared.

## Extend Journal Coverage

Some IC-adjacent journals are too broad to import as a whole. Use the journal extension importer to query OpenAlex by source id plus IC-focused search terms, then run local relevance filtering before writing to SQLite:

```powershell
npm run import:journals -- --years=2000-2026 --venues="IEEE Sensors J.,Adv. Mater.,Appl. Phys. Lett.,Solid-State Electron.,IEEE JMEMS,IEEE T-Nano,Microelectron. J."
```

Useful options:

- `--dry-run` previews insert/skip counts without changing the database.
- `--search-mode=source-only` scans a source-year directly; this is slower and should be reserved for narrow journals.
- `--max-pages=30` caps OpenAlex cursor pages per year and term.
- `--term-limit=4` keeps focused imports short by using the first high-yield search terms; set `--term-limit=0` for a deeper sweep.
- `--rebuild-fts` rebuilds the SQLite FTS index after manual database surgery.

The current extension targets include Nature Electronics, Nature, Nature Communications, IEEE T-MTT, IEEE TED, IEEE EDL, IEEE Sensors Journal, Advanced Materials, Applied Physics Letters, Solid-State Electronics, IEEE JMEMS, IEEE T-Nano, and Microelectronics Journal. Future IEEE API integration should replace the heuristic importer for IEEE venues and add stronger venue/year completeness checks.

Broad journal policy:

- `Nature` is treated as `SSS`; `Nature Electronics` is treated as `SS+`.
- `Nature Communications`, `IEEE EDL`, `Advanced Materials`, and `Applied Physics Letters` are retained in SQLite but marked `Hidden`, so they do not affect default search, rankings, maps, topics, or mentor/institution scoring.
- IEEE T-MTT is kept as a strong RF venue.
- Broad materials/devices journals such as Advanced Materials and Applied Physics Letters are deliberately downweighted because keyword metadata can over-match non-IC work.

After changing venue policy, reweight the existing database:

```powershell
npm run reweight:venues
```

## IEEE Xplore API

If you have IEEE Xplore API access, set an API key before rebuilding:

```powershell
$env:IEEE_API_KEY="your_ieee_xplore_api_key"
npm run build:database
```

With `IEEE_API_KEY`, IEEE metadata is queried first. Without it, the builder falls back to OpenAlex and Crossref. The tool does not mass-download IEEE PDFs.

## Local PDF Workflow

Put local PDF files into:

```text
ic_database/pdf_inbox/
```

If the filename contains a DOI or IEEE article number, run:

```powershell
npm run import:pdfs
```

Matched files are moved under `ic_database/pdfs/` and attached to database rows.

## Scoring

> **Disclaimer:** Metadata score, rank, and topic classification are heuristic indicators, not final academic judgment.

Paper score is intentionally transparent:

```text
quality_score = venue_base + 10 * domain_keyword_hits + citation_boost + recency_boost
```

- `citation_boost = min(cited_by_count, 300) / 25`
- `recency_boost = max(0, publication_year - 2016) * 0.35`
- Venue base examples: `ISSCC/JSSC = 100`, `VLSI = 92`, `CICC = 86`, `IEDM = 84`, `ASSCC = 78`, `ESSCIRC/ESSERC = 76`, `DAC/ICCAD = 74`, `TCAD = 70`

Classification uses keyword dictionaries over title, abstract, source name, and concepts. The domain with the most keyword hits wins; otherwise papers fall back to `General IC`.

PMIC/DC-DC classification now uses higher-weight phrase matching for terms such as `dc-dc`, `dcdc`, `buck`, `boost`, `ldo`, `pmic`, `switched-capacitor`, `charge pump`, `dual-path hybrid`, and `continuous-current-input`. To repair an existing database after imports, run:

```powershell
node .\scripts\repair-power-management-domains.mjs
```

Longer-term classification work should become a dedicated data-quality subsystem rather than a single keyword list:

- weighted title/abstract/source/concept matching with positive and negative phrases
- topic hierarchy, for example `Power Management > DC-DC`, `Analog > ADC`, `RF > PLL/Wireline`
- manual override files for known representative papers and ambiguous titles
- IEEE metadata verification for article number, venue, abstract, DOI, and author list
- optional embedding/LLM-assisted review only as a second-pass classifier, with the rule-based reason kept visible
- regression tests for examples that were previously misclassified

## Regional Map Notes

The Geo Intelligence page now separates spatial reading from numeric reading:

- the map layer uses Natural Earth country boundaries
- country color is kept subdued so dense regions stay readable
- city-level rays are schematic IC hotspots, used to show intra-country density such as US West/East Coast and East Asia clusters
- exact numbers are moved into the country share chart, country ranking, and country detail panel

The current city hotspot layer is a transition design. It is not yet a verified city-level database. The next data milestone is institution normalization plus geocoding, so affiliations such as Hong Kong, Macau, university branches, corporate labs, and renamed institutes can be disambiguated before city-level scoring is treated as factual.

## Caveats

- Metadata quality depends on IEEE/OpenAlex/Crossref coverage and naming consistency.
- Author identity is currently name-based; serious professor ranking should add ORCID/institution disambiguation.
- Institution names are raw affiliation strings and may need normalization.
- Mentor/institution membership and mentor-vs-student status are currently inferred from local paper metadata. The mentor review page filters low-evidence authors as likely students/collaborators and treats the remaining entries as provisional mentor candidates. Future IEEE Xplore API enrichment and large-scale university/college/lab website crawlers should verify each professor's current affiliation, historical affiliation moves, lab homepage, title, department, research group, and faculty role before the platform treats mentor-school membership as factual.
- Regional and city-level views are estimates until institution disambiguation and geocoding are connected.
- Some venue-year counts differ from IEEE Xplore because of early access, front matter, corrections, duplicate indexing, or source-specific metadata policy.
- `ESSCIRC 2020` was cancelled due to COVID-19; 2024+ European solid-state events may appear under `ESSERC`/combined naming.

## Project Structure

```text
backend/                  Express API server, services, repositories, and seed data
backend/src/routes/       HTTP route modules
backend/src/services/     Search, paper, profile, topic, geo, mentor, and learning logic
backend/src/repositories/ SQLite repository wrappers
backend/src/data/         Local seed catalogs such as learning roadmaps
frontend/                 React + Vite frontend
frontend/src/pages/       Search, paper, profile, geo, mentor, venue, and learning pages
frontend/src/components/  Shared UI and entity-link components
frontend/src/utils/       Route helpers and formatting utilities
ic_database/              Ready-to-use SQLite, CSV, summary, and PDF folders
docs/                     Product roadmap, deployment, methodology, and MVP notes
legacy-public/            Public demo/legacy materials retained for context
```

## Roadmap

Future product ideas are collected in [docs/ROADMAP.md](docs/ROADMAP.md), including:

- Web SaaS and API layer
- Daily circuit learning for mobile/PWA
- New-paper monitoring
- Author and institution profile upgrades
- Chinese interface
- Local PDF library and private paper reading
- Monetization and deployment notes

## Data Policy

This project stores metadata and local user-provided PDFs. It does not bypass paywalls and does not bulk-download publisher PDFs.

The regional map basemap uses Natural Earth Admin-0 country boundaries, which are public-domain map data. The GeoJSON is stored locally under `ic_seeker/public/data/` so the web app does not depend on an external map CDN at runtime.
