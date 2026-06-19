import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { openDb } from '../ic_seeker/db/connection.mjs';
import { classifyText, scorePaper as policyScorePaper } from '../ic_seeker/services/classification.service.mjs';
import { semanticText } from '../ic_seeker/services/search.service.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const currentYear = new Date().getFullYear();

const options = {
  dbPath: argValue('--db') || path.join(root, 'ic_database', 'ic_papers.sqlite'),
  years: parseYears(argValue('--years') || `2000-${currentYear}`),
  venues: parseList(argValue('--venues')),
  maxPagesPerYear: Number(argValue('--max-pages-per-year') || 2),
  perPage: Math.min(Number(argValue('--per-page') || 200), 200),
  delayMs: Number(argValue('--delay-ms') || 150),
  dryRun: process.argv.includes('--dry-run')
};

const coreVenues = [
  { key: 'ISSCC', rank: 'S+', score: 100, queries: ['IEEE International Solid-State Circuits Conference', 'International Solid-State Circuits Conference', 'ISSCC'], allow: ['solid-state circuits conference', 'isscc'] },
  { key: 'JSSC', rank: 'S+', score: 100, queries: ['IEEE Journal of Solid-State Circuits', 'Journal of Solid-State Circuits', 'JSSC'], allow: ['journal of solid-state circuits', 'jssc'] },
  { key: 'VLSI Symposium', rank: 'S', score: 92, queries: ['Symposium on VLSI Circuits', 'IEEE Symposium on VLSI Technology and Circuits', 'VLSI Technology and Circuits'], allow: ['symposium on vlsi circuits', 'vlsi technology and circuits'] },
  { key: 'CICC', rank: 'S', score: 86, queries: ['IEEE Custom Integrated Circuits Conference', 'Custom Integrated Circuits Conference', 'CICC'], allow: ['custom integrated circuits conference', 'cicc'] },
  { key: 'IEDM', rank: 'S', score: 84, queries: ['IEEE International Electron Devices Meeting', 'International Electron Devices Meeting', 'IEDM'], allow: ['international electron devices meeting', 'iedm'] },
  { key: 'ASSCC', rank: 'A', score: 78, queries: ['IEEE Asian Solid-State Circuits Conference', 'Asian Solid-State Circuits Conference', 'A-SSCC'], allow: ['asian solid-state circuits conference', 'a-sscc'] },
  { key: 'ESSCIRC', rank: 'A', score: 76, queries: ['European Solid-State Circuits Conference', 'ESSCIRC'], allow: ['european solid-state circuits conference', 'esscirc'] },
  { key: 'ESSERC', rank: 'A', score: 76, queries: ['European Solid-State Electronics Research Conference', 'ESSERC', 'ESSDERC'], allow: ['european solid-state electronics research conference', 'esserc', 'essderc'] },
  { key: 'DAC', rank: 'A', score: 74, queries: ['ACM IEEE Design Automation Conference', 'Design Automation Conference', 'DAC'], allow: ['design automation conference', 'dac'] },
  { key: 'ICCAD', rank: 'A', score: 74, queries: ['IEEE ACM International Conference on Computer-Aided Design', 'International Conference on Computer-Aided Design', 'ICCAD'], allow: ['international conference on computer-aided design', 'iccad'] },
  { key: 'DATE', rank: 'A-', score: 66, queries: ['Design Automation Test in Europe Conference', 'Design Automation and Test in Europe', 'DATE Conference'], allow: ['design, automation and test in europe', 'design automation and test in europe', 'date conference'] },
  { key: 'TCAD', rank: 'A', score: 70, queries: ['IEEE Transactions on Computer-Aided Design of Integrated Circuits and Systems', 'TCAD'], allow: ['computer-aided design of integrated circuits', 'tcad'] },
  { key: 'TCAS-I', rank: 'A-', score: 64, queries: ['IEEE Transactions on Circuits and Systems I Regular Papers', 'IEEE Transactions on Circuits and Systems I'], allow: ['transactions on circuits and systems i'] },
  { key: 'TCAS-II', rank: 'A-', score: 60, queries: ['IEEE Transactions on Circuits and Systems II Express Briefs', 'IEEE Transactions on Circuits and Systems II'], allow: ['transactions on circuits and systems ii', 'transactions on circuits & systems ii'] },
  { key: 'TVLSI', rank: 'A-', score: 62, queries: ['IEEE Transactions on Very Large Scale Integration VLSI Systems', 'Very Large Scale Integration Systems'], allow: ['very large scale integration', 'vlsi systems'] },
  { key: 'ISCAS', rank: 'B+', score: 54, queries: ['IEEE International Symposium on Circuits and Systems', 'ISCAS'], allow: ['international symposium on circuits and systems', 'iscas'] }
].filter(matchesVenueFilter);

const domains = [
  ['Power Management', ['ldo', 'dc-dc', 'dc dc', 'dcdc', 'buck', 'boost', 'regulator', 'pmic', 'charge pump', 'switched-capacitor', 'switched capacitor', 'power converter', 'voltage converter']],
  ['Data Converters', ['adc', 'dac', 'analog-to-digital', 'digital-to-analog', 'sigma-delta', 'delta-sigma', 'sar', 'pipeline adc', 'converter']],
  ['RF/Wireless', ['rf', 'radio-frequency', 'wireless', 'mm-wave', 'millimeter-wave', 'mixer', 'lna', 'power amplifier', 'transceiver', 'phased array']],
  ['Wireline', ['serdes', 'wireline', 'cdr', 'equalizer', 'pam-4', 'pam4']],
  ['Frequency Generation', ['pll', 'dll', 'oscillator', 'vco', 'dco', 'frequency synthesizer', 'clock generator', 'jitter']],
  ['Memory/Compute', ['sram', 'dram', 'rram', 'mram', 'flash memory', 'memory', 'compute-in-memory', 'computing-in-memory', 'accelerator']],
  ['EDA/Digital', ['eda', 'design automation', 'placement', 'routing', 'verification', 'timing analysis', 'processor', 'fpga', 'soc']],
  ['Devices, Process & 3D Integration', ['finfet', 'nanosheet', 'gaa', 'mosfet', 'transistor', 'semiconductor device', '3d integration', 'chiplet', 'advanced packaging']],
  ['Biomedical, Sensor & Imaging IC', ['cmos image sensor', 'image sensor', 'sensor interface', 'readout circuit', 'biosensor', 'biomedical', 'spad', 'lidar']],
  ['Analog & Mixed-Signal', ['analog', 'mixed-signal', 'mixed signal', 'amplifier', 'comparator', 'bandgap', 'reference', 'filter']]
];

const generalIcTerms = ['integrated circuit', 'chip', 'cmos', 'asic', 'soc', 'vlsi', 'circuit', 'transistor', 'semiconductor', 'on-chip', 'mixed-signal'];
const hardExcludes = ['table of contents', 'front cover', 'back cover', 'author index', 'copyright notice', 'editorial', 'erratum'];

const db = openDb(options.dbPath);
db.exec('PRAGMA journal_mode = DELETE; PRAGMA busy_timeout = 8000; PRAGMA synchronous = NORMAL;');

const statements = {
  findByDoi: db.prepare('SELECT id FROM papers WHERE doi = ? LIMIT 1'),
  findByOpenAlex: db.prepare('SELECT id FROM papers WHERE openalex_id = ? LIMIT 1'),
  findByTitleYear: db.prepare('SELECT id FROM papers WHERE year = ? AND lower(title) = lower(?) LIMIT 1'),
  insert: db.prepare(`
    INSERT INTO papers (
      title, authors, affiliations, abstract, year, venue, publication_title, venue_rank,
      domain, domain_hits, quality_score, doi, pdf_link, source_url, openalex_id,
      ieee_article_number, collection_method, download_status, local_pdf, citation_count,
      verification_status, user_added, semantic_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  insertFts: db.prepare('INSERT INTO papers_fts (rowid, title, authors, abstract, venue, domain, doi) VALUES (?, ?, ?, ?, ?, ?, ?)')
};

let totalInserted = 0;
let totalSkipped = 0;

try {
  console.log('Core venue backfill to 2000');
  console.log(`DB: ${options.dbPath}`);
  console.log(`Years: ${options.years[0]}-${options.years[1]}`);
  console.log(`Venues: ${coreVenues.map(v => v.key).join(', ')}`);
  if (options.dryRun) console.log('Dry run: no database writes');

  for (const venue of coreVenues) {
    await backfillVenue(venue);
  }
} finally {
  db.close();
}

console.log(`Done. Inserted ${totalInserted}, skipped ${totalSkipped}.`);

async function backfillVenue(venue) {
  console.log(`\n== ${venue.key} ==`);
  const sources = await resolveSources(venue);
  console.log(`Sources: ${sources.map(s => s.display_name).join(' | ') || 'search-only'}`);

  for (let year = options.years[0]; year <= options.years[1]; year += 1) {
    const seen = new Set();
    let inserted = 0;
    let skipped = 0;

    for (const source of sources) {
      const stats = await importSourceYear(source, venue, year, seen);
      inserted += stats.inserted;
      skipped += stats.skipped;
    }

    if (!sources.length) {
      const stats = await importSearchYear(venue, year, seen);
      inserted += stats.inserted;
      skipped += stats.skipped;
    }

    if (inserted || skipped) console.log(`${year}: +${inserted}, skipped ${skipped}`);
  }
}

async function resolveSources(venue) {
  const byId = new Map();
  for (const query of venue.queries) {
    const data = await fetchJson(`https://api.openalex.org/sources?search=${encodeURIComponent(query)}&per-page=10&mailto=icseeker.local@example.com`);
    for (const source of data.results || []) {
      const name = String(source.display_name || '').toLowerCase();
      if (!venue.allow.some(term => name.includes(term))) continue;
      const score = Number(source.works_count || 0) + (source.type === 'journal' ? 50000 : 0);
      const old = byId.get(source.id);
      if (!old || score > old.score) byId.set(source.id, { ...source, score });
    }
    await sleep(options.delayMs);
  }
  return [...byId.values()].sort((a, b) => b.score - a.score).slice(0, 3);
}

async function importSourceYear(source, venue, year, seen) {
  const sourceId = String(source.id || '').split('/').at(-1);
  const filters = [
    `primary_location.source.id:${sourceId}`,
    `publication_year:${year}`,
    'type:article|proceedings-article'
  ].join(',');
  return importPaged(`https://api.openalex.org/works?filter=${encodeURIComponent(filters)}`, venue, year, seen);
}

async function importSearchYear(venue, year, seen) {
  let stats = { inserted: 0, skipped: 0 };
  const filters = [
    `publication_year:${year}`,
    'type:article|proceedings-article'
  ].join(',');
  for (const query of venue.queries) {
    const result = await importPaged(`https://api.openalex.org/works?filter=${encodeURIComponent(filters)}&search=${encodeURIComponent(query)}`, venue, year, seen);
    stats = { inserted: stats.inserted + result.inserted, skipped: stats.skipped + result.skipped };
  }
  return stats;
}

async function importPaged(baseUrl, venue, year, seen) {
  let inserted = 0;
  let skipped = 0;
  let cursor = '*';
  for (let page = 1; page <= options.maxPagesPerYear && cursor; page += 1) {
    const url = `${baseUrl}&sort=cited_by_count:desc&per-page=${options.perPage}&cursor=${encodeURIComponent(cursor)}&select=id,doi,title,display_name,publication_year,authorships,abstract_inverted_index,primary_location,locations,cited_by_count,concepts,keywords&mailto=icseeker.local@example.com`;
    const data = await fetchJson(url);
    const works = data.results || [];
    if (!works.length) break;
    for (const work of works) {
      const key = normalizeDoi(work.doi) || work.id || `${work.title}-${year}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const record = toRecord(work, venue);
      if (!record || !worthKeeping(record, venue)) {
        skipped += 1;
        totalSkipped += 1;
        continue;
      }
      if (exists(record)) {
        skipped += 1;
        totalSkipped += 1;
        continue;
      }
      if (!options.dryRun) insertRecord(record);
      inserted += 1;
      totalInserted += 1;
    }
    cursor = data.meta?.next_cursor || '';
    await sleep(options.delayMs);
  }
  return { inserted, skipped };
}

function toRecord(work, venue) {
  const title = clean(work.title || work.display_name);
  const year = Number(work.publication_year || 0);
  if (!title || !year) return null;
  const abstract = abstractFromInvertedIndex(work.abstract_inverted_index);
  const authorNames = [];
  const affiliations = new Set();
  for (const authorship of work.authorships || []) {
    const name = clean(authorship.author?.display_name);
    if (name) authorNames.push(name);
    for (const institution of authorship.institutions || []) {
      const inst = clean(institution.display_name);
      if (inst) affiliations.add(inst);
    }
  }
  const concepts = [...(work.concepts || []), ...(work.keywords || [])]
    .map(item => item.display_name || item.keyword)
    .filter(Boolean)
    .join(' ');
  const classification = classify(`${title} ${abstract} ${concepts}`);
  const doi = normalizeDoi(work.doi);
  const ar = articleNumber(work, doi);
  const sourceUrl = doi ? `https://doi.org/${doi}` : (work.primary_location?.landing_page_url || work.id || '');
  const pdf = work.primary_location?.pdf_url || (ar ? `https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=${ar}` : '');
  return {
    title,
    authors: unique(authorNames).join('; '),
    affiliations: [...affiliations].join('; '),
    abstract,
    year,
    venue: venue.key,
    publicationTitle: work.primary_location?.source?.display_name || venue.key,
    venueRank: venue.rank,
    domain: classification.domain,
    domainHits: classification.hits,
    qualityScore: quality(venue, year, work.cited_by_count, classification.hits),
    doi,
    pdfLink: pdf,
    sourceUrl,
    openalexId: work.id || '',
    articleNumber: ar,
    collectionMethod: `openalex_core_backfill:${venue.key}:${year}`,
    citationCount: Number(work.cited_by_count || 0),
    haystack: `${title} ${abstract} ${concepts}`.toLowerCase()
  };
}

function worthKeeping(record, venue) {
  if (hardExcludes.some(term => record.haystack.includes(term))) return false;
  if (['ISSCC', 'JSSC', 'VLSI Symposium', 'CICC', 'ASSCC', 'ESSCIRC'].includes(venue.key)) return true;
  const generalHits = generalIcTerms.reduce((sum, term) => sum + (record.haystack.includes(term) ? 1 : 0), 0);
  return record.domainHits > 0 || generalHits > 0;
}

function classify(text) {
  return classifyText(text);
}

function quality(venue, year, citations, domainHits) {
  return policyScorePaper({
    venue: venue.key,
    year,
    citations,
    domainHits
  });
}

function exists(record) {
  if (record.doi && statements.findByDoi.get(record.doi)) return true;
  if (record.openalexId && statements.findByOpenAlex.get(record.openalexId)) return true;
  return Boolean(statements.findByTitleYear.get(record.year, record.title));
}

function insertRecord(record) {
  const semantic = semanticText(`${record.title} ${record.abstract} ${record.domain} ${record.venue}`);
  const result = statements.insert.run(
    record.title, record.authors, record.affiliations, record.abstract, record.year,
    record.venue, record.publicationTitle, record.venueRank, record.domain, record.domainHits,
    record.qualityScore, record.doi, record.pdfLink, record.sourceUrl, record.openalexId,
    record.articleNumber, record.collectionMethod, record.pdfLink ? 'publisher_pdf_requires_session' : 'metadata_only',
    '', record.citationCount, 'auto_imported', 1, semantic
  );
  statements.insertFts.run(Number(result.lastInsertRowid), record.title, record.authors, record.abstract, record.venue, record.domain, record.doi);
}

async function fetchJson(url) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'SiliconScope core venue backfill (metadata only)' } });
      clearTimeout(timer);
      if (response.ok) return response.json();
      if (![429, 500, 502, 503, 504].includes(response.status)) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
    } catch (error) {
      clearTimeout(timer);
      if (attempt === 5) throw error;
    }
    await sleep(1000 * attempt);
  }
  return { results: [], meta: {} };
}

function abstractFromInvertedIndex(index) {
  if (!index || typeof index !== 'object') return '';
  const words = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions || []) words[position] = word;
  }
  return clean(words.filter(Boolean).join(' '));
}

function articleNumber(work, doi) {
  const fromDoi = String(doi || '').match(/(\d{7,9})$/);
  if (fromDoi) return fromDoi[1];
  const fromUrl = String(work.primary_location?.landing_page_url || '').match(/arnumber=(\d{7,9})/i);
  return fromUrl ? fromUrl[1] : '';
}

function clean(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeDoi(value) {
  return String(value || '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim().toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function argValue(name) {
  const arg = process.argv.find(item => item.startsWith(`${name}=`));
  return arg ? arg.split('=').slice(1).join('=') : '';
}

function parseList(value) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function parseYears(value) {
  const [fromRaw, toRaw] = String(value || '').split('-');
  const from = Number(fromRaw || 2000);
  const to = Number(toRaw || fromRaw || currentYear);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) throw new Error(`Invalid --years value: ${value}`);
  return [from, to];
}

function compact(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchesVenueFilter(venue) {
  if (!options.venues.length) return true;
  const aliases = [venue.key, ...venue.queries].map(compact);
  return options.venues.some(item => aliases.some(alias => alias.includes(compact(item)) || compact(item).includes(alias)));
}
