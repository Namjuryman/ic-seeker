import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { createTestSqlite } from "../test-utils/seed.js";
import { enableForeignKeys, foreignKeysEnabled } from "./sqlite-pragmas.js";

describe("SQLite pragmas", () => {
  it("enables foreign key enforcement on direct connections", () => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = OFF");
    expect(foreignKeysEnabled(sqlite)).toBe(false);

    enableForeignKeys(sqlite);

    expect(foreignKeysEnabled(sqlite)).toBe(true);
  });

  it("enables foreign key enforcement for seeded test databases", () => {
    const sqlite = createTestSqlite();
    expect(foreignKeysEnabled(sqlite)).toBe(true);
  });
});
