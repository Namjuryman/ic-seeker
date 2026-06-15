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
- Author profile pages with papers, yearly trend, venue/rank distribution, collaborators, and institutions
- Institution leaderboard
- Institution profile pages with yearly output, venues, fields, authors, and representative papers
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
ic_database/                   SQLite database, CSV export, summary, and PDF folders
scripts/build-ic-database.mjs  Metadata collection and database builder
scripts/merge-ic-databases.mjs Database merge utility
scripts/import-local-pdfs.mjs  Local PDF matching utility
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

The current implementation is intentionally compact. It is suitable for a private MVP because it keeps the web app, local API server, SQLite database, and personal reading workflow easy to run and easy to modify.

However, as IC Seeker grows beyond the private-MVP stage, both the backend and frontend architecture should be gradually modularized.

### Current Architecture Status

The current structure is good for fast iteration:

```text
ic_seeker/
  server.mjs        Local API server and backend logic
  index.html        Main web page
  app.js            Frontend interaction logic
  styles.css        UI styles
```

This is acceptable for a local-first prototype, but long-term development will become harder if all backend logic remains in one server file and all frontend state/rendering remains in one large JavaScript file.

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

The backend should gradually move from a single-file server toward a layered structure:

```text
ic_seeker/
  server.mjs
  config/
    env.mjs
    paths.mjs
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

Recommended separation:

```text
routes        HTTP request and response handling
services      business logic and IC-domain logic
repositories  SQL queries and database access
db            connection, schema, and migrations
config        environment variables and filesystem paths
lib           shared utilities
```

This separation is especially important for IC Seeker because the project's core value is not just displaying papers. The core value is the data-recognition layer: author identity, institution normalization, venue mapping, topic classification, scoring, and paper deduplication.

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

Do not rewrite everything at once. The recommended order is:

```text
1. Split backend services and repositories
2. Move scoring, topic classification, author logic, and institution logic out of server.mjs
3. Add db/schema.sql and migration handling
4. Split frontend API, state, router, rendering, and utilities
5. Improve paper deduplication and venue canonical mapping
6. Improve institution normalization
7. Improve author identity disambiguation
8. Improve weighted topic classification
9. Add PDF title/text recognition
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
- Add canonical venue mapping
- Add profile override files
- Improve paper deduplication
- Add better dashboard and topic pages
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
