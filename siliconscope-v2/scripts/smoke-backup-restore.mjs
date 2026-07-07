import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siliconscope-backup-smoke-"));
const dbPath = path.join(tempRoot, "active.sqlite");
const backupDir = path.join(tempRoot, "backups");

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function run(args, env = {}) {
  const result = spawnSync(npmCommand(), args, {
    cwd: rootDir,
    env: { ...process.env, ...env },
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0) {
    throw new Error([
      `Command failed: npm ${args.join(" ")}`,
      result.error ? String(result.error.stack || result.error.message || result.error) : "",
      result.stdout,
      result.stderr,
    ].filter(Boolean).join("\n"));
  }
  return `${result.stdout || ""}${result.stderr || ""}`;
}

function backupSqliteFiles() {
  if (!fs.existsSync(backupDir)) return [];
  return fs.readdirSync(backupDir)
    .filter((name) => name.endsWith(".sqlite"))
    .map((name) => path.join(backupDir, name))
    .sort();
}

function assertSqlite(pathToCheck) {
  const stat = fs.statSync(pathToCheck);
  if (stat.size < 1024) {
    throw new Error(`Restored SQLite is unexpectedly small: ${stat.size} bytes`);
  }
}

try {
  run(["run", "db:build-from-csv", "--", `--out=${dbPath}`, "--limit=50", "--force"]);
  assertSqlite(dbPath);

  run(["run", "backup:create", "--", "smoke", "--keep=5"], {
    DATABASE_URL: dbPath,
    BACKUP_DIR: backupDir,
  });

  const backups = backupSqliteFiles();
  if (backups.length !== 1) {
    throw new Error(`Expected one backup SQLite file, found ${backups.length}`);
  }

  run(["run", "backup:restore", "--", `--file=${backups[0]}`, "--dry-run"], {
    DATABASE_URL: dbPath,
    BACKUP_DIR: backupDir,
  });

  fs.writeFileSync(`${dbPath}-wal`, "smoke wal");
  fs.writeFileSync(`${dbPath}-shm`, "smoke shm");
  run(["run", "backup:restore", "--", `--file=${backups[0]}`], {
    DATABASE_URL: dbPath,
    BACKUP_DIR: backupDir,
  });
  assertSqlite(dbPath);

  const archives = fs.readdirSync(path.dirname(dbPath)).filter((name) => name.includes(".pre-restore-"));
  if (archives.length < 3) {
    throw new Error(`Expected active db plus wal/shm pre-restore archives, found ${archives.length}`);
  }

  console.log(JSON.stringify({
    ok: true,
    tempRoot,
    backup: backups[0],
    archives: archives.length,
  }, null, 2));
} catch (error) {
  console.error("[backup-smoke] failed", error);
  console.error(JSON.stringify({ tempRoot }, null, 2));
  process.exitCode = 1;
}
