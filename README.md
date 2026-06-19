# SiliconScope

SiliconScope is a local-first IC paper search, reading-management, and academic-intelligence web app.

The project started as a ChipSeeker-style private tool and is moving toward an IC-focused platform for papers, professors, institutions, topics, regional strength, and eventually daily circuit learning.

The current version is still a private MVP. It is useful for exploration, but author identity, institution membership, mentor status, and city-level geography are metadata-based estimates until the future IEEE/API/homepage verification pipeline is added.

## Current Status

### Already Built

- Local Node.js web app at `http://127.0.0.1:8750`
- SQLite database with FTS5 search
- Search over title, abstract, authors, venue, domain, DOI, and source metadata
- Lightweight semantic expansion for IC terms such as ADC, PLL, LDO, PMIC, DC-DC, RF, SerDes, memory, and Chinese aliases
- Paper detail rail with DOI, official link, PDF status, abstract, affiliations, score, tags, notes, and reading status
- Quick citation copy in IEEE, APA, and BibTeX formats
- Favorites, notes, reading status, and tags
- DOI import through Crossref
- Manual paper import
- Local PDF inbox matching by DOI or IEEE article number
- Author/professor rankings and profile pages
- Institution rankings and profile pages
- Mentor/institution prototype page with provisional mentor candidates and reviews
- Topic intelligence page
- Venue/journal matrix page
- Regional intelligence map with country interaction and institution links
- Chinese/English UI toggle
- Docker deployment files
- Backend structure split into config, db, lib, routes, services, and repositories
- `db/schema.sql` and startup migrations
- Shared classification/scoring policy used by runtime imports and metadata import scripts

### Current Dataset

The repository includes a ready-to-use database under:

```text
ic_database/ic_papers.sqlite
ic_database/ic_chipseeker.csv
ic_database/summary.json
```

Current snapshot:

- Years: `2000-2026` in the active app filters
- Indexed papers: about `48k`
- Core venues include ISSCC, JSSC, VLSI Symposium, CICC, ASSCC, ESSCIRC, ESSERC, IEDM, DAC, ICCAD, DATE, TCAD, TCAS-I, TCAS-II, TVLSI, and ISCAS
- Extension venues include Nature, Nature Electronics, IEEE T-MTT, IEEE TED, and several broad IC-adjacent journals

Publisher PDFs are not included. The app stores metadata and user-provided local PDFs only.

## Run Locally

Requirements:

- Node.js `>=22.5.0`
- Windows PowerShell, macOS shell, or Linux shell

Start the app:

```powershell
npm start
```

Or:

```powershell
node .\ic_seeker\server.mjs
```

Open:

```text
http://127.0.0.1:8750
```

If login is enabled in `.env`, use `ADMIN_PASSWORD`.

Before exposing the app publicly, set:

```env
IC_SEEKER_REQUIRE_LOGIN=1
ADMIN_PASSWORD=replace-with-a-long-password
COOKIE_SECRET=replace-with-a-long-random-string
HOST=0.0.0.0
PORT=8750
```

## Docker

```powershell
copy .env.example .env
notepad .env
npm run docker:up
```

The Compose setup mounts `./ic_database` into the container, so SQLite data, PDF inbox, notes, tags, and imports persist locally.

For a public server, put the app behind HTTPS with Cloudflare Tunnel, Caddy, Nginx Proxy Manager, or another reverse proxy.

## Database Commands

Build the database from metadata sources:

```powershell
npm run build:database
```

Fast rebuild:

```powershell
npm run build:database:fast
```

Backfill core venues to 2000:

```powershell
npm run backfill:core -- --years=2000-2026
```

Import broad journal extensions with relevance filtering:

```powershell
npm run import:journals -- --years=2000-2026
```

Reweight existing rows after venue policy changes:

```powershell
npm run reweight:venues
```

Attach local PDFs:

```powershell
npm run import:pdfs
```

Put PDFs in:

```text
ic_database/pdf_inbox/
```

Matched files are moved under:

```text
ic_database/pdfs/
```

## Data Sources

Preferred long-term metadata order:

1. IEEE Xplore API for IC venue precision when an API key is available
2. OpenAlex for broad low-cost metadata
3. Crossref for DOI and publisher metadata
4. DBLP for EDA/CAD and architecture-adjacent venues
5. Semantic Scholar for citation/recommendation enrichment
6. AMiner only for targeted author/institution enrichment or selected missing gaps

Google Scholar should remain an outbound/manual search link. Do not scrape it.

The project does not mass-download IEEE PDFs and does not bypass paywalls.

## Scoring And Classification

Paper scoring is intentionally transparent:

```text
quality_score = venue_base + domain_boost + citation_boost + recency_boost
```

Current shared policy lives in:

```text
ic_seeker/services/classification.service.mjs
```

Important current policy choices:

- ISSCC and JSSC are `S+`
- VLSI Symposium, CICC, and IEDM are `S`
- Nature is `SSS`
- Nature Electronics is `SS+`
- Nature Communications, IEEE EDL, Advanced Materials, and Applied Physics Letters are retained in SQLite but marked `Hidden`
- PMIC/DC-DC classification has weighted phrase matching for terms such as `dc-dc`, `dcdc`, `buck`, `boost`, `ldo`, `pmic`, `switched-capacitor`, `charge pump`, `dual-path hybrid`, and `continuous-current-input`

Classification is still rule-based. It is explainable and editable, but imperfect.

## Architecture

Current backend structure:

```text
ic_seeker/
  server.mjs
  config/env.mjs
  db/connection.mjs
  db/migrations.mjs
  db/schema.sql
  lib/auth.mjs
  lib/http.mjs
  lib/identity.mjs
  routes/
  services/
  repositories/
  public/
```

Current frontend structure:

```text
ic_seeker/public/
  index.html
  app.js
  styles.css
  js/bootstrap.js
  js/geo-utils.js
  data/
```

The backend is partially modularized. The frontend is still mostly one large vanilla JavaScript app and should be split next.

## Current Limitations

### Data Coverage

- The current dataset is good enough for product iteration, but not a verified full IEEE-grade corpus.
- Some venue-year counts differ from IEEE Xplore because public metadata can include early access, corrections, front matter, duplicated records, or missing proceedings years.
- Future IEEE Xplore integration should verify title, authors, affiliations, year, venue, DOI, abstract, and IEEE article number.

### Author Recognition

- Current author aggregation is mostly name-based.
- Same-name authors can merge.
- One person can split across different name spellings.
- ORCID/OpenAlex/DBLP IDs and manual merge/split overrides are still needed.

### Mentor/Institution Pages

- Mentor candidates are inferred from local metadata.
- Student, postdoc, visiting collaborator, alumni, and faculty roles are not reliably separated yet.
- Current institution membership is inferred from publication metadata, not verified faculty rosters.
- Future versions should crawl faculty/lab/homepage pages and keep evidence provenance.

### Institution Recognition

- Institution names are raw or lightly normalized affiliation strings.
- Branch campuses, labs, corporate teams, translated names, and historical moves can still confuse rankings.
- Canonical institution IDs, aliases, and paper-institution join tables are still needed.

### Regional Map

- Country-level map is useful for exploration.
- City-level rays/hotspots are schematic until institution geocoding is connected.
- Hong Kong, Macau, Taiwan, Singapore, corporate labs, and branch campuses need auditable normalization before city-level counts are treated as factual.

### Frontend Maintainability

- The app works, but `public/app.js` is still too large.
- Router, API client, state, paper rendering, profile rendering, geo rendering, and utility functions should be split into modules.

## Not Done Yet

Near-term engineering work:

- Split frontend into modules:
  - `api.js`
  - `state.js`
  - `router.js`
  - `render/paperList.js`
  - `render/paperDetail.js`
  - `render/authorProfile.js`
  - `render/institutionProfile.js`
  - `utils/format.js`
- Add regression tests later for:
  - DC-DC/PMIC classification
  - venue ranks
  - hidden broad journals
  - known misclassified papers
- Add canonical venue mapping and venue IDs
- Improve paper deduplication by DOI, IEEE article number, title/year/first-author fuzzy matching
- Add canonical institution and author repositories
- Add manual override files:
  - `profiles/authors.json`
  - `profiles/institutions.json`
  - `profiles/venues.json`
- Add request logging, production error handling, and rate limiting
- Add backup scripts for SQLite and PDF folders

Near-term data work:

- IEEE Xplore metadata sync
- DBLP supplement for DAC/ICCAD/DATE and EDA/CAD records
- Better 2000-current completeness checks per venue/year
- Venue-year anomaly reports
- Institution alias normalization
- Author disambiguation
- Faculty homepage crawler for mentor verification
- Institution geocoding for real city-level maps

Near-term product work:

- Cleaner paper search layout
- Better institution and author profile pages
- Professor comparison
- Institution comparison
- Topic trend pages
- Venue profile pages
- Saved searches and followed topics
- Daily/weekly new-paper digest
- Local PDF text extraction and private full-text search

## Future Roadmap

### Local Edition

Keep a strong private/local version:

- Local SQLite database
- Private notes and tags
- Local PDF library
- Private full-text PDF search
- Optional AI paper reading over user-provided PDFs
- No redistribution of publisher PDFs

### Web SaaS Edition

Possible public website modules:

- Paper search and DOI redirects
- Paper detail pages
- Professor profiles
- Institution profiles
- Venue profiles
- Topic profiles
- Regional intelligence
- Rising-star ranking
- School strength ranking
- New-paper monitoring
- Weekly IC research digest
- Paid API access later

Recommended public data policy:

```text
SiliconScope provides bibliographic metadata, discovery, analytics, and links to official publisher pages.
It does not host or redistribute copyrighted publisher PDFs.
User-uploaded PDFs are for private reading and personal research management only.
```

### Mobile/PWA Edition

Core idea:

```text
Learn one circuit every day.
```

Daily lesson examples:

- SAR ADC
- Bandgap reference
- Charge-pump PLL
- LDO
- Mixer
- Sense amplifier
- Current mirror
- SerDes CDR
- SRAM bitcell
- Switched-capacitor converter

Each lesson can connect to:

- representative papers
- active professors
- strong institutions
- key equations
- practical design pitfalls
- small quiz and review cards

### Future Public Architecture

When SQLite becomes too limiting:

```text
Frontend: Next.js or static PWA
Backend: FastAPI, NestJS, or Next.js API routes
Database: PostgreSQL
Search: Meilisearch or Typesense
Vector search: pgvector or Qdrant
Storage: Cloudflare R2, S3, or MinIO
Jobs: Redis + BullMQ or Celery
Auth: Auth.js, Clerk, or custom JWT
Payments: Stripe or another payment provider
```

Suggested normalized data model:

```text
papers
authors
institutions
venues
topics
paper_authors
paper_institutions
author_aliases
institution_aliases
author_affiliation_history
paper_sources
pdf_assets
daily_lessons
daily_digests
subscriptions
user_libraries
user_notes
api_keys
update_jobs
```

## Public Deployment Notes

Recommended first deployment:

1. Rent a small VPS with Docker support.
2. Point a domain to Cloudflare.
3. Run `docker compose up -d --build`.
4. Put Cloudflare Tunnel, Caddy, Nginx, or Nginx Proxy Manager in front of port `8750`.
5. Keep `.env` private.
6. Back up `ic_database/ic_papers.sqlite` and `ic_database/pdfs/`.

Vercel is not a good target for the current app because it needs a persistent SQLite file and a long-running Node process. Vercel or Cloudflare Pages becomes reasonable after the frontend and backend are split and metadata is moved to hosted Postgres.

## Project Structure

```text
ic_seeker/                 Web app and local API server
ic_seeker/config/          Environment config
ic_seeker/db/              SQLite schema, migrations, connection, QS seed data
ic_seeker/lib/             Auth, HTTP, identity helpers
ic_seeker/routes/          HTTP route modules
ic_seeker/services/        Search, paper, profile, topic, geo, mentor, classification services
ic_seeker/repositories/    SQLite repository wrapper
ic_seeker/public/          Frontend files
ic_database/               SQLite database, CSV export, PDF folders
scripts/                   Database build/import/repair utilities
```

## Data Policy

SiliconScope stores and displays scholarly metadata for discovery and analysis.

It does not:

- bypass paywalls
- redistribute publisher PDFs
- mass-download copyrighted papers
- expose private user-uploaded PDFs publicly

Users may attach local PDFs only for private personal reading and research management.

## License

No open-source license has been selected yet. Treat the project as private unless a license is added.
