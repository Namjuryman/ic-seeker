export function ensurePaperAiTables(sqlite: any) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS paper_ai_annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paper_id INTEGER NOT NULL,
      provider TEXT NOT NULL DEFAULT 'rule-local',
      model TEXT NOT NULL DEFAULT 'heuristic-v1',
      prompt_version TEXT NOT NULL DEFAULT 'paper-ai-v1',
      input_hash TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'zh-en',
      summary_zh TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      primary_domain TEXT NOT NULL DEFAULT '',
      labels_json TEXT NOT NULL DEFAULT '[]',
      topics_json TEXT NOT NULL DEFAULT '[]',
      entities_json TEXT NOT NULL DEFAULT '{}',
      metrics_json TEXT NOT NULL DEFAULT '[]',
      confidence REAL NOT NULL DEFAULT 0,
      cost_estimate_usd REAL NOT NULL DEFAULT 0,
      token_input INTEGER NOT NULL DEFAULT 0,
      token_output INTEGER NOT NULL DEFAULT 0,
      needs_review INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ok',
      error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_paper_ai_annotations_paper
      ON paper_ai_annotations(paper_id, updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_paper_ai_annotations_hash
      ON paper_ai_annotations(input_hash);

    CREATE INDEX IF NOT EXISTS idx_paper_ai_annotations_review
      ON paper_ai_annotations(needs_review, confidence);

    CREATE TABLE IF NOT EXISTS paper_ai_annotation_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope TEXT NOT NULL DEFAULT 'missing',
      provider TEXT NOT NULL DEFAULT 'rule-local',
      model TEXT NOT NULL DEFAULT 'heuristic-v1',
      prompt_version TEXT NOT NULL DEFAULT 'paper-ai-v1',
      status TEXT NOT NULL DEFAULT 'queued',
      queued INTEGER NOT NULL DEFAULT 0,
      processed INTEGER NOT NULL DEFAULT 0,
      failed INTEGER NOT NULL DEFAULT 0,
      skipped INTEGER NOT NULL DEFAULT 0,
      estimated_cost_usd REAL NOT NULL DEFAULT 0,
      actual_cost_usd REAL NOT NULL DEFAULT 0,
      options_json TEXT NOT NULL DEFAULT '{}',
      error TEXT,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_paper_ai_annotation_jobs_status
      ON paper_ai_annotation_jobs(status, created_at DESC);

    CREATE TABLE IF NOT EXISTS paper_ai_annotation_reviews (
      paper_id INTEGER NOT NULL,
      annotation_id INTEGER NOT NULL,
      review_status TEXT NOT NULL DEFAULT 'pending',
      reviewer TEXT,
      correction_json TEXT,
      notes TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (paper_id, annotation_id)
    );
  `);
}
