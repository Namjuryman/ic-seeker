const PERFORMANCE_INDEXES = [
  "CREATE INDEX IF NOT EXISTS idx_papers_year_score ON papers(year DESC, quality_score DESC)",
  "CREATE INDEX IF NOT EXISTS idx_papers_score_year ON papers(quality_score DESC, year DESC)",
  "CREATE INDEX IF NOT EXISTS idx_papers_citations_score ON papers(citation_count DESC, quality_score DESC)",
  "CREATE INDEX IF NOT EXISTS idx_papers_venue ON papers(venue)",
  "CREATE INDEX IF NOT EXISTS idx_papers_domain ON papers(domain)",
  "CREATE INDEX IF NOT EXISTS idx_papers_venue_rank ON papers(venue_rank)",
  "CREATE INDEX IF NOT EXISTS idx_papers_doi ON papers(doi)",
  "CREATE INDEX IF NOT EXISTS idx_papers_openalex_id ON papers(openalex_id)",
  "CREATE INDEX IF NOT EXISTS idx_papers_local_pdf ON papers(local_pdf)",
  "CREATE INDEX IF NOT EXISTS idx_favorites_user_paper ON favorites(user_id, paper_id)",
  "CREATE INDEX IF NOT EXISTS idx_paper_tags_user_paper ON paper_tags(user_id, paper_id)",
  "CREATE INDEX IF NOT EXISTS idx_paper_tags_user_tag ON paper_tags(user_id, tag_id)",
  "CREATE INDEX IF NOT EXISTS idx_reading_status_user_status ON reading_status(user_id, status)",
  "CREATE INDEX IF NOT EXISTS idx_notes_user_paper ON notes(user_id, paper_id)",
  "CREATE INDEX IF NOT EXISTS idx_paper_comments_paper_status_created ON paper_comments(paper_id, moderation_status, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_paper_comments_status_created ON paper_comments(moderation_status, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_mentor_reviews_prof_status_created ON mentor_reviews(professor_id, moderation_status, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_mentor_reviews_status_created ON mentor_reviews(moderation_status, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_content_reports_status_created ON content_reports(status, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_moderation_logs_created ON moderation_logs(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_created ON admin_audit_logs(actor_user_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource ON admin_audit_logs(resource_type, resource_id)",
  "CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status)",
  "CREATE INDEX IF NOT EXISTS idx_billing_events_user_created ON billing_events(user_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_billing_events_provider_event ON billing_events(provider, provider_event_id)",
  "CREATE INDEX IF NOT EXISTS idx_usage_events_user_metric_created ON usage_events(user_id, metric, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_institution_aliases_canonical ON institution_aliases(canonical_name)",
  "CREATE INDEX IF NOT EXISTS idx_author_aliases_canonical ON author_aliases(canonical_name)",
];

function tableColumns(sqlite: any, table: string): string[] {
  return sqlite.prepare(`PRAGMA table_info(${table})`).all().map((row: any) => String(row.name));
}

function hasTable(sqlite: any, table: string): boolean {
  const row = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
  return Boolean(row);
}

function migrateUserScopedTables(sqlite: any) {
  // Older v2 builds used paper_id as the primary key for favorites/notes/status.
  // That makes all users share one reading workspace. Rebuild those tables into
  // user-scoped composite-key tables while keeping existing rows under user_id=0.
  if (hasTable(sqlite, "favorites") && !tableColumns(sqlite, "favorites").includes("user_id")) {
    sqlite.exec(`
      ALTER TABLE favorites RENAME TO favorites_old_userless;
      CREATE TABLE favorites (
        user_id INTEGER NOT NULL DEFAULT 0,
        paper_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, paper_id)
      );
      INSERT OR IGNORE INTO favorites (user_id, paper_id, created_at)
        SELECT 0, paper_id, COALESCE(created_at, CURRENT_TIMESTAMP) FROM favorites_old_userless;
      DROP TABLE favorites_old_userless;
    `);
  }

  if (hasTable(sqlite, "reading_status") && !tableColumns(sqlite, "reading_status").includes("user_id")) {
    sqlite.exec(`
      ALTER TABLE reading_status RENAME TO reading_status_old_userless;
      CREATE TABLE reading_status (
        user_id INTEGER NOT NULL DEFAULT 0,
        paper_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'unread',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, paper_id)
      );
      INSERT OR IGNORE INTO reading_status (user_id, paper_id, status, updated_at)
        SELECT 0, paper_id, COALESCE(status, 'unread'), COALESCE(updated_at, CURRENT_TIMESTAMP) FROM reading_status_old_userless;
      DROP TABLE reading_status_old_userless;
    `);
  }

  if (hasTable(sqlite, "notes") && !tableColumns(sqlite, "notes").includes("user_id")) {
    sqlite.exec(`
      ALTER TABLE notes RENAME TO notes_old_userless;
      CREATE TABLE notes (
        user_id INTEGER NOT NULL DEFAULT 0,
        paper_id INTEGER NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, paper_id)
      );
      INSERT OR IGNORE INTO notes (user_id, paper_id, body, updated_at)
        SELECT 0, paper_id, COALESCE(body, ''), COALESCE(updated_at, CURRENT_TIMESTAMP) FROM notes_old_userless;
      DROP TABLE notes_old_userless;
    `);
  }

  if (hasTable(sqlite, "paper_tags") && !tableColumns(sqlite, "paper_tags").includes("user_id")) {
    sqlite.exec(`
      ALTER TABLE paper_tags RENAME TO paper_tags_old_userless;
      CREATE TABLE paper_tags (
        user_id INTEGER NOT NULL DEFAULT 0,
        paper_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, paper_id, tag_id)
      );
      INSERT OR IGNORE INTO paper_tags (user_id, paper_id, tag_id, created_at)
        SELECT 0, paper_id, tag_id, COALESCE(created_at, CURRENT_TIMESTAMP) FROM paper_tags_old_userless;
      DROP TABLE paper_tags_old_userless;
    `);
  }
}

function ensureIdentityTables(sqlite: any) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS institution_aliases (
      alias TEXT PRIMARY KEY,
      canonical_name TEXT NOT NULL,
      country_code TEXT,
      country_name TEXT,
      city TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      confidence INTEGER NOT NULL DEFAULT 100,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS author_aliases (
      alias TEXT PRIMARY KEY,
      canonical_name TEXT NOT NULL,
      institution_hint TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      confidence INTEGER NOT NULL DEFAULT 100,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function ensureSnapshotTables(sqlite: any) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS computed_snapshots (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      source_version TEXT NOT NULL DEFAULT 'v1',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_computed_snapshots_updated
      ON computed_snapshots(updated_at DESC);
  `);
}

function ensureAdminAuditTables(sqlite: any) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id INTEGER,
      actor_email TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      status TEXT NOT NULL DEFAULT 'success',
      ip_address TEXT,
      user_agent TEXT,
      metadata_json TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function ensureNotificationTables(sqlite: any) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 0,
      kind TEXT NOT NULL DEFAULT 'system',
      severity TEXT NOT NULL DEFAULT 'info',
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      href TEXT,
      action_label TEXT,
      metadata_json TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function ensureBillingTables(sqlite: any) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 0,
      plan_id TEXT NOT NULL DEFAULT 'free',
      status TEXT NOT NULL DEFAULT 'active',
      provider TEXT NOT NULL DEFAULT 'manual',
      provider_customer_id TEXT,
      provider_subscription_id TEXT,
      current_period_start TEXT,
      current_period_end TEXT,
      cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payment_customers (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 0,
      provider TEXT NOT NULL DEFAULT 'manual',
      provider_customer_id TEXT NOT NULL DEFAULT '',
      email TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_customers_provider_customer
      ON payment_customers(provider, provider_customer_id);

    CREATE TABLE IF NOT EXISTS billing_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 0,
      provider TEXT NOT NULL DEFAULT 'manual',
      event_type TEXT NOT NULL,
      provider_event_id TEXT,
      plan_id TEXT,
      status TEXT NOT NULL DEFAULT 'recorded',
      payload_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 0,
      metric TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'app',
      resource_type TEXT,
      resource_id TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function applyPerformanceSettings(sqlite: any) {
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("temp_store = MEMORY");
  sqlite.pragma("cache_size = -64000");
  sqlite.pragma("busy_timeout = 5000");

  migrateUserScopedTables(sqlite);
  ensureIdentityTables(sqlite);
  ensureSnapshotTables(sqlite);
  ensureAdminAuditTables(sqlite);
  ensureNotificationTables(sqlite);
  ensureBillingTables(sqlite);

  for (const statement of PERFORMANCE_INDEXES) {
    sqlite.exec(statement);
  }
}
