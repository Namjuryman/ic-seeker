# Local PDF Workflow

SiliconScope supports a local-only personal PDF index. This is not a PDF repository and not a redistribution feature.

## Principles

- PDF files stay on the user's machine or private storage.
- The app stores local paths, hashes, match status, and OCR status only.
- The app must not upload copyrighted PDFs to SiliconScope servers by default.
- Exports may include metadata, citation data, source links, and user-owned notes/tags, but not copyrighted PDF files.

## Scan command

```bash
cd siliconscope-v2
npm run pdf:scan -- --dir=ic_database/pdf_inbox --dry-run
npm run pdf:scan -- --dir=/path/to/personal/pdf/library
```

If `--dir` is omitted, the script uses `LOCAL_PDF_LIBRARY` or the configured PDF inbox path.

## Matching strategy

`backend/src/services/local-pdf-matching.ts` implements a conservative v1 matcher:

1. Extract DOI-like text from the path/filename/sample text.
2. Match exact DOI against existing `papers.doi`.
3. Fall back to normalized filename-title overlap.
4. Store match score and match reason in `local_pdf_items`.

The scanner currently reads file metadata and a small byte sample. Full PDF text extraction and OCR are intentionally left for a later adapter so the core workflow stays dependency-light.

## Persistence

`local_pdf_items` stores:

- `file_path`
- `file_name`
- `sha256`
- `size_bytes`
- `detected_doi`
- `guessed_title`
- `matched_paper_id`
- `match_confidence`
- `match_reason`
- `ocr_status`
- `read_progress_json`
- `last_scanned_at`

If a confident match is found and `papers.local_pdf` is empty, the scanner can attach the local path to the matched paper.

## Next implementation slice

- Admin/user UI to review matched, unmatched, and ambiguous PDFs.
- Manual match, unmatch, ignore, and rescan actions.
- Optional local OCR adapter that writes extracted text to a local-only index.
- Reading progress and last-opened integration with Reading Queue.
