# Runtime QA Checklist

Use this checklist after a fresh clone or before releasing a new build.

## Prerequisites

- Node.js `>=22.5.0`
- Git LFS pulled (`git lfs pull`)
- `npm install` in `siliconscope-v2/` (root workspace)

## Steps

### 1. Database Ready

```powershell
cd siliconscope-v2
npm run companies:seed
```

- [ ] Companies table auto-created on backend startup (`ensureCompanyTables`)
- [ ] Seed completes without duplicate inserts (rawUpsertCompany uses `name` / `legal_name` for deduplication)
- [ ] Re-running `npm run companies:seed` is idempotent (updates existing, inserts missing)

### 2. Backend Dev

```powershell
cd backend
npm run dev
```

- [ ] Server starts at `http://127.0.0.1:8751`
- [ ] No `no such table` errors for company tables on old SQLite files

### 3. Frontend Dev

```powershell
cd frontend
npm run dev
```

- [ ] Dev server starts at `http://localhost:5173`
- [ ] Frontend can reach backend API

### 4. Company Pages

Navigate to `/companies`:
- [ ] Company list loads with total count
- [ ] If companies table is empty, shows: "No company data yet. Run npm run companies:seed or add companies in Admin."
- [ ] Search by keyword works
- [ ] Filter by domain works

Navigate to `/companies/:id`:
- [ ] Company profile loads with Basic Facts, Business Directions, Career Intelligence
- [ ] `dataConfidence` badge is visible with explanation: "metadata completeness and provenance score, not a company strength..."
- [ ] Field-level source provenance visible (source not verified / source name + confidence + date)
- [ ] Related Papers loads with affiliation matching
- [ ] `matchReason` shown per paper (name / legalName / alias)
- [ ] Short aliases (length <= 3) are excluded from affiliation matching
- [ ] Watch company / Unwatch company button works

### 5. Watchlist

Navigate to `/watchlist`:
- [ ] Watched companies list loads
- [ ] User ID isolation works (no cross-user data leakage)
- [ ] Unwatched companies disappear from list after refresh

### 6. Company Admin

Navigate to the independent admin frontend at `http://localhost:5176/companies`:
- [ ] Admin guard (`requireAdmin`) allows access in local dev when `IC_SEEKER_LOCAL_ADMIN=1`
- [ ] Create company works
- [ ] Edit company works
- [ ] Delete company works
- [ ] CSV Import shows "Coming soon" (not pretending to be usable)

### 7. Compare

Navigate to `/compare/companies`:
- [ ] Select 2–4 companies and compare
- [ ] Shared domains, product lines, fit matching visible
- [ ] Caveat visible: "not an investment recommendation or a final employer ranking"

### 8. Related Papers API

```powershell
curl http://127.0.0.1:8751/api/companies/:id/related-papers
```

- [ ] Returns JSON with `rows` (max 20), `total` from `COUNT(*)`, `engine: "sqlite-affiliation"`
- [ ] `caveat` field present: "based on affiliation text matching"
- [ ] No SQL injection via company names (parameterized + ESCAPE)

### 9. Admin Routes Guard

Verify these routes return `403 Admin access required` when auth is enabled and user is not admin:
- `POST /api/admin/companies`
- `PATCH /api/admin/companies/:id`
- `DELETE /api/admin/companies/:id`
- `GET /api/admin/moderation`
- `POST /api/admin/moderation/:type/:id`
- `GET /api/admin/snapshots`
- `POST /api/admin/snapshots/refresh`
- `POST /api/admin/snapshots/clear`
- `GET /api/admin/identity/aliases`
- `PUT /api/admin/identity/aliases/:type`
- `DELETE /api/admin/identity/aliases/:type/:alias`
- `GET /api/admin/api-keys`
- `PUT /api/admin/api-keys/:provider`
- `GET /api/admin/runtime`
- `POST /api/admin/notifications`

### 10. Runtime Health

```powershell
Invoke-RestMethod http://127.0.0.1:8751/api/health/live
Invoke-RestMethod http://127.0.0.1:8751/api/health/ready
```

- [ ] `/live` returns `status: ok`.
- [ ] `/ready` returns a JSON object with `status`, `checks`, `warnings`, `topology`, and `uptimeSeconds`.
- [ ] Metadata DB check reports a non-zero paper count.
- [ ] Local development may return `status: warn` for local admin bypass, weak JWT, or missing production build.
- [ ] Public deployment should target `status: ok` with `IC_SEEKER_REQUIRE_LOGIN=1`, `IC_SEEKER_LOCAL_ADMIN=0`, a strong `JWT_SECRET`, and exact `FRONTEND_ORIGINS`.
- [ ] `npm run deploy:doctor -- .env.production` passes after `npm run build`.
- [ ] Docker production stack exposes `www`, `admin`, and `api` hostnames through Caddy or an equivalent external reverse proxy.

### 11. Notification Center

```powershell
Invoke-RestMethod http://127.0.0.1:8751/api/notifications
Invoke-RestMethod http://127.0.0.1:8751/api/notifications/unread-count
```

- [ ] First visit creates a welcome notification for the current user.
- [ ] Notification list returns `rows`, `total`, `unread`, `limit`, and `offset`.

### 12. Billing Scaffold

- [ ] `GET /api/billing/plans` returns the public plan catalog.
- [ ] `GET /api/billing/status` returns `currentPlan`, `entitlementSummary`, `paymentProvider`, and `checkoutAvailable`.
- [ ] `GET /api/billing/usage` returns monthly usage items with `used`, `limit`, `remaining`, and `enforced`.
- [ ] `POST /api/billing/checkout` returns an explicit unavailable/not-implemented reason until a real provider adapter is configured.
- [ ] Adding a new watchlist item checks `watchlistItems`; adding a saved search also checks `savedSearches`.
- [ ] Moving a paper into a non-`unread` reading state checks `readingQueueItems`.
- [ ] `GET /api/admin/billing` is admin-only and exposes provider readiness without leaking secrets.
- [ ] `GET /api/admin/billing/users` lists users with plan and enforced quota usage.
- [ ] `PATCH /api/admin/billing/users/:id/plan` updates `users.subscription_plan`, inserts a manual `subscriptions` row, inserts a `billing_events` row, and writes an admin audit log.
- [ ] The frontend `/billing` page renders plan cards and current entitlements.
- [ ] The admin frontend `/billing` route renders user billing operations behind admin login.
- [ ] `POST /api/notifications/:id/read` marks one notification read.
- [ ] `POST /api/notifications/read-all` clears unread state for the user.
- [ ] Admin can create user notifications with `POST /api/admin/notifications`.

### 12. Build

```powershell
cd siliconscope-v2
npm run build
```

- [ ] Backend `tsc` succeeds with no errors
- [ ] Frontend `tsc -b && vite build` succeeds
- [ ] `frontend/dist` contains updated assets

## Known Limitations

- Company Watchlist does not include saved company searches yet (only watched companies).
- CSV bulk import is not implemented.
- Affiliation LIKE matching may still match partial strings (e.g., "Apple" in "Pineapple").
- Short alias exclusion (length <= 3) is a heuristic; some valid short aliases may be skipped.
- `better-sqlite3` binary must match the runtime Node.js version.
