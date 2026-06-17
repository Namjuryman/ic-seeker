import { DatabaseSync } from 'node:sqlite';

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
  } finally {
    db.close();
  }
}
