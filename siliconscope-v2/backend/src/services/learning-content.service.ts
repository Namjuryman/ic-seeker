import { createHash } from "node:crypto";
import { appSqlite } from "../db/app-db.js";
import {
  commonFoundations as seedFoundations,
  dailyLessons as seedLessons,
  learningRoadmaps as seedRoadmaps,
  routeFamilies as seedRouteFamilies,
} from "../data/learning-catalog-v3.js";
import type {
  DailyLessonSeed,
  FoundationGroupSeed,
  LearningRoadmapSeed,
  RouteFamilySeed,
} from "../data/learning-catalog-v3.js";

export type { DailyLessonSeed, LearningRoadmapSeed };

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

type LearningContentUpdateInput = {
  status?: string;
  payloadJson?: string;
  title?: string;
  actorUserId?: number | null;
};

type SeedItem = {
  itemKind: LearningItemKind;
  itemId: string;
  title: string;
  payload: unknown;
};

const SOURCE_VERSION = "learning-catalog-v3.0";

function stableJson(payload: unknown) {
  return JSON.stringify(payload);
}

function hashPayload(json: string) {
  return createHash("sha256").update(json).digest("hex");
}

function normalizeKind(kind: string): LearningItemKind {
  if (kind === "roadmap" || kind === "lesson" || kind === "route_family" || kind === "foundation_group") return kind;
  throw new Error("itemKind must be roadmap, lesson, route_family, or foundation_group");
}

function normalizeStatus(status: string): LearningItemStatus {
  if (status === "published" || status === "draft" || status === "archived") return status;
  throw new Error("status must be published, draft, or archived");
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

function rowById(kind: string, itemId: string): LearningContentRow | null {
  const row = appSqlite.prepare(`
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
    WHERE item_kind = ? AND item_id = ?
  `).get(normalizeKind(kind), itemId) as any | undefined;
  return row ? mapRow(row) : null;
}

function payloadIdentity(kind: LearningItemKind, payload: any): { id: string; title: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("payloadJson must be a JSON object");
  }
  if (kind === "roadmap") {
    if (!payload.slug || typeof payload.slug !== "string") throw new Error("roadmap payload requires string slug");
    if (!payload.title || typeof payload.title !== "string") throw new Error("roadmap payload requires string title");
    if (!Array.isArray(payload.stages)) throw new Error("roadmap payload requires stages array");
    return { id: payload.slug, title: payload.title };
  }
  if (kind === "lesson") {
    if (!payload.id || typeof payload.id !== "string") throw new Error("lesson payload requires string id");
    if (!payload.title || typeof payload.title !== "string") throw new Error("lesson payload requires string title");
    if (!payload.roadmapSlug || typeof payload.roadmapSlug !== "string") throw new Error("lesson payload requires string roadmapSlug");
    return { id: payload.id, title: payload.title };
  }
  if (kind === "route_family") {
    if (!payload.id || typeof payload.id !== "string") throw new Error("route_family payload requires string id");
    if (!payload.title || typeof payload.title !== "string") throw new Error("route_family payload requires string title");
    if (!Array.isArray(payload.routeIds)) throw new Error("route_family payload requires routeIds array");
    return { id: payload.id, title: payload.title };
  }
  if (!payload.title || typeof payload.title !== "string") throw new Error("foundation_group payload requires string title");
  return { id: "", title: payload.title };
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
  const rows = listRows({ kind });
  if (!rows.length) return null;
  try {
    return rows
      .filter((row) => row.status === "published")
      .map((row) => JSON.parse(row.payloadJson) as T);
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

function countModules(roadmap: LearningRoadmapSeed) {
  return roadmap.stages.reduce((sum, stage) => sum + stage.modules.length, 0);
}

function insertTerms(targetKind: string, targetId: string, termKind: string, values: string[] | undefined, orderOffset = 0) {
  if (!values?.length) return;
  const insert = appSqlite.prepare(`
    INSERT OR IGNORE INTO learning_terms (target_kind, target_id, term_kind, value, display_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  values.forEach((value, index) => {
    if (String(value || "").trim()) insert.run(targetKind, targetId, termKind, String(value).trim(), orderOffset + index);
  });
}

function refreshProjections() {
  const { roadmaps, lessons, routeFamilies, commonFoundations } = activeContent();
  const activeRouteSlugs = new Set(roadmaps.map((roadmap) => roadmap.slug));
  const routeStatus = new Map(listRows({ kind: "roadmap" }).map((row) => [row.itemId, row.status]));
  const lessonStatus = new Map(listRows({ kind: "lesson" }).map((row) => [row.itemId, row.status]));
  const familyStatus = new Map(listRows({ kind: "route_family" }).map((row) => [row.itemId, row.status]));
  const foundationStatus = new Map(listRows({ kind: "foundation_group" }).map((row) => [row.itemId, row.status]));

  const clearTerms = appSqlite.prepare("DELETE FROM learning_terms");
  const upsertRoute = appSqlite.prepare(`
    INSERT INTO learning_routes (
      slug, title, short_title, domain, level, family, accent, subtitle, description,
      paper_query, status, stage_count, module_count, lesson_count, display_order, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      short_title = excluded.short_title,
      domain = excluded.domain,
      level = excluded.level,
      family = excluded.family,
      accent = excluded.accent,
      subtitle = excluded.subtitle,
      description = excluded.description,
      paper_query = excluded.paper_query,
      status = excluded.status,
      stage_count = excluded.stage_count,
      module_count = excluded.module_count,
      lesson_count = excluded.lesson_count,
      display_order = excluded.display_order,
      updated_at = CURRENT_TIMESTAMP
  `);
  const upsertLesson = appSqlite.prepare(`
    INSERT INTO learning_lessons (
      id, title, roadmap_slug, module_id, level, estimated_minutes, status, display_order, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      roadmap_slug = excluded.roadmap_slug,
      module_id = excluded.module_id,
      level = excluded.level,
      estimated_minutes = excluded.estimated_minutes,
      status = excluded.status,
      display_order = excluded.display_order,
      updated_at = CURRENT_TIMESTAMP
  `);
  const upsertFamily = appSqlite.prepare(`
    INSERT INTO learning_route_families (id, title, description, display_order, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      display_order = excluded.display_order,
      updated_at = CURRENT_TIMESTAMP
  `);
  const upsertFoundation = appSqlite.prepare(`
    INSERT INTO learning_foundations (id, title, note, items_json, display_order, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      note = excluded.note,
      items_json = excluded.items_json,
      display_order = excluded.display_order,
      updated_at = CURRENT_TIMESTAMP
  `);
  const insertMember = appSqlite.prepare(`
    INSERT OR REPLACE INTO learning_route_family_members (family_id, route_slug, display_order)
    VALUES (?, ?, ?)
  `);
  clearTerms.run();
  appSqlite.prepare("DELETE FROM learning_route_family_members").run();
  appSqlite.prepare("DELETE FROM learning_routes").run();
  appSqlite.prepare("DELETE FROM learning_lessons").run();
  appSqlite.prepare("DELETE FROM learning_route_families").run();
  appSqlite.prepare("DELETE FROM learning_foundations").run();

  routeFamilies.forEach((family, index) => {
    if ((familyStatus.get(family.id) || "published") === "archived") return;
    upsertFamily.run(family.id, family.title, family.description, index);
    family.routeIds
      .filter((routeId) => activeRouteSlugs.has(routeId))
      .forEach((routeId, memberIndex) => insertMember.run(family.id, routeId, memberIndex));
  });

  commonFoundations.forEach((group, index) => {
    const id = foundationId(group, index);
    if ((foundationStatus.get(id) || "published") === "archived") return;
    upsertFoundation.run(id, group.title, group.note, JSON.stringify(group.items || []), index);
  });

  roadmaps.forEach((roadmap, index) => {
    const status = routeStatus.get(roadmap.slug) || "published";
    upsertRoute.run(
      roadmap.slug,
      roadmap.title,
      roadmap.shortTitle,
      roadmap.domain,
      roadmap.level,
      roadmap.family || "",
      roadmap.accent || null,
      roadmap.subtitle || null,
      roadmap.description,
      roadmap.paperQuery || roadmap.relatedSearchQueries?.[0] || roadmap.title,
      status,
      roadmap.stages.length,
      countModules(roadmap),
      lessons.filter((lesson) => lesson.roadmapSlug === roadmap.slug).length,
      index,
    );
    insertTerms("roadmap", roadmap.slug, "topic", roadmap.relatedTopics, 0);
    insertTerms("roadmap", roadmap.slug, "venue", roadmap.relatedVenues, 1000);
    insertTerms("roadmap", roadmap.slug, "search_query", roadmap.relatedSearchQueries, 2000);
    insertTerms("roadmap", roadmap.slug, "outcome", roadmap.outcomes, 3000);
  });

  lessons.forEach((lesson, index) => {
    const status = lessonStatus.get(lesson.id) || "published";
    upsertLesson.run(
      lesson.id,
      lesson.title,
      lesson.roadmapSlug,
      lesson.moduleId,
      lesson.level,
      lesson.estimatedMinutes,
      status,
      index,
    );
    insertTerms("lesson", lesson.id, "topic", lesson.relatedTopics, 0);
    insertTerms("lesson", lesson.id, "venue", lesson.relatedVenues, 1000);
    insertTerms("lesson", lesson.id, "search_query", lesson.relatedSearchQueries, 2000);
  });
}

function projectionSummary() {
  const one = (sql: string) => Number((appSqlite.prepare(sql).get() as any)?.count || 0);
  return {
    routes: one("SELECT COUNT(*) AS count FROM learning_routes"),
    lessons: one("SELECT COUNT(*) AS count FROM learning_lessons"),
    routeFamilies: one("SELECT COUNT(*) AS count FROM learning_route_families"),
    foundations: one("SELECT COUNT(*) AS count FROM learning_foundations"),
    familyMembers: one("SELECT COUNT(*) AS count FROM learning_route_family_members"),
    terms: one("SELECT COUNT(*) AS count FROM learning_terms"),
  };
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

function contentQualityReport() {
  const { roadmaps, lessons, routeFamilies, commonFoundations } = activeContent();
  const issues: Array<{ severity: "high" | "medium" | "low"; target: string; message: string }> = [];
  const roadmapSlugs = new Set(roadmaps.map((roadmap) => roadmap.slug));
  const lessonRoadmaps = new Map<string, number>();
  for (const lesson of lessons) {
    lessonRoadmaps.set(lesson.roadmapSlug, (lessonRoadmaps.get(lesson.roadmapSlug) || 0) + 1);
  }

  let possible = 0;
  let earned = 0;
  const addCheck = (ok: boolean, weight: number, severity: "high" | "medium" | "low", target: string, message: string) => {
    possible += weight;
    if (ok) {
      earned += weight;
    } else {
      issues.push({ severity, target, message });
    }
  };

  for (const roadmap of roadmaps) {
    const target = `roadmap:${roadmap.slug}`;
    addCheck(Boolean(roadmap.description && roadmap.description.length > 80), 2, "medium", target, "Description is too thin for a public product route.");
    addCheck((roadmap.stages?.length || 0) >= 3, 3, "high", target, "Route should have at least three learning stages.");
    addCheck(roadmap.stages.every((stage) => (stage.modules?.length || 0) > 0), 2, "high", target, "Every stage needs at least one module.");
    addCheck((roadmap.relatedSearchQueries?.length || 0) >= 4 || Boolean(roadmap.paperQuery), 2, "medium", target, "Route needs enough search hooks for paper discovery.");
    addCheck((roadmap.relatedVenues?.length || 0) >= 3, 1, "low", target, "Route should link to representative venues.");
    addCheck((roadmap.outcomes?.length || 0) >= 3, 1, "low", target, "Route needs concrete learning outcomes.");
    addCheck((roadmap.projectIdeas?.length || 0) >= 2, 1, "low", target, "Route should include practical project outputs.");
    addCheck((lessonRoadmaps.get(roadmap.slug) || 0) >= 1, 2, "medium", target, "Route has no daily lesson entry.");
  }

  for (const lesson of lessons) {
    const target = `lesson:${lesson.id}`;
    addCheck(roadmapSlugs.has(lesson.roadmapSlug), 3, "high", target, "Lesson points to a missing roadmap.");
    addCheck((lesson.relatedSearchQueries?.length || 0) >= 1, 1, "medium", target, "Lesson needs at least one paper search query.");
    addCheck((lesson.relatedTopics?.length || 0) >= 1, 1, "medium", target, "Lesson needs at least one topic link.");
    addCheck((lesson.relatedVenues?.length || 0) >= 1, 1, "low", target, "Lesson should include representative venues.");
    addCheck(lesson.estimatedMinutes >= 10 && lesson.estimatedMinutes <= 45, 1, "low", target, "Lesson time estimate should be realistic.");
  }

  addCheck(routeFamilies.length >= 5, 2, "medium", "route_families", "Route library should preserve at least five route families.");
  addCheck(commonFoundations.length >= 4, 2, "medium", "foundation_groups", "Common base should cover math, physics, circuits, and tools.");

  const score = possible > 0 ? Math.round((earned / possible) * 100) : 0;
  return {
    score,
    grade: score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : "D",
    possible,
    earned,
    issues: issues.slice(0, 80),
    issueCounts: issues.reduce<Record<string, number>>((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {}),
    coverage: {
      roadmaps: roadmaps.length,
      lessons: lessons.length,
      routesWithLessons: roadmaps.filter((roadmap) => (lessonRoadmaps.get(roadmap.slug) || 0) > 0).length,
      routeFamilies: routeFamilies.length,
      foundations: commonFoundations.length,
    },
  };
}

function prettyPayload(json: string) {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
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
      projection: projectionSummary(),
      quality: contentQualityReport(),
      byKind,
      validation,
      staleRows: staleRows.slice(0, 30),
      outOfSyncRows: outOfSyncRows.slice(0, 30),
      rows,
    };
  },

  getItem(kind: string, itemId: string) {
    const row = rowById(kind, itemId);
    if (!row) return null;
    return { ...row, payloadJson: prettyPayload(row.payloadJson) };
  },

  updateItem(kindInput: string, itemId: string, input: LearningContentUpdateInput) {
    const kind = normalizeKind(kindInput);
    const current = rowById(kind, itemId);
    if (!current) {
      throw new Error("Learning content item not found");
    }

    const nextStatus = input.status == null ? current.status : normalizeStatus(input.status);
    let nextPayloadJson = current.payloadJson;
    let nextTitle = typeof input.title === "string" && input.title.trim() ? input.title.trim() : current.title;

    if (typeof input.payloadJson === "string") {
      let parsed: any;
      try {
        parsed = JSON.parse(input.payloadJson);
      } catch (err) {
        throw new Error(`payloadJson is not valid JSON: ${(err as Error).message}`);
      }
      const identity = payloadIdentity(kind, parsed);
      if (kind !== "foundation_group" && identity.id !== itemId) {
        throw new Error(`payload id "${identity.id}" must match item id "${itemId}"`);
      }
      nextTitle = identity.title || nextTitle;
      nextPayloadJson = stableJson(parsed);
    }

    const update = appSqlite.prepare(`
      UPDATE learning_content_items
      SET
        title = ?,
        status = ?,
        source = CASE WHEN source = 'seed' THEN 'admin' ELSE source END,
        source_version = ?,
        payload_json = ?,
        payload_hash = ?,
        bytes = ?,
        updated_at = CURRENT_TIMESTAMP,
        updated_by_user_id = ?
      WHERE item_kind = ? AND item_id = ?
    `);

    const tx = appSqlite.transaction(() => {
      update.run(
        nextTitle,
        nextStatus,
        `${SOURCE_VERSION}:admin-edit`,
        nextPayloadJson,
        hashPayload(nextPayloadJson),
        Buffer.byteLength(nextPayloadJson, "utf8"),
        input.actorUserId ?? null,
        kind,
        itemId,
      );
      if (nextStatus === "published") {
        const validation = validateActiveContent();
        if (validation.errors.length) {
          throw new Error(`Published learning content would be invalid: ${validation.errors.join("; ")}`);
        }
      }
      refreshProjections();
    });
    tx();

    const next = this.getItem(kind, itemId);
    if (!next) throw new Error("Learning content item disappeared after update");
    return next;
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
      refreshProjections();
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
