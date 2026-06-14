import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const outRootArg = process.argv.find(a => a.startsWith('--out-root='));
const outRoot = outRootArg ? outRootArg.split('=').slice(1).join('=') : 'ic_database';
const yearsArg = process.argv.find(a => a.startsWith('--years='));
const currentYear = new Date().getFullYear();
const [sinceYear, untilYear] = yearsArg
  ? yearsArg.split('=')[1].split('-').map(Number)
  : [2000, currentYear];
const maxPerVenueArg = process.argv.find(a => a.startsWith('--max-per-venue='));
const maxPerVenue = maxPerVenueArg ? Number(maxPerVenueArg.split('=')[1]) : 12000;
const maxPerVenueYearArg = process.argv.find(a => a.startsWith('--max-per-venue-year='));
const maxPerVenueYear = maxPerVenueYearArg ? Number(maxPerVenueYearArg.split('=')[1]) : 700;
const venueFilterArg = process.argv.find(a => a.startsWith('--venues='));
const venueFilter = venueFilterArg ? new Set(venueFilterArg.split('=')[1].split(',').map(v => v.trim()).filter(Boolean)) : null;
const useSourceBackfill = !process.argv.includes('--no-source-backfill');
const ieeeApiKey = process.env.IEEE_API_KEY || '';
const ua = 'Codex IC Seeker Database Builder (local personal research library; contact: local)';

const allVenues = [
  { key: 'ISSCC', rank: 'S+', score: 100, allow: ['solid-state circuits conference', 'isscc'], queries: ['IEEE International Solid-State Circuits Conference', 'International Solid-State Circuits Conference', 'ISSCC'] },
  { key: 'JSSC', rank: 'S+', score: 100, allow: ['journal of solid-state circuits', 'jssc'], queries: ['IEEE Journal of Solid-State Circuits', 'Journal of Solid-State Circuits', 'JSSC'] },
  { key: 'VLSI Symposium', rank: 'S', score: 92, allow: ['symposium on vlsi circuits', 'vlsi technology and circuits'], queries: ['Symposium on VLSI Circuits', 'IEEE Symposium on VLSI Technology and Circuits', 'VLSI Technology and Circuits'] },
  { key: 'CICC', rank: 'S', score: 86, allow: ['custom integrated circuits conference', 'cicc'], queries: ['IEEE Custom Integrated Circuits Conference', 'Custom Integrated Circuits Conference', 'CICC'] },
  { key: 'ASSCC', rank: 'A', score: 78, allow: ['asian solid-state circuits conference', 'a-sscc'], queries: ['IEEE Asian Solid-State Circuits Conference', 'Asian Solid-State Circuits Conference', 'A-SSCC'] },
  { key: 'ESSCIRC', rank: 'A', score: 76, allow: ['european solid-state circuits conference', 'esscirc'], queries: ['European Solid-State Circuits Conference', 'ESSCIRC'] },
  { key: 'ESSERC', rank: 'A', score: 76, allow: ['european solid-state electronics research conference', 'esserc', 'esscirc', 'essderc'], queries: ['IEEE European Solid-State Electronics Research Conference', 'ESSERC', 'ESSCIRC ESSDERC'] },
  { key: 'IEDM', rank: 'S', score: 84, allow: ['international electron devices meeting', 'iedm'], queries: ['IEEE International Electron Devices Meeting', 'International Electron Devices Meeting', 'IEDM'] },
  { key: 'DAC', rank: 'A', score: 74, allow: ['design automation conference', 'dac'], queries: ['ACM IEEE Design Automation Conference', 'Design Automation Conference'] },
  { key: 'ICCAD', rank: 'A', score: 74, allow: ['international conference on computer-aided design', 'iccad'], queries: ['IEEE ACM International Conference on Computer-Aided Design', 'International Conference on Computer-Aided Design', 'ICCAD'] },
  { key: 'DATE', rank: 'A-', score: 66, allow: ['design, automation and test in europe', 'design, automation & test in europe', 'design automation and test in europe', 'date conference'], queries: ['Design, Automation & Test in Europe Conference', 'Design, Automation and Test in Europe Conference', 'DATE Design Automation Test Europe', 'DATE Conference'] },
  { key: 'TCAS-I', rank: 'A-', score: 64, allow: ['transactions on circuits and systems i'], queries: ['IEEE Transactions on Circuits and Systems I Regular Papers', 'IEEE Transactions on Circuits and Systems I'] },
  { key: 'TCAS-II', rank: 'A-', score: 60, allow: ['transactions on circuits and systems ii', 'transactions on circuits & systems ii'], queries: ['IEEE Transactions on Circuits and Systems II Express Briefs', 'IEEE Transactions on Circuits & Systems II Express Briefs', 'IEEE Transactions on Circuits and Systems II'] },
  { key: 'TVLSI', rank: 'A-', score: 62, allow: ['very large scale integration', 'vlsi systems'], queries: ['IEEE Transactions on Very Large Scale Integration VLSI Systems', 'Very Large Scale Integration Systems'] },
  { key: 'TCAD', rank: 'A', score: 70, allow: ['computer-aided design of integrated circuits', 'tcad'], queries: ['IEEE Transactions on Computer-Aided Design of Integrated Circuits and Systems', 'TCAD'] },
  { key: 'ISCAS', rank: 'B+', score: 54, allow: ['international symposium on circuits and systems', 'iscas'], queries: ['IEEE International Symposium on Circuits and Systems', 'ISCAS'] }
];

function compact(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const venues = venueFilter
  ? allVenues.filter(venue => {
    const wanted = [...venueFilter].map(compact);
    const key = compact(venue.key);
    return wanted.some(item => item === key || (item.length <= 4 && key.startsWith(item)));
  })
  : allVenues;

const coverageTargets = {
  ISSCC: {
    2025: 246
  },
  JSSC: {
    2025: 357
  }
};

const domains = [
  ['Analog & Mixed-Signal', ['adc', 'dac', 'analog-to-digital', 'digital-to-analog', 'sigma-delta', 'delta-sigma', 'sar', 'amplifier', 'comparator', 'bandgap', 'reference', 'bias', 'filter', 'continuous-time', 'sensor interface']],
  ['RF/mmWave & Wireline', ['rf', 'mm-wave', 'millimeter-wave', 'wireline', 'serdes', 'transceiver', 'receiver', 'transmitter', 'mixer', 'power amplifier', 'phased array', 'front-end', 'pam-4', 'cdr', 'equalizer']],
  ['Clocking & Frequency Generation', ['pll', 'dll', 'oscillator', 'vco', 'dco', 'jitter', 'frequency synthesizer', 'clock generator', 'time-to-digital', 'tdc']],
  ['Power Management', ['ldo', 'dc-dc', 'buck', 'boost', 'regulator', 'power management', 'pmic', 'charger', 'energy harvesting', 'switched-capacitor converter', 'voltage converter']],
  ['Digital IC & Architecture', ['microprocessor', 'processor', 'risc-v', 'cpu', 'gpu', 'accelerator', 'neural network processor', 'machine learning accelerator', 'ai accelerator', 'compute-in-memory', 'computing-in-memory', 'cryptographic', 'aes', 'soc']],
  ['Memory & Compute-in-Memory', ['sram', 'dram', 'nand', 'flash memory', 'rram', 'mram', 'memory', 'compute-in-memory', 'computing-in-memory', 'in-memory', 'hbm', 'gddr', 'lpddr']],
  ['EDA, CAD & Verification', ['placement', 'routing', 'synthesis', 'verification', 'formal verification', 'timing analysis', 'static timing', 'layout', 'design automation', 'eda', 'cad', 'floorplan', 'physical design']],
  ['Devices, Process & 3D Integration', ['finfet', 'nanosheet', 'gaa', 'device', 'electron devices', 'process technology', '3d integration', 'chiplet', 'heterogeneous integration', 'tsv', 'advanced packaging', 'bonding']],
  ['Biomedical, Sensor & Imaging IC', ['biomedical', 'neural recording', 'biopotential', 'bio-potential', 'cmos image sensor', 'image sensor', 'spad', 'lidar', 'ultrasound', 'implant', 'wearable', 'biosensor']],
  ['Security & Reliability', ['side-channel', 'hardware security', 'trojan', 'puf', 'fault injection', 'reliability', 'aging', 'radiation-hardened', 'soft error']]
];

const generalIcTerms = [
  'integrated circuit', 'chip', 'cmos', 'finfet', 'silicon', 'asic', 'soc',
  'vlsi', 'circuit', 'transistor', 'semiconductor', 'on-chip', 'mixed-signal'
];

const hardExcludes = [
  'power system', 'photovoltaic system', 'antenna array synthesis', 'wireless sensor network',
  'electric vehicle', 'image processing algorithm', 'deep neural network model only',
  'table of contents', 'front cover', 'back cover', 'author index', 'toc',
  'withdrawn by', 'tutorial', 'tutorials', 'reflections',
  'copyright notice', 'copyright and reprint permission', 'title page'
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': ua }, signal: controller.signal });
    } catch (err) {
      clearTimeout(timer);
      if (attempt < 5) {
        await sleep(1300 * attempt);
        continue;
      }
      throw err;
    }
    clearTimeout(timer);
    if (res.ok) return await res.json();
    if ([429, 500, 502, 503, 504].includes(res.status) && attempt < 5) {
      await sleep(1300 * attempt);
      continue;
    }
    throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  }
}

function clean(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function abstract(work) {
  if (typeof work.abstract === 'string') return clean(work.abstract);
  const index = work.abstract_inverted_index;
  if (!index) return '';
  const words = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions) words[pos] = word;
  }
  return words.join(' ');
}

function sourceNames(work) {
  const names = new Set();
  const add = value => {
    if (value) names.add(String(value).toLowerCase());
  };
  add(work.primary_location?.source?.display_name);
  add(work.host_venue?.display_name);
  for (const location of work.locations || []) add(location.source?.display_name);
  return [...names];
}

function text(work) {
  return [
    work.display_name,
    work.title,
    abstract(work),
    ...sourceNames(work),
    ...(work.concepts || []).map(c => c.display_name)
  ].join(' ').toLowerCase();
}

function countHits(hay, words) {
  return words.filter(word => hay.includes(word)).length;
}

function classify(work) {
  const hay = text(work);
  const scores = domains.map(([domain, words]) => ({ domain, hits: countHits(hay, words) }));
  scores.sort((a, b) => b.hits - a.hits);
  return scores[0].hits ? scores[0] : { domain: 'General IC', hits: countHits(hay, generalIcTerms) };
}

function venueMatches(work, venue) {
  const hay = [work.display_name, work.title, ...sourceNames(work), doi(work)].join(' ').toLowerCase();
  return venue.allow.some(term => hay.includes(term));
}

function worthKeeping(work, venue) {
  if (!venueMatches(work, venue)) return false;
  const hay = text(work);
  if (hardExcludes.some(term => hay.includes(term))) return false;
  const domain = classify(work);
  const generalHits = countHits(hay, generalIcTerms);
  if (!domain.hits && !generalHits && !['ISSCC', 'JSSC', 'VLSI Symposium', 'CICC', 'ASSCC', 'ESSCIRC'].includes(venue.key)) return false;
  const score = quality(work, venue, domain);
  const threshold = venue.rank === 'S+' ? 70 : venue.rank === 'S' ? 68 : venue.rank === 'A' ? 64 : 58;
  return score >= threshold;
}

function quality(work, venue, domainInfo = classify(work)) {
  const year = Number(work.publication_year || sinceYear);
  const citationBoost = Math.min(Number(work.cited_by_count || 0), 300) / 25;
  const recencyBoost = Math.max(0, year - sinceYear) * 0.35;
  return Math.round((venue.score + domainInfo.hits * 10 + citationBoost + recencyBoost) * 10) / 10;
}

function doi(work) {
  return String(work.doi || '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').toLowerCase();
}

function articleNumber(work) {
  if (work.article_number) return String(work.article_number);
  const id = doi(work).match(/(\d{7,9})$/);
  if (id) return id[1];
  const ieee = String(work.primary_location?.landing_page_url || '').match(/arnumber=(\d{7,9})/i);
  return ieee ? ieee[1] : '';
}

function pdfLink(work) {
  if (work.pdf_url) return work.pdf_url;
  const pdf = work.primary_location?.pdf_url || work.best_oa_location?.pdf_url || '';
  if (pdf) return pdf;
  const ar = articleNumber(work);
  if (ar) return `https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=${ar}`;
  return work.open_access?.oa_url || work.doi || work.id || '';
}

function authors(work) {
  return (work.authorships || []).map(a => a.author?.display_name).filter(Boolean).join('; ');
}

function affiliations(work) {
  return (work.authorships || [])
    .flatMap(a => a.institutions || [])
    .map(i => i.display_name)
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .join('; ');
}

function keywords(work, domain) {
  return [domain, ...(work.concepts || []).slice(0, 9).map(c => c.display_name).filter(Boolean)].join('; ');
}

function csvEscape(value) {
  const valueText = String(value ?? '');
  return /[",\r\n]/.test(valueText) ? `"${valueText.replace(/"/g, '""')}"` : valueText;
}

async function resolveSources(venue) {
  const candidates = new Map();
  for (const query of venue.queries) {
    const data = await fetchJson(`https://api.openalex.org/sources?search=${encodeURIComponent(query)}&per-page=25`);
    for (const source of data.results || []) {
      const name = (source.display_name || '').toLowerCase();
      const plausible = venue.allow.some(term => name.includes(term));
      if (!plausible) continue;
      const sourceScore = (source.works_count || 0) + (source.type === 'journal' ? 3000 : 0);
      const old = candidates.get(source.id);
      if (!old || sourceScore > old.sourceScore) candidates.set(source.id, { source, sourceScore });
    }
    await sleep(100);
  }
  return [...candidates.values()].sort((a, b) => b.sourceScore - a.sourceScore).slice(0, 10).map(c => c.source);
}

async function worksForSource(source, venue) {
  const sourceId = source.id.split('/').at(-1);
  const out = [];
  let cursor = '*';
  while (out.length < maxPerVenue) {
    const filters = [
      `primary_location.source.id:${sourceId}`,
      `from_publication_date:${sinceYear}-01-01`,
      `to_publication_date:${untilYear}-12-31`,
      'type:article|proceedings-article'
    ].join(',');
    const url = `https://api.openalex.org/works?filter=${encodeURIComponent(filters)}&sort=publication_date:desc&per-page=200&cursor=${encodeURIComponent(cursor)}`;
    const data = await fetchJson(url);
    const results = data.results || [];
    if (!results.length) break;
    for (const work of results) {
      if (worthKeeping(work, venue)) out.push(work);
      if (out.length >= maxPerVenue) break;
    }
    if (!data.meta?.next_cursor || data.meta.next_cursor === cursor) break;
    cursor = data.meta.next_cursor;
    await sleep(100);
  }
  return out;
}

async function worksForSourceYear(source, venue, year) {
  const sourceId = source.id.split('/').at(-1);
  const out = [];
  let cursor = '*';
  while (out.length < maxPerVenueYear) {
    const filters = [
      `primary_location.source.id:${sourceId}`,
      `from_publication_date:${year}-01-01`,
      `to_publication_date:${year}-12-31`,
      'type:article|proceedings-article'
    ].join(',');
    const url = `https://api.openalex.org/works?filter=${encodeURIComponent(filters)}&sort=cited_by_count:desc&per-page=200&cursor=${encodeURIComponent(cursor)}`;
    const data = await fetchJson(url);
    const results = data.results || [];
    if (!results.length) break;
    for (const work of results) {
      if (worthKeeping(work, venue)) out.push(work);
      if (out.length >= maxPerVenueYear) break;
    }
    if (!data.meta?.next_cursor || data.meta.next_cursor === cursor) break;
    cursor = data.meta.next_cursor;
    await sleep(100);
  }
  return out;
}

async function worksForVenueYear(venue, year) {
  const out = [];
  const seen = new Set();
  const filters = [
    `from_publication_date:${year}-01-01`,
    `to_publication_date:${year}-12-31`,
    'type:article|proceedings-article'
  ].join(',');
  for (const query of venue.queries) {
    if (out.length >= maxPerVenueYear) break;
    const url = `https://api.openalex.org/works?filter=${encodeURIComponent(filters)}&search=${encodeURIComponent(query)}&sort=cited_by_count:desc&per-page=200`;
    const data = await fetchJson(url);
    for (const work of data.results || []) {
      const key = doi(work) || work.id;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      if (worthKeeping(work, venue)) out.push(work);
      if (out.length >= maxPerVenueYear) break;
    }
    await sleep(100);
  }
  return out;
}

function crossrefAuthor(item) {
  return (item.author || [])
    .map(author => [author.given, author.family].filter(Boolean).join(' '))
    .filter(Boolean)
    .join('; ');
}

function crossrefYear(item) {
  return item.published?.['date-parts']?.[0]?.[0]
    || item['published-print']?.['date-parts']?.[0]?.[0]
    || item['published-online']?.['date-parts']?.[0]?.[0]
    || null;
}

function crossrefToWork(item, venue) {
  const year = crossrefYear(item);
  const container = item['container-title']?.[0] || venue.key;
  const itemDoi = String(item.DOI || '').toLowerCase();
  return {
    id: item.URL || (itemDoi ? `https://doi.org/${itemDoi}` : ''),
    doi: itemDoi,
    display_name: clean(item.title?.[0] || ''),
    title: clean(item.title?.[0] || ''),
    publication_year: year,
    publication_date: Array.isArray(item.published?.['date-parts']?.[0])
      ? item.published['date-parts'][0].join('-')
      : '',
    cited_by_count: item['is-referenced-by-count'] || 0,
    abstract_inverted_index: null,
    concepts: [],
    authorships: crossrefAuthor(item).split('; ').filter(Boolean).map(name => ({ author: { display_name: name }, institutions: [] })),
    biblio: {
      volume: item.volume || '',
      issue: item.issue || '',
      first_page: item.page ? String(item.page).split('-')[0] : '',
      last_page: item.page ? String(item.page).split('-').at(-1) : ''
    },
    primary_location: {
      landing_page_url: item.URL || (itemDoi ? `https://doi.org/${itemDoi}` : ''),
      source: {
        display_name: clean(container),
        type: item.type || 'proceedings-article',
        host_organization_name: item.publisher || 'IEEE/ACM',
        issn: item.ISSN || []
      }
    },
    locations: [
      {
        source: {
          display_name: clean(container)
        }
      }
    ],
    open_access: { is_oa: false }
  };
}

async function crossrefWorksForVenueYear(venue, year) {
  if (['JSSC', 'TCAS-I', 'TCAS-II', 'TVLSI', 'TCAD'].includes(venue.key)) return [];
  const out = [];
  const seen = new Set();
  const filters = [
    `from-pub-date:${year}-01-01`,
    `until-pub-date:${year}-12-31`,
    'type:proceedings-article'
  ].join(',');
  for (const query of venue.queries) {
    if (out.length >= maxPerVenueYear) break;
    const url = `https://api.crossref.org/works?query.container-title=${encodeURIComponent(query)}&filter=${encodeURIComponent(filters)}&rows=${Math.min(maxPerVenueYear, 200)}`;
    const data = await fetchJson(url);
    for (const item of data.message?.items || []) {
      const work = crossrefToWork(item, venue);
      const key = doi(work) || work.id;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      if (worthKeeping(work, venue)) out.push(work);
      if (out.length >= maxPerVenueYear) break;
    }
    await sleep(100);
  }
  return out;
}

function ieeeToWork(article, venue) {
  const authorsList = article.authors?.authors || article.authors || [];
  const authorNames = Array.isArray(authorsList)
    ? authorsList.map(author => author.full_name || author.name).filter(Boolean)
    : [];
  const sourceName = article.publication_title || article.conference_title || article.publisher || venue.key;
  return {
    id: article.html_url || article.abstract_url || (article.doi ? `https://doi.org/${article.doi}` : ''),
    doi: String(article.doi || '').toLowerCase(),
    display_name: clean(article.title || article.article_title || ''),
    title: clean(article.title || article.article_title || ''),
    abstract: clean(article.abstract || ''),
    abstract_inverted_index: null,
    publication_year: Number(article.publication_year || article.publication_date?.slice?.(0, 4)) || null,
    publication_date: article.publication_date || '',
    cited_by_count: Number(article.citing_paper_count || article.citation_count || 0),
    article_number: article.article_number || '',
    pdf_url: article.pdf_url || '',
    concepts: [],
    authorships: authorNames.map(name => ({ author: { display_name: name }, institutions: [] })),
    biblio: {
      volume: article.volume || '',
      issue: article.issue || '',
      first_page: article.start_page || '',
      last_page: article.end_page || ''
    },
    primary_location: {
      landing_page_url: article.html_url || article.abstract_url || '',
      source: {
        display_name: clean(sourceName),
        type: article.content_type || 'article',
        host_organization_name: article.publisher || 'IEEE',
        issn: article.issn ? [article.issn] : []
      }
    },
    locations: [{ source: { display_name: clean(sourceName) } }],
    open_access: { is_oa: Boolean(article.is_open_access) }
  };
}

async function ieeeWorksForVenueYear(venue, year) {
  if (!ieeeApiKey) return [];
  const out = [];
  const seen = new Set();
  for (const query of venue.queries) {
    if (out.length >= maxPerVenueYear) break;
    let start = 1;
    while (out.length < maxPerVenueYear) {
      const params = new URLSearchParams({
        apikey: ieeeApiKey,
        format: 'json',
        max_records: String(Math.min(100, maxPerVenueYear - out.length)),
        start_record: String(start),
        sort_field: 'publication_year',
        sort_order: 'desc',
        querytext: `"${query}"`,
        start_year: String(year),
        end_year: String(year)
      });
      const data = await fetchJson(`https://ieeexploreapi.ieee.org/api/v1/search/articles?${params.toString()}`);
      const articles = data.articles || [];
      if (!articles.length) break;
      for (const article of articles) {
        const work = ieeeToWork(article, venue);
        const key = doi(work) || work.article_number || work.id;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        if (worthKeeping(work, venue)) out.push(work);
      }
      if (articles.length < 100) break;
      start += articles.length;
      await sleep(120);
    }
    await sleep(120);
  }
  return out;
}

function row(work, venue, collectionMethod) {
  const domainInfo = classify(work);
  const source = work.primary_location?.source || {};
  const biblio = work.biblio || {};
  const link = pdfLink(work);
  return {
    'Document Title': clean(work.display_name || work.title),
    'Authors': authors(work),
    'Author Affiliations': affiliations(work),
    'Publication Title': clean(source.display_name || venue.key),
    'Date Added To Xplore': '',
    'Publication Year': work.publication_year || '',
    'Volume': biblio.volume || '',
    'Issue': biblio.issue || '',
    'Start Page': biblio.first_page || '',
    'End Page': biblio.last_page || '',
    'Abstract': clean(abstract(work)),
    'ISSN': (source.issn || []).join('; '),
    'ISBNs': '',
    'DOI': doi(work),
    'Funding Information': '',
    'PDF Link': link,
    'Author Keywords': keywords(work, domainInfo.domain),
    'IEEE Terms': '',
    'Mesh_Terms': '',
    'Article Citation Count': work.cited_by_count || '',
    'Patent Citation Count': '',
    'Reference Count': '',
    'License': work.open_access?.is_oa ? 'OpenAlex OA' : 'Publisher',
    'Online Date': work.publication_date || '',
    'Issue Date': '',
    'Meeting Date': '',
    'Publisher': source.host_organization_name || 'IEEE/ACM',
    'Document Identifier': source.type || '',
    'Venue Key': venue.key,
    'Venue Rank': venue.rank,
    'IC Domain': domainInfo.domain,
    'Domain Hits': domainInfo.hits,
    'Quality Score': quality(work, venue, domainInfo),
    'OpenAlex ID': work.id || '',
    'Source URL': work.primary_location?.landing_page_url || work.doi || work.id || '',
    'IEEE Article Number': articleNumber(work),
    'Collection Method': collectionMethod,
    'Download Status': link && !/ieeexplore\.ieee\.org/i.test(link) ? 'open_pdf_available' : 'publisher_pdf_requires_session'
  };
}

function addWork(rows, seen, work, venue, collectionMethod) {
  const key = doi(work) || work.id;
  if (!key || seen.has(key)) return false;
  seen.add(key);
  rows.push(row(work, venue, collectionMethod));
  return true;
}

async function main() {
  await fs.mkdir(outRoot, { recursive: true });
  await fs.mkdir(path.join(outRoot, 'pdfs'), { recursive: true });
  await fs.mkdir(path.join(outRoot, 'pdf_inbox'), { recursive: true });
  await fs.mkdir(path.join(outRoot, 'raw'), { recursive: true });

  const rows = [];
  const seen = new Set();
  const sourceReport = [];
  const years = Array.from({ length: untilYear - sinceYear + 1 }, (_, index) => sinceYear + index);
  for (const venue of venues) {
    const beforeVenue = rows.length;
    const needsSourceYears = ['JSSC', 'TCAS-I', 'TCAS-II', 'TVLSI', 'TCAD'].includes(venue.key);
    const sources = (useSourceBackfill || needsSourceYears) ? await resolveSources(venue) : [];
    sourceReport.push({ venue: venue.key, sources: sources.map(s => ({ id: s.id, name: s.display_name, type: s.type })) });
    console.log(`VENUE ${venue.key}: ${useSourceBackfill ? sources.map(s => s.display_name).join(' | ') || 'no source' : 'year search only'}`);
    for (const year of years) {
      const ieeeWorks = await ieeeWorksForVenueYear(venue, year);
      for (const work of ieeeWorks) addWork(rows, seen, work, venue, `ieee_xplore_api:${year}`);
      if (needsSourceYears) {
        for (const source of sources.slice(0, 2)) {
          const sourceYearWorks = await worksForSourceYear(source, venue, year);
          for (const work of sourceYearWorks) addWork(rows, seen, work, venue, `openalex_source_year:${year}`);
        }
      }
      const works = await worksForVenueYear(venue, year);
      for (const work of works) addWork(rows, seen, work, venue, `venue_year_search:${year}`);
      const crossrefWorks = await crossrefWorksForVenueYear(venue, year);
      for (const work of crossrefWorks) addWork(rows, seen, work, venue, `crossref_venue_year:${year}`);
      console.log(`  ${venue.key} ${year}: +${ieeeWorks.length} ieee, +${works.length} openalex search, +${crossrefWorks.length} crossref, total ${rows.length - beforeVenue}`);
    }
    if (useSourceBackfill) {
      for (const source of sources) {
        if (rows.filter(r => r['Venue Key'] === venue.key).length >= maxPerVenue) break;
        const works = await worksForSource(source, venue);
        for (const work of works) addWork(rows, seen, work, venue, 'source_backfill');
        await sleep(100);
      }
    }
  }

  rows.sort((a, b) => Number(b['Quality Score']) - Number(a['Quality Score']) || Number(b['Publication Year']) - Number(a['Publication Year']));
  const headers = Object.keys(rows[0] || {});
  await fs.writeFile(path.join(outRoot, 'ic_chipseeker.csv'), '\ufeff' + [headers.join(','), ...rows.map(r => headers.map(h => csvEscape(r[h])).join(','))].join('\r\n'), 'utf8');
  await fs.writeFile(path.join(outRoot, 'raw', 'source_report.json'), JSON.stringify(sourceReport, null, 2), 'utf8');

  const dbPath = path.join(outRoot, 'ic_papers.sqlite');
  await fs.rm(dbPath, { force: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE papers (
      id INTEGER PRIMARY KEY,
      title TEXT,
      authors TEXT,
      affiliations TEXT,
      abstract TEXT,
      year INTEGER,
      venue TEXT,
      publication_title TEXT,
      venue_rank TEXT,
      domain TEXT,
      domain_hits INTEGER,
      quality_score REAL,
      doi TEXT,
      pdf_link TEXT,
      source_url TEXT,
      openalex_id TEXT,
      ieee_article_number TEXT,
      collection_method TEXT,
      download_status TEXT,
      local_pdf TEXT,
      citation_count INTEGER
    );
    CREATE INDEX idx_papers_venue ON papers(venue);
    CREATE INDEX idx_papers_domain ON papers(domain);
    CREATE INDEX idx_papers_score ON papers(quality_score);
    CREATE INDEX idx_papers_doi ON papers(doi);
    CREATE INDEX idx_papers_year ON papers(year);
    CREATE VIRTUAL TABLE papers_fts USING fts5(
      title,
      authors,
      abstract,
      venue,
      domain,
      doi,
      content='papers',
      content_rowid='id',
      tokenize='unicode61 remove_diacritics 2'
    );
  `);
  const insert = db.prepare(`
    INSERT INTO papers (
      title, authors, affiliations, abstract, year, venue, publication_title, venue_rank, domain, domain_hits,
      quality_score, doi, pdf_link, source_url, openalex_id, ieee_article_number, collection_method,
      download_status, local_pdf, citation_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.exec('BEGIN');
  for (const r of rows) {
    insert.run(
      String(r['Document Title'] || ''), String(r.Authors || ''), String(r['Author Affiliations'] || ''), String(r.Abstract || ''),
      Number(r['Publication Year']) || null, String(r['Venue Key'] || ''), String(r['Publication Title'] || ''),
      String(r['Venue Rank'] || ''), String(r['IC Domain'] || ''), Number(r['Domain Hits']) || 0, Number(r['Quality Score']) || null,
      String(r.DOI || ''), String(r['PDF Link'] || ''), String(r['Source URL'] || ''), String(r['OpenAlex ID'] || ''),
      String(r['IEEE Article Number'] || ''), String(r['Collection Method'] || ''), String(r['Download Status'] || ''), '',
      Number(r['Article Citation Count']) || 0
    );
  }
  db.exec(`
    INSERT INTO papers_fts(rowid, title, authors, abstract, venue, domain, doi)
    SELECT id, title, authors, abstract, venue, domain, doi FROM papers;
  `);
  db.exec('COMMIT');
  const summary = db.prepare('SELECT venue, venue_rank, COUNT(*) AS papers, MIN(year) AS min_year, MAX(year) AS max_year, ROUND(AVG(quality_score), 1) AS avg_score FROM papers GROUP BY venue, venue_rank ORDER BY MAX(quality_score) DESC').all();
  const byDomain = db.prepare('SELECT domain, COUNT(*) AS papers FROM papers GROUP BY domain ORDER BY papers DESC').all();
  const byVenueYear = db.prepare('SELECT venue, year, COUNT(*) AS papers FROM papers GROUP BY venue, year ORDER BY venue, year').all();
  db.close();

  const coverageChecks = byVenueYear
    .map(row => {
      const expected = coverageTargets[row.venue]?.[row.year];
      if (!expected) return null;
      return {
        venue: row.venue,
        year: row.year,
        papers: row.papers,
        expected,
        coverage: Math.round((row.papers / expected) * 1000) / 10
      };
    })
    .filter(Boolean);
  const summaryPayload = { generatedAt: new Date().toISOString(), range: `${sinceYear}-${untilYear}`, rows: rows.length, summary, byDomain, byVenueYear, coverageChecks };
  await fs.writeFile(path.join(outRoot, 'summary.json'), JSON.stringify(summaryPayload, null, 2), 'utf8');
  console.table(summary);
  console.table(byDomain);
  if (coverageChecks.length) console.table(coverageChecks);
  console.log(JSON.stringify({ rows: rows.length, dbPath, csvPath: path.join(outRoot, 'ic_chipseeker.csv') }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
