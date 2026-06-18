import { methodology } from './methodology.service.mjs';
import { rowsWithUserState, semanticText } from './search.service.mjs';

function normalizeTags(tags) {
  const raw = Array.isArray(tags) ? tags : String(tags || '').split(',');
  return [...new Set(raw.map(tag => String(tag).trim()).filter(Boolean).slice(0, 12))];
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
    ['TCAS-II', 'A'], ['TVLSI', 'A'], ['ISCAS', 'B'],
    ['Nature Electron.', 'SS+'], ['Nat. Electronics', 'SS+'], ['Nature', 'SSS'], ['Nat. Commun.', 'Hidden'],
    ['IEEE T-MTT', 'A+'], ['IEEE TED', 'B+'], ['IEEE EDL', 'Hidden'],
    ['IEEE Sensors J.', 'B-'], ['Adv. Mater.', 'B-'], ['Appl. Phys. Lett.', 'C+'],
    ['Solid-State Electron.', 'C+'], ['IEEE JMEMS', 'B-'], ['IEEE T-Nano', 'C+'],
    ['Microelectron. J.', 'C']
  ]);
  return ranks.get(venue) || 'User';
}

function baseScore(venue, year, citations = 0) {
  const base = methodology().scoring.venueBase[venue] || 50;
  return Math.round((base + Math.min(Number(citations || 0), 300) / 25 + Math.max(0, Number(year || 2016) - 2016) * 0.35) * 10) / 10;
}

export function createPaperService({ openDb }) {
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

  function rebuildFtsForPaper(db, id) {
    const row = db.prepare('SELECT id, title, authors, abstract, venue, domain, doi FROM papers WHERE id = ?').get(id);
    if (!row) return;
    db.prepare('DELETE FROM papers_fts WHERE rowid = ?').run(id);
    db.prepare('INSERT INTO papers_fts (rowid, title, authors, abstract, venue, domain, doi) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(row.id, row.title || '', row.authors || '', row.abstract || '', row.venue || '', row.domain || '', row.doi || '');
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

  return { allTags, importDoi, insertPaper, paper, upsertPaperState, openDb };
}
