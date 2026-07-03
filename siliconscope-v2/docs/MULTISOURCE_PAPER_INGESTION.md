# Multi-source Paper Ingestion v1

This document describes the v1 ingestion foundation added for SiliconScope v2. It is metadata-only. It does not download or redistribute copyrighted PDFs.

## Goals

- Collect IC-relevant scholarly metadata from multiple sources.
- Normalize DOI, title, venue, year, authors, affiliations, abstract, citation count, and source URLs.
- Dedupe across DOI, OpenAlex ID, IEEE article number, Semantic Scholar IDs, DBLP URL, and normalized title/year.
- Preserve provenance for every source record.
- Compute `metadata_confidence` and route weak records to admin review.
- Support dry-run operation so provider changes can be tested safely.

## Supported sources

`backend/src/scripts/paper-import/sources.ts` supports:

- `openalex`
- `crossref`
- `ieee`
- `semantic-scholar`
- `dblp`
- `scholar-csv`
- `csv`
- `aminer`

The default source set is now OpenAlex, Crossref, Semantic Scholar, and DBLP. IEEE is opt-in and requires a user-provided API key.

## Useful commands

```bash
cd siliconscope-v2
npm run import:papers -- --query="hybrid dc-dc converter" --years=2020-2026 --limit=100 --dry-run
npm run import:papers -- --sources=openalex,crossref,semantic-scholar,dblp --queries="adc,pll,pmic" --year-from=2016 --year-to=2026 --limit=100
npm run import:papers -- --sources=ieee,openalex,crossref --venues=ISSCC,JSSC,CICC,ASSCC,ESSCIRC --year-from=2000 --year-to=2026 --limit=100
npm run import:papers -- --sources=scholar-csv,csv,aminer --scholar-csv=exports/scholar.csv --csv=exports/manual.csv --aminer-json=exports/aminer.json
```

## Environment variables

```bash
OPENALEX_API_KEY=
CROSSREF_MAILTO=researcher@example.com
IEEE_API_KEY=
IEEE_XPLORE_API_KEY=
SEMANTIC_SCHOLAR_API_KEY=
PAPER_IMPORT_RETRY_COUNT=2
```

`SEMANTIC_SCHOLAR_API_KEY` is sent as `x-api-key`. OpenAlex keys are sent as an `api-key` query parameter when configured.

## New persistence model

`ensurePaperIntelligenceTables()` adds these structures:

- `papers.metadata_confidence`
- `papers.confidence_reasons_json`
- `papers.confidence_flags_json`
- `papers.provenance_json`
- `papers.last_metadata_audit_at`
- `paper_sources`
- `paper_metadata_audits`
- `source_fetch_attempts`

These tables let admin tools show why a paper was trusted, imported as usable, or routed to review.

## Metadata confidence

`backend/src/services/paper-metadata-confidence.ts` computes a deterministic score from:

- DOI format and cross-source DOI agreement.
- Year plausibility and cross-source year agreement.
- Venue/publication-title consistency.
- Author and affiliation presence.
- Number and diversity of sources.
- Cross-source title, author, and affiliation consistency.

Status levels:

- `trusted`: strong metadata, generally no manual action.
- `usable`: adequate metadata but not perfect.
- `needs_review`: weak or conflicting metadata.
- `blocked`: severe metadata problems.

## Admin review loop

Data Quality now includes low metadata-confidence papers and can sync them into persistent findings as `low_metadata_confidence`. The next slice should add one-click paper edit, merge, accept, reject, and source-blacklist actions.

## Non-goals

- No publisher PDF crawling.
- No paywall bypassing.
- No resale of third-party databases.
- No hidden global school/professor/company ranking without methodology and provenance caveats.
