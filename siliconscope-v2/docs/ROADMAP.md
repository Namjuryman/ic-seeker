# IC Seeker Roadmap

This document collects product ideas for turning IC Seeker from a local paper database into an IC-focused academic intelligence platform.

## Product Direction

IC Seeker should focus on integrated circuits and semiconductor research instead of becoming a generic academic search engine.

Core positioning:

```text
An IC scholar intelligence platform for papers, professors, institutions, topics, trends, and daily circuit learning.
```

## Current v2 Status

SiliconScope v2 is now the canonical branch of the product. The old single-process prototype is retained only as historical context.

Implemented in v2:

- frontend/backend separated app with Express API and React/Vite frontend
- local SQLite metadata search and paper detail workflow
- paper, author, institution, topic, venue, geo, and mentor/institution pages
- right-rail paper detail interaction model
- local PDF inbox matching workflow
- venue policy and hidden/downweighted broad-journal handling
- learning workspace with `/learning`, roadmap detail pages, today's circuit, lesson pages, and related-paper suggestions
- learning seed catalog for analog, PMIC, ADC/DAC, PLL, RF/mmWave, SerDes, memory/CIM, EDA/CAD/AI, and digital/accelerator routes

Still provisional:

- author identity disambiguation is mostly name-based
- mentor-vs-student filtering is heuristic
- institution affiliation membership is inferred from metadata and needs verification
- city-level geo hotspots are illustrative until institution geocoding is connected
- learning lessons are structured placeholders, not polished course content

The product can have three editions:

- Local edition: personal database, local search, local PDF library, private notes.
- Web SaaS edition: hosted database, professor/institution profiles, alerts, API access, paid features.
- Mobile/PWA edition: daily circuit learning, new-paper digest, topic subscriptions, lightweight search.

## Compliance Principles

The public service should provide discovery and metadata, not copyrighted PDFs.

Public pages may show:

- Title
- Authors
- Affiliations
- Venue
- Year
- DOI
- Abstract or short description
- Keywords
- Topic classification
- Link to official publisher or DOI page

Public pages should not redistribute paywalled publisher PDFs.

Suggested public policy text:

```text
We provide bibliographic metadata, discovery, analytics, and links to official publisher pages.
We do not host or redistribute copyrighted publisher PDFs.
Users may upload documents only for private reading and personal research management.
```

Chinese version:

```text
本站提供论文元数据、检索、分析和官方 DOI 跳转服务，不提供受版权保护论文 PDF 的公开分发。
用户上传的 PDF 仅用于个人私有阅读与文献管理。
```

## Web SaaS

Potential public website modules:

- Paper search
- Paper detail pages
- DOI and official-source redirect
- Professor profiles
- Institution profiles
- Venue profiles
- Topic profiles
- Collaboration graph
- Citation graph
- Topic evolution
- Rising-star ranking
- School strength ranking
- New-paper monitoring
- Weekly research digest

Suggested domain split:

```text
www.example.com       Web frontend
api.example.com       Backend API
app.example.com       PWA or app landing
data.example.com      Static data or CDN
```

## API Layer

The API should become the shared backend for web, mobile, and third-party integrations.

Suggested endpoints:

```text
GET  /api/papers/search
GET  /api/papers/:id
GET  /api/authors/:id
GET  /api/institutions/:id
GET  /api/venues/:id
GET  /api/topics/:id
GET  /api/trends
GET  /api/daily-circuit
GET  /api/digests/latest
POST /api/pdf/import
POST /api/papers/:id/read
POST /api/ai/summarize
POST /api/ai/qa
POST /api/user/library
POST /api/user/follows
```

For "paper reading" features:

1. Accept user-uploaded private PDFs.
2. Parse PDF text.
3. Split text into chunks with page references.
4. Build full-text and vector indexes.
5. Answer questions with citations to page/chunk references.
6. Keep publisher PDFs private to the uploading user.

## Daily Circuit Learning

The mobile product can be built around:

```text
Learn one circuit every day.
```

Example daily topics:

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

Each daily lesson can include:

- One core circuit diagram
- Three-minute intuition
- Key equations
- Typical metrics
- Common design pitfalls
- Representative papers
- Recommended professors and institutions
- Small quiz
- Save and review

The lesson should connect to the database:

```text
Daily topic: SAR ADC
-> recent ISSCC/JSSC/VLSI SAR ADC papers
-> professors active in SAR ADC
-> institutions strong in SAR ADC
-> suggested keywords
```

Current v2 implementation:

- `/learning` shows the route library and today's circuit entry.
- `/learning/roadmaps/:slug` shows route stages, prerequisites, practice projects, linked SiliconScope searches, and related local papers.
- `/learning/today` chooses a deterministic daily lesson from the local seed catalog.
- `/learning/lessons/:lessonId` shows a structured lesson shell and related papers.
- The route catalog now has 24 routes and 35 daily lessons. The first expansion split broad IC buckets into finer routes for ADC/DAC, PLL/clocking, SerDes, image/display IC, analog layout/PEX, digital backend/signoff, equipment/materials, and automotive reliability/safety.
- Learning content now has a database-backed registry (`learning_content_items`). Public APIs prefer published database rows and fall back to the TypeScript seed catalog; the independent admin console can sync seed content into the registry and inspect content health.

Next learning milestones:

- Turn the learning registry into a real structured editor for route nodes, prerequisites, equations, paper lists, and design-project prompts.
- Add route-level representative diagrams: signal chain blocks, converter timing sketches, PLL noise-transfer views, SerDes eye/equalization views, floorplan/signoff flows, and process/packaging stack diagrams.
- Add user progress, review queue, saved route plans, and lesson completion state.
- Add manually authored circuit diagrams and short Chinese/English explanations.
- Add quizzes and design-check prompts.
- Connect route pages to company intelligence so each route can show typical roles, employers, tools, and interview topics.
- Connect weekly database refreshes so each route can recommend newly indexed papers.
- Keep Fudan-specific content from external guides out of the default SiliconScope route pages.

## New Paper Monitoring

A server job should run daily or weekly.

Pipeline:

```text
Scheduled job
-> query IEEE/OpenAlex/Crossref/arXiv
-> normalize metadata
-> deduplicate by DOI/source ID/title
-> classify topic
-> verify venue/year
-> update database
-> generate daily digest
-> notify subscribed users
```

Users can follow:

- Venues, such as JSSC, ISSCC, VLSI, CICC
- Topics, such as ADC, PLL, RF, Memory, EDA, Power
- Professors
- Institutions
- Companies
- Keywords

Example notification:

```text
Today 12 new JSSC papers were added.
3 match your ADC watchlist.
1 is from Tsinghua University.
2 are from University of Macau.
```

## Low-Cost Data Strategy

AMiner is useful for author and institution intelligence, but its `venue/paper/relation` endpoint is a paid/credit-consuming interface. Do not use AMiner as the default full-corpus crawler.

Recommended source split:

- OpenAlex: main free/low-cost scholarly metadata base for 2000-current coverage.
- Crossref: DOI, publisher metadata, publication dates, and duplicate correction.
- IEEE Xplore API: IC-focused precision layer for ISSCC, JSSC, VLSI, CICC, ASSCC, ESSCIRC, IEDM, TCAS, TVLSI, and related IEEE venues.
- DBLP: supplement DAC, ICCAD, DATE, EDA, CAD, and architecture-adjacent conference records.
- Semantic Scholar: citation graph, related papers, and recommendation features when needed.
- AMiner: on-demand enrichment only, such as professor profiles, institution pages, collaborator networks, and manually selected missing venue-year gaps.
- Google Scholar: outbound/manual search links only; do not scrape it.

IEEE Xplore should become the preferred IC metadata refinement source once an API key is available. It can provide title, authors, publication year, venue, DOI, abstract, IEEE article number, abstract URL, author URL, and other publication metadata. It should not be used to redistribute full text or publisher PDFs.

Cost guardrails:

- AMiner import commands should be opt-in and scoped by venue/year.
- Never run AMiner over all venues and all years by default.
- Add a dry-run or budget preview before paid API calls.
- Cache every successful AMiner response locally.
- Skip AMiner calls when a DOI/source ID/title-year record already exists.
- Use AMiner only after OpenAlex, Crossref, IEEE, and DBLP have been tried.

Suggested low-cost ingestion order:

```text
OpenAlex + Crossref baseline
-> IEEE Xplore precision backfill for IC venues
-> DBLP backfill for EDA/CAD venues
-> local deduplication by DOI, IEEE article number, title, year, venue
-> AMiner targeted enrichment for selected authors, institutions, and gaps
-> Semantic Scholar citation/recommendation enrichment
```

For public SaaS operation:

- Store and show metadata only: DOI, title, authors, abstract, venue, year, tags, and official links.
- Link users to IEEE/DOI/publisher pages for paper access.
- Allow private user-uploaded PDFs for personal reading features only.
- Keep API keys and paid-token usage server-side with per-job budgets.

## Mentor Affiliation Verification

The current mentor/institution review page should be treated as an inferred prototype, not a verified faculty directory.

Current behavior:

- Institution strength is ranked by local IC paper metadata.
- Mentor membership is inferred from author names and affiliation strings in indexed papers.
- Mentor-vs-student status is inferred from publication accumulation, S+ count, career span, and score; low-evidence authors are filtered as likely students/collaborators by default.
- This is useful for navigation and early product testing, but it can confuse collaborators, visiting students, branch campuses, shared labs, renamed institutes, and historical affiliation moves.

Future verification direction:

- Use IEEE Xplore API records to improve paper-level author, affiliation, article number, DOI, abstract, venue, and year precision.
- Crawl university, college, department, and lab homepages to confirm each professor's current institution, department, title, lab, homepage, research direction, and profile photo.
- Add a historical affiliation table so professor moves can be shown as a career timeline instead of overwriting old institutions.
- Confirm whether a person is faculty, postdoc, PhD student, visiting student, industry collaborator, or alumni before enabling mentor-style reviews.
- Keep evidence provenance for every affiliation assertion, such as `paper metadata`, `IEEE author page`, `faculty homepage`, `lab homepage`, or `manual review`.
- Separate `current faculty/mentor membership` from `collaborator appeared on papers with this institution`.
- Add confidence scores and manual override files for high-impact professors and institutions.

Suggested schema additions:

```text
author_profiles
  id
  display_name
  normalized_name
  current_institution_id
  department
  title
  homepage
  photo_url
  profile_source
  verification_status
  updated_at

author_affiliation_history
  author_id
  institution_id
  role_or_title
  start_year
  end_year
  evidence_url
  evidence_source
  confidence

author_institution_evidence
  author_id
  institution_id
  paper_id
  source
  raw_affiliation
  evidence_url
  confidence
```

Until that pipeline exists, UI text should keep using words such as `inferred`, `provisional`, or `metadata-based` for mentor-school membership.

## Regional And City Intelligence

The current Geo Intelligence page is a product prototype:

- country boundaries come from the local Natural Earth basemap
- map labels show country codes only
- exact numeric values are moved to country share, ranking, and detail panels
- city-level rays are schematic hotspots, not verified city-level statistics yet

The long-term goal is a real IC geography database, not just country-level ranking. The map should eventually show regional density inside large countries, such as US West Coast vs East Coast, Texas, Beijing/Shanghai/Yangtze River Delta/Pearl River Delta, Hsinchu/Taipei, Seoul/Daejeon, Tokyo/Osaka/Sendai, Leuven/Eindhoven/Delft, and other IC clusters.

Required data upgrades:

- Canonicalize institution names, including abbreviations, university branches, corporate labs, and translated names.
- Add institution aliases, for example `UM`, `University of Macau`, `Universidade de Macau`, and lab-specific variants.
- Add institution-to-city, city-to-region, and city-to-country mappings.
- Store geocoding confidence scores so uncertain affiliations do not become hard rankings.
- Distinguish author affiliation, publisher address, sponsor/company mention, and paper text mentions.
- Keep Hong Kong, Macau, Taiwan, Singapore, and branch-campus records auditable because small-region counts are easy to inflate.
- Add QA reports for suspicious jumps, for example a small region suddenly receiving hundreds of papers from affiliation-string false positives.

Suggested schema additions:

```text
institution_aliases
  alias
  institution_id
  confidence
  source

institutions
  id
  canonical_name
  homepage
  country_code
  region_name
  city_name
  latitude
  longitude
  geocode_confidence

paper_institutions
  paper_id
  institution_id
  raw_affiliation
  confidence
```

Suggested Geo pipeline:

```text
raw affiliations
-> institution alias matching
-> canonical institution
-> city/region/country geocoding
-> confidence filtering
-> city-level aggregation
-> country-level aggregation
-> anomaly report
-> Geo Intelligence API
```

UI roadmap:

- Keep the world map clean: no large numbers directly on dense regions.
- Use city dots, vertical rays, or heat contours for intra-country density.
- Show exact values in side panels and charts, not on top of the map.
- Let users switch between country, city, institution, and topic heatmap modes.
- Clicking a country should show top institutions, top cities, yearly trend, and topic mix.
- Clicking an institution should open the institution profile.
- Add a data-quality badge when a country's city split is estimated rather than verified.

## Author And Institution Profiles

The professor profile can take inspiration from AMiner-style pages, but stay IC-focused.

Author profile fields:

- Photo
- Homepage
- Google Scholar
- DBLP
- ORCID
- OpenAlex author ID
- Current affiliation
- Research topics
- Annual publication trend
- Venue distribution
- S+/S/A/B counts
- Representative papers
- Recent activity
- Collaborators
- Student/advisor relationships when manually verified
- Similar authors

Institution profile fields:

- Logo
- Campus or lab image
- Website
- Country/region
- IC-related departments and labs
- Total papers
- S+/S/A/B counts
- Recent five-year trend
- Strong topics
- Core professors
- Collaborating institutions
- Representative papers

Manual profile overrides should live in files such as:

```text
profiles/authors.json
profiles/institutions.json
assets/authors/
assets/institutions/
```

## Chinese Interface

Add English and Chinese language modes.

Chinese topic names:

- Analog and mixed-signal: 模拟与混合信号
- RF/mmWave and wireline: 射频/毫米波/高速线缆
- Clocking and frequency generation: 时钟与频率综合
- Power management: 电源管理
- Memory and compute-in-memory: 存储器与存内计算
- Digital IC and architecture: 数字 IC 与体系结构
- EDA/CAD/verification: EDA/CAD/验证
- Devices/process/3D integration: 器件/工艺/封装
- Biomedical/sensor/imaging IC: 生物医疗/传感/成像 IC
- Security and reliability: 安全与可靠性

Search should support Chinese aliases:

```text
锁相环 -> PLL
模数转换器 -> ADC
数模转换器 -> DAC
带隙基准 -> bandgap
低压差稳压器 -> LDO
逐次逼近 -> SAR
```

## Interface Upgrade

The current UI is a functional prototype. Product-grade UI ideas:

- Better dashboard with database coverage, newest papers, hot topics, top authors, and top institutions.
- Compact filter sidebar.
- Table/card view switch for papers.
- Author profile pages with charts.
- Institution profile pages with logos and strength charts.
- Venue coverage heatmap.
- Topic trend charts.
- Professor-vs-professor comparison.
- Institution-vs-institution comparison.
- Dark mode.
- Saved papers and reading status.
- Mobile-friendly PWA layout.

Good chart options:

- ECharts
- Observable Plot
- Recharts

## Server Architecture

Early SaaS stack:

```text
Frontend: Next.js
Backend API: FastAPI, NestJS, or Next.js API routes
Database: PostgreSQL
Search: Meilisearch or Typesense
Vector search: pgvector or Qdrant
Object storage: Cloudflare R2, S3, or MinIO
Jobs: Redis + BullMQ, or Celery
Auth: Auth.js, Clerk, or custom JWT
Payments: Stripe, Lemon Squeezy, or regional payment provider
```

Suggested schema:

```text
papers
authors
institutions
venues
topics
paper_authors
author_institutions
citations
pdf_assets
daily_lessons
daily_digests
subscriptions
user_follows
user_libraries
user_notes
api_keys
update_jobs
```

## Monetization

Free:

- Basic paper search
- Daily circuit lesson
- DOI redirects
- Limited alerts

Pro:

- Advanced filters
- Professor and institution deep profiles
- Trend analysis
- Custom alerts
- AI-generated Chinese summaries
- Weekly research report
- Private library

Lab/team:

- Shared private library
- Group notes
- Private PDF search
- Topic monitoring
- Exportable reports
- Team admin

API/data:

- Paid API keys
- Higher request limits
- Custom data exports
- Institutional integrations

## Suggested MVP Order

1. Done: split local code into a cleaner API and frontend structure.
2. Done: add a first learning roadmap and daily-circuit workspace.
3. Next: add automatic database download/update, so users do not need to pull large database files through Git.
4. Next: precompute heavy rankings, mentor/institution cards, venue matrices, and geo aggregates during weekly refresh jobs.
5. Next: add local PDF library with text extraction and private full-text search.
6. Next: move learning roadmaps and lessons into editable database tables.
7. Next: add topic/venue/professor/institution follow system.
8. Next: add scheduled metadata update jobs.
9. Next: add Chinese/English UI coverage for every v2 page.
10. Next: add author and institution profile overrides with photos/logos/homepages.
11. Next: deploy web SaaS to a server and domain.
12. Next: build PWA first, then consider native mobile apps.
