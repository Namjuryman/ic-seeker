# SiliconScope Independent Domain Go-Live

This is the production path for running SiliconScope on your own domain.

## Target Domain Layout

| Hostname | Purpose | Recommended hosting |
| --- | --- | --- |
| `www.your-domain.com` | public SiliconScope app | Cloudflare Pages, Vercel, or Caddy static files |
| `admin.your-domain.com` | private admin console | separate static deploy plus Cloudflare Access |
| `api.your-domain.com` | backend API | VPS Docker service behind Caddy/Nginx/Cloudflare Tunnel |

For the first real deployment, use Cloudflare DNS + Cloudflare Access for admin. That gives HTTPS, WAF, access control, and easy domain management without writing custom security plumbing too early.

## Minimal VPS Deployment

1. Copy `deploy/production.env.example` to `.env.production`.
2. Replace all `siliconscope.com` values with your real domain.
3. Set strong secrets:

```env
JWT_SECRET=generate-a-long-random-secret
ADMIN_PASSWORD=generate-a-long-random-admin-password
IC_SEEKER_REQUIRE_LOGIN=1
IC_SEEKER_LOCAL_ADMIN=0
```

Run the local production-env guard before deploying:

```bash
npm run deploy:check -- .env.production
npm run deploy:doctor -- .env.production
```

4. Build the public and admin frontends, then start the API plus Caddy edge proxy:

```bash
npm run build
docker compose -f docker-compose.production.yml up -d --build
```

5. If you do not use the Docker Caddy service, put a reverse proxy in front manually:

```bash
# Caddy example
sudo cp deploy/Caddyfile.example /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

6. Verify readiness:

```bash
curl https://api.your-domain.com/api/health/live
curl https://api.your-domain.com/api/health/ready
```

## Static Frontend Deployment

Set these build variables on Cloudflare Pages/Vercel:

```env
VITE_API_BASE_URL=https://api.your-domain.com
VITE_PUBLIC_SITE_URL=https://www.your-domain.com
VITE_ADMIN_SITE_URL=https://admin.your-domain.com
```

Build commands:

```bash
npm --workspace siliconscope-v2-frontend run build
npm --workspace siliconscope-v2-admin run build
```

Output directories:

```text
frontend/dist
frontend-admin/dist
```

## Admin Access

Do not expose the admin console as a normal public nav item. Use at least two layers:

1. `admin.your-domain.com` protected by Cloudflare Access, VPN, Tailscale, or equivalent.
2. Backend admin login with `IC_SEEKER_REQUIRE_LOGIN=1` and a strong `ADMIN_PASSWORD`.

The frontend is not the security boundary. The backend admin routes must continue to enforce `requireAdmin`.

## DNS Records

For Cloudflare Pages:

```text
CNAME www -> your-cloudflare-pages-project.pages.dev
CNAME admin -> your-admin-pages-project.pages.dev
CNAME api -> your-vps-tunnel-hostname or A record to VPS
```

For one VPS with Caddy:

```text
A @ -> VPS IP
A www -> VPS IP
A admin -> VPS IP
A api -> VPS IP
```

## First Production Checklist

- `GET /api/health/ready` has no `error` checks.
- `FRONTEND_ORIGINS` includes only real frontend/admin origins.
- Local admin bypass is off.
- SQLite database has an off-machine backup.
- PDF serving remains private or official-source redirect only.
- IEEE/AMiner/OpenAI keys are only in server environment variables.
- Admin domain is protected by Cloudflare Access or VPN.
- `docker compose -f docker-compose.production.yml ps` shows a healthy API.
- `npm run deploy:doctor -- .env.production` passes after `npm run build`.
