# SiliconScope

SiliconScope is an IC paper search, reading-management, and academic-intelligence platform for integrated-circuit research.

The project has moved to **SiliconScope v2**. The old single-process prototype is no longer the default product path; it remains in the repository only as a historical implementation and migration reference.

## Current Version

Use this version for all new development:

```text
siliconscope-v2/
```

SiliconScope v2 is a frontend/backend separated rebuild:

```text
siliconscope-v2/
  frontend/          React + Vite web app
  backend/           Express + TypeScript API server
  ic_database/       SQLite snapshot and metadata files for v2
  docs/              v2 deployment, methodology, MVP, and roadmap docs
  legacy-public/     public demo / legacy public materials
```

The legacy v1 app is still present:

```text
ic_seeker/
```

Treat `ic_seeker/` as archived. Do not add new product features there unless the change is needed for data migration, comparison, or emergency reference.

The v1 history is documented in:

```text
docs/LEGACY_V1_ARCHIVE.md
```

## What v2 Does Today

- IC paper search over title, abstract, authors, venue, domain, DOI, and source metadata
- Local SQLite-backed API with precomputed snapshot-style endpoints where possible
- AMiner-inspired paper search layout, paper detail rail, and academic-intelligence navigation
- Paper detail pages with DOI/source/PDF status, metadata, citation actions, reading state, and notes foundation
- Author, mentor, institution, topic, venue, and regional-intelligence pages
- Mentor/institution prototype with provisional IC mentor candidates and review workflow
- Venue matrix, data-quality pages, journal ingestion controls, and identity maintenance tools
- IC learning-roadmap page covering circuit design, digital systems, device/manufacturing, EDA/security, and frontier IC directions
- Learning catalog canonical source is `backend/src/data/learning-catalog.ts`
- Local PDF attachment workflow planned around user-provided private PDFs
- Docker-oriented deployment path for private/self-hosted use

The current data still contains heuristic estimates. Author identity, mentor status, institution membership, affiliations, and city-level geography need future IEEE API, faculty-homepage crawler, and manual identity-review pipelines before being treated as fully verified facts.

## Run v2 Locally

Recommended Windows workflow:

```powershell
cd E:\美好暑假
npm start
```

This starts:

```text
Frontend: http://localhost:5173
Backend:  http://127.0.0.1:8751
```

You can also run the v2 script directly:

```powershell
cd E:\美好暑假\siliconscope-v2
.\start-dev.ps1
```

Manual development commands:

```powershell
cd E:\美好暑假\siliconscope-v2\backend
npm run dev
```

```powershell
cd E:\美好暑假\siliconscope-v2\frontend
npm run dev
```

## Build v2

From the repository root:

```powershell
npm run build:v2
```

Or from the v2 folder:

```powershell
cd E:\美好暑假\siliconscope-v2
npm run build
```

This builds both:

```text
siliconscope-v2/backend/dist
siliconscope-v2/frontend/dist
```

## Docker

The default Docker path now targets v2:

```powershell
cd E:\美好暑假
npm run docker:up
```

Equivalent:

```powershell
cd E:\美好暑假\siliconscope-v2
docker compose up --build
```

For a public/private server, put it behind HTTPS with Cloudflare Tunnel, Caddy, Nginx, or Nginx Proxy Manager. Keep `.env` private and back up `siliconscope-v2/ic_database/`.

## Data Policy

SiliconScope provides bibliographic metadata, discovery, analytics, notes, and links to official publisher pages.

It does not:

- bypass paywalls
- mass-download copyrighted papers
- redistribute publisher PDFs
- expose user-uploaded PDFs publicly

User-provided PDFs are for private reading and personal research management only.

## Current Data Direction

Preferred long-term metadata order:

1. IEEE Xplore API for precise IC venue metadata
2. OpenAlex for low-cost broad metadata
3. Crossref for DOI and publisher metadata
4. DBLP for EDA/CAD and architecture-adjacent venues
5. Semantic Scholar for citation and recommendation enrichment
6. AMiner only for targeted author/institution enrichment or selected missing gaps

Google Scholar should stay as an outbound/manual search link. Do not scrape it.

## Important v2 Docs

- [v2 README](siliconscope-v2/README.md)
- [v2 Roadmap](siliconscope-v2/docs/ROADMAP.md)
- [v2 Deployment](siliconscope-v2/docs/DEPLOYMENT.md)
- [v2 Methodology](siliconscope-v2/docs/METHODOLOGY.md)
- [v2 Private MVP](siliconscope-v2/docs/PRIVATE_MVP.md)
- [Legacy v1 Archive](docs/LEGACY_V1_ARCHIVE.md)

## Future Product Direction

Near-term:

- Make v2 the only active product surface
- Move repeated runtime calculations into weekly refreshed database snapshots
- Improve author/institution identity tables and manual overrides
- Connect IEEE Xplore metadata when an API key is available
- Add local PDF text extraction and private full-text search
- Add user progress tracking to the IC learning-roadmap page
- Improve public demo mode with a small safe database subset

Later:

- Professor and institution comparison pages
- Topic trend pages and venue profile pages
- Daily/weekly new-paper digest
- Daily IC circuit learning cards
- PWA/mobile edition
- Public website mode that only exposes metadata, DOI links, abstracts, and analytics

## Legacy Commands

The root scripts still keep v1 commands for reference:

```powershell
npm run legacy:start
npm run legacy:docker:up
```

Use them only when you intentionally need the archived prototype.

## License

No open-source license has been selected yet. Treat the project as private unless a license is added.
