# Legacy v1 Archive

This document preserves the history of the first SiliconScope / IC Seeker prototype after the v1 source tree was removed from the active repository.

## Current Status

The active product line is:

```text
siliconscope-v2/
```

The old v1 single-process app previously lived at:

```text
ic_seeker/
```

That app code has been removed from tracked source. The repository should no longer expose v1 runtime commands, v1 Docker files, or v1 frontend/backend code.

## What Was Preserved

The database assets were intentionally kept because v2 reuses or can compare against them:

```text
ic_database/
siliconscope-v2/ic_database/
```

These folders may contain SQLite snapshots, CSV exports, raw source reports, PDF inbox folders, and local metadata artifacts.

## Why v1 Existed

v1 started as a local ChipSeeker-style prototype for IC paper discovery and personal reading management. It helped validate:

- local SQLite paper search;
- FTS5 metadata search;
- IC venue scoring and topic classification;
- paper detail rail interactions;
- DOI/manual import ideas;
- favorites, reading status, notes, and tags;
- author and institution ranking prototypes;
- regional intelligence map prototypes;
- mentor and institution review concepts;
- venue matrix and data-quality pages;
- local PDF inbox matching concepts.

## Why v1 Was Removed

The v1 implementation accumulated too much product and data logic in one local Node app and several large frontend files. Keeping it beside v2 made the repository confusing and encouraged changes to the wrong product surface.

SiliconScope now needs:

- frontend/backend separation;
- independent admin deployment;
- typed API services;
- precomputed snapshots;
- better identity normalization;
- scalable ingestion jobs;
- reviewable data-quality workflows;
- future Postgres/search/object-storage migration.

Those goals belong in v2.

## Migration Rule

All new work should target:

```text
siliconscope-v2/
```

If old behavior needs to be recovered, use Git history or the preserved data snapshots rather than reintroducing the v1 app.
