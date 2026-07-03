# SiliconScope

SiliconScope is an IC paper search, reading-management, learning, and academic-intelligence platform.

The repository now keeps **SiliconScope v2** as the only active application code path. The old v1 single-process prototype (`ic_seeker/`) has been removed from the tracked source tree to avoid maintaining two product architectures at once.

## Active Product

Use this folder for all development:

```text
siliconscope-v2/
```

The active architecture is frontend/backend separated:

```text
siliconscope-v2/
  frontend/          React + Vite public research app
  frontend-admin/    Independent admin console
  backend/           Express + TypeScript API server
  ic_database/       v2 SQLite metadata snapshot and local data folders
  docs/              v2 architecture, deployment, methodology, and roadmap docs
```

## Preserved Data

The first-version app code was removed, but data assets are intentionally preserved:

```text
ic_database/
siliconscope-v2/ic_database/
```

These contain SQLite/CSV snapshots, summaries, raw source reports, PDF inbox folders, and other metadata artifacts that may still be useful for v2 imports or comparison.

## Run v2 Locally

From the repository root:

```powershell
cd E:\美好暑假
npm start
```

Or from the v2 folder:

```powershell
cd E:\美好暑假\siliconscope-v2
npm run dev
```

Typical local services:

```text
Frontend: http://127.0.0.1:5173
Backend:  http://127.0.0.1:8751
Admin:    http://127.0.0.1:5176
```

## Build

From the repository root:

```powershell
npm run build:v2
```

Or from the v2 folder:

```powershell
npm run build
```

## Docker

The root Docker entry now points to v2 only:

```powershell
npm run docker:up
```

Equivalent:

```powershell
cd E:\美好暑假\siliconscope-v2
docker compose up --build
```

## Root Scripts

The root package intentionally keeps only thin v2 wrappers and database utilities that do not depend on the removed v1 app:

```powershell
npm start
npm run build:v2
npm run docker:up
npm run merge:databases
npm run repair:pmic-domains
```

New ingestion, AI annotation, company intelligence, topic taxonomy, snapshots, and admin workflows should be implemented under `siliconscope-v2/backend/src/scripts` and exposed through v2 services.

## Historical Note

The old v1 prototype proved the initial IC paper-search idea and helped seed the database, scoring policies, and early UI experiments. Its source code is no longer part of the active repository. The historical context is kept in:

```text
docs/LEGACY_V1_ARCHIVE.md
```

## Data Policy

SiliconScope stores bibliographic metadata, analytics, notes, and links to official publisher pages. It does not bypass paywalls, mass-download copyrighted PDFs, or redistribute publisher PDFs. User-provided PDFs are for private local reading workflows only.
