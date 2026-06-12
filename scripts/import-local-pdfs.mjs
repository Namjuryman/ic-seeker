import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const root = process.cwd();
const dbPath = process.env.IC_SEEKER_DB || path.join(root, 'ic_database', 'ic_papers.sqlite');
const inbox = process.env.IC_SEEKER_PDF_INBOX || path.join(root, 'ic_database', 'pdf_inbox');
const pdfRoot = process.env.IC_SEEKER_PDF_ROOT || path.join(root, 'ic_database', 'pdfs');

function doiFromName(name) {
  const decoded = name.replace(/_/g, '/').replace(/\s+/g, '');
  const match = decoded.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
  return match ? match[0].replace(/\.pdf$/i, '').toLowerCase() : '';
}

function articleNumberFromName(name) {
  const match = name.match(/(?:arnumber|article|ieee)?[-_\s]*(\d{7,9})/i);
  return match ? match[1] : '';
}

function safeFileName(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 180);
}

await fs.mkdir(inbox, { recursive: true });
await fs.mkdir(pdfRoot, { recursive: true });

const db = new DatabaseSync(dbPath);
const byDoi = db.prepare('SELECT id, title, venue, year FROM papers WHERE doi = ? COLLATE NOCASE');
const byArticle = db.prepare('SELECT id, title, venue, year FROM papers WHERE ieee_article_number = ?');
const attach = db.prepare('UPDATE papers SET local_pdf = ?, download_status = ? WHERE id = ?');

const entries = await fs.readdir(inbox, { withFileTypes: true });
const report = [];
db.exec('BEGIN');
for (const entry of entries) {
  if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.pdf')) continue;
  const sourcePath = path.join(inbox, entry.name);
  const doi = doiFromName(entry.name);
  const articleNumber = articleNumberFromName(entry.name);
  const paper = doi ? byDoi.get(doi) : articleNumber ? byArticle.get(articleNumber) : null;
  if (!paper) {
    report.push({ file: entry.name, status: 'unmatched', hint: 'Rename with DOI or IEEE article number, then run again.' });
    continue;
  }
  const venueDir = path.join(pdfRoot, safeFileName(paper.venue || 'unknown'));
  await fs.mkdir(venueDir, { recursive: true });
  const targetName = `${paper.year || 'no-year'}-${paper.id}-${safeFileName(entry.name)}`;
  const targetPath = path.join(venueDir, targetName);
  await fs.rename(sourcePath, targetPath);
  attach.run(targetPath, 'local_pdf_attached', paper.id);
  report.push({ file: entry.name, status: 'attached', paperId: paper.id, title: paper.title, targetPath });
}
db.exec('COMMIT');
db.close();

console.table(report);
console.log(JSON.stringify({ inbox, pdfRoot, processed: report.length }, null, 2));
