# Runtime QA Results

Use this file to record evidence from a real local or production-like run. Do not mark runtime QA complete from TypeScript/Vite build results alone.

## Current Uploaded-Zip Check, 2026-07-03

This repository snapshot was checked in the ChatGPT container environment after the 20-task foundation slice.

- Node version: `v22.16.0` observed in the tool environment.
- OS: Linux container.
- Database path checked: `ic_database/ic_papers.sqlite`.
- Database size: approximately 133-134 bytes.
- SQLite is real: **no**. The uploaded file is still Git LFS pointer-sized and cannot support runtime API smoke tests.
- `npm install` without `--ignore-scripts`: blocked in this environment by `better-sqlite3` native prebuild/header download DNS failures. This must be rerun on a normal development or deployment machine.
- `npm install --ignore-scripts`: completed enough to run TypeScript/Vite/unit-test checks.
- `npm test -- --run`: passed, 12 test files / 30 tests.
- `npm run build:backend`: passed.
- `npm run build:frontend`: passed.
- `npm run build:admin`: passed.
- `npm audit --json`: 0 high, 0 critical, 4 moderate dev-tooling advisories from `drizzle-kit`/`esbuild` chain.

Release decision from this environment: **not ready for public launch** because real database runtime QA, native dependency install, seed, API smoke, page smoke, admin operations, ingestion dry-run, and scheduler/backup smoke were not completed against a real SQLite database.



## Second Completion Pass, 2026-07-03

Additional work was checked after adding the 20-task completion cockpit, Daily Circuit page, reading workflow API, paper dedupe/admin surfaces, local PDF admin surface, search-cache fallback, and foundation refresh scripts.

- Node version: `v22.16.0`.
- OS: Linux container.
- `npm install --ignore-scripts`: passed. Root now also declares `better-sqlite3` so workspace scripts can resolve Drizzle's better-sqlite3 peer from the hoisted package tree.
- `npm run build:backend`: passed.
- `npm run build:frontend`: passed.
- `npm run build:admin`: passed.
- `npm test -- --run`: passed, 12 test files / 30 tests.
- `npm run foundation:refresh -- --dry-run`: intentionally blocked by SQLite health guard because `ic_database/ic_papers.sqlite` is a 134-byte Git LFS pointer, not a real database.

Release decision remains: **not production-certified until the real SQLite database and provider API keys are available and runtime smoke tests complete.**

## Environment

- Date:
- Operator:
- Git commit:
- Node version:
- OS:
- Database path:
- Database size:
- Database is Git LFS pointer: yes / no
- Backend URL:
- Public frontend URL:
- Admin frontend URL:

## Setup Commands

```bash
npm install
npm run companies:seed
npm run build
npm run dev
npm run import:papers -- --query="adc" --limit=5 --dry-run
npm run identity:candidates -- --dry-run
npm run pdf:scan -- --dir=ic_database/pdf_inbox --dry-run
```

## API Smoke

| Check | URL / command | Result | Notes |
| --- | --- | --- | --- |
| live health | `/api/health/live` | pending | |
| ready health | `/api/health/ready` | pending | |
| search | `/api/search?q=ADC` | pending | |
| paper detail | `/api/papers/:id` | pending | |
| learning dashboard | `/api/learning` | pending | |
| companies | `/api/companies` | pending | |
| public site settings | `/api/site-settings` | pending | |
| public access request | `POST /api/access-requests` | pending | should work before login |
| company detail | `/api/companies/:id` | pending | |
| related papers | `/api/companies/:id/related-papers` | pending | |
| watchlist | `/api/watchlist` | pending | |
| reading queue | `/api/reading-queue` | pending | |
| institution compare | `/api/compare/institutions` | pending | |
| author compare | `/api/compare/authors` | pending | |
| mentor compare | `/api/compare/mentors` | pending | |
| company compare | `/api/compare/companies` | pending | |
| topic report | `/api/reports/topics/Power%20Management` | pending | |
| export topic report | `/api/exports/topic-report?field=Power%20Management&format=markdown` | pending | |
| export institution compare | `/api/exports/institution-compare?names=Tsinghua%20University,University%20of%20Macau&format=csv` | pending | |
| admin snapshots | `/api/admin/snapshots` | pending | |
| admin site settings | `/api/admin/site-settings` | pending | |
| admin access requests | `/api/admin/access-requests` | pending | admin-only |
| admin audit logs | `/api/admin/audit-logs` | pending | |

## Page Smoke

| Page | Result | Notes |
| --- | --- | --- |
| `/` | pending | |
| `/papers/:id` | pending | |
| `/learning` | pending | |
| `/learning-path` | pending | |
| `/learning/roadmaps/:slug` | pending | |
| `/companies` | pending | |
| `/companies/:id` | pending | |
| `/watchlist` | pending | |
| `/reading-queue` | pending | |
| `/compare` | pending | |
| `/compare/institutions` | pending | |
| `/compare/authors` | pending | |
| `/compare/mentors` | pending | |
| `/compare/companies` | pending | |
| `/exports` | pending | |
| `/reports` | pending | |
| `/reports/topics/Power%20Management` | pending | |
| `/billing` | pending | |
| `/legal` | pending | |
| `/request-access` | pending | public page outside login wall |
| `/admin/anything` on public frontend | pending | should show external admin handoff only |
| admin `/` | pending | |
| admin `/site-settings` | pending | |
| admin `/access-requests` | pending | |
| admin `/journal-ingestion` | pending | |
| admin `/moderation` | pending | |
| admin `/snapshots` | pending | |
| admin `/identity` | pending | |
| admin `/companies` | pending | |
| admin `/billing` | pending | |
| admin `/audit-logs` | pending | |
| admin `/backups` | pending | |
| admin `/scheduler` | pending | |
| admin `/observability` | pending | |

## Operations

| Operation | Result | Evidence |
| --- | --- | --- |
| backup create | pending | |
| backup list | pending | |
| snapshot refresh | pending | |
| data-quality maintenance run | pending | |
| scheduler manual run | pending | |
| ingestion job create/start/cancel/retry | pending | |
| site setting toggle | pending | should write admin audit log |
| access request approval | pending | should write admin audit log |
| export download | pending | should write `exportsPerMonth` usage event |
| admin audit log after mutation | pending | |

## Findings

Document every blocker, bug, performance issue, confusing copy, or data-quality caveat found during the run.

1. Real SQLite was not provided in this uploaded zip. `ic_database/ic_papers.sqlite` is pointer-sized, so runtime API/page/admin smoke tests remain pending.
2. Native `better-sqlite3` install could not be completed in the container because external downloads for prebuilds/headers were blocked by DNS failures. Release machines must run a normal `npm install` without `--ignore-scripts`.
3. Static verification is healthy: backend/frontend/admin builds passed, and backend unit tests passed.
4. Drizzle ORM was upgraded beyond the high advisory range; audit now reports no high or critical issues. Remaining moderate issues are dev-tooling advisories in the `drizzle-kit`/`esbuild` chain.

## Release Decision

- Ready for private alpha: no, not until real DB runtime smoke is complete.
- Ready for invite-only beta: no.
- Ready for public launch: no.
- Required fixes before next release: pull the real SQLite via Git LFS, run `npm install`, run seed/import/identity/PDF dry-runs, run API/page/admin smoke tests, attach evidence here, and resolve any runtime defects.
