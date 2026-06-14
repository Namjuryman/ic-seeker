# IC Seeker

IC Seeker is a private, ChipSeeker-style paper search and reading-management tool for integrated-circuit research.

It builds a local SQLite database from public scholarly metadata, provides full-text and lightweight semantic search, ranks papers by configurable venue/domain rules, and profiles authors and institutions by publication strength. The current web app is designed as a private MVP, not a public multi-user SaaS.

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

## Features

- Local SQLite + FTS5 search over title, abstract, authors, venue, domain, and DOI
- Private admin login with a signed HTTP-only cookie
- Lightweight semantic search through IC-domain alias expansion
- Venue, domain, rank, year, local-PDF, and sort filters
- Paper detail view with DOI, source link, PDF link status, score, affiliations, and collection method
- Paper import by DOI through Crossref metadata
- Manual paper import for missing records
- Favorites, reading status, private notes, and tags
- Backend API-key storage with masked display
- Author/professor leaderboard
- Clickable author profile with papers, venue/rank statistics, yearly trend, collaborators, institutions, and external Scholar search
- Institution leaderboard for school/lab strength
- Clickable institution profile with yearly output, venues, fields, authors, and papers
- Local PDF inbox workflow for matching downloaded PDFs by DOI or IEEE article number
- CSV export compatible with ChipSeeker-like workflows
- Mobile-friendly web layout
- Docker deployment

## Quick Start

Requirements:

- Node.js `>=22.5.0`
- Windows PowerShell, macOS shell, or Linux shell

Run:

```powershell
copy .env.example .env
notepad .env
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

Log in with `ADMIN_PASSWORD` from `.env`. Change the default password and `COOKIE_SECRET` before exposing the site outside your own machine.

On Windows, you can also double-click:

```text
Start_IC_Seeker.bat
```

## Docker

Create `.env` first, then run:

```powershell
npm run docker:up
```

The Compose setup mounts `./ic_database` into the container so your SQLite database, PDF inbox, notes, tags, and imports persist locally.

For server deployment, put the app behind an HTTPS reverse proxy and keep `HOST=0.0.0.0` only inside Docker or trusted server environments.

## Private MVP Workflow

- Search papers with the main search bar. Keep `Semantic` enabled to expand common IC terms such as PLL, ADC, LDO, and their Chinese equivalents.
- Open a paper detail page to save favorite status, reading status, tags, and notes.
- Import missing papers by DOI from the sidebar. This stores metadata only and links to the DOI/source.
- Use manual import for papers that are missing from public metadata.
- Store optional service keys from the API-key panel. Values are masked in the UI.

More detail is in [docs/PRIVATE_MVP.md](docs/PRIVATE_MVP.md).

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

Paper score is intentionally transparent:

```text
quality_score = venue_base + 10 * domain_keyword_hits + citation_boost + recency_boost
```

- `citation_boost = min(cited_by_count, 300) / 25`
- `recency_boost = max(0, publication_year - 2016) * 0.35`
- Venue base examples: `ISSCC/JSSC = 100`, `VLSI = 92`, `CICC = 86`, `IEDM = 84`, `ASSCC = 78`, `ESSCIRC/ESSERC = 76`, `DAC/ICCAD = 74`, `TCAD = 70`

Classification uses keyword dictionaries over title, abstract, source name, and concepts. The domain with the most keyword hits wins; otherwise papers fall back to `General IC`.

## Caveats

- Metadata quality depends on IEEE/OpenAlex/Crossref coverage and naming consistency.
- Author identity is currently name-based; serious professor ranking should add ORCID/institution disambiguation.
- Institution names are raw affiliation strings and may need normalization.
- Some venue-year counts differ from IEEE Xplore because of early access, front matter, corrections, duplicate indexing, or source-specific metadata policy.
- `ESSCIRC 2020` was cancelled due to COVID-19; 2024+ European solid-state events may appear under `ESSERC`/combined naming.

## Project Structure

```text
ic_seeker/                 Web app and local API server
ic_database/               Ready-to-use SQLite, CSV, summary, and PDF folders
scripts/build-ic-database.mjs
scripts/merge-ic-databases.mjs
scripts/import-local-pdfs.mjs
Start_IC_Seeker.bat
Build_IC_Database.bat
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
