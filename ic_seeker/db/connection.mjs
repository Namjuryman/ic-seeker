import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

import { runStartupMigrations } from './migrations.mjs';
import { qsRankings } from './qs-rankings.js';

const schemaSql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

export function openDb(dbPath, options = {}) {
  return new DatabaseSync(dbPath, options);
}

export function initDb(dbPath) {
  const db = openDb(dbPath);
  try {
    db.exec(schemaSql);
    runStartupMigrations(db);

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
