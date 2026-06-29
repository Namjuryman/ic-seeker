import Database from "better-sqlite3";

export function ensureTopicTaxonomyTables(sqlite: ReturnType<typeof Database>): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS topic_nodes (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL DEFAULT '',
      parent_id TEXT,
      domain TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      source_version TEXT NOT NULL DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS topic_aliases (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL DEFAULT '',
      alias TEXT NOT NULL DEFAULT '',
      alias_kind TEXT NOT NULL DEFAULT 'alias',
      confidence INTEGER NOT NULL DEFAULT 90,
      source TEXT NOT NULL DEFAULT 'seed',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS topic_keyword_rules (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL DEFAULT '',
      keyword TEXT NOT NULL DEFAULT '',
      polarity TEXT NOT NULL DEFAULT 'positive',
      weight INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'seed',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS paper_topic_edges (
      paper_id INTEGER NOT NULL,
      topic_id TEXT NOT NULL DEFAULT '',
      confidence INTEGER NOT NULL DEFAULT 0,
      method TEXT NOT NULL DEFAULT 'heuristic',
      evidence_json TEXT,
      override_status TEXT NOT NULL DEFAULT 'auto',
      reviewed_at TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (paper_id, topic_id)
    );

    CREATE INDEX IF NOT EXISTS idx_topic_nodes_parent ON topic_nodes(parent_id);
    CREATE INDEX IF NOT EXISTS idx_topic_nodes_domain ON topic_nodes(domain);
    CREATE INDEX IF NOT EXISTS idx_topic_aliases_topic ON topic_aliases(topic_id);
    CREATE INDEX IF NOT EXISTS idx_topic_aliases_alias ON topic_aliases(alias);
    CREATE INDEX IF NOT EXISTS idx_topic_rules_topic ON topic_keyword_rules(topic_id);
    CREATE INDEX IF NOT EXISTS idx_topic_rules_keyword ON topic_keyword_rules(keyword);
    CREATE INDEX IF NOT EXISTS idx_paper_topic_edges_topic ON paper_topic_edges(topic_id);
    CREATE INDEX IF NOT EXISTS idx_paper_topic_edges_confidence ON paper_topic_edges(confidence);
  `);
}
