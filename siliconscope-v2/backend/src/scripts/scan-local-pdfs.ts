import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import { appConfig } from "../config.js";
import { ensurePaperIntelligenceTables } from "./paper-intelligence-schema.js";
import { scorePdfMatch } from "../services/local-pdf-matching.js";

type PaperRow = { id: number; title: string; doi: string; year: number };

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];
  return undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...walk(full));
    if (item.isFile() && item.name.toLowerCase().endsWith(".pdf")) out.push(full);
  }
  return out;
}

function shaFileSample(filePath: string): string {
  const fd = fs.openSync(filePath, "r");
  try {
    const stat = fs.statSync(filePath);
    const len = Math.min(stat.size, 1024 * 1024);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, 0);
    return crypto.createHash("sha256").update(buf).digest("hex");
  } finally {
    fs.closeSync(fd);
  }
}

function textSample(filePath: string): string {
  const fd = fs.openSync(filePath, "r");
  try {
    const len = Math.min(fs.statSync(filePath).size, 128 * 1024);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, 0);
    return buf.toString("latin1").replace(/[^\x20-\x7E]+/g, " ").slice(0, 25_000);
  } finally {
    fs.closeSync(fd);
  }
}

function paperCandidates(sqlite: InstanceType<typeof Database>, doiGuess: string, titleGuess: string): PaperRow[] {
  if (doiGuess) {
    const rows = sqlite.prepare("SELECT id, title, doi, year FROM papers WHERE LOWER(doi) = LOWER(?) LIMIT 20").all(doiGuess) as PaperRow[];
    if (rows.length) return rows;
  }
  const tokens = titleGuess.split(/\s+/).filter((token) => token.length >= 4).slice(0, 5);
  if (!tokens.length) return [];
  const where = tokens.map((_, idx) => `LOWER(title) LIKE @t${idx}`).join(" AND ");
  const params = Object.fromEntries(tokens.map((token, idx) => [`t${idx}`, `%${token.toLowerCase()}%`]));
  return sqlite.prepare(`SELECT id, title, doi, year FROM papers WHERE ${where} ORDER BY year DESC LIMIT 30`).all(params) as PaperRow[];
}

function main() {
  const dir = path.resolve(readArg("dir") || process.env.LOCAL_PDF_LIBRARY || appConfig.pdfInboxPath);
  const dryRun = hasFlag("dry-run");
  const sqlite = new Database(appConfig.dbPath);
  ensurePaperIntelligenceTables(sqlite);
  const files = walk(dir);
  const stmt = sqlite.prepare(`
    INSERT INTO local_pdf_items (
      id, paper_id, file_path, file_hash, file_size, title_guess, doi_guess,
      match_status, match_confidence, ocr_status, last_seen_at, created_at, updated_at
    ) VALUES (
      @id, @paperId, @filePath, @fileHash, @fileSize, @titleGuess, @doiGuess,
      @matchStatus, @matchConfidence, @ocrStatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT(file_path) DO UPDATE SET
      paper_id = excluded.paper_id,
      file_hash = excluded.file_hash,
      file_size = excluded.file_size,
      title_guess = excluded.title_guess,
      doi_guess = excluded.doi_guess,
      match_status = excluded.match_status,
      match_confidence = excluded.match_confidence,
      last_seen_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `);

  let matched = 0;
  let candidates = 0;
  let unmatched = 0;
  for (const filePath of files) {
    const stat = fs.statSync(filePath);
    const sample = textSample(filePath);
    const firstPass = scorePdfMatch({ filePath, fileName: path.basename(filePath), fileSize: stat.size, textSample: sample }, []);
    const papers = paperCandidates(sqlite, firstPass.doiGuess, firstPass.titleGuess);
    const result = scorePdfMatch({ filePath, fileName: path.basename(filePath), fileSize: stat.size, textSample: sample }, papers);
    if (result.matchStatus === "matched") matched += 1;
    else if (result.matchStatus === "candidate") candidates += 1;
    else unmatched += 1;

    const row = {
      id: crypto.createHash("sha256").update(filePath).digest("hex"),
      paperId: result.paperId || null,
      filePath,
      fileHash: shaFileSample(filePath),
      fileSize: stat.size,
      titleGuess: result.titleGuess,
      doiGuess: result.doiGuess,
      matchStatus: result.matchStatus,
      matchConfidence: result.matchConfidence,
      ocrStatus: "not_started",
    };
    if (!dryRun) {
      stmt.run(row);
      if (result.matchStatus === "matched" && result.paperId) {
        sqlite.prepare("UPDATE papers SET local_pdf = ? WHERE id = ? AND COALESCE(local_pdf, '') = ''").run(filePath, result.paperId);
      }
    }
  }

  console.log(JSON.stringify({ dir, dryRun, scanned: files.length, matched, candidates, unmatched }, null, 2));
  sqlite.close();
}

main();
