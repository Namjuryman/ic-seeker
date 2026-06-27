# SiliconScope Commercial Architecture Plan

This document tracks the migration from the current private MVP into a production-grade SiliconScope service.

## Target Architecture

```text
Client
├─ Web frontend: React today, Next.js/BFF possible later
├─ Mobile app: optional future client
│
CDN / WAF / Load Balancer
├─ Cloudflare DNS/WAF/Access for the first independent-domain deployment
│
Frontend / BFF layer
├─ Public static frontend: www.your-domain.com
├─ Independent admin frontend: admin.your-domain.com
├─ Future BFF/API aggregation layer if SSR or multi-tenant SaaS needs it
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
| Client | React + Vite web frontend and independent admin frontend | Mobile app not started; no SSR/BFF |
| CDN / WAF / Load Balancer | Deployment templates added for Cloudflare, Caddy, Nginx, and Dockerized Caddy edge | Real domain, WAF policy, and admin Access rule still need to be configured outside the repo |
| Frontend / BFF | Frontends directly call Express API; `VITE_API_BASE_URL` supports split API domains | Optional Next.js BFF layer for SaaS edition |
| Backend API | Express API with auth, search, admin, moderation, comments, notifications, watchlist, reading queue, companies, billing catalog, site settings, backup operations, maintenance task runs, scheduled operations, ingestion job records, and a unified operations ledger | Payment checkout, email delivery, and real ingestion workers missing |
| Realtime | Pull-based notification center implemented | Add Socket.IO or WebSocket gateway later |
| Core database | SQLite | Migrate multi-user data to PostgreSQL; keep SQLite metadata import as source/cache if useful |
| Redis | Optional infra compose only | Needed for production cache, sessions, rate limits, queues |
| Object storage | Local folders only | Add S3-compatible storage such as Cloudflare R2, MinIO, or OSS |
| Search engine | SQLite/service search | Add Meilisearch first; OpenSearch later if scale requires |
| Message queue | Not implemented | Add BullMQ/Redis or another queue for ingestion, enrichment, snapshots |
| Payment | Plan catalog, entitlement metadata, usage ledger, partial quota enforcement, admin plan management, and checkout adapter boundary exist | Add Stripe/Paddle session creation and webhook handling; China payments later |
| Email/SMS/OAuth | Not implemented | Add email invite/login and optional OAuth |
| Observability | Runtime health/readiness checks and logs | Add Sentry first; Prometheus/Grafana after production traffic |

## Migration Plan

| Phase | Goal | Concrete work | Acceptance |
| --- | --- | --- | --- |
| 0 | Stabilize MVP | Keep React + Express + SQLite working; document target architecture | `npm run build` passes; docs describe gaps |
| 1 | Infrastructure scaffold | Add optional local infra compose: Postgres, Redis, Meilisearch, MinIO, Mailpit | Developers can start infra without changing current app |
| 2 | Independent domain | Add public/admin/API URL configuration, production Docker Compose, Cloudflare/Caddy/Nginx templates, and env validation | A VPS + static hosting path is documented and checkable |
| 3 | Data abstraction | Separate metadata SQLite source from user/business data; introduce repository/service boundaries | User tables can move without rewriting paper search |
| 4 | PostgreSQL migration | Move users, notifications, comments, reviews, watchlist, reading queue, companies, admin logs to PostgreSQL | SQLite remains optional metadata import; user data persists in Postgres |
| 5 | Redis integration | Cache snapshots/search facets; store sessions/rate-limit counters; prepare BullMQ | Hot pages avoid expensive recompute |
| 6 | Search engine | Index papers, authors, institutions, companies, roadmaps into Meilisearch | Search latency and relevance improve; rebuild index task exists |
| 7 | Object storage | Store avatars, company logos, PDFs, attachments in S3-compatible storage | Local disk is no longer required for uploaded assets |
| 8 | Async jobs | Add queue workers for IEEE/OpenAlex ingestion, enrichment, PDF matching, snapshot rebuilds | Weekly update can run as scheduled background jobs |
| 9 | SaaS features | Add checkout provider, webhooks, OAuth, email delivery, public/private permissions | Public demo and paid/private modes can coexist |
| 10 | Realtime and app | Add realtime notifications/comments; design mobile app API surface | Realtime features do not block core search |
| 11 | Production ops | Add Sentry, metrics, health checks, backup/restore, deployment docs | Public deployment has monitoring and rollback path |

## Implemented Production Scaffolding

- Optional commercial infrastructure compose: Postgres, Redis, Meilisearch, MinIO, and Mailpit.
- Runtime health/readiness checks for API liveness, metadata DB, app DB, cache, auth mode, JWT, CORS, production URLs, and commercial adapter configuration.
- SQLite-backed Notification Center with user notifications, unread counts, mark-read actions, and admin-created messages.
- Subscription and quota scaffold with `Free Preview`, `Research Pro`, `Lab`, `Enterprise`, and `Internal Admin` plans.
- Billing API endpoints for plan catalog, current user entitlements, monthly usage summary, admin overview, and checkout-adapter placeholder.
- Admin billing endpoints for listing users, inspecting usage, and manually changing a user's plan during private beta.
- App-data tables for subscriptions, payment customers, billing events, and usage events.
- Site settings control plane:
  - `GET /api/site-settings` exposes only safe public flags.
  - `GET /api/admin/site-settings` lists the full operations/commercial configuration.
  - `PATCH /api/admin/site-settings/:key` updates one setting and writes an admin audit log.
  - Admin `/site-settings` controls private beta mode, maintenance mode, paid-feature gates, community surfaces, company intelligence, topic reports, and weekly ingestion readiness.
- Local backup operations:
  - `GET /api/admin/backups`.
  - `POST /api/admin/backups`.
  - `POST /api/admin/backups/prune`.
  - `DELETE /api/admin/backups/:id`.
  - `npm run backup:create -- label --keep=10`.
  - Backup writes use the SQLite backup API and produce `.sqlite` plus manifest JSON files under `BACKUP_DIR`.
- Maintenance task center:
  - `GET /api/admin/maintenance/jobs`.
  - `GET /api/admin/maintenance/runs`.
  - `POST /api/admin/maintenance/jobs/:jobId/run`.
  - Current jobs: backup, snapshot-core, snapshot-full, and data-quality.
  - Runs are recorded in `maintenance_runs` with status, duration, summary, actor, and error.
- Job operations ledger:
  - `GET /api/admin/job-operations`.
  - Admin `/job-operations` aggregates scheduler state, maintenance runs, backup restore points, snapshot cache state, data-quality status, and future ingestion placeholders for independent-domain operations.
- Ingestion job registry:
  - `GET /api/admin/ingestion/jobs`.
  - `POST /api/admin/ingestion/jobs`.
  - `PATCH /api/admin/ingestion/jobs/:id`.
  - Admin `/journal-ingestion` records provider, mode, scope, status, counts, notes, and errors for future IEEE/OpenAlex/Crossref/CSV/PDF workers.
- Independent-domain scaffolding:
  - `PUBLIC_SITE_URL`, `ADMIN_SITE_URL`, `API_BASE_URL`, `VITE_API_BASE_URL`.
  - `docker-compose.production.yml`.
  - `deploy/Caddyfile.example`.
  - `deploy/Caddyfile.docker`.
  - `deploy/nginx.siliconscope.example.conf`.
  - `deploy/cloudflare-tunnel.example.yml`.
  - `deploy/DOMAIN_GO_LIVE.md`.
  - `scripts/init-production-domain.mjs`.
  - `npm run deploy:check -- .env.production`.
  - `npm run deploy:doctor -- .env.production`.
  - Admin `/launch` go-live console for runtime blockers, backup freshness, maintenance runs, and DNS cutover.
  - Admin `/job-operations` operational ledger for post-launch weekly updates and incident review.
  - Admin `/observability` runtime console for in-process request volume, latency, status buckets, hot routes, slow routes, and recent error/request IDs.
  - Admin `/scheduler` console for server-side backup, snapshot refresh, and data-quality jobs; enable with `SCHEDULER_ENABLED=1` after the deployment is stable.

## Billing Boundary

The current billing layer deliberately does not call Stripe/Paddle yet. It provides:

- Stable plan IDs and quota metadata.
- Current-user entitlement status from `users.subscription_plan`.
- Usage ledger via `usage_events`.
- Partial quota enforcement on watchlist and reading queue workflows.
- Manual admin plan changes that write `subscriptions` and `billing_events`.
- Admin-visible provider state from `PAYMENT_PROVIDER`, `STRIPE_SECRET_KEY`, and `PADDLE_API_KEY`.
- A checkout endpoint that returns an explicit unavailable/not-implemented reason until provider-specific adapters are added.

Next work:

1. Implement Stripe Checkout Session creation first, then Paddle if needed.
2. Add webhook signature verification and idempotent event handling into `billing_events`.
3. Enforce quota checks inside exports, alerts, AI reading, and API endpoints.
4. Add invoice/customer pages after Stripe/Paddle webhooks exist.
5. Keep the public demo free and metadata-only; paid plans should unlock workflow limits, team functions, and private deployment features.

## Design Principles

- Do not break the local private workflow while adding production scaffolding.
- Prefer optional adapters before hard dependencies.
- Keep large paper metadata and user-generated business data separable.
- Compute expensive rankings/snapshots offline where possible.
- Use public DOI/metadata links by default; do not redistribute publisher PDFs.
