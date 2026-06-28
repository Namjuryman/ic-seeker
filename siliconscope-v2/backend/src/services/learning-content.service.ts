import { createHash } from "node:crypto";
import { appSqlite } from "../db/app-db.js";
import {
  commonFoundations as seedFoundations,
  dailyLessons as seedLessons,
  learningRoadmaps as seedRoadmaps,
  routeFamilies as seedRouteFamilies,
} from "../data/learning-catalog.js";
import type {
  DailyLessonSeed,
  FoundationGroupSeed,
  LearningRoadmapSeed,
  RouteFamilySeed,
} from "../data/learning-catalog.js";

type LearningItemKind = "roadmap" | "lesson" | "route_family" | "foundation_group";
type LearningItemStatus = "published" | "draft" | "archived";

type LearningContentRow = {
  itemKind: LearningItemKind;
  itemId: string;
  title: string;
  status: LearningItemStatus;
  source: string;
  sourceVersion: string;
  payloadJson: string;
  payloadHash: string;
  bytes: number;
  syncedAt: string;
  updatedAt: string;
  updatedByUserId: number | null;
};

type SeedItem = {
  itemKind: LearningItemKind;
  itemId: string;
  title: string;
  payload: unknown;
};

const SOURCE_VERSION = "learning-catalog-v2.1";

function stableJson(payload: unknown) {
  return JSON.stringify(payload);
}

function hashPayload(json: string) {
  return createHash("sha256").update(json).digest("hex");
}

function foundationId(group: FoundationGroupSeed, index: number) {
  const slug = group.title
    ? group.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : "";
  return slug || `foundation-${index + 1}`;
}

function seedItems(): SeedItem[] {
  return [
    ...seedRoadmaps.map((roadmap) => ({
      itemKind: "roadmap" as const,
      itemId: roadmap.slug,
      title: roadmap.title,
      payload: roadmap,
    })),
    ...seedLessons.map((lesson) => ({
      itemKind: "lesson" as const,
      itemId: lesson.id,
      title: lesson.title,
      payload: lesson,
    })),
    ...seedRouteFamilies.map((family) => ({
      itemKind: "route_family" as const,
      itemId: family.id,
      title: family.title,
      payload: family,
    })),
    ...seedFoundations.map((group, index) => ({
      itemKind: "foundation_group" as const,
      itemId: foundationId(group, index),
      title: group.title,
      payload: group,
    })),
  ];
}

function mapRow(row: any): LearningContentRow {
  return {
    itemKind: row.itemKind,
    itemId: row.itemId,
    title: row.title,
    status: row.status,
    source: row.source,
    sourceVersion: row.sourceVersion,
    payloadJson: row.payloadJson,
    payloadHash: row.payloadHash,
    bytes: Number(row.bytes || 0),
    syncedAt: row.syncedAt,
    updatedAt: row.updatedAt,
    updatedByUserId: row.updatedByUserId ?? null,
  };
}

function listRows(params: { kind?: LearningItemKind; status?: string } = {}): LearningContentRow[] {
  const where: string[] = [];
  const values: unknown[] = [];
  if (params.kind) {
    where.push("item_kind = ?");
    values.push(params.kind);
  }
  if (params.status) {
    where.push("status = ?");
    values.push(params.status);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = appSqlite.prepare(`
    SELECT
      item_kind AS itemKind,
      item_id AS itemId,
      title,
      status,
      source,
      source_version AS sourceVersion,
      payload_json AS payloadJson,
      payload_hash AS payloadHash,
      bytes,
      synced_at AS syncedAt,
      updated_at AS updatedAt,
      updated_by_user_id AS updatedByUserId
    FROM learning_content_items
    ${whereSql}
    ORDER BY
      CASE item_kind
        WHEN 'route_family' THEN 1
        WHEN 'foundation_group' THEN 2
        WHEN 'roadmap' THEN 3
        WHEN 'lesson' THEN 4
        ELSE 9
      END,
      title COLLATE NOCASE ASC
  `).all(...values) as any[];
  return rows.map(mapRow);
}

function parsePayloads<T>(kind: LearningItemKind): T[] | null {
  const rows = listRows({ kind, status: "published" });
  if (!rows.length) return null;
  try {
    return rows.map((row) => JSON.parse(row.payloadJson) as T);
  } catch (err) {
    console.warn(`[learning-content] failed to parse ${kind} rows, falling back to seed catalog`, err);
    return null;
  }
}

function activeContent() {
  const roadmaps = parsePayloads<LearningRoadmapSeed>("roadmap") ?? seedRoadmaps;
  const lessons = parsePayloads<DailyLessonSeed>("lesson") ?? seedLessons;
  const routeFamilies = parsePayloads<RouteFamilySeed>("route_family") ?? seedRouteFamilies;
  const commonFoundations = parsePayloads<FoundationGroupSeed>("foundation_group") ?? seedFoundations;
  return { roadmaps, lessons, routeFamilies, commonFoundations };
}

function validateActiveContent() {
  const { roadmaps, lessons, routeFamilies } = activeContent();
  const slugs = new Set(roadmaps.map((roadmap) => roadmap.slug));
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const family of routeFamilies) {
    for (const routeId of family.routeIds) {
      if (!slugs.has(routeId)) errors.push(`Route family "${family.id}" references missing roadmap "${routeId}".`);
    }
  }
  for (const lesson of lessons) {
    if (!slugs.has(lesson.roadmapSlug)) errors.push(`Lesson "${lesson.id}" references missing roadmap "${lesson.roadmapSlug}".`);
    if (!lesson.relatedSearchQueries?.length) warnings.push(`Lesson "${lesson.id}" has no relatedSearchQueries.`);
  }
  for (const roadmap of roadmaps) {
    if (!roadmap.stages?.length) errors.push(`Roadmap "${roadmap.slug}" has no stages.`);
    if (!roadmap.relatedSearchQueries?.length && !roadmap.paperQuery) warnings.push(`Roadmap "${roadmap.slug}" has no search query fallback.`);
  }

  return { errors, warnings };
}

export const learningContentService = {
  sourceVersion: SOURCE_VERSION,

  activeContent,

  seedSummary() {
    return {
      sourceVersion: SOURCE_VERSION,
      roadmaps: seedRoadmaps.length,
      lessons: seedLessons.length,
      routeFamilies: seedRouteFamilies.length,
      foundationGroups: seedFoundations.length,
      seedItems: seedItems().length,
    };
  },

  adminOverview() {
    const rows = listRows();
    const active = activeContent();
    const validation = validateActiveContent();
    const byKind = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.itemKind] = (acc[row.itemKind] || 0) + 1;
      return acc;
    }, {});
    const published = rows.filter((row) => row.status === "published").length;
    const seed = seedItems();
    const seedKeys = new Set(seed.map((item) => `${item.itemKind}:${item.itemId}`));
    const staleRows = rows.filter((row) => row.source === "seed" && !seedKeys.has(`${row.itemKind}:${row.itemId}`));
    const seedHashes = new Map(seed.map((item) => {
      const json = stableJson(item.payload);
      return [`${item.itemKind}:${item.itemId}`, hashPayload(json)];
    }));
    const outOfSyncRows = rows.filter((row) => {
      const hash = seedHashes.get(`${row.itemKind}:${row.itemId}`);
      return row.source === "seed" && hash && hash !== row.payloadHash;
    });

    return {
      generatedAt: new Date().toISOString(),
      sourceVersion: SOURCE_VERSION,
      summary: {
        dbItems: rows.length,
        published,
        seedItems: seed.length,
        roadmaps: active.roadmaps.length,
        lessons: active.lessons.length,
        routeFamilies: active.routeFamilies.length,
        foundationGroups: active.commonFoundations.length,
        bytes: rows.reduce((sum, row) => sum + row.bytes, 0),
      },
      byKind,
      validation,
      staleRows: staleRows.slice(0, 30),
      outOfSyncRows: outOfSyncRows.slice(0, 30),
      rows,
    };
  },

  syncSeedToDatabase(actorUserId: number | null = null) {
    const items = seedItems();
    const upsert = appSqlite.prepare(`
      INSERT INTO learning_content_items (
        item_kind, item_id, title, status, source, source_version,
        payload_json, payload_hash, bytes, synced_at, updated_at, updated_by_user_id
      )
      VALUES (?, ?, ?, 'published', 'seed', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(item_kind, item_id) DO UPDATE SET
        title = excluded.title,
        status = CASE
          WHEN learning_content_items.source = 'seed' THEN 'published'
          ELSE learning_content_items.status
        END,
        source_version = excluded.source_version,
        payload_json = excluded.payload_json,
        payload_hash = excluded.payload_hash,
        bytes = excluded.bytes,
        synced_at = CURRENT_TIMESTAMP,
        updated_at = CASE
          WHEN learning_content_items.payload_hash <> excluded.payload_hash THEN CURRENT_TIMESTAMP
          ELSE learning_content_items.updated_at
        END,
        updated_by_user_id = excluded.updated_by_user_id
    `);
    const archiveOne = appSqlite.prepare(`
      UPDATE learning_content_items
      SET status = 'archived', updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ?
      WHERE source = 'seed' AND item_kind = ? AND item_id = ?
    `);

    let createdOrUpdated = 0;
    const tx = appSqlite.transaction(() => {
      for (const item of items) {
        const json = stableJson(item.payload);
        const info = upsert.run(
          item.itemKind,
          item.itemId,
          item.title,
          SOURCE_VERSION,
          json,
          hashPayload(json),
          Buffer.byteLength(json, "utf8"),
          actorUserId,
        );
        createdOrUpdated += Number(info.changes || 0);
      }

      const activeKeys = new Set(items.map((item) => `${item.itemKind}:${item.itemId}`));
      for (const row of listRows()) {
        if (row.source === "seed" && !activeKeys.has(`${row.itemKind}:${row.itemId}`)) {
          archiveOne.run(actorUserId, row.itemKind, row.itemId);
        }
      }
    });
    tx();

    return {
      ok: true,
      sourceVersion: SOURCE_VERSION,
      seedItems: items.length,
      changedRows: createdOrUpdated,
      summary: this.adminOverview().summary,
    };
  },
};
