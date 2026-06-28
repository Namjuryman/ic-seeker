import Database from "better-sqlite3";

function tableColumns(sqlite: ReturnType<typeof Database>, table: string): string[] {
  return sqlite.prepare(`PRAGMA table_info(${table})`).all().map((row: any) => String(row.name));
}

function ensureColumn(sqlite: ReturnType<typeof Database>, table: string, name: string, ddl: string): void {
  if (!tableColumns(sqlite, table).includes(name)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

export function ensureCompanyTables(sqlite: ReturnType<typeof Database>): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      legal_name TEXT,
      aliases_json TEXT,
      country TEXT,
      city TEXT,
      website TEXT,
      company_type TEXT,
      status TEXT,
      founded_year INTEGER,
      registered_capital TEXT,
      employee_count TEXT,
      employee_count_range TEXT,
      stock_ticker TEXT,
      exchange TEXT,
      market_cap_usd TEXT,
      market_cap_label TEXT,
      stock_price TEXT,
      stock_currency TEXT,
      stock_change_percent REAL,
      market_data_source TEXT,
      market_data_as_of TEXT,
      description TEXT,
      product_lines_json TEXT,
      domains_json TEXT,
      technology_keywords_json TEXT,
      application_markets_json TEXT,
      career_roles_json TEXT,
      hiring_signals_json TEXT,
      data_confidence INTEGER NOT NULL DEFAULT 0,
      last_enriched_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS company_sources (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT '',
      source_type TEXT NOT NULL DEFAULT 'other',
      source_name TEXT NOT NULL DEFAULT '',
      source_url TEXT,
      fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      payload_json TEXT,
      confidence INTEGER NOT NULL DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS company_aliases (
      id TEXT PRIMARY KEY,
      alias TEXT NOT NULL DEFAULT '',
      company_id TEXT NOT NULL DEFAULT '',
      canonical_name TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual',
      confidence INTEGER NOT NULL DEFAULT 100,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS company_field_facts (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT '',
      field_name TEXT NOT NULL DEFAULT '',
      field_value TEXT NOT NULL DEFAULT '',
      source_id TEXT,
      confidence INTEGER NOT NULL DEFAULT 0,
      fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS company_job_signals (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT '',
      role_title TEXT NOT NULL DEFAULT '',
      role_category TEXT,
      location TEXT,
      source_url TEXT,
      fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'unknown',
      keywords_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
    CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(company_type);
    CREATE INDEX IF NOT EXISTS idx_companies_country ON companies(country);
    CREATE INDEX IF NOT EXISTS idx_company_aliases_alias ON company_aliases(alias);
    CREATE INDEX IF NOT EXISTS idx_company_aliases_company ON company_aliases(company_id);
    CREATE INDEX IF NOT EXISTS idx_company_sources_company ON company_sources(company_id);
    CREATE INDEX IF NOT EXISTS idx_company_facts_company ON company_field_facts(company_id);
    CREATE INDEX IF NOT EXISTS idx_company_jobs_company ON company_job_signals(company_id);

    CREATE TABLE IF NOT EXISTS watchlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 0,
      target_type TEXT NOT NULL DEFAULT 'company',
      target_id TEXT NOT NULL DEFAULT '',
      query_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist_items(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_user_target ON watchlist_items(user_id, target_type, target_id);
  `);

  ensureColumn(sqlite, "companies", "market_cap_usd", "market_cap_usd TEXT");
  ensureColumn(sqlite, "companies", "market_cap_label", "market_cap_label TEXT");
  ensureColumn(sqlite, "companies", "stock_price", "stock_price TEXT");
  ensureColumn(sqlite, "companies", "stock_currency", "stock_currency TEXT");
  ensureColumn(sqlite, "companies", "stock_change_percent", "stock_change_percent REAL");
  ensureColumn(sqlite, "companies", "market_data_source", "market_data_source TEXT");
  ensureColumn(sqlite, "companies", "market_data_as_of", "market_data_as_of TEXT");
  sqlite.exec("CREATE INDEX IF NOT EXISTS idx_companies_stock ON companies(exchange, stock_ticker)");
}
