# SiliconScope v2: 20-Task Execution Plan

This document translates the requested 20 large follow-up tasks into concrete product targets, code landing zones, and next implementation slices. The current repository update does **not** claim that every task is finished end-to-end. It creates the first production-shaped foundation for ingestion, provenance, metadata confidence, local PDF matching, identity candidates, topic taxonomy expansion, admin review, and QA.

## Current implementation slice

Implemented in this slice:

- Multi-source ingestion foundation now covers OpenAlex, Crossref, IEEE Xplore, Semantic Scholar, DBLP, CSV, scholar CSV, and AMiner JSON inputs.
- Paper provenance tables were added: `paper_sources`, `paper_metadata_audits`, and `source_fetch_attempts`.
- Paper metadata confidence scoring was added with deterministic tests.
- The `papers` table now stores `metadata_confidence`, confidence flags/reasons, provenance JSON, and the last metadata-audit timestamp.
- A local PDF scanner was added for personal metadata matching without uploading or redistributing PDF files.
- Author and institution identity-candidate utilities and a refresh script were added.
- Topic taxonomy seed data was expanded toward fine-grained IC structure.
- Data Quality now surfaces low metadata-confidence papers and can sync them into the persistent review queue.
- Search indexing now includes `metadataConfidence` as a paper filter/sort dimension.
- Legal/policy pages were strengthened with contact placeholders and explicit AI, mentor, company, data-correction, and moderation policies.
- `docs/PRIVATE_MVP.md` was archived to `docs/archive/PRIVATE_MVP_V1.md`.

## Task matrix

| # | Task | Product target | Code landing zones | This slice | Next slice |
| --- | --- | --- | --- | --- | --- |
| 1 | Paper data ingestion pipeline v1 | Repeatable metadata-only ingestion with dedupe, provenance, retry, and incremental refresh. | `backend/src/scripts/import-papers-multisource.ts`, `paper-import/*`, `paper_sources`, `source_fetch_attempts` | Added Semantic Scholar and DBLP, source records, raw hashes, retry config, provenance writes. | Add provider-specific rate-limit backoff, cursor checkpoints, ingestion-job worker, and admin job execution. |
| 2 | Paper authenticity and metadata trust | Every paper has a transparent metadata-confidence score and review status. | `paper-metadata-confidence.ts`, `paper_metadata_audits`, Data Quality | Added confidence scoring, flags, review thresholds, audit rows, admin visibility. | Add manual approve/reject/edit actions and merge confidence into paper detail pages. |
| 3 | IC Topic Taxonomy 2.0 | Fine-grained IC tree with aliases, negative keywords, confidence, and correction workflow. | `topic-taxonomy.ts`, `topic-taxonomy.service.ts`, topic admin | Expanded taxonomy seed with ADC/PLL/RF/SerDes/Memory/CIM/EDA/DFT/Process/Packaging/Security/Reliability nodes. | Move full taxonomy governance into DB, add negative keyword editor and paper-topic correction audit. |
| 4 | Low-cost AI annotation pipeline | Batch topic/contribution/metric/application/difficulty labels with low-confidence review. | `paper-ai-enrichment.service.ts`, `annotate-papers-ai.ts`, AI admin | Existing rule-local pipeline remains; metadata confidence now feeds quality review context. | Add cheap-model adapter boundary, prompt/version registry, output schema tests, and cost ledger. |
| 5 | Productized learning routes | Every route has prerequisites, concepts, equations, figures, papers, exercises, mistakes, reading order. | `learning-catalog-v3.ts`, learning registry/admin | No broad content rewrite in this slice. | Add route-quality checklist and require structured sections before publish. |
| 6 | Daily Circuit | Daily concept/circuit with diagram, derivation, papers, prompts, review reminders. | `learning/today`, `learning/lessons/*`, learning progress | Existing Daily Lesson remains. | Add spaced-review table, lesson media assets, and reading-queue integration events. |
| 7 | Reading workflow upgrade | Reading queue becomes literature-review workspace. | `reading-queue.service.ts`, reading pages, export service | Earlier compatibility utils remain. | Add review date, post-read summary, literature-review export blocks, and PDF local-link awareness. |
| 8 | Local PDF access and matching | Personal local PDF index only; no copyrighted upload/redistribution. | `local_pdf_items`, `scan-local-pdfs.ts`, `local-pdf-matching.ts` | Added scanner and DOI/title matching utilities. | Add UI import wizard, OCR status, reading progress, and manual match/ignore actions. |
| 9 | Author identity disambiguation | Same-name and alias issues become reviewable merge/split candidates. | `author_identity_candidates`, `identity-candidate-utils.ts`, identity admin | Added candidate generation script. | Add graph-aware features: ORCID/OpenAlex IDs, coauthors, institution history, merge/split mutations. |
| 10 | Institution normalization | Aliases, countries/cities, labs, schools, companies, historical names. | `institution_identity_candidates`, institution services/admin | Added normalized candidate generation. | Add institution registry table, parent-child relations, geocoding, alias approval workflow. |
| 11 | Mentor profile 2.0 | Publication profile plus privacy-safe anonymous experience signals. | mentor compare/service/moderation | Previous threshold hardening remains. | Add mentor profile pages with trend, collaboration graph, student-filtered anonymized aggregates. |
| 12 | Institution profile page rebuild | Institution pages show direction structure, trends, representative authors/papers, collaborations, venues. | institution pages/services/snapshots | Not rebuilt in this slice. | Move institution page to snapshot-backed cards with transparent weights and no absolute ranking claims. |
| 13 | Geo academic map 2.0 | City/institution hotspots with time and topic filters. | geo services/pages/snapshots | Not rebuilt in this slice. | Add city-level geocoding, institution clustering, topic-year tiles, and provenance warnings. |
| 14 | Company intelligence upgrade | Maintainable employer/industry intelligence with source confidence. | company services/admin/sources | Existing company intelligence remains. | Add company product-line registry, source refresh jobs, news/report source ledger, and field-level confidence. |
| 15 | Search engine integration | Meilisearch/OpenSearch unified entity search with facets and explainable sorting. | `search-index.service.ts`, search admin | Added `metadataConfidence` to paper index filters/sorts. | Add author/institution index, query explanation payloads, and OpenSearch adapter only if scale requires. |
| 16 | Snapshot/precompute system | 0 live recompute for ranking, topic, geo, company, mentor aggregates. | `snapshot.service.ts`, `refresh-snapshots.ts`, admin snapshots | Existing snapshot scaffold remains. | Add typed snapshot contracts and weekly refresh DAG. |
| 17 | Mature admin center | Data quality, ingestion, AI labels, taxonomy, identity, company, learning, snapshots, logs. | `frontend-admin`, admin routes/services | Data Quality now sees metadata-confidence issues. | Add job execution controls, provider credentials status, manual identity merge/split, and audit-linked edits. |
| 18 | Commercial entitlement boundary | Free metadata workspace, paid AI reports/advanced export/team/private spaces. | billing service, usage ledger, export/report gates | Existing scaffold remains. | Add entitlement checks to AI reports, advanced export formats, and private PDF/team features. |
| 19 | Production deployment and ops | Unified ports, Docker/env/backup/logging/Sentry/Prometheus/health docs. | `deploy/*`, `docs/PORTS.md`, runtime QA | Runtime QA doc updated with current blocked checks. | Complete real DB runtime QA, attach logs, and add Sentry/Prometheus adapters. |
| 20 | UI/interaction upgrade | AMiner plus research-SaaS level navigation, search, detail, compare, learning, mobile daily flow. | frontend pages/components/design system | No visual overhaul in this slice. | Build a design-system inventory and redesign search/detail/profile pages around three-pane workflows. |

## Quality gates for the next release

1. Real SQLite must be pulled through Git LFS and pass `assertUsableSqliteDatabase`.
2. `npm install` must complete without `--ignore-scripts` on the release machine so `better-sqlite3` native bindings are built.
3. `npm run companies:seed`, `npm run import:papers -- --dry-run`, `npm run identity:candidates -- --dry-run`, `npm run pdf:scan -- --dry-run`, and `npm run snapshots:refresh` should be smoke-tested.
4. Public frontend, admin frontend, and backend API smoke tests must be run against a real database.
5. Data Quality should sync low-confidence metadata findings into the persistent review queue before any invite-only release.

## Product boundary reminders

SiliconScope is a research, learning, application, and career decision-support workspace. Scores, comparisons, reports, and ranking-like indicators must remain metadata-based directional signals with provenance and completeness caveats. They are not final academic evaluation, employment advice, investment advice, or admission guarantees.
