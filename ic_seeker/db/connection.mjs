import { DatabaseSync } from 'node:sqlite';

import { qsRankings } from './qs-rankings.js';

export function openDb(dbPath, options = {}) {
  return new DatabaseSync(dbPath, options);
}

export function ensureColumn(db, table, column, definition) {
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some(row => row.name === column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

export function initDb(dbPath) {
  const db = openDb(dbPath);
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS favorites (
        paper_id INTEGER PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS reading_status (
        paper_id INTEGER PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'unread',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS notes (
        paper_id INTEGER PRIMARY KEY,
        body TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#1d6fb8',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS paper_tags (
        paper_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (paper_id, tag_id)
      );
      CREATE TABLE IF NOT EXISTS api_keys (
        provider TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS import_log (
        id INTEGER PRIMARY KEY,
        source TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    ensureColumn(db, 'papers', 'verification_status', "TEXT NOT NULL DEFAULT 'unverified'");
    ensureColumn(db, 'papers', 'user_added', 'INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db, 'papers', 'semantic_text', "TEXT NOT NULL DEFAULT ''");

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        nickname TEXT,
        verification_status TEXT NOT NULL DEFAULT 'unverified',
        verification_level TEXT NOT NULL DEFAULT 'none',
        subscription_plan TEXT NOT NULL DEFAULT 'free',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS paper_comments (
        id INTEGER PRIMARY KEY,
        paper_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        comment_type TEXT NOT NULL DEFAULT 'Technical Note',
        body TEXT NOT NULL DEFAULT '',
        moderation_status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (paper_id) REFERENCES papers(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS mentor_reviews (
        id INTEGER PRIMARY KEY,
        professor_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        public_alias TEXT NOT NULL DEFAULT 'Verified Reviewer',
        is_verified_review INTEGER NOT NULL DEFAULT 0,
        relationship_type TEXT,
        structured_scores_json TEXT,
        strengths_text TEXT,
        cautions_text TEXT,
        fit_text TEXT,
        moderation_status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS content_reports (
        id INTEGER PRIMARY KEY,
        target_type TEXT NOT NULL,
        target_id INTEGER NOT NULL,
        reporter_user_id INTEGER,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS moderation_logs (
        id INTEGER PRIMARY KEY,
        target_type TEXT NOT NULL,
        target_id INTEGER NOT NULL,
        moderator_id INTEGER,
        action TEXT NOT NULL,
        reason TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS qs_rankings (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        aliases TEXT NOT NULL DEFAULT '',
        qs_world_rank INTEGER,
        qs_region_rank INTEGER,
        region TEXT
      );
    `);
    // Seed QS rankings if empty
    const qsCount = db.prepare('SELECT COUNT(*) as c FROM qs_rankings').get().c;
    if (qsCount === 0) {
      const insert = db.prepare('INSERT OR IGNORE INTO qs_rankings (name, aliases, qs_world_rank, qs_region_rank, region) VALUES (?, ?, ?, ?, ?)');
      for (const r of qsRankings) {
        insert.run(r.name, r.aliases, r.qs_world_rank, r.qs_region_rank, r.region);
      }
    }
  } finally {
    db.close();
  }
}
