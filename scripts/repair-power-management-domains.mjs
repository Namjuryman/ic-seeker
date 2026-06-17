import { DatabaseSync } from 'node:sqlite';

const dbPath = process.argv.find(arg => arg.startsWith('--db='))?.split('=').slice(1).join('=') || 'ic_database/ic_papers.sqlite';

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ');
}

function isPowerManagement(row) {
  const hay = normalize(`${row.title} ${row.abstract}`);
  const strong = [
    /\bdc\s*-?\s*dc\b/,
    /\bdcdc\b/,
    /\bpmic\b/,
    /\bbuck\b/,
    /\bboost\b/,
    /\bldo\b/,
    /switched-capacitor/,
    /charge pump/,
    /voltage regulator/,
    /power management/,
    /power converter/,
    /dual-path hybrid/,
    /continuous-current-input/
  ];
  return strong.some(pattern => pattern.test(hay));
}

const db = new DatabaseSync(dbPath);
try {
  const rows = db.prepare(`
    SELECT id, title, abstract, domain, domain_hits
    FROM papers
    WHERE domain != 'Power Management'
  `).all();
  const updatePaper = db.prepare(`
    UPDATE papers
    SET domain = 'Power Management',
        domain_hits = MAX(COALESCE(domain_hits, 0), 3)
    WHERE id = ?
  `);
  const updateFts = db.prepare('UPDATE papers_fts SET domain = ? WHERE rowid = ?');
  let changed = 0;
  db.exec('BEGIN');
  try {
    for (const row of rows) {
      if (!isPowerManagement(row)) continue;
      updatePaper.run(row.id);
      try {
        updateFts.run('Power Management', row.id);
      } catch {
        // Some SQLite builds expose FTS as contentless; the paper row remains authoritative.
      }
      changed += 1;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  console.log(`Reclassified ${changed} papers as Power Management in ${dbPath}`);
} finally {
  db.close();
}
