export function ensureColumn(db, table, column, definition) {
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some(row => row.name === column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function hasTable(db, table) {
  return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
}

function markApplied(db, id) {
  db.prepare('INSERT OR IGNORE INTO schema_migrations (id) VALUES (?)').run(id);
}

export function runStartupMigrations(db) {
  if (!hasTable(db, 'papers')) {
    markApplied(db, '0001-no-papers-table-yet');
    return;
  }

  ensureColumn(db, 'papers', 'verification_status', "TEXT NOT NULL DEFAULT 'unverified'");
  ensureColumn(db, 'papers', 'user_added', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'papers', 'semantic_text', "TEXT NOT NULL DEFAULT ''");
  markApplied(db, '0002-paper-private-metadata-columns');
}
