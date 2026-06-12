import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicDir = path.join(__dirname, 'public');
const dbPath = process.env.IC_SEEKER_DB || path.join(root, 'ic_database', 'ic_papers.sqlite');
const csvPath = process.env.IC_SEEKER_CSV || path.join(root, 'ic_database', 'ic_chipseeker.csv');
const pdfInboxPath = process.env.IC_SEEKER_PDF_INBOX || path.join(root, 'ic_database', 'pdf_inbox');
const port = Number(process.env.PORT || 8750);

function json(res, body, status = 200) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

function bad(res, message, status = 400) {
  json(res, { error: message }, status);
}

function openDb() {
  return new DatabaseSync(dbPath, { readOnly: true });
}

function parseUrl(req) {
  return new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
}

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
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', args };
}

function ftsQuery(input) {
  const terms = String(input || '')
    .normalize('NFKC')
    .toLowerCase()
    .match(/[\p{L}\p{N}_]+/gu);
  if (!terms) return '';
  const cleanTerms = [...new Set(terms)]
    .filter(term => term.length > 1 || /^[a-z]$/i.test(term) === false)
    .slice(0, 12);
  return cleanTerms.map(term => `${term.replace(/"/g, '')}*`).join(' AND ');
}

function stats() {
  const db = openDb();
  try {
    const total = db.prepare('SELECT COUNT(*) AS n FROM papers').get().n;
    const pdfs = db.prepare("SELECT COUNT(*) AS n FROM papers WHERE local_pdf != ''").get().n;
    const byVenue = db.prepare('SELECT venue, venue_rank AS rank, COUNT(*) AS count, ROUND(AVG(quality_score), 1) AS avgScore FROM papers GROUP BY venue, venue_rank ORDER BY MAX(quality_score) DESC').all();
    const byField = db.prepare('SELECT domain AS field, COUNT(*) AS count FROM papers GROUP BY domain ORDER BY count DESC').all();
    const byVenueYear = db.prepare('SELECT venue, year, COUNT(*) AS count FROM papers GROUP BY venue, year ORDER BY venue, year').all();
    const years = db.prepare('SELECT MIN(year) AS minYear, MAX(year) AS maxYear FROM papers').get();
    const venues = db.prepare('SELECT DISTINCT venue FROM papers ORDER BY venue').all().map(r => r.venue);
    const fields = db.prepare('SELECT DISTINCT domain FROM papers ORDER BY domain').all().map(r => r.domain);
    const ranks = db.prepare('SELECT DISTINCT venue_rank FROM papers ORDER BY venue_rank').all().map(r => r.venue_rank);
    return { total, pdfs, byVenue, byField, byVenueYear, years, venues, fields, ranks, csvPath, dbPath, pdfInboxPath };
  } finally {
    db.close();
  }
}

function search(params) {
  const limit = Math.min(Number(params.get('limit') || 80), 300);
  const offset = Math.max(Number(params.get('offset') || 0), 0);
  const q = (params.get('q') || '').trim();
  const requestedSort = params.get('sort') || 'score';
  const sort = !q && requestedSort === 'relevance' ? 'score' : requestedSort;
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
    const query = ftsQuery(q);
    if (query) {
      const joinWhere = where.sql ? where.sql.replace(/^WHERE /, 'AND ') : '';
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
        SELECT papers.id, title, authors, year, venue, venue_rank AS rank, domain AS field,
               quality_score AS score, doi, pdf_link AS pdfLink, local_pdf AS localPdf,
               download_status AS downloadStatus, citation_count AS citations, searchRank
        FROM matched
        JOIN papers ON papers.id = matched.id
        ${where.sql}
        ORDER BY ${sort === 'score' ? 'searchRank ASC, quality_score DESC, year DESC' : order}
        LIMIT ? OFFSET ?
      `).all(query, ...where.args, limit, offset);
      return { total, limit, offset, query, engine: 'sqlite-fts5', rows };
    }
    const total = db.prepare(`SELECT COUNT(*) AS n FROM papers ${where.sql}`).get(...where.args).n;
    const rows = db.prepare(`
      SELECT id, title, authors, year, venue, venue_rank AS rank, domain AS field,
             quality_score AS score, doi, pdf_link AS pdfLink, local_pdf AS localPdf,
             download_status AS downloadStatus, citation_count AS citations
      FROM papers
      ${where.sql}
      ORDER BY ${order}
      LIMIT ? OFFSET ?
    `).all(...where.args, limit, offset);
    return { total, limit, offset, engine: 'sqlite', rows };
  } finally {
    db.close();
  }
}

function paper(id) {
  const db = openDb();
  try {
    return db.prepare('SELECT * FROM papers WHERE id = ?').get(id);
  } finally {
    db.close();
  }
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

server.listen(port, '127.0.0.1', () => {
  console.log(`IC Seeker running at http://127.0.0.1:${port}`);
  console.log(`Database: ${dbPath}`);
});
