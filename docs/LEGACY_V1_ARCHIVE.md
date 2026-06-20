# Legacy v1 Archive

This document preserves the history of the first SiliconScope / IC Seeker prototype.

The active product line is now:

```text
siliconscope-v2/
```

The v1 implementation remains here:

```text
ic_seeker/
```

## Why v1 Exists

v1 started as a local ChipSeeker-style prototype for IC paper discovery and personal reading management. It proved that the project idea was useful before the system was reorganized into a frontend/backend separated architecture.

It helped validate:

- local SQLite paper search
- FTS5 search over paper metadata
- IC venue scoring and topic classification
- paper detail rail
- DOI import and manual import
- favorites, reading status, notes, and tags
- author/professor ranking prototypes
- institution ranking prototypes
- regional intelligence map prototypes
- mentor/institution review prototypes
- venue matrix and data-quality pages
- local PDF inbox matching concept

## Why v1 Is Archived

v1 accumulated too much product and data logic in a single local Node app and large frontend files. It was good for fast exploration, but it became hard to maintain as the product moved toward:

- public/private deployment modes
- richer frontend interactions
- API-first architecture
- precomputed weekly database snapshots
- author/institution identity maintenance
- mentor review workflows
- a polished AMiner-style UI
- future mobile/PWA surfaces

The v2 split is the intended foundation for those goals.

## Current Status

v1 is not deleted because it is still useful for:

- checking old behavior
- comparing scoring and classification changes
- recovering UI ideas that worked better
- migrating scripts or data utilities
- debugging regressions against an older known prototype

But v1 should not receive new product features by default.

## Legacy Runtime

The old app can still be started intentionally:

```powershell
npm run legacy:start
```

The legacy Docker path is also retained:

```powershell
npm run legacy:docker:up
```

These commands are for archival/reference use only.

## Migration Notes

Already migrated or reimplemented in v2:

- paper search UI
- paper detail pages
- author/institution/topic/geo navigation
- mentor/institution prototype
- venue matrix
- data quality views
- IC learning roadmap
- frontend/backend separation
- TypeScript backend services
- React/Vite frontend

Still useful to mine from v1:

- database builder scripts
- venue policy experiments
- classification edge cases
- hidden/broad-journal policy history
- local PDF matching workflow
- early map and ranking heuristics

## Rule Going Forward

Use v2 for all new work.

Only touch v1 when the task explicitly says:

- restore old behavior for comparison
- migrate a script or policy into v2
- inspect old data logic
- fix a critical archive/runtime issue

Otherwise, leave v1 as a historical trace.
