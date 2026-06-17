import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export async function loadEnv(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env is optional for local development.
  }
}

export async function createConfig(importMetaUrl) {
  const appDir = path.dirname(fileURLToPath(importMetaUrl));
  const rootDir = path.resolve(appDir, '..');
  await loadEnv(path.join(rootDir, '.env'));

  const dbPath = process.env.IC_SEEKER_DB || path.join(rootDir, 'ic_database', 'ic_papers.sqlite');
  const adminPassword = process.env.ADMIN_PASSWORD || 'change-me-now';

  return {
    appDir,
    rootDir,
    publicDir: path.join(appDir, 'public'),
    dbPath,
    csvPath: process.env.IC_SEEKER_CSV || path.join(rootDir, 'ic_database', 'ic_chipseeker.csv'),
    pdfInboxPath: process.env.IC_SEEKER_PDF_INBOX || path.join(rootDir, 'ic_database', 'pdf_inbox'),
    port: Number(process.env.PORT || 8750),
    bindHost: process.env.HOST || '127.0.0.1',
    appName: process.env.APP_NAME || 'IC Seeker Private',
    adminPassword,
    authEnabled: process.env.IC_SEEKER_REQUIRE_LOGIN === '1' || process.env.IC_SEEKER_AUTH === 'password',
    cookieName: 'ic_seeker_session',
    cookieSecret: process.env.COOKIE_SECRET || crypto.createHash('sha256').update(`${adminPassword}:${dbPath}`).digest('hex')
  };
}
