import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { appSqlite } from "../db/app-db.js";
import { searchService } from "./search.service.js";

const userId = 910_000 + Math.floor(Math.random() * 10_000);
let paperIds: number[] = [];
let tagId = 0;

beforeAll(() => {
  paperIds = (appSqlite.prepare("SELECT id FROM papers ORDER BY id LIMIT 1200").all() as Array<{ id: number }>).map((row) => row.id);
});

afterEach(() => {
  appSqlite.prepare("DELETE FROM favorites WHERE user_id = ?").run(userId);
  appSqlite.prepare("DELETE FROM paper_tags WHERE user_id = ?").run(userId);
  appSqlite.prepare("DELETE FROM reading_status WHERE user_id = ?").run(userId);
  if (tagId) {
    appSqlite.prepare("DELETE FROM tags WHERE id = ?").run(tagId);
    tagId = 0;
  }
});

function requirePapers() {
  expect(paperIds.length).toBeGreaterThan(0);
}

function seedFavorites() {
  const insert = appSqlite.prepare("INSERT OR IGNORE INTO favorites (user_id, paper_id) VALUES (?, ?)");
  const tx = appSqlite.transaction((ids: number[]) => {
    for (const id of ids) insert.run(userId, id);
  });
  tx(paperIds);
}

function seedTag() {
  const tagName = `bulk-filter-${userId}`;
  appSqlite.prepare("INSERT INTO tags (name, color) VALUES (?, '#1d6fb8')").run(tagName);
  tagId = (appSqlite.prepare("SELECT id FROM tags WHERE name = ?").get(tagName) as { id: number }).id;
  const insert = appSqlite.prepare("INSERT OR IGNORE INTO paper_tags (user_id, paper_id, tag_id) VALUES (?, ?, ?)");
  const tx = appSqlite.transaction((ids: number[]) => {
    for (const id of ids) insert.run(userId, id, tagId);
  });
  tx(paperIds);
  return tagName;
}

function seedReadingStatus() {
  const insert = appSqlite.prepare(`
    INSERT OR IGNORE INTO reading_status (user_id, paper_id, status, reading_state)
    VALUES (?, ?, 'important', 'important')
  `);
  const tx = appSqlite.transaction((ids: number[]) => {
    for (const id of ids) insert.run(userId, id);
  });
  tx(paperIds);
}

describe("search user-state filters", () => {
  it("filters large favorite sets without expanding paper IDs into an IN list", () => {
    requirePapers();
    seedFavorites();

    const result = searchService.search({ favorite: "1", limit: "5" }, userId);

    expect(result.total).toBeGreaterThan(0);
    expect(result.rows.every((row) => row.favorite)).toBe(true);
  });

  it("filters large tag and status sets through SQL subqueries", () => {
    requirePapers();
    const tagName = seedTag();
    seedReadingStatus();

    const tagged = searchService.search({ tag: tagName, limit: "5" }, userId);
    const important = searchService.search({ status: "important", limit: "5" }, userId);

    expect(tagged.total).toBeGreaterThan(0);
    expect(tagged.rows.every((row) => {
      const rowTags = row.tags as Array<{ name: string }>;
      return rowTags.some((tag) => tag.name === tagName);
    })).toBe(true);
    expect(important.total).toBeGreaterThan(0);
    expect(important.rows.every((row) => row.readingStatus === "important")).toBe(true);
  });
});
