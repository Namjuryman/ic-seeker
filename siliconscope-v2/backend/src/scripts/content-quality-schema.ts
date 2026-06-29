export function ensureContentQualityTables(sqlite: any) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS content_quality_findings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint TEXT NOT NULL UNIQUE,
      finding_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'open',
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      evidence_json TEXT NOT NULL DEFAULT '{}',
      source TEXT NOT NULL DEFAULT 'data-quality',
      first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_content_quality_status
      ON content_quality_findings(status, severity, last_seen_at DESC);

    CREATE INDEX IF NOT EXISTS idx_content_quality_type_status
      ON content_quality_findings(finding_type, status);

    CREATE INDEX IF NOT EXISTS idx_content_quality_target
      ON content_quality_findings(target_type, target_id);
  `);
}
