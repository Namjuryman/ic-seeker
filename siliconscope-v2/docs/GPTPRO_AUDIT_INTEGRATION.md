# GPT Pro Audit Integration

Date: 2026-07-01

This note records the parts of `siliconscope-v2-audit-and-fixes.zip` that were merged into the active SiliconScope v2 mainline. The zip was treated as an audit patch set, not as a replacement tree, because the current repository already contains newer company intelligence, data quality, AI enrichment, and admin-console work.

## Integrated

- Added SQLite file health detection:
  - detects missing database files;
  - detects Git LFS pointer files;
  - detects tiny non-production database files;
  - validates the SQLite header before backend startup.
- Added watchlist utilities and tests:
  - target-type validation;
  - saved-search query canonicalization;
  - deterministic query hashes;
  - 8 KB query JSON guardrail.
- Reworked Reading Queue compatibility:
  - split reading state from importance and use cases;
  - preserved legacy statuses such as `important` and `use_for_project`;
  - removed mojibake labels and centralized Chinese labels in `reading-queue-utils`.
- Added Mentor Compare privacy utilities and tests:
  - `<3` approved reviews: hide aggregate, summary, and comments;
  - `3-4`: aggregate only;
  - `5-9`: threshold-safe summary only;
  - `>=10`: sanitized curated comments.
- Added reusable utilities and tests for:
  - billing quota evaluation;
  - company SQL `LIKE` escaping;
  - export formatting;
  - learning catalog validation;
  - topic taxonomy tree construction.
- Rewired existing services to use the merged utilities where low-risk:
  - `watchlist.service.ts`
  - `reading-queue.service.ts`
  - `mentor-compare.service.ts`
  - `billing.service.ts`
  - `company.service.ts`
  - `export.service.ts`
  - `topic-taxonomy.service.ts`

## Deferred

- Full package dependency upgrades from the zip are not blindly applied. Dependency bumps should be done with a lockfile update and build verification.
- Full frontend page replacements from the zip are deferred because the current UI has newer company intelligence and admin work.
- The zip database is not used. It contains a tiny Git LFS pointer, not the real SQLite database.
- Large documentation rewrites from the zip are not copied verbatim because some text is stale or encoding-damaged. Existing docs remain the source of truth, with this note acting as the integration record.

## Operational Notes

- Backend startup now fails early when `DATABASE_URL` points at a pointer, missing file, tiny file, or invalid SQLite file.
- Set `SKIP_SQLITE_FILE_HEALTH=1` only for special tests or migrations that intentionally use a non-file SQLite target.
- The local database is a runtime artifact and should not be committed unless a deliberate demo database snapshot is being prepared.
