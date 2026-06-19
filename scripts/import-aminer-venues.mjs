import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { classifyText, scorePaper as policyScorePaper, venueRank } from '../ic_seeker/services/classification.service.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await loadEnv(path.join(root, '.env'));

const dbPath = argValue('--db') || process.env.IC_SEEKER_DB || path.join(root, 'ic_database', 'ic_papers.sqlite');
const yearsArg = argValue('--years');
const currentYear = new Date().getFullYear();
const [sinceYear, untilYear] = yearsArg ? yearsArg.split('-').map(Number) : [2000, currentYear];
const maxPages = Number(argValue('--max-pages') || 100);
const limit = Math.min(Number(argValue('--limit') || 100), 100);
const dryRun = process.argv.includes('--dry-run');
const venuesArg = argValue('--venues');
const venueFilter = venuesArg ? venuesArg.split(',').map(item => item.trim()).filter(Boolean) : null;

const baseUrl = 'https://datacenter.aminer.cn/gateway/open_platform';
const token = process.env.AMINER_AUTH_TOKEN || process.env.AMINER_API_KEY || readStoredApiKey('aminer');

const venues = [
  { key: 'ISSCC', rank: 'S+', score: 100, names: ['IEEE International Solid-State Circuits Conference', 'ISSCC'] },
  { key: 'JSSC', rank: 'S+', score: 100, names: ['IEEE Journal of Solid-State Circuits', 'JSSC'] },
  { key: 'VLSI Symposium', rank: 'S', score: 92, names: ['Symposium on VLSI Circuits', 'VLSI Symposium'] },
  { key: 'CICC', rank: 'S', score: 86, names: ['IEEE Custom Integrated Circuits Conference', 'CICC'] },
  { key: 'IEDM', rank: 'A+', score: 84, names: ['IEEE International Electron Devices Meeting', 'IEDM'] },
  { key: 'ASSCC', rank: 'A+', score: 78, names: ['IEEE Asian Solid-State Circuits Conference', 'ASSCC'] },
  { key: 'ESSCIRC', rank: 'A+', score: 76, names: ['European Solid-State Circuits Conference', 'ESSCIRC'] },
  { key: 'DAC', rank: 'A', score: 74, names: ['Design Automation Conference', 'DAC'] },
  { key: 'ICCAD', rank: 'A', score: 74, names: ['IEEE/ACM International Conference on Computer-Aided Design', 'ICCAD'] },
  { key: 'TCAD', rank: 'A', score: 70, names: ['IEEE Transactions on Computer-Aided Design of Integrated Circuits and Systems', 'TCAD'] },
  { key: 'DATE', rank: 'A-', score: 66, names: ['Design, Automation & Test in Europe Conference', 'DATE'] },
  { key: 'TCAS-I', rank: 'A-', score: 64, names: ['IEEE Transactions on Circuits and Systems I', 'TCAS-I'] },
  { key: 'TVLSI', rank: 'A-', score: 62, names: ['IEEE Transactions on Very Large Scale Integration Systems', 'TVLSI'] },
  { key: 'TCAS-II', rank: 'A-', score: 60, names: ['IEEE Transactions on Circuits and Systems II', 'TCAS-II'] },
  { key: 'ISCAS', rank: 'B+', score: 54, names: ['IEEE International Symposium on Circuits and Systems', 'ISCAS'] }
].filter(venue => !venueFilter || venueFilter.some(item => compact(venue.key).includes(compact(item))));

function argValue(name) {
  const arg = process.argv.find(item => item.startsWith(`${name}=`));
  return arg ? arg.split('=').slice(1).join('=') : '';
}

async function loadEnv(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const [key, ...rest] = line.split('=');
      let value = rest.join('=').trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (!process.env[key.trim()]) process.env[key.trim()] = value;
    }
  } catch {}
}

function readStoredApiKey(provider) {
  try {
    const db = new DatabaseSync(dbPath);
    const row = db.prepare('SELECT value FROM api_keys WHERE provider = ?').get(provider);
    db.close();
    return row?.value || '';
  } catch {
    return '';
  }
}

function compact(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function clean(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function pickArray(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ['data', 'items', 'result', 'results', 'paper', 'papers']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  for (const value of Object.values(payload || {})) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const nested = pickArray(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

function totalOf(payload) {
  for (const key of ['total', 'Total', 'count']) {
    if (Number.isFinite(Number(payload?.[key]))) return Number(payload[key]);
  }
  for (const value of Object.values(payload || {})) {
    if (value && typeof value === 'object') {
      const total = totalOf(value);
      if (total) return total;
    }
  }
  return 0;
}

async function aminer(pathname, { method = 'GET', body, query } = {}) {
  if (!token) throw new Error('Missing AMINER_API_KEY or AMINER_AUTH_TOKEN. Save the token in .env or the web API key panel.');
  const url = new URL(`${baseUrl}${pathname}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: token,
      'X-Platform': 'ic-seeker',
      'Content-Type': 'application/json;charset=utf-8'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok || data?.code >= 40000) {
    throw new Error(`AMiner ${pathname} failed: HTTP ${res.status}, code ${data?.code || '-'}, ${data?.message || data?.msg || text.slice(0, 160)}`);
  }
  return data;
}

async function findVenue(venue) {
  for (const name of venue.names) {
    const data = await aminer('/api/venue/search', { method: 'POST', body: { name } });
    const candidates = pickArray(data);
    const picked = candidates.find(item => {
      const hay = [item.name, item.name_en, item.name_zh, ...(item.aliases || [])].join(' ');
      return venue.names.some(candidate => compact(hay).includes(compact(candidate))) || compact(hay).includes(compact(venue.key));
    }) || candidates[0];
    if (picked?.id) return { ...venue, aminerVenueId: picked.id, aminerName: picked.name_en || picked.name || name };
  }
  return { ...venue, aminerVenueId: '', aminerName: '' };
}

async function venuePapers(venue, year) {
  const papers = [];
  let total = 0;
  const seen = new Set();
  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * limit;
    const data = await aminer('/api/venue/paper/relation', {
      method: 'POST',
      body: { id: venue.aminerVenueId, year, offset, limit }
    });
    const rows = pickArray(data);
    total = totalOf(data) || total;
    let added = 0;
    for (const row of rows) {
      const key = clean(row.id || row._id);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      papers.push(row);
      added += 1;
    }
    if (!rows.length || !added) break;
    if (total && offset + limit >= total) break;
  }
  return { papers, total };
}

async function paperInfo(ids) {
  if (!ids.length) return [];
  const out = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const data = await aminer('/api/paper/info', { method: 'POST', body: { ids: chunk } });
    out.push(...pickArray(data));
  }
  return out;
}

function authorsOf(paper) {
  const authors = paper.authors || paper.author || [];
  if (Array.isArray(authors)) return authors.map(author => clean(author.name || author.name_zh || author)).filter(Boolean).join('; ');
  return clean(authors);
}

function affiliationsOf(paper) {
  const authors = paper.authors || [];
  if (!Array.isArray(authors)) return '';
  return [...new Set(authors.map(author => clean(author.org || author.org_zh)).filter(Boolean))].join('; ');
}

function domainOf(paper) {
  const hay = clean([paper.title, paper.title_zh, paper.abstract, paper.abstract_slice, paper.keywords].join(' ')).toLowerCase();
  const result = classifyText(hay);
  return [result.domain, result.hits];
}

function insertPaper(db, venue, paper) {
  const aminerId = clean(paper.id || paper._id);
  const title = clean(paper.title || paper.title_zh);
  const year = Number(paper.year) || null;
  if (!aminerId || !title || !year) return 'skip';
  const exists = db.prepare("SELECT id FROM papers WHERE openalex_id = ? OR (lower(title) = lower(?) AND year = ? AND venue = ?)").get(`aminer:${aminerId}`, title, year, venue.key);
  if (exists) return 'exists';
  const [domain, hits] = domainOf(paper);
  const abstract = clean(paper.abstract || paper.abstract_slice || paper.abstract_zh);
  const score = policyScorePaper({
    venue: venue.key,
    year,
    citations: Number(paper.n_citation || paper.n_citation_bucket || 0) || 0,
    domainHits: hits
  });
  if (dryRun) return 'dry';
  const semanticText = clean([title, authorsOf(paper), abstract, domain, venue.key, paper.doi].join(' '));
  const result = db.prepare(`
    INSERT INTO papers (
      title, authors, affiliations, abstract, year, venue, publication_title, venue_rank, domain, domain_hits,
      quality_score, doi, pdf_link, source_url, openalex_id, ieee_article_number, collection_method,
      download_status, local_pdf, citation_count, verification_status, user_added, semantic_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    title,
    authorsOf(paper),
    affiliationsOf(paper),
    abstract,
    year,
    venue.key,
    clean(paper.raw || paper.venue?.name || paper.venue?.name_en || venue.aminerName || venue.key),
    venueRank(venue.key),
    domain,
    hits,
    score,
    clean(paper.doi),
    '',
    aminerId ? `https://www.aminer.cn/pub/${aminerId}` : '',
    `aminer:${aminerId}`,
    '',
    'aminer_venue_year',
    'metadata_only',
    '',
    Number(paper.n_citation || paper.n_citation_bucket || 0) || 0,
    'aminer_metadata',
    semanticText
  );
  db.prepare(`
    INSERT INTO papers_fts(rowid, title, authors, abstract, venue, domain, doi)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(result.lastInsertRowid, title, authorsOf(paper), abstract, venue.key, domain, clean(paper.doi));
  return 'inserted';
}

async function main() {
  const db = new DatabaseSync(dbPath);
  let inserted = 0;
  let exists = 0;
  let skipped = 0;
  let stopped = false;
  try {
    for (const venueBase of venues) {
      const venue = await findVenue(venueBase);
      if (!venue.aminerVenueId) {
        console.log(`VENUE ${venue.key}: AMiner venue id not found`);
        continue;
      }
      console.log(`VENUE ${venue.key}: ${venue.aminerName} (${venue.aminerVenueId})`);
      for (let year = sinceYear; year <= untilYear; year += 1) {
        try {
          const { papers, total } = await venuePapers(venue, year);
          const ids = [...new Set(papers.map(paper => clean(paper.id || paper._id)).filter(Boolean))];
          const info = await paperInfo(ids);
          const details = info.length ? info : papers;
          const before = { inserted, exists, skipped };
          db.exec('BEGIN');
          for (const paper of details) {
            const status = insertPaper(db, venue, paper);
            if (status === 'inserted' || status === 'dry') inserted += 1;
            else if (status === 'exists') exists += 1;
            else skipped += 1;
          }
          if (dryRun) db.exec('ROLLBACK');
          else db.exec('COMMIT');
          console.log(`  ${venue.key} ${year}: fetched ${papers.length}/${total || '?'}; +${inserted - before.inserted}, existing ${exists - before.exists}, skipped ${skipped - before.skipped}`);
        } catch (error) {
          try { db.exec('ROLLBACK'); } catch {}
          const message = String(error.message || error);
          console.error(`  ${venue.key} ${year}: ${message}`);
          if (message.includes('余额不足') || message.includes('40301') || message.includes('40306')) {
            stopped = true;
            break;
          }
          throw error;
        }
      }
      if (stopped) break;
    }
  } catch (error) {
    throw error;
  } finally {
    db.close();
  }
  console.log(JSON.stringify({ inserted, exists, skipped, dryRun, stopped }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
