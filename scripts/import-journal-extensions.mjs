import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { openDb } from '../ic_seeker/db/connection.mjs';
import { semanticText } from '../ic_seeker/services/search.service.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const currentYear = new Date().getFullYear();

const options = {
  dbPath: argValue('--db') || path.join(root, 'ic_database', 'ic_papers.sqlite'),
  years: parseYears(argValue('--years') || `2000-${currentYear}`),
  maxPages: Number(argValue('--max-pages') || 30),
  perPage: Math.min(Number(argValue('--per-page') || 200), 200),
  termLimit: Number(argValue('--term-limit') || 4),
  delayMs: Number(argValue('--delay-ms') || 250),
  dryRun: process.argv.includes('--dry-run'),
  rebuildFts: process.argv.includes('--rebuild-fts'),
  venueFilter: parseList(argValue('--venues')),
  searchMode: argValue('--search-mode') || 'focused'
};

const journals = [
  {
    shortName: 'Nat. Electronics',
    fullName: 'Nature Electronics',
    sourceId: 'S4210239724',
    rank: 'SS+',
    baseScore: 115,
    terms: ['integrated circuit', 'cmos', 'chip', 'semiconductor', 'transistor', 'vlsi', 'analog circuit', 'mixed signal', 'memory device', 'power electronics']
  },
  {
    shortName: 'Nature',
    fullName: 'Nature',
    sourceId: 'S137773608',
    rank: 'SSS',
    baseScore: 125,
    terms: ['cmos', 'integrated circuit', 'chip', 'semiconductor device', 'transistor', 'silicon photonics', 'memory device']
  },
  {
    shortName: 'Nat. Commun.',
    fullName: 'Nature Communications',
    sourceId: 'S64187185',
    rank: 'Hidden',
    baseScore: 0,
    terms: ['cmos', 'integrated circuit', 'chip', 'semiconductor device', 'transistor', 'memory device', 'neuromorphic circuit']
  },
  {
    shortName: 'IEEE T-MTT',
    fullName: 'IEEE Transactions on Microwave Theory and Techniques',
    sourceId: 'S198879913',
    rank: 'A+',
    baseScore: 78,
    terms: ['cmos', 'integrated circuit', 'mm-wave', 'millimeter-wave', 'rf circuit', 'transceiver', 'power amplifier', 'lna', 'mixer', 'oscillator']
  },
  {
    shortName: 'IEEE TED',
    fullName: 'IEEE Transactions on Electron Devices',
    sourceId: 'S162355128',
    rank: 'B+',
    baseScore: 50,
    terms: ['cmos', 'finfet', 'transistor', 'semiconductor device', 'memory device', 'mosfet', 'nanosheet', 'gaa', 'integrated circuit']
  },
  {
    shortName: 'IEEE EDL',
    fullName: 'IEEE Electron Device Letters',
    sourceId: 'S19887683',
    rank: 'Hidden',
    baseScore: 0,
    terms: ['cmos', 'finfet', 'transistor', 'semiconductor device', 'memory device', 'mosfet', 'nanosheet', 'gaa', 'integrated circuit']
  },
  {
    shortName: 'IEEE Sensors J.',
    fullName: 'IEEE Sensors Journal',
    sourceId: 'S189694085',
    rank: 'B-',
    baseScore: 40,
    terms: ['cmos sensor', 'integrated sensor', 'readout circuit', 'sensor interface', 'image sensor', 'biosensor circuit', 'ic sensor', 'low-power sensor']
  },
  {
    shortName: 'Adv. Mater.',
    fullName: 'Advanced Materials',
    sourceId: 'S99352657',
    rank: 'Hidden',
    baseScore: 0,
    terms: ['semiconductor device', 'transistor', 'memory device', 'integrated circuit', 'neuromorphic device', 'cmos compatible', 'flexible electronics circuit']
  },
  {
    shortName: 'Appl. Phys. Lett.',
    fullName: 'Applied Physics Letters',
    sourceId: 'S105243760',
    rank: 'Hidden',
    baseScore: 0,
    terms: ['semiconductor device', 'transistor', 'mosfet', 'memory device', 'cmos', 'integrated circuit', 'photonic integrated circuit']
  },
  {
    shortName: 'Solid-State Electron.',
    fullName: 'Solid-State Electronics',
    sourceId: 'S77418581',
    rank: 'C+',
    baseScore: 36,
    terms: ['cmos', 'transistor', 'mosfet', 'semiconductor device', 'integrated circuit', 'analog circuit', 'memory device', 'sensor interface']
  },
  {
    shortName: 'IEEE JMEMS',
    fullName: 'Journal of Microelectromechanical Systems',
    sourceId: 'S167509434',
    rank: 'B-',
    baseScore: 42,
    terms: ['mems sensor', 'readout circuit', 'cmos mems', 'integrated microsystem', 'microelectromechanical circuit', 'resonator circuit']
  },
  {
    shortName: 'IEEE T-Nano',
    fullName: 'IEEE Transactions on Nanotechnology',
    sourceId: 'S142331907',
    rank: 'C+',
    baseScore: 34,
    terms: ['nanoelectronic device', 'transistor', 'memory device', 'cmos', 'integrated circuit', 'neuromorphic device', 'nanowire transistor']
  },
  {
    shortName: 'Microelectron. J.',
    fullName: 'Microelectronics Journal',
    sourceId: 'S98831239',
    rank: 'C',
    baseScore: 32,
    terms: ['cmos', 'integrated circuit', 'analog circuit', 'mixed signal', 'low power circuit', 'vlsi', 'sensor interface', 'memory circuit']
  }
].filter(matchesVenueFilter);

const domains = [
  ['Power Management', ['ldo', 'dc-dc', 'dc dc', 'dcdc', 'buck', 'boost', 'regulator', 'pmic', 'charge pump', 'switched-capacitor', 'switched capacitor', 'voltage converter', 'power converter', 'dual-path hybrid']],
  ['Data Converters', ['adc', 'dac', 'analog-to-digital', 'digital-to-analog', 'sigma-delta', 'delta-sigma', 'sar adc', 'pipeline adc', 'converter']],
  ['RF/Wireless', ['rf', 'radio-frequency', 'mm-wave', 'millimeter-wave', 'mixer', 'lna', 'power amplifier', 'transceiver', 'phased array', 'antenna-on-chip']],
  ['Wireline', ['serdes', 'wireline', 'cdr', 'equalizer', 'pam-4', 'pam4', 'clock-data recovery']],
  ['Frequency Generation', ['pll', 'dll', 'oscillator', 'vco', 'dco', 'frequency synthesizer', 'clock generator', 'jitter']],
  ['Memory/Compute', ['sram', 'dram', 'rram', 'mram', 'flash memory', 'memory', 'compute-in-memory', 'computing-in-memory', 'in-memory', 'neuromorphic']],
  ['Devices, Process & 3D Integration', ['finfet', 'nanosheet', 'gaa', 'mosfet', 'transistor', 'semiconductor device', '3d integration', 'chiplet', 'advanced packaging']],
  ['Biomedical, Sensor & Imaging IC', ['cmos image sensor', 'image sensor', 'sensor interface', 'readout circuit', 'biosensor', 'biomedical', 'spad', 'lidar', 'mems sensor']],
  ['EDA/Digital', ['eda', 'design automation', 'placement', 'routing', 'verification', 'vlsi', 'processor', 'accelerator', 'soc']],
  ['Analog & Mixed-Signal', ['analog', 'mixed-signal', 'mixed signal', 'amplifier', 'comparator', 'bandgap', 'reference', 'filter', 'front-end']]
];

const positiveIcTerms = [
  'integrated circuit', 'cmos', 'chip', 'soc', 'asic', 'vlsi', 'on-chip', 'mixed-signal',
  'analog circuit', 'readout circuit', 'sensor interface', 'transistor', 'mosfet', 'finfet',
  'semiconductor device', 'memory device', 'mems', 'rf circuit', 'mm-wave', 'power management'
];

const negativeTerms = [
  'table of contents', 'front cover', 'back cover', 'editorial', 'erratum', 'corrigendum',
  'author index', 'copyright', 'book review', 'conference calendar',
  'power grid', 'wireless sensor network', 'photovoltaic system', 'lithium-ion battery',
  'catalyst', 'perovskite solar cell', 'quantum dot solar cell', 'organic solar cell'
];

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
  insertFts: db.prepare(`
    INSERT INTO papers_fts (rowid, title, authors, abstract, venue, domain, doi)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  deleteFts: db.prepare('DELETE FROM papers_fts WHERE rowid = ?')
};

const runStarted = Date.now();
let totalInserted = 0;
let totalSkipped = 0;

try {
  console.log(`Journal extension import`);
  console.log(`DB: ${options.dbPath}`);
  console.log(`Years: ${options.years[0]}-${options.years[1]}`);
  console.log(`Mode: ${options.searchMode}; journals: ${journals.map(j => j.shortName).join(', ')}`);
  if (options.dryRun) console.log('Dry run: no database writes');

  if (options.rebuildFts && !options.dryRun) rebuildFts();

  for (const journal of journals) {
    await importJournal(journal);
  }
} finally {
  db.close();
}

console.log(`Done. Inserted ${totalInserted}, skipped ${totalSkipped}, elapsed ${Math.round((Date.now() - runStarted) / 1000)}s.`);

async function importJournal(journal) {
  let journalInserted = 0;
  let journalSkipped = 0;
  console.log(`\n== ${journal.shortName} (${journal.fullName}) ==`);

  for (let year = options.years[1]; year >= options.years[0]; year -= 1) {
    const before = { inserted: journalInserted, skipped: journalSkipped };
    const queries = options.searchMode === 'source-only'
      ? ['']
      : options.termLimit > 0
        ? journal.terms.slice(0, options.termLimit)
        : journal.terms;
    const seenThisYear = new Set();

    for (const query of queries) {
      if (query) console.log(`${year}: query "${query}"`);
      let cursor = '*';
      for (let page = 1; page <= options.maxPages && cursor; page += 1) {
        const url = buildOpenAlexUrl(journal, year, query, cursor);
        const data = await fetchJson(url);
        const works = data.results || [];
        cursor = data.meta?.next_cursor || '';
        if (!works.length) break;

        for (const work of works) {
          const key = work.id || `${work.title}-${work.publication_year}`;
          if (seenThisYear.has(key)) continue;
          seenThisYear.add(key);

          const record = toPaperRecord(work, journal);
          if (!record || !isRelevant(record)) {
            journalSkipped += 1;
            totalSkipped += 1;
            continue;
          }
          if (alreadyExists(record)) {
            journalSkipped += 1;
            totalSkipped += 1;
            continue;
          }
          if (!options.dryRun) insertRecord(record, journal);
          journalInserted += 1;
          totalInserted += 1;
        }

        await sleep(options.delayMs);
        if (!cursor || cursor === data.meta?.cursor) break;
      }
    }

    const added = journalInserted - before.inserted;
    const skipped = journalSkipped - before.skipped;
    if (added || skipped) console.log(`${year}: +${added}, skipped ${skipped}`);
  }

  console.log(`${journal.shortName}: inserted ${journalInserted}, skipped ${journalSkipped}`);
}

function buildOpenAlexUrl(journal, year, query, cursor) {
  const params = new URLSearchParams();
  params.set('filter', [
    `primary_location.source.id:${journal.sourceId}`,
    `publication_year:${year}`
  ].join(','));
  params.set('per-page', String(options.perPage));
  params.set('cursor', cursor);
  params.set('select', [
    'id', 'doi', 'title', 'display_name', 'publication_year', 'authorships',
    'abstract_inverted_index', 'primary_location', 'locations', 'cited_by_count',
    'concepts', 'keywords'
  ].join(','));
  if (query) params.set('search', query);
  params.set('mailto', 'icseeker.local@example.com');
  return `https://api.openalex.org/works?${params.toString()}`;
}

async function fetchJson(url) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'SiliconScope local journal importer (metadata only)' }
      });
      clearTimeout(timer);
      if (response.ok) return response.json();
      if (![429, 500, 502, 503, 504].includes(response.status)) {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
      }
    } catch (error) {
      clearTimeout(timer);
      if (attempt === 5) throw error;
    }
    await sleep(1000 * attempt);
  }
  return { results: [], meta: {} };
}

function toPaperRecord(work, journal) {
  const title = clean(work.title || work.display_name);
  const year = Number(work.publication_year || 0);
  if (!title || !year) return null;

  const abstract = abstractFromInvertedIndex(work.abstract_inverted_index);
  const authors = [];
  const affiliations = new Set();
  for (const authorship of work.authorships || []) {
    const name = clean(authorship.author?.display_name);
    if (name) authors.push(name);
    for (const institution of authorship.institutions || []) {
      const inst = clean(institution.display_name);
      if (inst) affiliations.add(inst);
    }
  }

  const concepts = [
    ...(work.concepts || []).map(item => item.display_name),
    ...(work.keywords || []).map(item => item.display_name || item.keyword)
  ].filter(Boolean).join(' ');
  const haystack = `${title} ${abstract} ${journal.fullName} ${concepts}`;
  const classification = classify(haystack);
  const doi = normalizeDoi(work.doi);
  const sourceUrl = doi ? `https://doi.org/${doi}` : (work.primary_location?.landing_page_url || work.id || '');
  const pdfLink = work.primary_location?.pdf_url || '';
  const score = scorePaper(journal, year, work.cited_by_count, classification.hits);

  return {
    title,
    authors: unique(authors).join('; '),
    affiliations: [...affiliations].join('; '),
    abstract,
    year,
    venue: journal.shortName,
    publicationTitle: journal.fullName,
    venueRank: journal.rank,
    domain: classification.domain,
    domainHits: classification.hits,
    qualityScore: score,
    doi,
    pdfLink,
    sourceUrl,
    openalexId: work.id || '',
    collectionMethod: `openalex_journal_extension:${journal.shortName}:${year}`,
    citationCount: Number(work.cited_by_count || 0),
    relevantScore: relevanceScore(haystack)
  };
}

function isRelevant(record) {
  const hay = `${record.title} ${record.abstract} ${record.domain}`.toLowerCase();
  if (negativeTerms.some(term => hay.includes(term))) return false;
  if (record.domainHits >= 2) return true;
  if (record.relevantScore >= 2) return true;
  return ['SSS', 'SS+', 'S+'].includes(record.venueRank) && record.relevantScore >= 1;
}

function relevanceScore(text) {
  const hay = String(text || '').toLowerCase();
  let score = 0;
  for (const term of positiveIcTerms) {
    if (hay.includes(term)) score += 1;
  }
  return score;
}

function classify(text) {
  const hay = String(text || '').toLowerCase();
  let best = { domain: 'General IC', hits: 0 };
  for (const [domain, terms] of domains) {
    const hits = terms.reduce((sum, term) => sum + (hay.includes(term) ? 1 : 0), 0);
    if (hits > best.hits) best = { domain, hits };
  }
  if (best.domain === 'RF/Wireless' && /dc-?dc|dcdc|buck|boost|pmic|regulator|switched-capacitor|charge pump/i.test(hay)) {
    return { domain: 'Power Management', hits: Math.max(best.hits, 3) };
  }
  return best;
}

function scorePaper(journal, year, citations, domainHits) {
  const citationBoost = Math.min(Number(citations || 0), 300) / 25;
  const recencyBoost = Math.max(0, Number(year || 2016) - 2016) * 0.35;
  const domainBoost = Math.min(Number(domainHits || 0), 8) * 1.25;
  return Math.round((journal.baseScore + citationBoost + recencyBoost + domainBoost) * 10) / 10;
}

function alreadyExists(record) {
  if (record.doi && statements.findByDoi.get(record.doi)) return true;
  if (record.openalexId && statements.findByOpenAlex.get(record.openalexId)) return true;
  return Boolean(statements.findByTitleYear.get(record.year, record.title));
}

function insertRecord(record) {
  const semantic = semanticText(`${record.title} ${record.abstract} ${record.domain} ${record.venue}`);
  const result = statements.insert.run(
    record.title,
    record.authors,
    record.affiliations,
    record.abstract,
    record.year,
    record.venue,
    record.publicationTitle,
    record.venueRank,
    record.domain,
    record.domainHits,
    record.qualityScore,
    record.doi,
    record.pdfLink,
    record.sourceUrl,
    record.openalexId,
    '',
    record.collectionMethod,
    record.pdfLink ? 'publisher_pdf_requires_session' : 'metadata_only',
    '',
    record.citationCount,
    'auto_imported',
    1,
    semantic
  );
  const id = Number(result.lastInsertRowid);
  statements.deleteFts.run(id);
  statements.insertFts.run(id, record.title, record.authors, record.abstract, record.venue, record.domain, record.doi);
}

function rebuildFts() {
  console.log('Rebuilding papers_fts...');
  db.exec('DELETE FROM papers_fts;');
  const rows = db.prepare('SELECT id, title, authors, abstract, venue, domain, doi FROM papers').all();
  const insert = db.prepare('INSERT INTO papers_fts (rowid, title, authors, abstract, venue, domain, doi) VALUES (?, ?, ?, ?, ?, ?, ?)');
  db.exec('BEGIN');
  try {
    for (const row of rows) {
      insert.run(row.id, row.title || '', row.authors || '', row.abstract || '', row.venue || '', row.domain || '', row.doi || '');
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  console.log(`FTS rows: ${rows.length}`);
}

function abstractFromInvertedIndex(index) {
  if (!index || typeof index !== 'object') return '';
  const words = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions || []) words[position] = word;
  }
  return clean(words.filter(Boolean).join(' '));
}

function clean(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDoi(value) {
  return String(value || '').replace(/^https?:\/\/doi\.org\//i, '').trim().toLowerCase();
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

function parseYears(value) {
  const [fromRaw, toRaw] = String(value || '').split('-');
  const from = Number(fromRaw || 2000);
  const to = Number(toRaw || fromRaw || currentYear);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
    throw new Error(`Invalid --years value: ${value}`);
  }
  return [from, to];
}

function parseList(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function compact(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchesVenueFilter(journal) {
  if (!options.venueFilter.length) return true;
  const aliases = [journal.shortName, journal.fullName].map(compact);
  return options.venueFilter.some(item => aliases.some(alias => alias.includes(compact(item)) || compact(item).includes(alias)));
}
