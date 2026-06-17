# IC Seeker Public Deployment

IC Seeker is a Node.js service backed by a local SQLite database and PDF inbox. The recommended public deployment is:

1. Run the app on a small VPS or your own always-on machine with Docker.
2. Put Cloudflare in front of it with either Cloudflare Tunnel or normal DNS + reverse proxy.

The current public-safe product shape should expose metadata, DOI links, abstracts, search, author/institution/topic/region intelligence, and personal reading state. It should not serve publisher PDFs to other users. For a commercial public site, keep paper reading as official-source redirects unless you have redistribution rights.

Vercel is not the recommended target for the current architecture because the app expects a persistent SQLite file and long-running Node server process. Vercel is better after the backend is split into serverless APIs and the database is moved to a hosted database.

## Option A: Cloudflare Tunnel

Use this when you do not want to open inbound ports on the server.

1. Point your domain to Cloudflare.
2. On the server, clone the repo and create `.env`.
3. Start IC Seeker:

```powershell
docker compose up -d --build
```

4. In Cloudflare Zero Trust, create a Tunnel and map your hostname to:

```text
http://ic-seeker:8750
```

If you run `cloudflared` outside Docker on the host, map the hostname to:

```text
http://127.0.0.1:8750
```

5. Before exposing publicly, enable login:

```env
IC_SEEKER_REQUIRE_LOGIN=1
ADMIN_PASSWORD=replace-with-a-long-password
COOKIE_SECRET=replace-with-a-long-random-string
HOST=0.0.0.0
PORT=8750
```

## Option B: VPS + Cloudflare DNS

Use this when you are comfortable opening ports `80` and `443` on a VPS.

1. Run the app with Docker Compose.
2. Put Caddy or Nginx in front of `127.0.0.1:8750`.
3. Create a Cloudflare DNS record for your domain pointing to the VPS.
4. Enable HTTPS at the reverse proxy.

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
- Use a strong `ADMIN_PASSWORD`.
- Use a strong random `COOKIE_SECRET`.
- Keep `.env` out of Git.
- Back up `ic_database/ic_papers.sqlite`.
- Do not proxy raw publisher PDFs unless you have rights to redistribute them.
- Keep AMiner/IEEE API keys in environment variables, not frontend code.
- Schedule regular database backups before running new crawls/imports.
- Add a private admin route or script for IEEE API sync rather than calling paid APIs directly from the frontend.
- Add rate limiting before public traffic or paid subscriptions.

## Upgrade Path

When the site grows beyond private usage:

1. Keep the current Docker+SQLite version as the local/private edition.
2. Move metadata to Postgres, with migrations and normalized tables for papers, authors, institutions, venues, topics, and paper-source provenance.
3. Move user PDFs, if any, to private object storage with per-user access control.
4. Split the frontend into a static app or Next.js app, then deploy that frontend to Vercel/Cloudflare Pages.
5. Run IEEE/OpenAlex/Crossref/AMiner sync jobs on the backend with quotas, logs, retries, and source provenance.
6. Add billing only after the metadata policy, access control, and source terms are clear.
