import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { inspectSqliteFile } from "./sqlite-file-health.js";

describe("SQLite file health", () => {
  it("detects Git LFS pointer files before runtime startup", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siliconscope-db-"));
    const file = path.join(dir, "ic_papers.sqlite");
    fs.writeFileSync(file, "version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 108236800\n");
    const result = inspectSqliteFile(file);
    expect(result.ok).toBe(false);
    expect(result.kind).toBe("git-lfs-pointer");
  });
});
