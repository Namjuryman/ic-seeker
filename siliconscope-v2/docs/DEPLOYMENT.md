# SiliconScope Public Deployment

SiliconScope is now split into three deployable surfaces:

1. Public frontend: `frontend`, deployed to `www.siliconscope.com` or the root domain.
2. Independent admin frontend: `frontend-admin`, deployed to `admin.siliconscope.com`.
3. Backend API: `backend`, deployed on a VPS/Docker host behind HTTPS.

The public-safe product shape should expose metadata, DOI links, abstracts, search, author/institution/topic/region intelligence, and personal reading state. It should not serve publisher PDFs to other users. For a commercial public site, keep paper reading as official-source redirects unless you have redistribution rights.

Vercel or Cloudflare Pages can host the two static frontends. The backend still needs a persistent server or container because it owns SQLite/Postgres access, admin APIs, authentication cookies, ingestion jobs, and local PDF workflows.

## Local Development

```powershell
.\start-dev.ps1
```

This starts:

- Backend API: `http://127.0.0.1:8751`
- Public frontend: `http://localhost:5173`
- Admin frontend: `http://localhost:5176`

The launcher sets `IC_SEEKER_LOCAL_ADMIN=1` for local development only. Never set that flag on a public server.

## Option A: Cloudflare Tunnel

Use this when you do not want to open inbound ports on the server.

1. Point your domain to Cloudflare.
2. On the server, clone the repo and generate production env:

```powershell
npm run deploy:init -- your-domain.com
```

Review `.env.production`, then copy selected values into `.env` only if your host workflow expects `.env`.
3. Start the backend API:

```powershell
docker compose -f docker-compose.production.yml up -d --build
```

4. In Cloudflare Zero Trust, create tunnel hostnames:

```text
api.siliconscope.com -> http://ic-seeker:8750
www.siliconscope.com -> Cloudflare Pages public frontend
admin.siliconscope.com -> Cloudflare Pages admin frontend protected by Cloudflare Access
```

If you run `cloudflared` outside Docker on the host, map the API hostname to:

```text
http://127.0.0.1:8750
```

5. Before exposing publicly, enable login:

```env
IC_SEEKER_REQUIRE_LOGIN=1
IC_SEEKER_LOCAL_ADMIN=0
ADMIN_PASSWORD=replace-with-a-long-password
JWT_SECRET=replace-with-a-long-random-string
PUBLIC_SITE_URL=https://www.siliconscope.com
ADMIN_SITE_URL=https://admin.siliconscope.com
API_BASE_URL=https://api.siliconscope.com
VITE_API_BASE_URL=https://api.siliconscope.com
FRONTEND_ORIGINS=https://www.siliconscope.com,https://admin.siliconscope.com
HOST=0.0.0.0
PORT=8750
RATE_LIMIT_ENABLED=1
RATE_LIMIT_MAX=400
AUTH_RATE_LIMIT_MAX=8
ADMIN_RATE_LIMIT_MAX=120
SCHEDULER_ENABLED=0
```

Run the production guard after `npm run build`:

```powershell
npm run deploy:check -- .env.production
npm run build
npm run deploy:doctor -- .env.production
```

## Option B: VPS + Cloudflare DNS

Use this when you are comfortable opening ports `80` and `443` on a VPS.

1. Run `npm run deploy:init -- your-domain.com` and review `.env.production`.
2. Run `npm run deploy:check -- .env.production`.
3. Run `npm run build` so `frontend/dist` and `frontend-admin/dist` exist.
4. Run `npm run deploy:doctor -- .env.production`.
5. Run `docker compose -f docker-compose.production.yml up -d --build`.
6. The compose stack starts the API plus a Caddy edge proxy.
7. Caddy hosts `frontend/dist` as `www.siliconscope.com`, `frontend-admin/dist` as `admin.siliconscope.com`, and reverse-proxies `api.siliconscope.com` to the API container.
8. If you prefer a host-level reverse proxy, use `deploy/Caddyfile.example` or `deploy/nginx.siliconscope.example.conf` instead of the Caddy compose service.

Ready-to-edit templates live in `deploy/`:

- `deploy/Caddyfile.example`: three independent HTTPS hostnames with SPA fallback.
- `deploy/Caddyfile.docker`: the Caddy config mounted by production Docker Compose.
- `deploy/nginx.siliconscope.example.conf`: equivalent Nginx virtual hosts.
- `deploy/production.env.example`: production environment variables for the API host.
- `deploy/cloudflare-tunnel.example.yml`: API-only Cloudflare Tunnel ingress template.
- `deploy/DOMAIN_GO_LIVE.md`: practical independent-domain checklist.
- `scripts/init-production-domain.mjs`: generates `.env.production` with the standard `www/admin/api` split and strong random secrets.

The intended production domain split is:

```text
https://www.your-domain.com   -> public frontend
https://admin.your-domain.com -> independent admin frontend
https://api.your-domain.com   -> backend API
```

Keep the admin hostname behind Cloudflare Access, VPN, or another access-control layer even though the backend also checks admin privileges. Defense in depth matters once this leaves localhost.

After logging into the independent admin frontend, open `/launch`. It summarizes runtime blockers, backup freshness, maintenance runs, DNS shape, and the exact go-live command sequence.

## Why Not Vercel Yet

Vercel can run Node.js functions, but the current app is a stateful service with:

- SQLite database files in `ic_database/`
- local PDF inbox
- background/import scripts
- admin API key storage

Before a Vercel deployment, migrate to:

- hosted Postgres/Supabase/Neon for metadata
- object storage for PDFs
- serverless API handlers
- static frontend bundle

## Production Checklist

- Set `IC_SEEKER_REQUIRE_LOGIN=1`.
- Set `IC_SEEKER_LOCAL_ADMIN=0`.
- Use a strong `ADMIN_PASSWORD`.
- Use a strong random `JWT_SECRET`.
- Set `FRONTEND_ORIGINS` to both the public frontend and admin frontend domains.
- Keep `RATE_LIMIT_ENABLED=1`; tune `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`, and `ADMIN_RATE_LIMIT_MAX` as traffic grows.
- Keep `.env` out of Git.
- Back up `ic_database/ic_papers.sqlite`.
- Do not proxy raw publisher PDFs unless you have rights to redistribute them.
- Keep AMiner/IEEE API keys in environment variables, not frontend code.
- Schedule regular database backups before running new crawls/imports.
- Create a restore point before deploys and weekly imports:

```powershell
npm run backup:create -- weekly-refresh --keep=10
```

- Run IEEE/OpenAlex/Crossref sync and admin operations only from the backend/admin frontend, never from the public frontend.
- API responses include `X-Request-Id`; use that ID when correlating production errors with server logs.
- Keep `SCHEDULER_ENABLED=0` for the first smoke deploy. Turn it on after backups, admin login, and DNS are verified; configure intervals with `SCHEDULER_BACKUP_INTERVAL_MINUTES`, `SCHEDULER_SNAPSHOT_INTERVAL_MINUTES`, and `SCHEDULER_QUALITY_INTERVAL_MINUTES`.
- Wire uptime/load-balancer probes to `GET /api/health/live` and `GET /api/health/ready`.
- Check the independent admin console runtime panel before major imports or public announcements.
- Run `npm run deploy:check -- .env.production` before every first-time public deploy or secret rotation.
- Run `npm run deploy:doctor -- .env.production` after `npm run build` to verify env, frontend bundles, and DNS readiness.

## Health Checks

The API exposes two production-friendly health endpoints:

```text
GET /api/health/live   -> lightweight process liveness
GET /api/health/ready  -> runtime readiness: SQLite, app DB, cache, frontend build, auth, JWT, CORS, commercial adapters
```

`/api/health/ready` returns HTTP 503 only for hard errors. Warnings still return HTTP 200 so local/private deployments can keep running while clearly showing what must be hardened before public launch.

## Upgrade Path

When the site grows beyond private usage:

1. Keep the current Docker+SQLite version as the local/private edition.
2. Move metadata to Postgres, with migrations and normalized tables for papers, authors, institutions, venues, topics, and paper-source provenance.
3. Move user PDFs, if any, to private object storage with per-user access control.
4. Keep public frontend and admin frontend as separate deployments.
5. Run IEEE/OpenAlex/Crossref/AMiner sync jobs on the backend with quotas, logs, retries, and source provenance.
6. Connect the existing billing scaffold to Stripe/Paddle only after the metadata policy, access control, and source terms are clear.
