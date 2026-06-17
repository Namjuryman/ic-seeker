import fs from 'node:fs/promises';
import path from 'node:path';

function maskSecret(value) {
  if (!value) return '';
  if (value.length <= 8) return '*'.repeat(value.length);
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function createAdminService({ repository, config }) {
  function stats() {
    return repository.withDb(db => {
      const total = db.prepare('SELECT COUNT(*) AS n FROM papers').get().n;
      const pdfs = db.prepare("SELECT COUNT(*) AS n FROM papers WHERE local_pdf != ''").get().n;
      const aminerRows = db.prepare("SELECT COUNT(*) AS n FROM papers WHERE openalex_id LIKE 'aminer:%' OR collection_method LIKE 'aminer%'").get().n;
      const byVenue = db.prepare('SELECT venue, venue_rank AS rank, COUNT(*) AS count, ROUND(AVG(quality_score), 1) AS avgScore FROM papers GROUP BY venue, venue_rank ORDER BY MAX(quality_score) DESC').all();
      const byField = db.prepare('SELECT domain AS field, COUNT(*) AS count FROM papers GROUP BY domain ORDER BY count DESC').all();
      const byVenueYear = db.prepare('SELECT venue, year, COUNT(*) AS count FROM papers GROUP BY venue, year ORDER BY venue, year').all();
      const byCollectionMethod = db.prepare(`
        SELECT COALESCE(NULLIF(collection_method, ''), 'unknown') AS method, COUNT(*) AS count
        FROM papers
        GROUP BY COALESCE(NULLIF(collection_method, ''), 'unknown')
        ORDER BY count DESC, method
      `).all();
      const byVerification = db.prepare(`
        SELECT COALESCE(NULLIF(verification_status, ''), 'unverified') AS status, COUNT(*) AS count
        FROM papers
        GROUP BY COALESCE(NULLIF(verification_status, ''), 'unverified')
        ORDER BY count DESC, status
      `).all();
      const years = db.prepare('SELECT MIN(year) AS minYear, MAX(year) AS maxYear FROM papers').get();
      const venues = db.prepare('SELECT DISTINCT venue FROM papers ORDER BY venue').all().map(r => r.venue);
      const fields = db.prepare('SELECT DISTINCT domain FROM papers ORDER BY domain').all().map(r => r.domain);
      const ranks = db.prepare('SELECT DISTINCT venue_rank FROM papers ORDER BY venue_rank').all().map(r => r.venue_rank);
      const favorites = db.prepare('SELECT COUNT(*) AS n FROM favorites').get().n;
      const notes = db.prepare("SELECT COUNT(*) AS n FROM notes WHERE body != ''").get().n;
      const tags = db.prepare('SELECT name, color FROM tags ORDER BY name').all();
      return {
        appName: config.appName,
        total,
        pdfs,
        favorites,
        notes,
        aminerRows,
        byVenue,
        byField,
        byVenueYear,
        byCollectionMethod,
        byVerification,
        years,
        venues,
        fields,
        ranks,
        tags,
        csvPath: config.csvPath,
        dbPath: config.dbPath,
        pdfInboxPath: config.pdfInboxPath
      };
    });
  }

  function apiKeys() {
    return repository.withDb(db => {
      const rows = db.prepare('SELECT provider, value, updated_at AS updatedAt FROM api_keys ORDER BY provider').all();
      const envProviders = ['OPENAI_API_KEY', 'IEEE_API_KEY', 'AMINER_API_KEY', 'AMINER_AUTH_TOKEN', 'CROSSREF_MAILTO']
        .filter(name => process.env[name])
        .map(name => ({ provider: name.toLowerCase(), masked: maskSecret(process.env[name]), source: 'env' }));
      return [
        ...rows.map(row => ({ provider: row.provider, masked: maskSecret(row.value), updatedAt: row.updatedAt, source: 'database' })),
        ...envProviders
      ];
    });
  }

  function setApiKey(provider, value) {
    const cleanProvider = String(provider || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
    if (!cleanProvider) throw new Error('Invalid provider');
    return repository.withDb(db => {
      if (value) {
        db.prepare(`
          INSERT INTO api_keys (provider, value, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(provider) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `).run(cleanProvider, String(value).trim());
      } else {
        db.prepare('DELETE FROM api_keys WHERE provider = ?').run(cleanProvider);
      }
      return apiKeys();
    });
  }

  async function pdfInbox() {
    await fs.mkdir(config.pdfInboxPath, { recursive: true });
    const entries = await fs.readdir(config.pdfInboxPath, { withFileTypes: true });
    const pdfs = entries
      .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
      .map(entry => ({ name: entry.name, path: path.join(config.pdfInboxPath, entry.name) }));
    return {
      path: config.pdfInboxPath,
      count: pdfs.length,
      pdfs,
      importCommand: 'node .\\scripts\\import-local-pdfs.mjs'
    };
  }

  return { apiKeys, pdfInbox, setApiKey, stats };
}
