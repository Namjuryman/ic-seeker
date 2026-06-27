# Deploy Templates

This folder contains deployment templates for taking SiliconScope from localhost to an independent domain.

- `production.env.example`: copy to `.env.production` on the server.
- `Caddyfile.example`: HTTPS reverse proxy and static SPA hosting.
- `nginx.siliconscope.example.conf`: Nginx equivalent.
- `cloudflare-tunnel.example.yml`: Cloudflare Tunnel ingress shape.
- `DOMAIN_GO_LIVE.md`: practical go-live runbook.
- `../scripts/check-production-env.mjs`: local guard for required production env values.

Recommended first public setup:

1. Cloudflare manages DNS and WAF.
2. `api.your-domain.com` points to a VPS Docker API.
3. `www.your-domain.com` hosts `frontend/dist`.
4. `admin.your-domain.com` hosts `frontend-admin/dist` and is protected by Cloudflare Access.

Before starting the VPS service:

```bash
npm run deploy:check -- .env.production
```
