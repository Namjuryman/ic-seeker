# Data Layer Migration Plan

SiliconScope v2 currently uses one local SQLite database for both paper metadata and user/business data. That is convenient for a private MVP, but it should be split before the product becomes a public multi-user service.

## Target Split

| Data group | Current storage | Target storage | Reason |
| --- | --- | --- | --- |
| Paper metadata: papers, FTS, DOI, venue, domain, affiliations | SQLite | Keep SQLite as import/cache first; later mirror to Postgres/Search | Large mostly-read corpus; current tooling depends on SQLite FTS |
| User accounts and auth | SQLite | PostgreSQL | Multi-user writes, constraints, backups, SaaS readiness |
| Private paper state: favorites, reading status, notes, tags | SQLite | PostgreSQL | User-specific mutable data |
| Community: comments, mentor reviews, notifications, content reports, moderation logs | SQLite | PostgreSQL | Public writes, moderation auditability, user operations |
| Companies and aliases | SQLite | PostgreSQL | Business/admin data; needs auditing and enrichment |
| API keys and admin settings | SQLite | PostgreSQL plus secret manager later | Operational state should not live in metadata DB |
| Computed snapshots/read models | SQLite | Redis cache plus Postgres snapshot registry | Avoid expensive recompute; allow invalidation |
| Search index | SQLite FTS plus optional Meilisearch adapter | Meilisearch first, OpenSearch later if needed | Better relevance and cross-entity search; rebuildable read model |
| Files: avatars, PDFs, company logos, attachments | Local folders | S3-compatible object storage | Public deployment and backups |

## Migration Phases

### Phase 1: Boundaries without behavior change

- Keep `backend/src/db/connection.ts` as the SQLite metadata connection.
- Add `backend/src/db/app-db.ts` as the app/business data adapter.
- Add runtime topology reporting so deployment can show which commercial services are configured.
- Document which tables are metadata versus app/business data.
- Do not add Postgres runtime dependency until a real adapter is implemented.

Current Phase 1 status:

- `appDb` exists and currently points to SQLite.
- `discussion.service.ts`, `review.service.ts`, and `moderation.service.ts` use `appDb`.
- `reading-queue.service.ts` now writes/reads reading status through `appDb` and enriches papers through the metadata SQLite connection.
- `watchlist.service.ts` now writes/reads watchlist records through `appSqlite` and enriches papers/companies through the metadata SQLite connection.
- `paper.service.ts` now keeps paper metadata/import/FTS work on `metadataDb`, while favorites, notes, tags, and reading status use `appDb`.
- `search.service.ts` now keeps paper search on `metadataDb`, while favorite/tag/status filters and row enrichment use `appDb`.
- `stats.service.ts` now keeps corpus statistics on `metadataDb`, while user stats, tags, and API-key settings use `appDb`.
- `auth.service.ts` now ensures the password-login admin user through `appDb`; local private mode keeps the historical `userId = 0` behavior.
- `company.service.ts` now keeps company records, sources, field facts, aliases, and company watchlist records in `appSqlite`, while related-paper matching stays on metadata SQLite.
- `identity-admin.service.ts`, `author-identity.service.ts`, and `institution-identity.service.ts` now use `appDb` for manual alias reads/writes.
- `profile.service.ts`, `mentor.service.ts`, `author-compare.service.ts`, and `institution-compare.service.ts` are explicitly metadata-first because they derive live corpus-based profile lists from the paper corpus.
- `mentor-compare.service.ts` reads mentor-review aggregates through `appDb`.
- `snapshot.service.ts` now uses `cacheDb`/`cacheSqlite`, a cache adapter that falls back to SQLite today and leaves a Redis path open.
- `search-index.service.ts` now provides an optional Meilisearch adapter for `papers`, `companies`, and `learning_routes`; SQLite search remains the fallback until public search is routed through it.

### Phase 2: App database adapter

- Add `backend/src/db/app-db.ts` with a switch:
  - `sqlite` fallback for private mode.
  - `postgres` when `POSTGRES_URL` is configured and migration is enabled.
- Create Postgres schema for app/business tables.
- Keep paper metadata reads on SQLite during this phase.

### Phase 3: Migrate user/business services

Move these services first:

- `auth`
- `watchlist.service`
- `reading-queue.service`
- `discussion.service`
- `review.service`
- `moderation.service`
- `company.service`
- `identity-admin.service`
- `paper.service` user-state methods only: favorites, notes, tags, reading status

Do not migrate heavy paper-search paths until the search engine is ready.

Recommended service migration order:

1. Community/moderation services that only touch app tables. Done for comments, reviews, and moderation queue.
2. Reading queue and watchlist after enrichment reads are split from writes. Initial split done.
3. Paper user-state methods and search enrichment. Done for `paper.service.ts`, `search.service.ts`, and `stats.service.ts`.
4. Auth and user profile. Initial password-admin user now uses `appDb`; full multi-user auth is still pending.
5. Company/admin data. Initial company service and identity alias split done.
6. Search and snapshot-backed profile lists only after Meilisearch/Redis are introduced. Initial Meilisearch indexing now exists for papers, companies, and learning routes.

## Current Adapter Usage

| Service | Metadata DB | App DB | Notes |
| --- | --- | --- | --- |
| `discussion.service.ts` | No | Yes | Comments and public list use `appDb`; currently joins `papers` while SQLite fallback is active. |
| `review.service.ts` | No | Yes | Mentor reviews use `appDb`. |
| `moderation.service.ts` | Partial | Yes | Moderation uses `appDb`; reported comment queue still joins paper titles while SQLite fallback is active. |
| `reading-queue.service.ts` | Yes | Yes | Reading status in `appDb`; paper enrichment in metadata DB. |
| `watchlist.service.ts` | Yes | Yes | Watchlist records in `appDb`; paper/company enrichment in metadata DB. |
| `paper.service.ts` | Yes | Yes | Metadata import/FTS in metadata DB; user state in `appDb`. |
| `search.service.ts` | Yes | Yes | Corpus search in metadata DB; user-state filters/enrichment in `appDb`. |
| `stats.service.ts` | Yes | Yes | Corpus stats in metadata DB; user settings/state in `appDb`. |
| `auth.service.ts` | No | Yes | Password-mode admin user is stored through `appDb`. |
| `company.service.ts` | Yes | Yes | Company data and company watchlist use `appSqlite`; related-paper matching uses metadata SQLite. |
| `identity-admin.service.ts` | No | Yes | Manual alias management uses `appDb`. |
| `author-identity.service.ts` | No | Yes | Manual author alias reads use `appDb`. |
| `institution-identity.service.ts` | No | Yes | Manual institution alias reads use `appDb`; builtin aliases remain in code. |
| `profile.service.ts` | Yes | No | Author/institution profile lists are corpus-derived and use `metadataDb`. |
| `mentor.service.ts` | Yes | No | Mentor/institution candidate inference is corpus-derived and uses `metadataDb`. |
| `author-compare.service.ts` | Yes | No | Author comparison is corpus-derived and uses `metadataDb`. |
| `institution-compare.service.ts` | Yes | No | Institution comparison is corpus-derived and uses `metadataDb`. |
| `mentor-compare.service.ts` | No | Yes | Anonymous mentor-review comparison uses `appDb`. |
| `snapshot.service.ts` | No | Cache | Computed snapshots use `cacheDb`/`cacheSqlite`; currently SQLite fallback, Redis planned. |
| `search-index.service.ts` | Yes | Yes | Rebuildable Meilisearch read model for corpus, company, and learning-route search; disabled unless configured. |
| `topic-report.service.ts` | Yes | Yes | Topic facts come from metadata services; related companies come from `appDb`. |

## Remaining Split Work

- Profile, mentor, and compare services now have explicit adapter names, but they still do live paper-corpus aggregation. The next performance step is to read most of these pages from weekly computed snapshots.
- `company.service.ts` still uses raw SQLite for app data. It has a clear adapter boundary now, but true Postgres support will need query builders or a repository interface.
- `discussion.service.ts` and `moderation.service.ts` still join paper titles while appDb falls back to SQLite. Before real Postgres mode, these joins must be split into app rows plus metadata enrichment.
- `snapshot.service.ts` still stores snapshot payloads in SQLite fallback. A Redis implementation should keep the same `cacheDb` service boundary or introduce a typed `SnapshotStore` interface.

### Phase 4: Search engine and cache

- Index `papers`, `companies`, and `roadmaps` in Meilisearch. Initial adapter and admin rebuild controls exist.
- Add `authors`, `institutions`, `venues`, and `topics` after identity resolution is stronger.
- Route public search through the search adapter when Meilisearch is healthy, while preserving SQLite fallback for local/private mode.
- Store expensive profile/snapshot payloads in Redis or Postgres-backed snapshot tables.
- Keep weekly rebuild scripts idempotent.

### Recommended Advanced Schema Shape

Use source tables for truth, projection tables for fast reads, and rebuildable indexes for search.

| Layer | Example tables/models | Update cadence |
| --- | --- | --- |
| Raw import | `paper_import_runs`, `paper_sources`, `raw_provider_payloads` | Per crawl/import |
| Canonical metadata | `papers`, `paper_authors`, `paper_institutions`, `venues`, `doi_aliases` | Per import with upserts |
| Manual curation | `author_aliases`, `institution_aliases`, `venue_overrides`, `company_aliases` | Admin edits |
| Read projections | `author_profile_snapshots`, `institution_profile_snapshots`, `geo_density_snapshots`, `learning_routes` | Weekly or on-demand |
| Search indexes | Meilisearch `papers`, `companies`, `learning_routes`, later `authors` and `institutions` | After projections refresh |
| User/product state | `users`, `notes`, `favorites`, `comments`, `reviews`, `billing_events` | Realtime writes |

This avoids making every page run live joins across the full corpus. Hot pages should read one or two projection rows plus an indexed search result.

### Phase 5: Object storage

- Add object storage adapter for:
  - professor photos
  - institution/company logos
  - local PDF inbox and matched PDFs
  - user-uploaded attachments

## Table Classification

### Metadata / Corpus Tables

- `papers`
- `papers_fts`
- `import_log`
- `qs_rankings`
- `institution_aliases`
- `author_aliases`

These can remain in SQLite while the corpus pipeline matures.

### User / Product Tables

- `users`
- `favorites`
- `reading_status`
- `notes`
- `tags`
- `paper_tags`
- `watchlist_items`
- `learning_progress`

These should move to PostgreSQL early.

### Community / Moderation Tables

- `paper_comments`
- `mentor_reviews`
- `content_reports`
- `moderation_logs`

These should move to PostgreSQL before public launch.

### Business Intelligence Tables

- `companies`
- `company_sources`
- `company_aliases`
- `company_field_facts`
- `company_job_signals`
- `api_keys`

These should move to PostgreSQL, with secrets eventually moved out of the database.

## Current Rule

Until the Postgres adapter exists, all app behavior must remain SQLite-compatible. New commercial-service environment variables are configuration placeholders only.
