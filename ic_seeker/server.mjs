import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createConfig } from './config/env.mjs';
import { initDb, openDb as openDatabase } from './db/connection.mjs';
import { bad, json, parseUrl, readJson } from './lib/http.mjs';
import { createAuth } from './lib/auth.mjs';

const config = await createConfig(import.meta.url);
const {
  publicDir,
  dbPath,
  csvPath,
  pdfInboxPath,
  port,
  bindHost,
  appName,
  adminPassword,
  authEnabled,
  cookieName,
  cookieSecret
} = config;
const loginFailures = new Map();
const { currentUser, setSession, clearSession, requireAuth, ipKey } = createAuth({
  authEnabled,
  cookieName,
  cookieSecret,
  bad
});

function openDb(options = {}) {
  return openDatabase(dbPath, options);
}

initDb(dbPath);

function whereClause(params) {
  const clauses = [];
  const args = [];
  const q = (params.get('q') || '').trim();
  if (q && params.get('_includeQ') !== '0') {
    clauses.push('(title LIKE ? OR abstract LIKE ? OR authors LIKE ? OR doi LIKE ?)');
    const like = `%${q}%`;
    args.push(like, like, like, like);
  }
  for (const [key, column] of [['venue', 'venue'], ['field', 'domain'], ['rank', 'venue_rank']]) {
    const value = (params.get(key) || '').trim();
    if (value) {
      clauses.push(`${column} = ?`);
      args.push(value);
    }
  }
  const yearFrom = Number(params.get('yearFrom') || 0);
  const yearTo = Number(params.get('yearTo') || 0);
  if (yearFrom) {
    clauses.push('year >= ?');
    args.push(yearFrom);
  }
  if (yearTo) {
    clauses.push('year <= ?');
    args.push(yearTo);
  }
  const hasPdf = params.get('hasPdf');
  if (hasPdf === '1') clauses.push("local_pdf != ''");
  const favorite = params.get('favorite');
  if (favorite === '1') clauses.push('id IN (SELECT paper_id FROM favorites)');
  const tag = (params.get('tag') || '').trim();
  if (tag) clauses.push('id IN (SELECT paper_id FROM paper_tags JOIN tags ON tags.id = paper_tags.tag_id WHERE tags.name = ?)');
  if (tag) args.push(tag);
  const status = (params.get('status') || '').trim();
  if (status) {
    clauses.push('id IN (SELECT paper_id FROM reading_status WHERE status = ?)');
    args.push(status);
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', args };
}

function ftsQuery(input, operator = 'AND') {
  const terms = String(input || '')
    .normalize('NFKC')
    .toLowerCase()
    .match(/[\p{L}\p{N}_]+/gu);
  if (!terms) return '';
  const cleanTerms = [...new Set(terms)]
    .filter(term => term.length > 1 || /^[a-z]$/i.test(term) === false)
    .slice(0, 12);
  return cleanTerms.map(term => `${term.replace(/"/g, '')}*`).join(` ${operator} `);
}

const semanticAliases = new Map([
  ['adc', ['analog to digital', 'a/d', 'converter', 'sar', 'pipeline', 'delta sigma']],
  ['dac', ['digital to analog', 'd/a', 'converter', 'current steering']],
  ['pll', ['phase locked loop', 'clock generator', 'jitter', 'frequency synthesizer']],
  ['ldo', ['low dropout', 'regulator', 'power management']],
  ['dcdc', ['buck', 'boost', 'switched capacitor', 'charge pump', 'pmic']],
  ['dc-dc', ['dcdc', 'buck', 'boost', 'switched capacitor', 'charge pump', 'pmic']],
  ['dc/dc', ['dcdc', 'buck', 'boost', 'switched capacitor', 'charge pump', 'pmic']],
  ['pmic', ['power management', 'dc-dc', 'dcdc', 'ldo', 'buck', 'boost']],
  ['bandgap', ['voltage reference', 'reference circuit', 'temperature coefficient']],
  ['serdes', ['wireline', 'transceiver', 'equalizer', 'cdr']],
  ['rf', ['radio frequency', 'mixer', 'pa', 'lna', 'oscillator']],
  ['memory', ['sram', 'dram', 'nonvolatile', 'compute in memory']],
  ['ai', ['accelerator', 'neural network', 'machine learning', 'inference']],
  ['模数转换器', ['adc', 'analog to digital', 'sar', 'pipeline']],
  ['数模转换器', ['dac', 'digital to analog']],
  ['锁相环', ['pll', 'phase locked loop', 'frequency synthesizer']],
  ['电源管理', ['power management', 'ldo', 'buck', 'boost']],
  ['射频', ['rf', 'radio frequency', 'lna', 'mixer']],
  ['存储器', ['memory', 'sram', 'dram']],
  ['芯片', ['integrated circuit', 'ic', 'chip']],
  ['模拟', ['analog', 'mixed signal']]
]);

function semanticText(input) {
  const q = String(input || '').trim();
  if (!q) return '';
  const lower = q.toLowerCase();
  const compact = lower.replace(/[^\p{L}\p{N}]+/gu, '');
  const extra = [];
  for (const [key, values] of semanticAliases) {
    const keyLower = key.toLowerCase();
    const keyCompact = keyLower.replace(/[^\p{L}\p{N}]+/gu, '');
    if (lower.includes(keyLower) || (keyCompact && compact.includes(keyCompact))) extra.push(...values);
  }
  return [...new Set([q, ...extra])].join(' ');
}

function stats() {
  const db = openDb();
  try {
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
      appName,
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
      csvPath,
      dbPath,
      pdfInboxPath
    };
  } finally {
    db.close();
  }
}

function rowsWithUserState(db, rows) {
  if (!rows.length) return rows;
  const ids = rows.map(row => Number(row.id)).filter(Boolean);
  const placeholders = ids.map(() => '?').join(',');
  const favorites = new Set(db.prepare(`SELECT paper_id FROM favorites WHERE paper_id IN (${placeholders})`).all(...ids).map(row => row.paper_id));
  const status = new Map(db.prepare(`SELECT paper_id, status FROM reading_status WHERE paper_id IN (${placeholders})`).all(...ids).map(row => [row.paper_id, row.status]));
  const tagRows = db.prepare(`
    SELECT paper_tags.paper_id, tags.name, tags.color
    FROM paper_tags
    JOIN tags ON tags.id = paper_tags.tag_id
    WHERE paper_tags.paper_id IN (${placeholders})
    ORDER BY tags.name
  `).all(...ids);
  const tags = new Map();
  for (const row of tagRows) {
    if (!tags.has(row.paper_id)) tags.set(row.paper_id, []);
    tags.get(row.paper_id).push({ name: row.name, color: row.color });
  }
  return rows.map(row => ({
    ...row,
    favorite: favorites.has(row.id),
    readingStatus: status.get(row.id) || 'unread',
    tags: tags.get(row.id) || []
  }));
}

function search(params) {
  const limit = Math.min(Number(params.get('limit') || 80), 300);
  const offset = Math.max(Number(params.get('offset') || 0), 0);
  const rawQ = (params.get('q') || '').trim();
  const semantic = params.get('semantic') === '1';
  const q = semantic ? semanticText(rawQ) : rawQ;
  const requestedSort = params.get('sort') || 'score';
  const sort = !rawQ && requestedSort === 'relevance' ? 'score' : requestedSort;
  const order = {
    relevance: 'searchRank ASC, quality_score DESC, year DESC',
    score: 'quality_score DESC, year DESC',
    year: 'year DESC, quality_score DESC',
    citations: 'citation_count DESC, quality_score DESC',
    title: 'title COLLATE NOCASE ASC'
  }[sort] || 'quality_score DESC, year DESC';
  const filterParams = new URLSearchParams(params);
  filterParams.set('_includeQ', '0');
  const where = whereClause(filterParams);
  const db = openDb();
  try {
    const query = ftsQuery(q, semantic ? 'OR' : 'AND');
    if (query) {
      const total = db.prepare(`
        WITH matched AS (
          SELECT rowid AS id
          FROM papers_fts
          WHERE papers_fts MATCH ?
        )
        SELECT COUNT(*) AS n
        FROM matched
        JOIN papers ON papers.id = matched.id
        ${where.sql}
      `).get(query, ...where.args).n;
      const rows = db.prepare(`
        WITH matched AS (
          SELECT rowid AS id, bm25(papers_fts, 8.0, 2.0, 4.0, 1.5, 1.2, 4.0) AS searchRank
          FROM papers_fts
          WHERE papers_fts MATCH ?
        )
        SELECT papers.id, title, authors, abstract, year, venue, venue_rank AS rank, domain AS field,
               quality_score AS score, doi, pdf_link AS pdfLink, local_pdf AS localPdf,
               download_status AS downloadStatus, citation_count AS citations,
               verification_status AS verificationStatus, collection_method AS collectionMethod, searchRank
        FROM matched
        JOIN papers ON papers.id = matched.id
        ${where.sql}
        ORDER BY ${sort === 'score' ? 'searchRank ASC, quality_score DESC, year DESC' : order}
        LIMIT ? OFFSET ?
      `).all(query, ...where.args, limit, offset);
      return { total, limit, offset, query: rawQ, expandedQuery: q, engine: semantic ? 'sqlite-fts5-semantic-lite' : 'sqlite-fts5', rows: rowsWithUserState(db, rows) };
    }
    const total = db.prepare(`SELECT COUNT(*) AS n FROM papers ${where.sql}`).get(...where.args).n;
    const rows = db.prepare(`
      SELECT id, title, authors, abstract, year, venue, venue_rank AS rank, domain AS field,
             quality_score AS score, doi, pdf_link AS pdfLink, local_pdf AS localPdf,
             download_status AS downloadStatus, citation_count AS citations,
             verification_status AS verificationStatus, collection_method AS collectionMethod
      FROM papers
      ${where.sql}
      ORDER BY ${order}
      LIMIT ? OFFSET ?
    `).all(...where.args, limit, offset);
    return { total, limit, offset, engine: 'sqlite', rows: rowsWithUserState(db, rows) };
  } finally {
    db.close();
  }
}

function paper(id) {
  const db = openDb();
  try {
    const row = db.prepare('SELECT * FROM papers WHERE id = ?').get(id);
    if (!row) return null;
    const [withState] = rowsWithUserState(db, [row]);
    const note = db.prepare('SELECT body FROM notes WHERE paper_id = ?').get(id);
    return { ...withState, note: note?.body || '' };
  } finally {
    db.close();
  }
}

function normalizeTags(tags) {
  const raw = Array.isArray(tags) ? tags : String(tags || '').split(',');
  return [...new Set(raw.map(tag => String(tag).trim()).filter(Boolean).slice(0, 12))];
}

function upsertPaperState(id, body) {
  const db = openDb();
  try {
    const exists = db.prepare('SELECT id FROM papers WHERE id = ?').get(id);
    if (!exists) return null;
    db.exec('BEGIN');
    if (typeof body.favorite === 'boolean') {
      if (body.favorite) db.prepare('INSERT OR IGNORE INTO favorites (paper_id) VALUES (?)').run(id);
      else db.prepare('DELETE FROM favorites WHERE paper_id = ?').run(id);
    }
    if (body.readingStatus) {
      const allowed = new Set(['unread', 'reading', 'read', 'important', 'skip']);
      const status = allowed.has(body.readingStatus) ? body.readingStatus : 'unread';
      db.prepare(`
        INSERT INTO reading_status (paper_id, status, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(paper_id) DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP
      `).run(id, status);
    }
    if (typeof body.note === 'string') {
      db.prepare(`
        INSERT INTO notes (paper_id, body, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(paper_id) DO UPDATE SET body = excluded.body, updated_at = CURRENT_TIMESTAMP
      `).run(id, body.note.slice(0, 20000));
    }
    if ('tags' in body) {
      db.prepare('DELETE FROM paper_tags WHERE paper_id = ?').run(id);
      for (const tag of normalizeTags(body.tags)) {
        db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(tag);
        const tagRow = db.prepare('SELECT id FROM tags WHERE name = ?').get(tag);
        db.prepare('INSERT OR IGNORE INTO paper_tags (paper_id, tag_id) VALUES (?, ?)').run(id, tagRow.id);
      }
    }
    db.exec('COMMIT');
    return paper(id);
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    throw err;
  } finally {
    db.close();
  }
}

function allTags() {
  const db = openDb();
  try {
    return db.prepare(`
      SELECT tags.name, tags.color, COUNT(paper_tags.paper_id) AS papers
      FROM tags
      LEFT JOIN paper_tags ON paper_tags.tag_id = tags.id
      GROUP BY tags.id
      ORDER BY tags.name
    `).all();
  } finally {
    db.close();
  }
}

function maskSecret(value) {
  if (!value) return '';
  if (value.length <= 8) return '*'.repeat(value.length);
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function apiKeys() {
  const db = openDb();
  try {
    const rows = db.prepare('SELECT provider, value, updated_at AS updatedAt FROM api_keys ORDER BY provider').all();
    const envProviders = ['OPENAI_API_KEY', 'IEEE_API_KEY', 'AMINER_API_KEY', 'AMINER_AUTH_TOKEN', 'CROSSREF_MAILTO']
      .filter(name => process.env[name])
      .map(name => ({ provider: name.toLowerCase(), masked: maskSecret(process.env[name]), source: 'env' }));
    return [
      ...rows.map(row => ({ provider: row.provider, masked: maskSecret(row.value), updatedAt: row.updatedAt, source: 'database' })),
      ...envProviders
    ];
  } finally {
    db.close();
  }
}

function setApiKey(provider, value) {
  const cleanProvider = String(provider || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  if (!cleanProvider) throw new Error('Invalid provider');
  const db = openDb();
  try {
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
  } finally {
    db.close();
  }
}

function inferDomain(text) {
  const hay = String(text || '').toLowerCase();
  const rules = [
    ['Data Converters', ['adc', 'dac', 'converter', 'sar', 'pipeline', 'delta-sigma', 'delta sigma']],
    ['Frequency Generation', ['pll', 'oscillator', 'clock', 'jitter', 'synthesizer']],
    ['Power Management', ['ldo', 'buck', 'boost', 'regulator', 'dc-dc', 'power management']],
    ['RF/Wireless', ['rf', 'wireless', 'mixer', 'lna', 'pa', 'transceiver']],
    ['Wireline', ['serdes', 'wireline', 'cdr', 'equalizer']],
    ['Memory/Compute', ['sram', 'dram', 'memory', 'compute-in-memory', 'accelerator']],
    ['EDA/Digital', ['placement', 'routing', 'verification', 'fpga', 'digital']]
  ];
  for (const [domain, keys] of rules) {
    if (keys.some(key => hay.includes(key))) return domain;
  }
  return 'General IC';
}

function venueRank(venue) {
  const ranks = new Map([
    ['ISSCC', 'S+'], ['JSSC', 'S+'], ['VLSI Symposium', 'S'], ['CICC', 'S'],
    ['IEDM', 'S'], ['ASSCC', 'A'], ['ESSCIRC', 'A'], ['DAC', 'A'],
    ['ICCAD', 'A'], ['TCAD', 'A'], ['DATE', 'A'], ['TCAS-I', 'A'],
    ['TCAS-II', 'A'], ['TVLSI', 'A'], ['ISCAS', 'B']
  ]);
  return ranks.get(venue) || 'User';
}

function baseScore(venue, year, citations = 0) {
  const base = methodology().scoring.venueBase[venue] || 50;
  return Math.round((base + Math.min(Number(citations || 0), 300) / 25 + Math.max(0, Number(year || 2016) - 2016) * 0.35) * 10) / 10;
}

function rebuildFtsForPaper(db, id) {
  const row = db.prepare('SELECT id, title, authors, abstract, venue, domain, doi FROM papers WHERE id = ?').get(id);
  if (!row) return;
  db.prepare('DELETE FROM papers_fts WHERE rowid = ?').run(id);
  db.prepare('INSERT INTO papers_fts (rowid, title, authors, abstract, venue, domain, doi) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(row.id, row.title || '', row.authors || '', row.abstract || '', row.venue || '', row.domain || '', row.doi || '');
}

function insertPaper(input) {
  const title = String(input.title || '').trim();
  if (!title) throw new Error('Title is required');
  const doi = String(input.doi || '').trim().replace(/^https?:\/\/doi\.org\//i, '');
  const authors = Array.isArray(input.authors) ? input.authors.join('; ') : String(input.authors || '');
  const abstract = String(input.abstract || '');
  const venue = String(input.venue || input.publication_title || 'User Import').trim();
  const year = Number(input.year || new Date().getFullYear());
  const domain = String(input.domain || inferDomain(`${title} ${abstract} ${venue}`));
  const citations = Number(input.citation_count || input.citations || 0);
  const sourceUrl = String(input.source_url || (doi ? `https://doi.org/${doi}` : ''));
  const db = openDb();
  try {
    if (doi) {
      const existing = db.prepare('SELECT id FROM papers WHERE lower(doi) = lower(?)').get(doi);
      if (existing) return paper(existing.id);
    }
    const result = db.prepare(`
      INSERT INTO papers (
        title, authors, affiliations, abstract, year, venue, publication_title, venue_rank,
        domain, domain_hits, quality_score, doi, pdf_link, source_url, openalex_id,
        ieee_article_number, collection_method, download_status, local_pdf, citation_count,
        verification_status, user_added, semantic_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      title,
      authors,
      String(input.affiliations || ''),
      abstract,
      year,
      venue,
      String(input.publication_title || venue),
      venueRank(venue),
      domain,
      0,
      baseScore(venue, year, citations),
      doi,
      String(input.pdf_link || ''),
      sourceUrl,
      String(input.openalex_id || ''),
      String(input.ieee_article_number || ''),
      input.collection_method || 'manual_import',
      input.download_status || 'metadata_only',
      String(input.local_pdf || ''),
      citations,
      input.verification_status || (doi ? 'doi_verified' : 'user_entered'),
      semanticText(`${title} ${abstract} ${domain}`)
    );
    rebuildFtsForPaper(db, Number(result.lastInsertRowid));
    db.prepare('INSERT INTO import_log (source, status, message) VALUES (?, ?, ?)').run(input.collection_method || 'manual_import', 'ok', title);
    return paper(Number(result.lastInsertRowid));
  } finally {
    db.close();
  }
}

async function importDoi(doi) {
  const cleanDoi = String(doi || '').trim().replace(/^https?:\/\/doi\.org\//i, '');
  if (!cleanDoi) throw new Error('DOI is required');
  const mailto = process.env.CROSSREF_MAILTO ? `?mailto=${encodeURIComponent(process.env.CROSSREF_MAILTO)}` : '';
  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}${mailto}`, {
    headers: { 'user-agent': `IC Seeker Private (${process.env.CROSSREF_MAILTO || 'local'})` }
  });
  if (!res.ok) throw new Error(`Crossref returned ${res.status}`);
  const data = await res.json();
  const item = data.message || {};
  const published = item.published?.['date-parts']?.[0] || item.created?.['date-parts']?.[0] || [];
  const authors = (item.author || []).map(author => [author.given, author.family].filter(Boolean).join(' ')).filter(Boolean);
  return insertPaper({
    title: item.title?.[0] || cleanDoi,
    authors,
    abstract: String(item.abstract || '').replace(/<[^>]+>/g, ' '),
    year: published[0],
    venue: item['container-title']?.[0] || item.publisher || 'Crossref',
    publication_title: item['container-title']?.[0] || '',
    doi: item.DOI || cleanDoi,
    source_url: item.URL || `https://doi.org/${cleanDoi}`,
    citation_count: item['is-referenced-by-count'] || 0,
    collection_method: 'crossref_doi_import',
    verification_status: 'doi_verified'
  });
}

function splitList(value) {
  return String(value || '').split(';').map(item => item.trim()).filter(Boolean);
}

function scoreAuthor(item) {
  return Math.round((item.scoreSum + item.sPlus * 5 + item.s * 2 + item.citations / 50) * 10) / 10;
}

function summarizePaperRows(rows) {
  const years = new Map();
  const venues = new Map();
  const domains = new Map();
  const ranks = { sPlus: 0, s: 0, a: 0, other: 0 };
  let scoreSum = 0;
  let citations = 0;
  for (const row of rows) {
    years.set(row.year, (years.get(row.year) || 0) + 1);
    venues.set(row.venue, (venues.get(row.venue) || 0) + 1);
    domains.set(row.domain, (domains.get(row.domain) || 0) + 1);
    scoreSum += Number(row.quality_score || 0);
    citations += Number(row.citation_count || 0);
    if (row.venue_rank === 'S+') ranks.sPlus += 1;
    else if (row.venue_rank === 'S') ranks.s += 1;
    else if (String(row.venue_rank || '').startsWith('A')) ranks.a += 1;
    else ranks.other += 1;
  }
  const sortedEntries = map => [...map.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)));
  return {
    papers: rows.length,
    scoreSum: Math.round(scoreSum * 10) / 10,
    avgScore: Math.round((scoreSum / Math.max(1, rows.length)) * 10) / 10,
    citations,
    ranks,
    byYear: sortedEntries(years).sort((a, b) => Number(a.key) - Number(b.key)),
    byVenue: sortedEntries(venues),
    byDomain: sortedEntries(domains)
  };
}

function paperListForProfile(rows) {
  return rows
    .sort((a, b) => Number(b.year) - Number(a.year) || Number(b.quality_score) - Number(a.quality_score))
    .slice(0, 250)
    .map(row => ({
      id: row.id,
      title: row.title,
      authors: row.authors,
      affiliations: row.affiliations,
      year: row.year,
      venue: row.venue,
      rank: row.venue_rank,
      field: row.domain,
      score: row.quality_score,
      doi: row.doi,
      citations: row.citation_count
    }));
}

function authorProfile(name) {
  const target = String(name || '').trim().toLowerCase();
  const db = openDb();
  try {
    const rows = db.prepare('SELECT * FROM papers WHERE authors LIKE ?').all(`%${name}%`)
      .filter(row => splitList(row.authors).some(author => author.toLowerCase() === target));
    const summary = summarizePaperRows(rows);
    const coauthors = new Map();
    const institutions = new Map();
    for (const row of rows) {
      for (const author of splitList(row.authors)) {
        if (author.toLowerCase() !== target) coauthors.set(author, (coauthors.get(author) || 0) + 1);
      }
      for (const institution of splitList(row.affiliations)) institutions.set(institution, (institutions.get(institution) || 0) + 1);
    }
    const authorScore = scoreAuthor({
      scoreSum: summary.scoreSum,
      sPlus: summary.ranks.sPlus,
      s: summary.ranks.s,
      citations: summary.citations
    });
    return {
      name,
      paperCount: summary.papers,
      authorScore,
      ...summary,
      coauthors: [...coauthors.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, 40),
      institutions: [...institutions.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, 20),
      external: {
        googleScholar: `https://scholar.google.com/scholar?q=${encodeURIComponent(name)}`,
        webSearch: `https://www.google.com/search?q=${encodeURIComponent(`${name} professor integrated circuits`)}`
      },
      papers: paperListForProfile(rows)
    };
  } finally {
    db.close();
  }
}

function institutions(params) {
  const limit = Math.min(Number(params.get('limit') || 80), 300);
  const minPapers = Number(params.get('minPapers') || 2);
  const db = openDb();
  try {
    const rows = db.prepare("SELECT affiliations, venue_rank, quality_score, citation_count FROM papers WHERE affiliations != ''").all();
    const byInstitution = new Map();
    for (const row of rows) {
      for (const name of splitList(row.affiliations)) {
        const item = byInstitution.get(name) || { name, papers: 0, scoreSum: 0, citations: 0, sPlus: 0, s: 0, a: 0 };
        item.papers += 1;
        item.scoreSum += Number(row.quality_score || 0);
        item.citations += Number(row.citation_count || 0);
        if (row.venue_rank === 'S+') item.sPlus += 1;
        else if (row.venue_rank === 'S') item.s += 1;
        else if (String(row.venue_rank || '').startsWith('A')) item.a += 1;
        byInstitution.set(name, item);
      }
    }
    return [...byInstitution.values()]
      .map(item => ({
        ...item,
        avgScore: Math.round((item.scoreSum / Math.max(1, item.papers)) * 10) / 10,
        institutionScore: scoreAuthor(item)
      }))
      .filter(item => item.papers >= minPapers)
      .sort((a, b) => b.institutionScore - a.institutionScore || b.papers - a.papers)
      .slice(0, limit);
  } finally {
    db.close();
  }
}

function institutionProfile(name) {
  const target = String(name || '').trim().toLowerCase();
  const db = openDb();
  try {
    const rows = db.prepare('SELECT * FROM papers WHERE affiliations LIKE ?').all(`%${name}%`)
      .filter(row => splitList(row.affiliations).some(institution => institution.toLowerCase() === target));
    const authors = new Map();
    for (const row of rows) {
      for (const author of splitList(row.authors)) authors.set(author, (authors.get(author) || 0) + 1);
    }
    const summary = summarizePaperRows(rows);
    return {
      name,
      paperCount: summary.papers,
      institutionScore: scoreAuthor({
        scoreSum: summary.scoreSum,
        sPlus: summary.ranks.sPlus,
        s: summary.ranks.s,
        citations: summary.citations
      }),
      ...summary,
      authors: [...authors.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, 50),
      papers: paperListForProfile(rows)
    };
  } finally {
    db.close();
  }
}

function methodology() {
  return {
    scoring: {
      formula: 'quality_score = venue_base + 10 * domain_keyword_hits + citation_boost + recency_boost',
      citationBoost: 'min(cited_by_count, 300) / 25',
      recencyBoost: `(publication_year - ${2016}) * 0.35, floored at 0`,
      venueBase: {
        ISSCC: 100,
        JSSC: 100,
        'VLSI Symposium': 92,
        CICC: 86,
        IEDM: 84,
        ASSCC: 78,
        ESSCIRC: 76,
        DAC: 74,
        ICCAD: 74,
        TCAD: 70,
        DATE: 66,
        'TCAS-I': 64,
        TVLSI: 62,
        'TCAS-II': 60,
        ISCAS: 54
      }
    },
    classification: [
      'Each paper is scored against IC-domain keyword dictionaries using title, abstract, source name, and OpenAlex concepts.',
      'The domain with the most keyword hits wins; if no domain wins but IC terms are present, it falls back to General IC.',
      'This is intentionally transparent and editable. It is not a learned model yet.'
    ],
    coverage: [
      'The builder now uses venue-year OpenAlex search for every configured year, then backfills from resolved OpenAlex sources.',
      'Conference coverage can still depend on how OpenAlex indexes a specific proceedings year.',
      'Publisher PDFs are not mass-downloaded; local PDFs can be attached through the pdf_inbox workflow.'
    ],
    professorScoring: {
      formula: 'author_score = score_sum + 5 * s_plus_count + 2 * s_count + citation_count / 50',
      caveat: 'Current author identity is name-based. ORCID/institution disambiguation should be added before using it seriously.'
    }
  };
}

function professors(params) {
  const limit = Math.min(Number(params.get('limit') || 80), 300);
  const db = openDb();
  try {
    const rows = db.prepare("SELECT authors, venue_rank, quality_score, citation_count FROM papers WHERE authors != ''").all();
    const byAuthor = new Map();
    for (const row of rows) {
      for (const rawName of String(row.authors || '').split(';')) {
        const name = rawName.trim();
        if (!name) continue;
        const item = byAuthor.get(name) || { name, papers: 0, scoreSum: 0, citations: 0, sPlus: 0, s: 0, a: 0 };
        item.papers += 1;
        item.scoreSum += Number(row.quality_score || 0);
        item.citations += Number(row.citation_count || 0);
        if (row.venue_rank === 'S+') item.sPlus += 1;
        else if (row.venue_rank === 'S') item.s += 1;
        else if (String(row.venue_rank || '').startsWith('A')) item.a += 1;
        byAuthor.set(name, item);
      }
    }
    return [...byAuthor.values()]
      .map(item => ({
        ...item,
        avgScore: Math.round((item.scoreSum / Math.max(1, item.papers)) * 10) / 10,
        authorScore: scoreAuthor(item)
      }))
      .filter(item => item.papers >= Number(params.get('minPapers') || 2))
      .sort((a, b) => b.authorScore - a.authorScore || b.papers - a.papers)
      .slice(0, limit);
  } finally {
    db.close();
  }
}

async function pdfInbox() {
  await fs.mkdir(pdfInboxPath, { recursive: true });
  const entries = await fs.readdir(pdfInboxPath, { withFileTypes: true });
  const pdfs = entries
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
    .map(entry => ({ name: entry.name, path: path.join(pdfInboxPath, entry.name) }));
  return {
    path: pdfInboxPath,
    count: pdfs.length,
    pdfs,
    importCommand: 'node .\\scripts\\import-local-pdfs.mjs'
  };
}

async function serveStatic(req, res, url) {
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filePath = path.resolve(publicDir, `.${requested}`);
  if (!filePath.startsWith(publicDir)) return bad(res, 'Forbidden', 403);
  try {
    const bytes = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    res.end(bytes);
  } catch {
    bad(res, 'Not found', 404);
  }
}

const server = http.createServer(async (req, res) => {
  const url = parseUrl(req);
  try {
    if (url.pathname === '/api/auth/status') return json(res, { authenticated: Boolean(currentUser(req)), authEnabled, appName });
    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      if (!authEnabled) return json(res, { ok: true, user: 'local', appName });
      const key = ipKey(req);
      const failures = loginFailures.get(key) || { count: 0, last: 0 };
      if (failures.count >= 8 && Date.now() - failures.last < 60_000) return bad(res, 'Too many login attempts. Try again later.', 429);
      const body = await readJson(req, 20_000);
      if (String(body.password || '') !== adminPassword) {
        loginFailures.set(key, { count: failures.count + 1, last: Date.now() });
        return bad(res, 'Invalid password', 401);
      }
      loginFailures.delete(key);
      setSession(res);
      return json(res, { ok: true, user: 'admin', appName });
    }
    if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
      clearSession(res);
      return json(res, { ok: true });
    }

    if (url.pathname.startsWith('/api/') || url.pathname === '/download/csv') {
      if (!requireAuth(req, res)) return;
    }

    if (url.pathname === '/api/stats') return json(res, stats());
    if (url.pathname === '/api/methodology') return json(res, methodology());
    if (url.pathname === '/api/professors') return json(res, professors(url.searchParams));
    if (url.pathname.startsWith('/api/authors/')) return json(res, authorProfile(decodeURIComponent(url.pathname.split('/').at(-1))));
    if (url.pathname === '/api/institutions') return json(res, institutions(url.searchParams));
    if (url.pathname.startsWith('/api/institutions/')) return json(res, institutionProfile(decodeURIComponent(url.pathname.split('/').at(-1))));
    if (url.pathname === '/api/pdf-inbox') return json(res, await pdfInbox());
    if (url.pathname === '/api/search') return json(res, search(url.searchParams));
    if (url.pathname.startsWith('/api/papers/')) {
      const id = Number(url.pathname.split('/').at(-1));
      const row = paper(id);
      return row ? json(res, row) : bad(res, 'Paper not found', 404);
    }
    if (url.pathname.startsWith('/api/private/papers/') && url.pathname.endsWith('/state') && req.method === 'PUT') {
      const id = Number(url.pathname.split('/').at(-2));
      const row = upsertPaperState(id, await readJson(req));
      return row ? json(res, row) : bad(res, 'Paper not found', 404);
    }
    if (url.pathname === '/api/private/tags') return json(res, allTags());
    if (url.pathname === '/api/import/manual' && req.method === 'POST') return json(res, insertPaper(await readJson(req)));
    if (url.pathname === '/api/import/doi' && req.method === 'POST') {
      const body = await readJson(req, 50_000);
      return json(res, await importDoi(body.doi));
    }
    if (url.pathname === '/api/admin/api-keys') return json(res, apiKeys());
    if (url.pathname.startsWith('/api/admin/api-keys/') && req.method === 'PUT') {
      const provider = decodeURIComponent(url.pathname.split('/').at(-1));
      const body = await readJson(req, 200_000);
      return json(res, setApiKey(provider, body.value || ''));
    }
    if (url.pathname === '/download/csv') {
      const bytes = await fs.readFile(csvPath);
      res.writeHead(200, {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="ic_chipseeker.csv"'
      });
      return res.end(bytes);
    }
    return await serveStatic(req, res, url);
  } catch (err) {
    return bad(res, err.message || String(err), 500);
  }
});

server.listen(port, bindHost, () => {
  console.log(`IC Seeker running at http://${bindHost}:${port}`);
  console.log(`Database: ${dbPath}`);
});
