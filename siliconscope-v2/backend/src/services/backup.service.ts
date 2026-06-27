import fs from "node:fs";
import path from "node:path";
import { appConfig } from "../config.js";
import { appSqlite } from "../db/app-db.js";

export type BackupManifest = {
  id: string;
  label: string;
  createdAt: string;
  dbPath: string;
  dbBytes: number;
  manifestPath: string;
  manifestBytes: number;
  source: {
    databasePath: string;
    appName: string;
    deploymentMode: string;
    nodeVersion: string;
  };
  notes: string[];
};

function ensureBackupDir() {
  fs.mkdirSync(backupRoot(), { recursive: true });
}

function backupRoot() {
  return path.resolve(appConfig.backupDir);
}

function safeLabel(label?: string) {
  const cleaned = String(label || "manual")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return cleaned || "manual";
}

function timestampId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function manifestPathFor(id: string) {
  return path.join(backupRoot(), `${id}.json`);
}

function dbPathFor(id: string) {
  return path.join(backupRoot(), `${id}.sqlite`);
}

function readManifest(filePath: string): BackupManifest | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as BackupManifest;
    const dbPath = parsed.dbPath || dbPathFor(parsed.id);
    const manifestStat = fs.statSync(filePath);
    const dbStat = fs.existsSync(dbPath) ? fs.statSync(dbPath) : null;
    return {
      ...parsed,
      dbPath,
      manifestPath: filePath,
      manifestBytes: manifestStat.size,
      dbBytes: dbStat?.size || parsed.dbBytes || 0,
    };
  } catch {
    return null;
  }
}

function listManifests(): BackupManifest[] {
  ensureBackupDir();
  return fs.readdirSync(backupRoot())
    .filter((name) => name.endsWith(".json"))
    .map((name) => readManifest(path.join(backupRoot(), name)))
    .filter((row): row is BackupManifest => Boolean(row))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function findManifest(id: string) {
  const requested = path.basename(id).replace(/\.json$/i, "");
  return readManifest(manifestPathFor(requested));
}

export const backupService = {
  list() {
    const rows = listManifests();
    return {
      backupDir: backupRoot(),
      total: rows.length,
      totalBytes: rows.reduce((sum, row) => sum + row.dbBytes + row.manifestBytes, 0),
      rows,
    };
  },

  latest() {
    return listManifests()[0] || null;
  },

  async create(input: { label?: string; actor?: string } = {}) {
    ensureBackupDir();
    const id = `${timestampId()}-${safeLabel(input.label)}`;
    const dbPath = dbPathFor(id);
    const manifestPath = manifestPathFor(id);
    await appSqlite.backup(dbPath);
    const dbStat = fs.statSync(dbPath);
    const manifest: BackupManifest = {
      id,
      label: input.label || "manual",
      createdAt: new Date().toISOString(),
      dbPath,
      dbBytes: dbStat.size,
      manifestPath,
      manifestBytes: 0,
      source: {
        databasePath: appConfig.dbPath,
        appName: appConfig.appName,
        deploymentMode: appConfig.deploymentMode,
        nodeVersion: process.version,
      },
      notes: [
        "SQLite backup created through better-sqlite3 backup API.",
        "Restore is intentionally manual-first: stop the API, copy this sqlite file over the active database, then restart.",
        input.actor ? `Created by ${input.actor}.` : "Created by system or local script.",
      ],
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    const manifestStat = fs.statSync(manifestPath);
    return { ...manifest, manifestBytes: manifestStat.size };
  },

  delete(id: string) {
    const manifest = findManifest(id);
    if (!manifest) return { deleted: false, id };
    const files = [manifest.dbPath, manifest.manifestPath];
    let deletedFiles = 0;
    for (const file of files) {
      if (path.resolve(file).startsWith(backupRoot()) && fs.existsSync(file)) {
        fs.unlinkSync(file);
        deletedFiles += 1;
      }
    }
    return { deleted: true, id: manifest.id, deletedFiles };
  },

  prune(keep = 10) {
    const rows = listManifests();
    const toDelete = rows.slice(Math.max(0, keep));
    const deleted = toDelete.map((row) => this.delete(row.id)).filter((row) => row.deleted);
    return { keep, deleted: deleted.length, rows: deleted };
  },
};
