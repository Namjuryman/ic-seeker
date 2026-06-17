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

export function semanticText(input) {
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
  if (params.get('hasPdf') === '1') clauses.push("local_pdf != ''");
  if (params.get('favorite') === '1') clauses.push('id IN (SELECT paper_id FROM favorites)');
  const tag = (params.get('tag') || '').trim();
  if (tag) {
    clauses.push('id IN (SELECT paper_id FROM paper_tags JOIN tags ON tags.id = paper_tags.tag_id WHERE tags.name = ?)');
    args.push(tag);
  }
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

export function rowsWithUserState(db, rows) {
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

export function createSearchService({ openDb }) {
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

  return { search };
}
