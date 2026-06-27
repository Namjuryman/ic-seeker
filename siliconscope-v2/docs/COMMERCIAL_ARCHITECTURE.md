# SiliconScope Commercial Architecture Plan

This document tracks the migration from the current private MVP into a production-grade SiliconScope service.

## Target Architecture

```text
Client
├─ Web frontend: React today, Next.js/BFF possible later
├─ Mobile app: optional future client
│
CDN / WAF / Load Balancer
│
Frontend / BFF layer
├─ Page rendering
├─ Login state handling
├─ API aggregation
│
Backend API
├─ Auth
├─ User Profile
├─ Forum / Community
├─ Payment
├─ Notification
├─ Admin
├─ Search
├─ Moderation
│
Realtime Layer
├─ WebSocket / Socket.IO
├─ Realtime chat
├─ Realtime comments
├─ Realtime notifications
│
Data Layer
├─ PostgreSQL / MySQL: core business data
├─ Redis: cache, session, rate limit, realtime state
├─ Object Storage: images, avatars, PDFs, attachments
├─ Search Engine: Meilisearch / OpenSearch / Elasticsearch
├─ Message Queue: async tasks
│
Third-party Services
├─ Stripe / Paddle / Alipay / WeChat Pay
├─ Email / SMS
├─ OAuth login
├─ Sentry / Prometheus / Grafana
```

## Current Fit

| Layer | Current status | Gap |
| --- | --- | --- |
| Client | React + Vite web frontend | Mobile app not started; no SSR/BFF |
| CDN / WAF / Load Balancer | Not implemented | Add Cloudflare or reverse proxy for public deployment |
| Frontend / BFF | Frontend directly calls Express API | Optional Next.js BFF layer for SaaS edition |
| Backend API | Express API with auth, search, admin, moderation, comments, watchlist, reading queue, companies | Payment and notification missing |
| Realtime | Not implemented | Add Socket.IO or WebSocket gateway later |
| Core database | SQLite | Migrate multi-user data to PostgreSQL; keep SQLite metadata import as source/cache if useful |
| Redis | Not implemented | Needed for production cache, sessions, rate limits, queues |
| Object storage | Local folders only | Add S3-compatible storage such as Cloudflare R2, MinIO, or OSS |
| Search engine | SQLite/service search | Add Meilisearch first; OpenSearch later if scale requires |
| Message queue | Not implemented | Add BullMQ/Redis or another queue for ingestion, enrichment, snapshots |
| Payment | Not implemented | Add Stripe/Paddle first; China payments later |
| Email/SMS/OAuth | Not implemented | Add email invite/login and optional OAuth |
| Observability | Runtime health/readiness checks and logs | Add Sentry first; Prometheus/Grafana after production traffic |

## Migration Plan

| Phase | Goal | Concrete work | Acceptance |
| --- | --- | --- | --- |
| 0 | Stabilize MVP | Keep React + Express + SQLite working; document target architecture | `npm run build` passes; docs describe gaps |
| 1 | Infrastructure scaffold | Add optional local infra compose: Postgres, Redis, Meilisearch, MinIO, Mailpit | Developers can start infra without changing current app |
| 2 | Data abstraction | Separate metadata SQLite source from user/business data; introduce repository/service boundaries | User tables can move without rewriting paper search |
| 3 | PostgreSQL migration | Move users, comments, reviews, watchlist, reading queue, companies, admin logs to PostgreSQL | SQLite remains optional metadata import; user data persists in Postgres |
| 4 | Redis integration | Cache snapshots/search facets; store sessions/rate-limit counters; prepare BullMQ | Hot pages avoid expensive recompute |
| 5 | Search engine | Index papers, authors, institutions, companies, roadmaps into Meilisearch | Search latency and relevance improve; rebuild index task exists |
| 6 | Object storage | Store avatars, company logos, PDFs, attachments in S3-compatible storage | Local disk is no longer required for uploaded assets |
| 7 | Async jobs | Add queue workers for IEEE/OpenAlex ingestion, enrichment, PDF matching, snapshot rebuilds | Weekly update can run as scheduled background jobs |
| 8 | SaaS features | Add payment, notifications, OAuth, public/private permissions | Public demo and paid/private modes can coexist |
| 9 | Realtime and app | Add realtime notifications/comments; design mobile app API surface | Realtime features do not block core search |
| 10 | Production ops | Add Sentry, metrics, health checks, backup/restore, deployment docs | Public deployment has monitoring and rollback path |

## First Implementation Batch

- Add this document as the architectural source of truth.
- Add `docker-compose.infra.yml` for optional local Postgres, Redis, Meilisearch, MinIO, and Mailpit.
- Extend `.env.example` and backend config with inert placeholders for the commercial services.
- Keep the default app path unchanged so the private SQLite MVP continues to work.
- Track the data-layer split in `docs/DATA_LAYER_MIGRATION.md`.
- Introduce `backend/src/db/app-db.ts` as the app/business data adapter; it currently falls back to SQLite.
- Add runtime health/readiness checks for API liveness, metadata DB, app DB, cache, auth mode, JWT, CORS, and production adapter configuration.

## Design Principles

- Do not break the local private workflow while adding production scaffolding.
- Prefer optional adapters before hard dependencies.
- Keep large paper metadata and user-generated business data separable.
- Compute expensive rankings/snapshots offline where possible.
- Use public DOI/metadata links by default; do not redistribute publisher PDFs.
