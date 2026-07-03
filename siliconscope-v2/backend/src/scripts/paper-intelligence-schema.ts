import Database from "better-sqlite3";

type Db = ReturnType<typeof Database>;

function hasColumn(sqlite: Db, table: string, column: string): boolean {
  try {
    const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    return rows.some((row) => row.name === column);
  } catch {
    return false;
  }
}

function addColumn(sqlite: Db, table: string, ddl: string) {
  const column = ddl.trim().split(/\s+/)[0];
  if (!hasColumn(sqlite, table, column)) sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

export function ensurePaperIntelligenceTables(sqlite: Db): void {
  addColumn(sqlite, "papers", "metadata_confidence INTEGER NOT NULL DEFAULT 0");
  addColumn(sqlite, "papers", "confidence_reasons_json TEXT NOT NULL DEFAULT '[]'");
  addColumn(sqlite, "papers", "confidence_flags_json TEXT NOT NULL DEFAULT '[]'");
  addColumn(sqlite, "papers", "provenance_json TEXT NOT NULL DEFAULT '[]'");
  addColumn(sqlite, "papers", "last_metadata_audit_at TEXT");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS paper_sources (
      id TEXT PRIMARY KEY,
      paper_id INTEGER NOT NULL,
      source TEXT NOT NULL,
      source_id TEXT,
      source_url TEXT,
      doi TEXT,
      title TEXT NOT NULL DEFAULT '',
      venue TEXT NOT NULL DEFAULT '',
      year INTEGER,
      authors_json TEXT NOT NULL DEFAULT '[]',
      affiliations_json TEXT NOT NULL DEFAULT '[]',
      raw_hash TEXT,
      payload_json TEXT,
      confidence INTEGER NOT NULL DEFAULT 0,
      fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_paper_sources_source_id
      ON paper_sources(source, source_id)
      WHERE source_id IS NOT NULL AND source_id != '';
    CREATE INDEX IF NOT EXISTS idx_paper_sources_paper_id ON paper_sources(paper_id);
    CREATE INDEX IF NOT EXISTS idx_paper_sources_doi ON paper_sources(LOWER(doi));

    CREATE TABLE IF NOT EXISTS paper_metadata_audits (
      id TEXT PRIMARY KEY,
      paper_id INTEGER NOT NULL,
      metadata_confidence INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'needs_review',
      source_count INTEGER NOT NULL DEFAULT 0,
      provenance_score INTEGER NOT NULL DEFAULT 0,
      flags_json TEXT NOT NULL DEFAULT '[]',
      reasons_json TEXT NOT NULL DEFAULT '[]',
      audit_method TEXT NOT NULL DEFAULT 'metadata-confidence-v1',
      audited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_paper_metadata_audits_paper_id ON paper_metadata_audits(paper_id, audited_at DESC);
    CREATE INDEX IF NOT EXISTS idx_paper_metadata_audits_status ON paper_metadata_audits(status, metadata_confidence);

    CREATE TABLE IF NOT EXISTS local_pdf_items (
      id TEXT PRIMARY KEY,
      paper_id INTEGER,
      file_path TEXT NOT NULL,
      file_hash TEXT,
      file_size INTEGER NOT NULL DEFAULT 0,
      title_guess TEXT NOT NULL DEFAULT '',
      doi_guess TEXT NOT NULL DEFAULT '',
      match_status TEXT NOT NULL DEFAULT 'unmatched',
      match_confidence INTEGER NOT NULL DEFAULT 0,
      page_count INTEGER,
      ocr_status TEXT NOT NULL DEFAULT 'not_started',
      extracted_text_hash TEXT,
      last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_local_pdf_items_path ON local_pdf_items(file_path);
    CREATE INDEX IF NOT EXISTS idx_local_pdf_items_paper_id ON local_pdf_items(paper_id);
    CREATE INDEX IF NOT EXISTS idx_local_pdf_items_match ON local_pdf_items(match_status, match_confidence DESC);

    CREATE TABLE IF NOT EXISTS author_identity_candidates (
      id TEXT PRIMARY KEY,
      normalized_key TEXT NOT NULL,
      canonical_name TEXT NOT NULL DEFAULT '',
      alias_json TEXT NOT NULL DEFAULT '[]',
      external_ids_json TEXT NOT NULL DEFAULT '{}',
      institution_history_json TEXT NOT NULL DEFAULT '[]',
      coauthor_signature_json TEXT NOT NULL DEFAULT '[]',
      paper_count INTEGER NOT NULL DEFAULT 0,
      confidence INTEGER NOT NULL DEFAULT 0,
      review_status TEXT NOT NULL DEFAULT 'pending',
      evidence_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_author_identity_candidates_key ON author_identity_candidates(normalized_key);
    CREATE INDEX IF NOT EXISTS idx_author_identity_candidates_review ON author_identity_candidates(review_status, confidence);

    CREATE TABLE IF NOT EXISTS institution_identity_candidates (
      id TEXT PRIMARY KEY,
      normalized_key TEXT NOT NULL,
      canonical_name TEXT NOT NULL DEFAULT '',
      aliases_json TEXT NOT NULL DEFAULT '[]',
      country_code TEXT,
      country_name TEXT,
      city TEXT,
      parent_institution TEXT,
      lab_or_school TEXT,
      company_affiliation TEXT,
      paper_count INTEGER NOT NULL DEFAULT 0,
      confidence INTEGER NOT NULL DEFAULT 0,
      review_status TEXT NOT NULL DEFAULT 'pending',
      evidence_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_institution_identity_candidates_key ON institution_identity_candidates(normalized_key);
    CREATE INDEX IF NOT EXISTS idx_institution_identity_candidates_review ON institution_identity_candidates(review_status, confidence);



    CREATE TABLE IF NOT EXISTS paper_ingestion_runs (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'manual',
      mode TEXT NOT NULL DEFAULT 'metadata_sync',
      query_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'queued',
      started_at TEXT,
      finished_at TEXT,
      fetched INTEGER NOT NULL DEFAULT 0,
      inserted INTEGER NOT NULL DEFAULT 0,
      updated INTEGER NOT NULL DEFAULT 0,
      deduped INTEGER NOT NULL DEFAULT 0,
      failed INTEGER NOT NULL DEFAULT 0,
      review_required INTEGER NOT NULL DEFAULT 0,
      provenance_json TEXT NOT NULL DEFAULT '[]',
      error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_paper_ingestion_runs_status ON paper_ingestion_runs(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_paper_ingestion_runs_provider ON paper_ingestion_runs(provider, mode);

    CREATE TABLE IF NOT EXISTS paper_dedupe_candidates (
      id TEXT PRIMARY KEY,
      candidate_key TEXT NOT NULL,
      candidate_type TEXT NOT NULL DEFAULT 'title_year',
      paper_ids_json TEXT NOT NULL DEFAULT '[]',
      doi_values_json TEXT NOT NULL DEFAULT '[]',
      title_values_json TEXT NOT NULL DEFAULT '[]',
      source_values_json TEXT NOT NULL DEFAULT '[]',
      confidence INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open',
      reasons_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_paper_dedupe_key_type ON paper_dedupe_candidates(candidate_type, candidate_key);
    CREATE INDEX IF NOT EXISTS idx_paper_dedupe_status ON paper_dedupe_candidates(status, confidence DESC);

    CREATE TABLE IF NOT EXISTS reading_workflow_items (
      user_id INTEGER NOT NULL DEFAULT 0,
      paper_id INTEGER NOT NULL,
      reading_goal TEXT NOT NULL DEFAULT '',
      literature_review_note TEXT NOT NULL DEFAULT '',
      project_note TEXT NOT NULL DEFAULT '',
      application_note TEXT NOT NULL DEFAULT '',
      summary_text TEXT NOT NULL DEFAULT '',
      key_contributions_json TEXT NOT NULL DEFAULT '[]',
      limitations_json TEXT NOT NULL DEFAULT '[]',
      next_review_at TEXT,
      exported_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, paper_id)
    );
    CREATE INDEX IF NOT EXISTS idx_reading_workflow_review ON reading_workflow_items(user_id, next_review_at);

    CREATE TABLE IF NOT EXISTS daily_circuit_items (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      topic_id TEXT,
      roadmap_slug TEXT NOT NULL DEFAULT '',
      circuit_kind TEXT NOT NULL DEFAULT 'concept',
      payload_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'published',
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_daily_circuit_roadmap ON daily_circuit_items(roadmap_slug, display_order);
    CREATE INDEX IF NOT EXISTS idx_daily_circuit_status ON daily_circuit_items(status, display_order);

    CREATE TABLE IF NOT EXISTS institution_geo_points (
      normalized_key TEXT PRIMARY KEY,
      canonical_name TEXT NOT NULL DEFAULT '',
      country_code TEXT,
      country_name TEXT,
      region TEXT,
      city TEXT,
      latitude REAL,
      longitude REAL,
      geocode_source TEXT NOT NULL DEFAULT 'manual_or_alias',
      confidence INTEGER NOT NULL DEFAULT 0,
      evidence_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_institution_geo_city ON institution_geo_points(country_code, city);

    CREATE TABLE IF NOT EXISTS entity_profile_snapshots (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_key TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      confidence INTEGER NOT NULL DEFAULT 0,
      generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      source_version TEXT NOT NULL DEFAULT 'entity-profile-v1'
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_profile_latest ON entity_profile_snapshots(entity_type, entity_key, source_version);

    CREATE TABLE IF NOT EXISTS search_index_documents (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      facets_json TEXT NOT NULL DEFAULT '{}',
      ranking_json TEXT NOT NULL DEFAULT '{}',
      metadata_confidence INTEGER NOT NULL DEFAULT 0,
      source_version TEXT NOT NULL DEFAULT 'search-doc-v1',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_search_docs_target ON search_index_documents(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_search_docs_type_confidence ON search_index_documents(target_type, metadata_confidence DESC);

    CREATE TABLE IF NOT EXISTS billing_entitlements (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      entitlement_key TEXT NOT NULL,
      value_json TEXT NOT NULL DEFAULT '{}',
      enforcement_mode TEXT NOT NULL DEFAULT 'soft',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_entitlements_plan_key ON billing_entitlements(plan_id, entitlement_key);

    CREATE TABLE IF NOT EXISTS source_fetch_attempts (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      source TEXT NOT NULL,
      query TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'queued',
      attempt INTEGER NOT NULL DEFAULT 1,
      http_status INTEGER,
      error TEXT,
      started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at TEXT,
      payload_bytes INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_source_fetch_attempts_run ON source_fetch_attempts(run_id, source, status);
  `);
}
