import Database from "better-sqlite3";

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
  `);
}
