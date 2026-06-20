import { openDb } from '../db/connection.mjs';
import { semanticText } from '../services/search.service.mjs';

const OPENALEX_BASE = 'https://api.openalex.org';
const SLEEP_MS = 10;
const BATCH_SIZE = 200;

// 优先补全的 venue（顶级会议为主）
const PRIORITY_VENUES = [
  'ISSCC', 'DAC', 'IEDM', 'ICCAD', 'VLSI Symposium', 'CICC',
  'ASSCC', 'ESSCIRC', 'ESSERC', 'DATE', 'JSSC',
  'TCAS-I', 'TCAS-II', 'TVLSI', 'TCAD', 'ISCAS'
];

async function fetchOpenAlexByDoi(doi) {
  if (!doi) return null;
  const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//i, '');
  try {
    const resp = await fetch(`${OPENALEX_BASE}/works/doi:${encodeURIComponent(cleanDoi)}`);
    if (!resp.ok) return null;
    return resp.json();
  } catch { return null; }
}

async function fetchOpenAlexByTitle(title) {
  if (!title) return null;
  try {
    const url = `${OPENALEX_BASE}/works?search=${encodeURIComponent(title)}&per-page=5`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.results?.[0] || null;
  } catch { return null; }
}

function extractAffiliations(work) {
  if (!work || !work.authorships) return null;
  const affiliations = [];
  for (const auth of work.authorships) {
    if (auth.institutions) {
      for (const inst of auth.institutions) {
        if (inst.display_name && !affiliations.includes(inst.display_name)) {
          affiliations.push(inst.display_name);
        }
      }
    }
  }
  return affiliations.join('; ') || null;
}

function extractAuthorsWithAffiliations(work) {
  if (!work || !work.authorships) return null;
  const authors = [];
  for (const auth of work.authorships) {
    const name = auth.author?.display_name || '';
    const affs = (auth.institutions || []).map(i => i.display_name).filter(Boolean);
    if (name) {
      authors.push(affs.length ? `${name} (${affs.join('; ')})` : name);
    }
  }
  return authors.join('; ') || null;
}

async function enrichBatch(db, papers) {
  let updated = 0, failed = 0, noData = 0;
  const CONCURRENCY = 10; // 并行请求数

  for (let i = 0; i < papers.length; i += CONCURRENCY) {
    const batch = papers.slice(i, i + CONCURRENCY);
    const promises = batch.map(async (paper) => {
      let work = null;
      if (paper.doi) {
        work = await fetchOpenAlexByDoi(paper.doi);
      }
      if (!work && paper.title) {
        work = await fetchOpenAlexByTitle(paper.title);
      }
      return { paper, work };
    });

    const results = await Promise.all(promises);

    for (const { paper, work } of results) {
      if (!work) {
        noData++;
        continue;
      }
      const affiliations = extractAffiliations(work);
      const authors = extractAuthorsWithAffiliations(work);
      if (affiliations || authors) {
        try {
          db.prepare(`UPDATE papers SET affiliations = COALESCE(?, affiliations), authors = COALESCE(?, authors) WHERE id = ?`)
            .run(affiliations || paper.affiliations, authors || paper.authors, paper.id);
          updated++;
        } catch (err) {
          failed++;
          console.error(`Update failed for id ${paper.id}:`, err.message);
        }
      } else {
        noData++;
      }
    }

    await new Promise(r => setTimeout(r, SLEEP_MS));
  }

  return { updated, failed, noData };
}

async function main() {
  const targetVenue = process.argv[2]; // 可选：指定 venue
  const db = openDb('../ic_database/ic_papers.sqlite');
  db.exec('PRAGMA busy_timeout = 30000');

  console.log('=== Enrich Missing Affiliations ===');
  if (targetVenue) console.log(`Target venue: ${targetVenue}`);

  // 统计总数
  const totalMissing = db.prepare("SELECT COUNT(*) as c FROM papers WHERE affiliations = '' OR affiliations IS NULL").get();
  console.log(`Total missing affiliations: ${totalMissing.c}`);

  let grandTotal = { updated: 0, failed: 0, noData: 0 };
  const venuesToProcess = targetVenue ? [targetVenue] : PRIORITY_VENUES;

  for (const venue of venuesToProcess) {
    const count = db.prepare("SELECT COUNT(*) as c FROM papers WHERE (affiliations = '' OR affiliations IS NULL) AND venue = ?").get(venue);
    if (count.c === 0) {
      console.log(`[${venue}] No missing, skip`);
      continue;
    }

    console.log(`\n[${venue}] ${count.c} papers to enrich...`);

    // 分页获取
    let offset = 0;
    const venueTotals = { updated: 0, failed: 0, noData: 0 };

    while (true) {
      const papers = db.prepare(
        "SELECT id, title, doi, authors, affiliations FROM papers WHERE (affiliations = '' OR affiliations IS NULL) AND venue = ? LIMIT ? OFFSET ?"
      ).all(venue, BATCH_SIZE, offset);

      if (!papers.length) break;

      const result = await enrichBatch(db, papers);
      venueTotals.updated += result.updated;
      venueTotals.failed += result.failed;
      venueTotals.noData += result.noData;

      offset += papers.length;
      console.log(`  ${venue} batch done: ${result.updated} updated, ${result.failed} failed, ${result.noData} no data (total: ${offset}/${count.c})`);
    }

    console.log(`[${venue}] FINAL: ${venueTotals.updated} updated, ${venueTotals.failed} failed, ${venueTotals.noData} no data`);
    grandTotal.updated += venueTotals.updated;
    grandTotal.failed += venueTotals.failed;
    grandTotal.noData += venueTotals.noData;
  }

  console.log(`\n=== ENRICH COMPLETE ===`);
  console.log(`Total updated: ${grandTotal.updated}`);
  console.log(`Total failed: ${grandTotal.failed}`);
  console.log(`Total no data: ${grandTotal.noData}`);

  // 重新统计
  const remaining = db.prepare("SELECT COUNT(*) as c FROM papers WHERE affiliations = '' OR affiliations IS NULL").get();
  console.log(`Remaining missing: ${remaining.c}`);

  db.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
