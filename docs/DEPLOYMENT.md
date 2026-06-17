# IC Seeker Public Deployment

IC Seeker is a Node.js service backed by a local SQLite database and PDF inbox. The recommended public deployment is:

1. Run the app on a small VPS or your own always-on machine with Docker.
2. Put Cloudflare in front of it with either Cloudflare Tunnel or normal DNS + reverse proxy.

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
