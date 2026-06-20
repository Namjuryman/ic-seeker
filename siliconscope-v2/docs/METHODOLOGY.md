# Methodology

## Data Sources

IC Seeker can collect metadata from:

- IEEE Xplore Metadata API, when `IEEE_API_KEY` is available
- OpenAlex
- Crossref

IEEE is preferred when configured. Public sources are used as fallback or for venue-year backfill.

## Venue Collection

Proceedings-like venues are collected by venue and year. Journal-like venues use source-year queries where possible.

The builder supports isolated output with `--out-root`, so each venue can be rebuilt and inspected before merging into the main database.

## Author And Institution Profiles

Author scores use name-based aggregation:

```text
author_score = score_sum + 5 * s_plus_count + 2 * s_count + citation_count / 50
```

Institution scores use the same formula over affiliation strings.

These are useful for exploration, but not final bibliometric judgments. The next step should be identity normalization: ORCID, DBLP/OpenAlex author IDs, affiliation normalization, and manual merge/split rules.

## Known Coverage Notes

- ISSCC 2025 is around the expected 246-paper scale in the current crawl, depending on front matter and duplicate filtering.
- JSSC 2025 may exceed user-visible issue counts because public metadata can include early access and related records.
- ESSCIRC 2020 has no normal proceedings due to cancellation.
- ESSCIRC/ESSDERC naming changes around 2024 are represented with `ESSERC`.
