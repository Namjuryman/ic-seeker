import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const args = process.argv.slice(2);
const outArg = args.find(arg => arg.startsWith('--out='));
const outPath = outArg ? outArg.split('=').slice(1).join('=') : path.join('ic_database', 'ic_papers.sqlite');
const inputPaths = args.filter(arg => !arg.startsWith('--out='));

if (!inputPaths.length) {
  console.error('Usage: node .\\scripts\\merge-ic-databases.mjs --out=ic_database\\ic_papers.sqlite path\\one.sqlite path\\two.sqlite');
  process.exit(1);
}

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.rm(outPath, { force: true });

const out = new DatabaseSync(outPath);
out.exec(`
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

const insert = out.prepare(`
  INSERT INTO papers (
    title, authors, affiliations, abstract, year, venue, publication_title, venue_rank, domain, domain_hits,
    quality_score, doi, pdf_link, source_url, openalex_id, ieee_article_number, collection_method,
    download_status, local_pdf, citation_count
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const seen = new Set();
const report = [];
out.exec('BEGIN');
for (const inputPath of inputPaths) {
  const input = new DatabaseSync(inputPath, { readOnly: true });
  let added = 0;
  try {
    const rows = input.prepare('SELECT * FROM papers ORDER BY venue, year, title').all();
    for (const row of rows) {
      const key = row.doi || row.openalex_id || `${row.venue}|${row.year}|${row.title}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      insert.run(
        row.title || '', row.authors || '', row.affiliations || '', row.abstract || '', row.year || null,
        row.venue || '', row.publication_title || '', row.venue_rank || '', row.domain || '', row.domain_hits || 0,
        row.quality_score || null, row.doi || '', row.pdf_link || '', row.source_url || '', row.openalex_id || '',
        row.ieee_article_number || '', row.collection_method || '', row.download_status || '', row.local_pdf || '',
        row.citation_count || 0
      );
      added += 1;
    }
    report.push({ inputPath, added, scanned: rows.length });
  } finally {
    input.close();
  }
}
out.exec(`
  INSERT INTO papers_fts(rowid, title, authors, abstract, venue, domain, doi)
  SELECT id, title, authors, abstract, venue, domain, doi FROM papers;
`);
out.exec('COMMIT');

const summary = out.prepare('SELECT venue, COUNT(*) AS papers, MIN(year) AS min_year, MAX(year) AS max_year FROM papers GROUP BY venue ORDER BY papers DESC').all();
const byDomain = out.prepare('SELECT domain, COUNT(*) AS papers FROM papers GROUP BY domain ORDER BY papers DESC').all();
const byVenueYear = out.prepare('SELECT venue, year, COUNT(*) AS papers FROM papers GROUP BY venue, year ORDER BY venue, year').all();
const exportRows = out.prepare(`
  SELECT title, authors, affiliations, publication_title, year, venue, venue_rank, domain,
         abstract, doi, pdf_link, source_url, ieee_article_number, quality_score,
         collection_method, download_status, citation_count
  FROM papers
  ORDER BY venue, year, title
`).all();
out.close();

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const outRoot = path.dirname(outPath);
const summaryPath = path.join(outRoot, 'summary.json');
const csvPath = path.join(outRoot, 'ic_chipseeker.csv');
const csvHeaders = [
  'Document Title', 'Authors', 'Author Affiliations', 'Publication Title',
  'Publication Year', 'Venue Key', 'Venue Rank', 'IC Domain', 'Abstract',
  'DOI', 'PDF Link', 'Source URL', 'IEEE Article Number', 'Quality Score',
  'Collection Method', 'Download Status', 'Article Citation Count'
];
const csvRows = exportRows.map(row => [
  row.title, row.authors, row.affiliations, row.publication_title,
  row.year, row.venue, row.venue_rank, row.domain, row.abstract,
  row.doi, row.pdf_link, row.source_url, row.ieee_article_number, row.quality_score,
  row.collection_method, row.download_status, row.citation_count
]);
await fs.writeFile(csvPath, '\ufeff' + [csvHeaders.join(','), ...csvRows.map(row => row.map(csvEscape).join(','))].join('\r\n'), 'utf8');
await fs.writeFile(summaryPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  rows: seen.size,
  summary,
  byDomain,
  byVenueYear
}, null, 2), 'utf8');

console.table(report);
console.table(summary);
console.log(JSON.stringify({ outPath, csvPath, summaryPath, inputs: inputPaths.length, rows: seen.size }, null, 2));
