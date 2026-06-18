import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { openDb } from '../ic_seeker/db/connection.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = argValue('--db') || path.join(root, 'ic_database', 'ic_papers.sqlite');
const dryRun = process.argv.includes('--dry-run');

const policy = [
  ['Nature Electron.', 'SS+', 115],
  ['Nat. Electronics', 'SS+', 115],
  ['Nature', 'SSS', 125],
  ['Nat. Commun.', 'Hidden', 0],
  ['IEEE T-MTT', 'A+', 78],
  ['IEEE TED', 'B+', 50],
  ['IEEE EDL', 'B', 46],
  ['IEEE Sensors J.', 'B-', 40],
  ['Adv. Mater.', 'B-', 38],
  ['Appl. Phys. Lett.', 'C+', 34],
  ['Solid-State Electron.', 'C+', 36],
  ['IEEE JMEMS', 'B-', 42],
  ['IEEE T-Nano', 'C+', 34],
  ['Microelectron. J.', 'C', 32]
];

const db = openDb(dbPath);
try {
  console.log(`Reweight venue policy: ${dbPath}`);
  if (dryRun) console.log('Dry run: no database writes');
  const preview = db.prepare(`
    SELECT venue, venue_rank, COUNT(*) AS count, ROUND(AVG(quality_score), 1) AS avgScore
    FROM papers
    WHERE venue = ?
    GROUP BY venue, venue_rank
  `);
  const update = db.prepare(`
    UPDATE papers
    SET venue_rank = ?,
        quality_score = ROUND(
          ? + MIN(COALESCE(citation_count, 0), 300) / 45.0
            + MAX(COALESCE(year, 2016) - 2016, 0) * 0.12
            + MIN(COALESCE(domain_hits, 0), 8) * 0.6,
          1
        )
    WHERE venue = ?
  `);
  for (const [venue, rank, base] of policy) {
    const before = preview.all(venue);
    if (!before.length) continue;
    console.log(`Before ${venue}: ${JSON.stringify(before)}`);
    if (!dryRun) update.run(rank, base, venue);
    const after = dryRun ? before : preview.all(venue);
    console.log(`After  ${venue}: ${JSON.stringify(after)}`);
  }
} finally {
  db.close();
}

function argValue(name) {
  const arg = process.argv.find(item => item.startsWith(`${name}=`));
  return arg ? arg.split('=').slice(1).join('=') : '';
}
