import fs from "node:fs";
import path from "node:path";
import { appConfig } from "../config.js";

type RestoreArgs = {
  file?: string;
  dryRun: boolean;
};

function backupRoot() {
  return path.resolve(appConfig.backupDir);
}

function timestampId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function parseArgs(): RestoreArgs {
  const fileArg = process.argv.find((arg) => arg.startsWith("--file="));
  const positional = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  return {
    file: fileArg ? fileArg.slice("--file=".length) : positional,
    dryRun: process.argv.includes("--dry-run"),
  };
}

function printHelp() {
  console.log(`Usage:
  npm run backup:restore -- --file=<backup-id-or-path>
  npm run backup:restore -- <backup-id-or-path> --dry-run

Notes:
  Stop the API before restoring. This script replaces the active SQLite file and archives
  the current database plus -wal/-shm sidecars as .pre-restore-* files.
`);
}

function resolveBackupFile(input: string) {
  const trimmed = input.trim();
  const candidates = [
    path.resolve(trimmed),
    path.join(backupRoot(), trimmed),
    path.join(backupRoot(), `${trimmed}.sqlite`),
    path.join(backupRoot(), trimmed.replace(/\.json$/i, ".sqlite")),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!found) throw new Error(`Backup file not found: ${input}`);
  if (!found.toLowerCase().endsWith(".sqlite")) {
    throw new Error(`Backup file must be a .sqlite file: ${found}`);
  }
  return path.resolve(found);
}

function archiveCurrentFile(filePath: string, restoreId: string, dryRun: boolean) {
  if (!fs.existsSync(filePath)) return null;
  const archivedPath = `${filePath}.pre-restore-${restoreId}`;
  if (fs.existsSync(archivedPath)) {
    throw new Error(`Pre-restore archive already exists: ${archivedPath}`);
  }
  if (!dryRun) fs.renameSync(filePath, archivedPath);
  return archivedPath;
}

async function main() {
  const args = parseArgs();
  if (!args.file || process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    process.exitCode = args.file ? 0 : 1;
    return;
  }

  const source = resolveBackupFile(args.file);
  const target = path.resolve(appConfig.dbPath);
  const sourceStat = fs.statSync(source);
  const restoreId = timestampId();
  const sidecars = [`${target}-wal`, `${target}-shm`];
  const archived = [
    archiveCurrentFile(target, restoreId, args.dryRun),
    ...sidecars.map((sidecar) => archiveCurrentFile(sidecar, restoreId, args.dryRun)),
  ].filter((value): value is string => Boolean(value));

  if (!args.dryRun) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }

  console.log(JSON.stringify({
    dryRun: args.dryRun,
    restored: !args.dryRun,
    source,
    sourceBytes: sourceStat.size,
    target,
    archived,
    notes: [
      "Restart the backend after restore.",
      "Run a search smoke test such as /api/search?q=ldo after the API starts.",
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error("[backup-restore] failed", error);
  process.exitCode = 1;
});
