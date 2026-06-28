# SiliconScope v2 Module Map

This document records the current product modules and the next high-value improvements. The goal is to keep the private research tool useful today while making the codebase ready for a commercial web product later.

## Current Product Modules

| Module | Status | Why It Matters | Next Hard Step |
| --- | --- | --- | --- |
| Paper Search Workbench | Ready | The core daily workflow: search, inspect, cite, tag, and track papers. | Route public search through the optional Meilisearch adapter, then add IEEE ingestion. |
| Scholar and Institution Profiles | Partial | Turns paper metadata into people/institution intelligence. | Merge IEEE affiliations, ORCID, faculty pages, and manual aliases. |
| Mentor Intelligence | Partial | Builds a mentor/institution view for applicants and students. | Add verified reviews, abuse controls, and career timeline enrichment. |
| Company Intelligence | Partial | Connects IC papers, roadmaps, companies, jobs, and supply chain. | Add job/news/source ingestion and confidence review workflow. |
| Learning and Daily Circuit | Ready | Makes the database useful for self-study, not only search. Current seed catalog has 24 route maps and 35 daily lessons, with a DB-backed content registry, admin sync/editing, normalized projection tables, per-user progress state, and reading queue handoff. | Add type-specific structured editors, spaced review scheduling, route diagrams, and completion analytics. |
| Geo, Topic, and Venue Intelligence | Partial | Helps answer where a field is strong and which venues matter. | Improve city-level geocoding, venue weights, and topic classification. |
| Data Operations | Partial | Keeps weekly updates manageable. | Add scheduled ingestion jobs and snapshot diff reports. |
| Commercial Stack | Partial | Required for public SaaS. Runtime checks, audit logs, independent admin, pull notifications, independent-domain deploy templates, billing catalog, usage ledger, partial quota enforcement, admin plan management, local backup operations, maintenance task records, and optional search-index controls are in place. | Connect PostgreSQL, Redis, object storage, payment checkout/webhooks, email, realtime delivery, and observability. |

## Backend Architecture Direction

The current backend now has explicit adapter boundaries:

- `metadataDb`: paper corpus, FTS, venue, topic, institution, and author-derived reads.
- `appDb`: user, community, company, review, admin, and mutable product data.
- `cacheDb`: computed snapshots and ranking payloads.
- `searchIndexService`: rebuildable Meilisearch read model for papers, companies, and learning routes, with SQLite as the fallback search path.

The SQLite fallback remains intentional for private/local use. Public deployment should move app/business tables first, then snapshots, then full search.

The learning CMS now follows the same direction:

- `learning_content_items` keeps the mutable source payload and publication state.
- `learning_routes`, `learning_lessons`, `learning_route_families`, `learning_foundations`, `learning_route_family_members`, and `learning_terms` provide a queryable projection layer.
- `learning_progress` stores user-specific roadmap/lesson state and related-paper queue handoff.
- Future Postgres migration can move these tables without rewriting the public learning pages, because the service boundary already hides the storage model.

## Suggested New Modules

### Operations Timeline

Track each weekly ingestion run:

- started/finished timestamps
- source venue/year
- imported/updated/skipped counts
- duplicate and low-confidence samples
- snapshot refresh result

### Source Confidence Review

Give users an admin queue for questionable data:

- author/institution alias conflicts
- company identity conflicts
- papers with missing affiliations
- topic classification disagreements
- venue/rank overrides

### Unified Entity Search

One search box should eventually search:

- papers
- authors
- institutions
- companies
- roadmaps
- venues
- topics

This belongs in Meilisearch first; OpenSearch can wait until scale demands it. The first Meilisearch adapter exists for papers, companies, and learning routes; the remaining work is to route the public search UI through it and add authors, institutions, venues, and topics.

### Personal Workspace

Make the private workflow stronger before public SaaS:

- saved searches
- weekly watchlist updates
- reading queue with status transitions
- notes and tags export
- citation snippets
- local PDF inbox and matching

### Commercial Readiness

Only after the above is stable:

- PostgreSQL app store
- Redis cache and queue
- object storage for PDFs/images
- OAuth login
- Stripe/Paddle/subscription billing
- email notification
- Sentry/Prometheus/Grafana

## Product Principle

Do not hide uncertain data. Mark it as inferred, show confidence, and give the admin a way to correct it. SiliconScope should feel like a research cockpit, not a magic ranking black box.
