# Runtime QA Results

Use this file to record evidence from a real local or production-like run. Do not mark runtime QA complete from TypeScript/Vite build results alone.

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

```powershell
npm install
npm run companies:seed
npm run build
npm run dev
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
| company detail | `/api/companies/:id` | pending | |
| related papers | `/api/companies/:id/related-papers` | pending | |
| watchlist | `/api/watchlist` | pending | |
| reading queue | `/api/reading-queue` | pending | |
| institution compare | `/api/compare/institutions` | pending | |
| author compare | `/api/compare/authors` | pending | |
| mentor compare | `/api/compare/mentors` | pending | |
| company compare | `/api/compare/companies` | pending | |
| topic report | `/api/reports/topics/Power%20Management` | pending | |
| admin snapshots | `/api/admin/snapshots` | pending | |
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
| `/reports` | pending | |
| `/reports/topics/Power%20Management` | pending | |
| `/billing` | pending | |
| `/legal` | pending | |
| admin `/` | pending | |
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
| admin audit log after mutation | pending | |

## Findings

Document every blocker, bug, performance issue, confusing copy, or data-quality caveat found during the run.

1.

## Release Decision

- Ready for private alpha: yes / no
- Ready for invite-only beta: yes / no
- Ready for public launch: yes / no
- Required fixes before next release:
