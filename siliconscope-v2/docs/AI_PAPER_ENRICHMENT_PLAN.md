# AI Paper Enrichment Plan

SiliconScope should use low-cost AI models as an offline annotation layer, not as the source of truth. The raw paper metadata remains immutable; AI output becomes versioned enrichment that can be audited, regenerated, and corrected.

## Why This Fits The Product

The current keyword classifier is fast and explainable, but it cannot reliably understand paper intent, circuit topology, contribution type, metrics, or cross-domain papers. A cheap model pass over title, abstract, venue, year, and available metadata can produce better labels without requiring full PDF redistribution.

This should be part of the weekly refresh flow:

```text
1. Import new metadata
2. Run deterministic normalization and keyword topic edges
3. Run low-cost AI enrichment for missing/stale rows
4. Validate JSON schema and confidence
5. Write enrichment rows and derived topic edges
6. Refresh snapshots/search/report caches
7. Surface uncertain samples in admin review
```

## Data Model

Recommended tables:

- `paper_ai_annotations`
  - `paper_id`
  - `provider`
  - `model`
  - `prompt_version`
  - `input_hash`
  - `language`
  - `summary_zh`
  - `summary_en`
  - `labels_json`
  - `topics_json`
  - `entities_json`
  - `metrics_json`
  - `confidence`
  - `cost_estimate_usd`
  - `token_input`
  - `token_output`
  - `status`
  - `error`
  - `created_at`
  - `updated_at`

- `paper_ai_annotation_jobs`
  - `id`
  - `scope`
  - `provider`
  - `model`
  - `prompt_version`
  - `status`
  - `queued`
  - `processed`
  - `failed`
  - `estimated_cost_usd`
  - `actual_cost_usd`
  - `started_at`
  - `finished_at`

- `paper_ai_annotation_reviews`
  - `paper_id`
  - `annotation_id`
  - `review_status`
  - `reviewer`
  - `correction_json`
  - `notes`
  - `reviewed_at`

The first version can stay in SQLite. For public SaaS, move these app/business tables to PostgreSQL and keep the paper corpus in the metadata store.

## Output Schema

Use strict JSON. Do not ask for prose-only output.

```json
{
  "summary_zh": "Short Chinese summary",
  "summary_en": "One-sentence English summary",
  "primary_domain": "Power Management",
  "topic_path": ["PMIC", "Hybrid Converter", "Switched-Capacitor Converter"],
  "circuit_blocks": ["DC-DC converter", "switched-capacitor stage"],
  "methods": ["dual-path hybrid", "continuous-current-input"],
  "metrics": [
    { "name": "efficiency", "value": "93%", "context": "peak or reported efficiency" },
    { "name": "power", "value": "10.5 W", "context": "output/input capability if stated" }
  ],
  "process_or_node": [],
  "application": ["12 V/24 V input power conversion"],
  "novelty": ["hybrid topology", "input-current reduction"],
  "negative_labels": ["RF/mmWave"],
  "confidence": 0.86,
  "needs_review": false
}
```

## Prompt Rules

The model must be told:

- Use only the supplied metadata.
- If abstract is missing, mark `needs_review: true`.
- Do not infer unmentioned process nodes, companies, or measurements.
- Prefer IC-specific labels from the current taxonomy.
- Return empty arrays rather than guessing.
- Include negative labels when the title has misleading words, such as wireless power versus RF communication.
- Keep summaries metadata-only and do not reproduce copyrighted text.

## Cost Control

Do not enrich everything on every run.

Priority order:

1. New papers imported since the last run.
2. Papers with `General IC`, low `domain_hits`, or no `paper_topic_edges`.
3. S+/S/SS+/SSS venues and highly cited papers.
4. Papers returned frequently in search/watchlists.
5. Old long-tail papers only when requested by an admin batch.

Use input hashing:

```text
input_hash = hash(title + abstract + venue + year + doi + prompt_version)
```

Skip rows whose latest annotation has the same `input_hash` and a compatible prompt version.

## Provider Strategy

Keep providers behind an adapter:

```text
AiAnnotationProvider
  annotatePaper(input): Promise<AnnotationResult>
```

Do not hard-code one vendor. Low-cost models are enough for tagging and short summaries, while expensive models should be reserved for paid reports, difficult review queues, and high-value paper reading.

Provider config should live in environment variables or admin settings:

- `AI_ENRICHMENT_PROVIDER`
- `AI_ENRICHMENT_MODEL`
- `AI_ENRICHMENT_MAX_DAILY_COST_USD`
- `AI_ENRICHMENT_MAX_BATCH_SIZE`
- `AI_ENRICHMENT_ENABLED`

## Validation

Every model response must pass deterministic checks:

- Valid JSON.
- Confidence is within `0..1`.
- `primary_domain` exists in known domains or is empty.
- `topic_path` maps to known taxonomy nodes when possible.
- Metrics include value and context, not free-floating numbers.
- Suspicious results set `needs_review: true`.

If validation fails, store the error and do not update derived edges.

## How It Connects To Existing Tables

- `paper_ai_annotations` stores the model output.
- `paper_topic_edges` receives derived topic edges with `method = ai-cheap-v1` and evidence from the annotation.
- Topic reports can show AI summaries only when annotation confidence is above a threshold.
- Search indexing can include `summary_zh`, `summary_en`, circuit blocks, methods, and applications.
- Data Quality can surface low-confidence or conflicting AI/rule labels for admin review.

## First Implementation Milestone

Status: implemented as a local rule-based MVP. This creates the durable versioned annotation layer first, without spending API budget or making page render depend on model calls.

Implemented:

1. DB tables and Drizzle schema:
   - `paper_ai_annotations`
   - `paper_ai_annotation_jobs`
   - `paper_ai_annotation_reviews`
2. Provider-neutral `rule-local` service that reads only title, abstract, venue, year, DOI, current domain, and the local topic taxonomy.
3. CLI command:

```powershell
npm --workspace siliconscope-v2-backend run ai:annotate-papers -- --limit=200 --mode=missing
```

Useful variants:

```powershell
# Inspect candidates without writing rows
npm --workspace siliconscope-v2-backend run ai:annotate-papers -- --mode=weak --limit=50 --dry-run

# Annotate weakly classified papers and also write derived paper_topic_edges
npm --workspace siliconscope-v2-backend run ai:annotate-papers -- --mode=weak --limit=500 --min-topic-confidence=55

# Revisit rows whose source metadata changed since the previous prompt version/hash
npm --workspace siliconscope-v2-backend run ai:annotate-papers -- --mode=stale --limit=500
```

4. Admin API:
   - `GET /api/admin/ai-enrichment/overview`
   - `GET /api/admin/ai-enrichment/annotations`
   - `POST /api/admin/ai-enrichment/run`

Remaining:

1. Add the independent-admin UI page for job history, cost estimate, failed rows, and samples.
2. Add one real provider adapter only after API key, budget limit, and prompt validation are ready.
3. Add review tools to approve/correct generated topic paths and metric extraction.

This keeps the product cheap and scalable: old papers get one bulk annotation pass, and weekly imports only annotate new or changed rows.
