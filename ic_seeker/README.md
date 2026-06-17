# IC Seeker

Local ChipSeeker-style paper search, reading, and academic-intelligence web app for IC papers.

Search is fully local. The database is a SQLite file with an FTS5 full-text
index over title, abstract, authors, venue, domain, and DOI.

Current web features include paper search, reading notes, favorites, tags, author and institution profiles, topic intelligence, a regional intelligence map, and quick citation copy in IEEE/APA/BibTeX formats.

## Build Database

From the workspace root:

```powershell
node .\scripts\build-ic-database.mjs --years=2016-2026 --max-per-venue-year=220 --max-per-venue=1800
```

Outputs:

- `ic_database/ic_papers.sqlite`
- `ic_database/ic_chipseeker.csv`
- `ic_database/pdfs/`
- `ic_database/pdf_inbox/`

The CSV follows the field layout used by ChipSeeker-style imports.
The builder combines yearly venue search with source backfill, which improves
coverage for proceedings-like venues such as ISSCC.

If you have IEEE Xplore API access, set an API key before building:

```powershell
$env:IEEE_API_KEY="your_ieee_xplore_api_key"
node .\scripts\build-ic-database.mjs --years=2016-2026 --max-per-venue-year=220 --no-source-backfill
```

With `IEEE_API_KEY`, IEEE Xplore metadata is queried first. Without it, the
builder falls back to OpenAlex and Crossref metadata.

After importing or rebuilding, repair obvious PMIC/DC-DC topic misses with:

```powershell
node .\scripts\repair-power-management-domains.mjs
```

## Run App

```powershell
node .\ic_seeker\server.mjs
```

Open:

```text
http://127.0.0.1:8750
```

## Notes

- Metadata is collected from public scholarly metadata APIs.
- IEEE PDFs are not mass-downloaded by default. Use institution access slowly and legally.
- The app is independent from Zotero and does not modify the Zotero library.
- Scoring is transparent in the app: venue base score plus domain keyword hits,
  citation boost, and recency boost.
- The regional map is metadata-only and infers country from affiliation strings;
  it should be upgraded with canonical institution identities later.
- Local PDF matching is available with:

```powershell
node .\scripts\import-local-pdfs.mjs
```

Put PDF files in `ic_database/pdf_inbox/`. Filenames containing a DOI or IEEE
article number are matched into the SQLite database and moved under
`ic_database/pdfs/`.
