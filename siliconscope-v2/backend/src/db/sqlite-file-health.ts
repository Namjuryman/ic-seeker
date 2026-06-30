import fs from "node:fs";
import path from "node:path";

export type SqliteFileHealth = {
  ok: boolean;
  path: string;
  exists: boolean;
  sizeBytes: number;
  kind: "sqlite" | "git-lfs-pointer" | "missing" | "too-small" | "unknown" | "special";
  message: string;
};

export function inspectSqliteFile(dbPath: string): SqliteFileHealth {
  if (!dbPath || dbPath === ":memory:" || dbPath.startsWith("file:")) {
    return {
      ok: true,
      path: dbPath,
      exists: true,
      sizeBytes: 0,
      kind: "special",
      message: "Special SQLite connection string; file header check skipped.",
    };
  }

  const resolved = path.resolve(dbPath);
  if (!fs.existsSync(resolved)) {
    return {
      ok: false,
      path: resolved,
      exists: false,
      sizeBytes: 0,
      kind: "missing",
      message: `SQLite database file does not exist: ${resolved}`,
    };
  }

  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    return {
      ok: false,
      path: resolved,
      exists: true,
      sizeBytes: stat.size,
      kind: "unknown",
      message: `SQLite database path is not a regular file: ${resolved}`,
    };
  }

  const fd = fs.openSync(resolved, "r");
  try {
    const sample = Buffer.alloc(Math.min(256, stat.size));
    fs.readSync(fd, sample, 0, sample.length, 0);
    const text = sample.toString("utf8");
    if (text.startsWith("version https://git-lfs.github.com/spec/v1")) {
      return {
        ok: false,
        path: resolved,
        exists: true,
        sizeBytes: stat.size,
        kind: "git-lfs-pointer",
        message: `SQLite database is a Git LFS pointer (${stat.size} bytes), not the real database. Run git lfs pull or mount a real ic_papers.sqlite before starting the backend.`,
      };
    }
    if (stat.size < 1000) {
      return {
        ok: false,
        path: resolved,
        exists: true,
        sizeBytes: stat.size,
        kind: "too-small",
        message: `SQLite database is unexpectedly small (${stat.size} bytes). This usually means the real database was not provided.`,
      };
    }
    if (sample.subarray(0, 16).toString("utf8") !== "SQLite format 3\0") {
      return {
        ok: false,
        path: resolved,
        exists: true,
        sizeBytes: stat.size,
        kind: "unknown",
        message: `SQLite database header is invalid for ${resolved}. Expected SQLite format 3 header.`,
      };
    }
    return {
      ok: true,
      path: resolved,
      exists: true,
      sizeBytes: stat.size,
      kind: "sqlite",
      message: `SQLite database header is valid (${stat.size} bytes).`,
    };
  } finally {
    fs.closeSync(fd);
  }
}

export function assertUsableSqliteDatabase(dbPath: string): SqliteFileHealth {
  const health = inspectSqliteFile(dbPath);
  if (!health.ok) {
    throw new Error(health.message);
  }
  return health;
}
