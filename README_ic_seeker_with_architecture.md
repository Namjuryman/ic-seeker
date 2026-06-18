# IC Seeker

**IC Seeker** is a local-first paper search, reading-management, and academic profiling tool for integrated-circuit research.

It is designed for IC students, researchers, and applicants who want to explore papers, professors, institutions, venues, and research topics in analog/mixed-signal IC, RF/mmWave, power management, memory, EDA, devices, and related semiconductor fields.

The current version is a **private MVP**. It focuses on local search, metadata analysis, personal reading workflow, and transparent scoring. It is not yet a public multi-user SaaS platform.

---

## Why IC Seeker?

General academic search engines are powerful, but they are not optimized for IC-specific research questions such as:

- Which professors are active in PMIC, PLL, ADC, RF, memory, or EDA?
- Which institutions publish frequently in ISSCC, JSSC, VLSI, CICC, ASSCC, ESSCIRC, IEDM, TCAD, or TCAS?
- What are the representative papers in a specific IC topic?
- How has a topic evolved over the past few years?
- Which papers are worth reading first for a beginner entering a subfield?
- How can I build a private IC paper library with notes, tags, and local PDFs?

IC Seeker tries to answer these questions with a local database, IC-domain keyword expansion, transparent scoring rules, author/institution profiles, and private reading tools.

---

## Current Dataset

The repository includes a ready-to-use local database under `ic_database/`.

Current snapshot:

- Years: `2016-2026`
- Papers: about `38k`
- Main venues: `ISSCC`, `JSSC`, `VLSI Symposium`, `CICC`, `ASSCC`, `ESSCIRC`, `ESSERC`, `IEDM`, `DAC`, `ICCAD`, `DATE`, `TCAD`, `TCAS-I`, `TCAS-II`, `TVLSI`, `ISCAS`

Included files:

```text
ic_database/ic_papers.sqlite
ic_database/ic_chipseeker.csv
ic_database/summary.json
```

Publisher PDFs are **not** included.

---

## Features

### Paper Search

- Local SQLite database with FTS5 full-text search
- Search over title, abstract, authors, venue, domain, DOI, and source metadata
- IC-domain alias expansion for terms such as `PLL`, `ADC`, `DAC`, `LDO`, `SAR`, `bandgap`, and Chinese equivalents
- Filters by venue, year, domain, rank, local PDF status, and sort method
- Paper detail page with DOI, source link, abstract, score, affiliations, and collection method
- Quick citation copy in IEEE, APA, and BibTeX formats

### Reading Management

- Private admin login
- Favorite papers
- Reading status
- Private notes
- Custom tags
- Local PDF matching workflow
- DOI import through Crossref
- Manual paper import for missing records

### Academic Profiling

- Author/professor leaderboard
- AMiner-style author profile pages: the main area stays focused on the professor's papers, while the right rail shows the professor profile, inferred career stage, yearly trend, collaborators, institutions, and external search links
- Institution leaderboard
- Institution profile pages with yearly output, venues, fields, authors, and representative papers
- Topic intelligence pages with field trends, leaders, institutions, venues, and representative papers
- Regional intelligence map with hoverable countries, all-field strength, institution view, single-topic strength such as PMIC, and regional strength-change summaries
- Local Natural Earth world-country GeoJSON basemap for the regional intelligence map
- CSV export for ChipSeeker-like workflows

### Deployment

- Local Node.js server
- Windows batch launcher
- Docker deployment
- Local persistent database and PDF folders

---

## Quick Start

### Requirements

- Node.js `>=22.5.0`
- Windows PowerShell, macOS shell, or Linux shell

### Run Locally

```bash
copy .env.example .env
notepad .env
npm start
```

Or run the server directly:

```bash
node ./ic_seeker/server.mjs
```

Open:

```text
http://127.0.0.1:8750
```

Log in with `ADMIN_PASSWORD` from `.env`.

Before exposing the app outside your own machine, change:

```text
ADMIN_PASSWORD
COOKIE_SECRET
```

On Windows, you can also double-click:

```text
Start_IC_Seeker.bat
```

---

## Docker

Create `.env` first, then run:

```bash
npm run docker:up
```

The Docker Compose setup mounts `./ic_database` into the container, so your SQLite database, local PDFs, notes, tags, and imported papers remain persistent.

For server deployment, put the app behind an HTTPS reverse proxy. Use `HOST=0.0.0.0` only inside Docker or trusted server environments.

---

## Database Rebuild

The default rebuild uses public metadata sources and writes into `ic_database/`.

```bash
npm run build:database
```

Fast rebuild:

```bash
npm run build:database:fast
```

Equivalent command example:

```bash
node ./scripts/build-ic-database.mjs --years=2016-2026 --max-per-venue-year=500 --max-per-venue=9000 --no-source-backfill
```

Build one venue into an isolated directory for checking:

```bash
node ./scripts/build-ic-database.mjs --out-root=ic_database_checks/isscc --years=2016-2026 --max-per-venue-year=500 --no-source-backfill --venues=ISSCC
```

Merge checked databases:

```bash
node ./scripts/merge-ic-databases.mjs --out=ic_database/ic_papers.sqlite ic_database_checks/isscc/ic_papers.sqlite ic_database_checks/jssc/ic_papers.sqlite
```

---

## IEEE Xplore API

If you have IEEE Xplore API access, set an API key before rebuilding:

```powershell
$env:IEEE_API_KEY="your_ieee_xplore_api_key"
npm run build:database
```

When `IEEE_API_KEY` is available, IEEE metadata is queried first. Without it, the builder falls back to public sources such as OpenAlex and Crossref.

IC Seeker does **not** bulk-download IEEE PDFs and does **not** bypass publisher paywalls.

---

## Local PDF Workflow

Put local PDF files into:

```text
ic_database/pdf_inbox/
```

If the filename contains a DOI or IEEE article number, run:

```bash
npm run import:pdfs
```

Matched files are moved under:

```text
ic_database/pdfs/
```

and attached to the corresponding database rows.

---

## Scoring Method

Paper score is intentionally transparent and rule-based:

```text
quality_score = venue_base + 10 * domain_keyword_hits + citation_boost + recency_boost
```

where:

```text
citation_boost = min(cited_by_count, 300) / 25
recency_boost = max(0, publication_year - 2016) * 0.35
```

Example venue base scores:

```text
ISSCC / JSSC      100
VLSI Symposium     92
CICC               86
IEDM               84
ASSCC              78
ESSCIRC / ESSERC   76
DAC / ICCAD        74
TCAD               70
```

The score is meant for exploration and triage, not as a final judgment of paper quality.

---

## Topic Classification

Topic classification currently uses keyword dictionaries over:

- Title
- Abstract
- Source name
- Concepts
- Domain aliases

The domain with the most keyword hits is selected. If no strong topic signal exists, the paper falls back to `General IC`.

Power-management classification has an additional weighted repair path for PMIC/DC-DC papers. Strong phrases such as `dc-dc`, `dcdc`, `buck`, `boost`, `ldo`, `pmic`, `switched-capacitor`, `charge pump`, `dual-path hybrid`, and `continuous-current-input` are treated as high-confidence power-management signals. Existing databases can be repaired with:

```bash
node ./scripts/repair-power-management-domains.mjs
```

The next classification milestone is to turn topic recognition into a testable subsystem:

- Maintain weighted positive and negative phrase dictionaries per topic.
- Split broad fields into subtopics such as `PMIC/DC-DC`, `ADC`, `PLL`, `Wireline`, `CIM`, `SRAM`, `Device`, and `EDA`.
- Store classifier reason codes on each paper so the UI can explain why a paper was assigned to a topic.
- Add manual override files for well-known papers, professors, and venues.
- Use IEEE metadata as the high-trust source for venue, article number, DOI, abstract, and author list when an API key is available.
- Add regression tests that lock examples such as DC-DC converters into `Power Management`.
- Add optional embedding or LLM review as a second-pass suggestion, not as an opaque replacement for transparent rules.

Example topic groups include:

- Analog and mixed-signal
- RF/mmWave and wireline
- Clocking and frequency generation
- Power management
- Memory and compute-in-memory
- Digital IC and architecture
- EDA/CAD/verification
- Devices/process/3D integration
- Biomedical/sensor/imaging IC
- Security and reliability

---

## Current Limitations

IC Seeker is useful for discovery, but several recognition tasks still need improvement.

### Author Recognition

Current author aggregation is mostly name-based. This may merge different people with the same name or split the same person across different name formats.

Planned improvements:

- Add OpenAlex author IDs
- Add ORCID where available
- Add DBLP IDs for EDA/CAD-related authors
- Use coauthor, affiliation, topic, and venue history for disambiguation
- Add manual merge/split override files for important professors

### Institution Recognition

Institution names are currently based on raw affiliation strings. This may split the same institution into multiple variants.

Planned improvements:

- Normalize names such as `MIT`, `Massachusetts Institute of Technology`, and `M.I.T.`
- Merge campus/lab variants into canonical institutions
- Add country/region and department/lab metadata
- Maintain manual institution override files
- Track historical affiliations separately from current affiliations

### Venue Recognition

Venue metadata can vary across IEEE, OpenAlex, Crossref, and DBLP.

Planned improvements:

- Maintain canonical venue IDs
- Normalize abbreviations and full names
- Handle renamed or combined events such as ESSCIRC/ESSDERC/ESSERC
- Separate proceedings, journal, early-access, front matter, and corrections

### Topic Recognition

Keyword-only classification is transparent but imperfect.

Planned improvements:

- Weighted keyword matching
- Phrase-level matching
- Negative keywords to reduce false positives
- Title/abstract/concept weighting
- Topic hierarchy
- Optional embedding-based topic refinement
- Manual topic overrides for representative papers

### Paper Deduplication

The same paper can appear through DOI, IEEE article number, title variants, early access records, and publisher metadata.

Planned improvements:

- Deduplicate by DOI
- Deduplicate by IEEE article number
- Fuzzy-match title + year + first author
- Preserve source provenance for each merged record
- Keep conflict logs for manual inspection

---

## Project Structure

```text
ic_seeker/                     Web app and local API server
ic_seeker/config/              Environment configuration
ic_seeker/db/                  SQLite connection helper
ic_seeker/lib/                 HTTP/auth utilities
ic_seeker/routes/              Auth, API, static, and request routing
ic_seeker/services/            Admin, paper, profile, search, topic, geo, and methodology services
ic_seeker/repositories/        SQLite repository wrapper
ic_database/                   SQLite database, CSV export, summary, and PDF folders
scripts/build-ic-database.mjs  Metadata collection and database builder
scripts/merge-ic-databases.mjs Database merge utility
scripts/import-local-pdfs.mjs  Local PDF matching utility
scripts/repair-power-management-domains.mjs
docs/                          Methodology, roadmap, and MVP notes
Start_IC_Seeker.bat            Windows local launcher
Build_IC_Database.bat          Windows database build helper
Dockerfile
docker-compose.yml
package.json
```

---

## Data Policy

IC Seeker stores and displays scholarly metadata for discovery and analysis.

It does not:

- bypass paywalls
- redistribute publisher PDFs
- mass-download copyrighted papers
- expose private user-uploaded PDFs publicly

Users may attach local PDFs only for private personal reading and research management.

---

## Architecture Notes and Refactoring Plan

The current implementation is still local-first and easy to run, but the backend has moved beyond the original single-file prototype. The server now has a modular backend skeleton with config, database, lib, route, service, and repository layers. The frontend is still mostly a single vanilla JavaScript app and should be the next major structure cleanup area.

### Current Architecture Status

Current backend structure:

```text
ic_seeker/
  server.mjs
  config/env.mjs
  db/connection.mjs
  lib/auth.mjs
  lib/http.mjs
  routes/
    auth.routes.mjs
    api.routes.mjs
    static.routes.mjs
    index.mjs
  services/
    admin.service.mjs
    paper.service.mjs
    profile.service.mjs
    search.service.mjs
    topic.service.mjs
    geo.service.mjs
    methodology.service.mjs
  repositories/sqlite.repository.mjs
```

Current frontend structure:

```text
ic_seeker/public/
  index.html
  app.js
  styles.css
  js/bootstrap.js
```

This is acceptable for the current private MVP, but long-term development will become harder if all frontend state, routing, rendering, maps, citation tools, profiles, and search interactions remain in one large JavaScript file.

The main risk is not that the app cannot run. The main risk is that future features will become difficult to maintain.

Examples of future features that will increase complexity:

- better author identity recognition
- better institution normalization
- topic trend pages
- professor comparison
- institution comparison
- PDF full-text extraction
- private AI paper reading
- user accounts
- public web deployment
- API rate limiting
- logging and monitoring
- access control for private user data

### Backend Refactoring Direction

The backend is already partway through this layered structure:

```text
ic_seeker/
  server.mjs
  config/
    env.mjs
  db/
    connection.mjs
    migrations.mjs
    schema.sql
  routes/
    auth.routes.mjs
    papers.routes.mjs
    search.routes.mjs
    authors.routes.mjs
    institutions.routes.mjs
    imports.routes.mjs
    admin.routes.mjs
  services/
    search.service.mjs
    paper.service.mjs
    author.service.mjs
    institution.service.mjs
    scoring.service.mjs
    topic.service.mjs
    geo.service.mjs
    pdf.service.mjs
  repositories/
    paper.repo.mjs
    author.repo.mjs
    institution.repo.mjs
    tag.repo.mjs
  lib/
    http.mjs
    cookies.mjs
    validation.mjs
    errors.mjs
```

Current and recommended separation:

```text
routes        HTTP request and response handling
services      business logic and IC-domain logic
repositories  SQL queries and database access
db            connection, schema, and migrations
config        environment variables and filesystem paths
lib           shared utilities
```

This separation is especially important for IC Seeker because the project's core value is not just displaying papers. The core value is the data-recognition layer: author identity, institution normalization, venue mapping, topic classification, scoring, and paper deduplication.

Remaining backend work:

- Add `db/schema.sql` and migration handling
- Move scoring/topic keyword dictionaries into a dedicated `scoring.service.mjs` or `classification.service.mjs`
- Add canonical venue, author, and institution repositories
- Add manual override files for important professors and schools
- Add request logging, API-rate limiting, and production error handling before public deployment

### Frontend Refactoring Direction

The frontend can stay framework-free in the near term, but it should be split into smaller modules.

Suggested structure:

```text
ic_seeker/public/
  index.html
  assets/
  js/
    app.js
    api.js
    state.js
    router.js
    render/
      paperList.js
      paperDetail.js
      authorProfile.js
      institutionProfile.js
      filters.js
      tags.js
    utils/
      dom.js
      format.js
      debounce.js
  css/
    base.css
    layout.css
    components.css
    pages.css
```

Recommended separation:

```text
api.js       all fetch/API calls
state.js     current search state, filters, login state, selected paper
router.js    page switching and URL state
render/      DOM rendering for each page or component
utils/       formatting, debounce, DOM helpers
css/         split by base, layout, components, and pages
```

A frontend framework such as React, Vue, or Next.js is not required for the current private MVP. It becomes more reasonable only when the UI grows into a complex multi-page product with dashboards, comparisons, PDF reading, and multi-user features.

### Data-Layer Architecture

The most important long-term architecture is the data layer.

A mature IC Seeker should look more like this:

```text
Data collection layer
  OpenAlex / Crossref / IEEE / DBLP / Semantic Scholar

Data cleaning layer
  venue normalization
  paper deduplication
  author disambiguation
  institution normalization
  topic classification

Database layer
  papers
  authors
  institutions
  venues
  topics
  paper_authors
  paper_institutions
  author_aliases
  institution_aliases
  paper_sources

Business service layer
  search service
  profile service
  ranking service
  recommendation service

Presentation layer
  paper page
  author page
  institution page
  topic page
  dashboard
```

This structure matters because IC Seeker's value depends on whether the database can answer domain-specific questions reliably:

```text
Who is active in this topic?
Which institution is strong in this subfield?
Which papers are representative?
Is this professor still publishing in this direction?
Which venues matter for this topic?
```

### Recommended Refactoring Order

Backend step 1 has already been completed. Continue with this order:

```text
1. Add db/schema.sql and migrations
2. Move scoring/topic classification into dedicated services
3. Split frontend API, state, router, rendering, and utilities
4. Improve paper deduplication and venue canonical mapping
5. Improve institution normalization
6. Improve author identity disambiguation
7. Add IEEE metadata sync and scheduled new-paper monitoring
8. Add PDF title/text recognition
9. Add public deployment hardening, backups, and monitoring
10. Consider React/Vue/Next only after the feature set becomes too complex for modular vanilla JavaScript
```

The priority is backend modularization first, frontend modularization second, and full framework migration last.

For the current stage, the goal is not to build a perfect enterprise architecture. The goal is to prevent the MVP from turning into a hard-to-maintain codebase while keeping development speed high.

---

## Roadmap

Near-term:

- Improve author identity recognition
- Improve institution normalization
- Improve topic classification
- Import richer IEEE metadata and refresh 2000-current venue coverage
- Add canonical venue mapping
- Add profile override files
- Improve paper deduplication
- Improve dashboard, topic, and regional intelligence pages
- Add Chinese/English interface

Mid-term:

- Local PDF text extraction
- Private full-text search
- Topic trend pages
- Professor comparison
- Institution comparison
- New-paper monitoring
- Weekly IC research digest

Long-term:

- Public web edition
- API layer
- PWA/mobile edition
- User accounts and subscriptions
- Team/lab library
- Private PDF reading with citation-grounded AI Q&A

---

## Positioning

IC Seeker is not trying to replace Google Scholar, IEEE Xplore, Semantic Scholar, or OpenAlex.

Its goal is narrower:

```text
Build an IC-focused academic intelligence tool for discovering papers,
understanding research topics, profiling professors and institutions,
and managing a private reading workflow.
```

For IC beginners, it should help answer:

```text
What should I read?
Who is active in this topic?
Which institutions are strong here?
How is this field moving?
Which papers are worth saving?
```

---

## License

Add a license before public reuse or contribution.

Suggested options:

- MIT License for permissive open-source use
- Apache-2.0 if you want explicit patent language
- Private/no license if the project is not intended for public reuse yet
