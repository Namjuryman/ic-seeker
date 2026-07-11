import { cacheDb, cacheSqlite } from "../db/cache-db.js";
import { sql } from "drizzle-orm";
import { profileService } from "./profile.service.js";
import { topicService } from "./topic.service.js";
import { geoService } from "./geo.service.js";
import { venueMatrixService } from "./venue-matrix.service.js";
import { mentorService } from "./mentor.service.js";

type SnapshotRow = {
  key: string;
  valueJson: string;
  updatedAt: string;
};

type AnySnapshot = Record<string, any>;
type MentorDetailSnapshot = { mentors?: Array<{ name: string }> };
type MentorInstitutionSnapshot = { name?: string };

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function readSnapshot<T>(key: string): T | null {
  const row = cacheDb.get<SnapshotRow>(sql`
    SELECT "key" AS key, value_json AS valueJson, updated_at AS updatedAt
    FROM computed_snapshots
    WHERE "key" = ${key}
  `);
  if (!row?.valueJson) return null;
  try {
    return JSON.parse(row.valueJson) as T;
  } catch {
    return null;
  }
}

function writeSnapshot(key: string, value: unknown) {
  cacheSqlite.prepare(`
    INSERT INTO computed_snapshots ("key", value_json, source_version, updated_at)
    VALUES (?, ?, 'v1', CURRENT_TIMESTAMP)
    ON CONFLICT("key") DO UPDATE SET
      value_json = excluded.value_json,
      source_version = excluded.source_version,
      updated_at = CURRENT_TIMESTAMP
  `).run(key, stableJson(value));
}

function invalidateSnapshot(key: string) {
  cacheSqlite.prepare(`DELETE FROM computed_snapshots WHERE "key" = ?`).run(key);
  const row = cacheSqlite.prepare(`SELECT changes() AS n`).get() as { n: number };
  return { deleted: row.n };
}

function invalidateSnapshotsByPrefix(prefix: string) {
  cacheSqlite.prepare(`DELETE FROM computed_snapshots WHERE "key" LIKE ?`).run(`${prefix}%`);
  const row = cacheSqlite.prepare(`SELECT changes() AS n`).get() as { n: number };
  return { deleted: row.n };
}

function invalidateAllSnapshots() {
  cacheSqlite.prepare(`DELETE FROM computed_snapshots`).run();
  const row = cacheSqlite.prepare(`SELECT changes() AS n`).get() as { n: number };
  return { deleted: row.n };
}

function getOrBuild<T>(key: string, builder: () => T): T {
  const hit = readSnapshot<T>(key);
  if (hit) return hit;
  const value = builder();
  writeSnapshot(key, value);
  return value;
}

function keyPart(value: string): string {
  return encodeURIComponent(String(value || "").trim());
}

const coreSnapshotBuilders: Record<string, () => unknown> = {
  "profiles:professors:top80": () => profileService.getProfessors({ limit: "80", minPapers: "2" }),
  "profiles:institutions:top80": () => profileService.getInstitutions({ limit: "80", minPapers: "2" }),
  "topics:list": () => topicService.getTopics(),
  "geo:overall:v4": () => geoService.getGeo({}),
  "venue-matrix": () => venueMatrixService.getVenueMatrix(),
  "mentor:institutions": () => mentorService.getInstitutionsWithMentors({}),
};

function buildOne(key: string, builder: () => unknown) {
  const started = Date.now();
  try {
    const value = builder();
    writeSnapshot(key, value);
    return { key, ok: true, ms: Date.now() - started };
  } catch (err) {
    return { key, ok: false, ms: Date.now() - started, error: (err as Error).message };
  }
}

export const snapshotService = {
  read: readSnapshot,
  write: writeSnapshot,
  invalidateSnapshot,
  invalidateSnapshotsByPrefix,
  invalidateAllSnapshots,

  getOrBuild,

  keys: {
    authorProfile: (name: string) => `profile:author:${keyPart(name)}`,
    institutionProfile: (name: string) => `profile:institution:${keyPart(name)}`,
    topicDetail: (field: string) => `topic:detail:${keyPart(field)}`,
    geoOverall: () => "geo:overall:v4",
    geoField: (field: string) => `geo:field:v4:${keyPart(field)}`,
    mentorInstitution: (name: string) => `mentor:institution:${keyPart(name)}`,
    mentorProfile: (name: string) => `mentor:author:${keyPart(name)}`,
  },

  getProfessors(params: Record<string, string>) {
    const limit = Number(params.limit || 80);
    const minPapers = Number(params.minPapers || 2);
    if (limit <= 80 && minPapers === 2 && !params.q) {
      return getOrBuild("profiles:professors:top80", coreSnapshotBuilders["profiles:professors:top80"]);
    }
    return profileService.getProfessors(params);
  },

  getAuthorProfile(name: string) {
    return getOrBuild<AnySnapshot>(this.keys.authorProfile(name), () => profileService.getAuthorProfile(name) as AnySnapshot);
  },

  getInstitutions(params: Record<string, string>) {
    const limit = Number(params.limit || 80);
    const minPapers = Number(params.minPapers || 2);
    if (limit <= 80 && minPapers === 2 && !params.q) {
      return getOrBuild("profiles:institutions:top80", coreSnapshotBuilders["profiles:institutions:top80"]);
    }
    return profileService.getInstitutions(params);
  },

  getInstitutionProfile(name: string) {
    return getOrBuild<AnySnapshot>(this.keys.institutionProfile(name), () => profileService.getInstitutionProfile(name) as AnySnapshot);
  },

  getTopics() {
    return getOrBuild("topics:list", coreSnapshotBuilders["topics:list"]);
  },

  getTopicDetail(field: string) {
    return getOrBuild<AnySnapshot>(this.keys.topicDetail(field), () => topicService.getTopicDetail(field) as AnySnapshot);
  },

  getGeo(params: Record<string, string>) {
    if (!params.field && !params.mode && !params.country) {
      return getOrBuild(this.keys.geoOverall(), coreSnapshotBuilders["geo:overall:v4"]);
    }
    if (params.field && !params.mode && !params.country) {
      const field = String(params.field);
      return getOrBuild<AnySnapshot>(this.keys.geoField(field), () => geoService.getGeo({ field }) as AnySnapshot);
    }
    return geoService.getGeo(params);
  },

  getVenueMatrix() {
    return getOrBuild("venue-matrix", coreSnapshotBuilders["venue-matrix"]);
  },

  getMentorInstitutions(params: Record<string, string>) {
    const limit = Math.max(0, Math.min(1000, Number(params.limit || 0) || 0));
    if (!params.region && !params.recentOnly) {
      const q = String(params.q || "").trim().toLowerCase();
      const rows = getOrBuild<MentorInstitutionSnapshot[]>(
        "mentor:institutions",
        () => coreSnapshotBuilders["mentor:institutions"]() as MentorInstitutionSnapshot[]
      );
      const filtered = q ? rows.filter((row) => String(row.name || "").toLowerCase().includes(q)) : rows;
      return limit ? filtered.slice(0, limit) : filtered;
    }
    return mentorService.getInstitutionsWithMentors(params);
  },

  getMentorInstitution(name: string, params: Record<string, string>) {
    if (!params.recentOnly && !params.field) {
      return getOrBuild<AnySnapshot>(this.keys.mentorInstitution(name), () => mentorService.getMentorsByInstitution(name, params) as AnySnapshot);
    }
    return mentorService.getMentorsByInstitution(name, params);
  },

  getMentorProfile(name: string, params: Record<string, string>) {
    if (!params.live) {
      return getOrBuild<AnySnapshot>(this.keys.mentorProfile(name), () => mentorService.getMentorProfile(name, params) as AnySnapshot);
    }
    return mentorService.getMentorProfile(name, params);
  },

  refresh(keys = ["all"]) {
    const result: Array<{ key: string; ok: boolean; ms: number; error?: string }> = [];
    const all = keys.includes("all");
    const requestedCore = all ? Object.keys(coreSnapshotBuilders) : keys.filter((key) => coreSnapshotBuilders[key]);

    for (const key of requestedCore) {
      result.push(buildOne(key, coreSnapshotBuilders[key]));
    }

    if (all) {
      const professors = readSnapshot<Array<{ name: string }>>("profiles:professors:top80") || [];
      const institutions = readSnapshot<Array<{ name: string }>>("profiles:institutions:top80") || [];
      const topics = readSnapshot<Array<{ field: string }>>("topics:list") || [];
      const mentorInstitutions = readSnapshot<Array<{ name: string }>>("mentor:institutions") || [];

      for (const professor of professors.slice(0, 80)) {
        result.push(buildOne(this.keys.authorProfile(professor.name), () => profileService.getAuthorProfile(professor.name)));
      }

      for (const institution of institutions.slice(0, 80)) {
        result.push(buildOne(this.keys.institutionProfile(institution.name), () => profileService.getInstitutionProfile(institution.name)));
      }

      for (const topic of topics) {
        result.push(buildOne(this.keys.topicDetail(topic.field), () => topicService.getTopicDetail(topic.field)));
        result.push(buildOne(this.keys.geoField(topic.field), () => geoService.getGeo({ field: topic.field })));
      }

      for (const institution of mentorInstitutions.slice(0, 80)) {
        const key = this.keys.mentorInstitution(institution.name);
        result.push(buildOne(key, () => mentorService.getMentorsByInstitution(institution.name, {})));
        const detail = readSnapshot<MentorDetailSnapshot>(key);
        for (const mentor of (detail?.mentors || []).slice(0, 8)) {
          result.push(buildOne(this.keys.mentorProfile(mentor.name), () => mentorService.getMentorProfile(mentor.name, {})));
        }
      }

      return result;
    }

    for (const key of keys) {
      if (coreSnapshotBuilders[key]) continue;
      const builder = coreSnapshotBuilders[key];
      if (!builder) {
        result.push({ key, ok: false, ms: 0, error: "unknown snapshot key" });
        continue;
      }
      result.push(buildOne(key, builder));
    }
    return result;
  },

  list() {
    return cacheDb.all(sql`
      SELECT "key" AS key, updated_at AS updatedAt, LENGTH(value_json) AS bytes
      FROM computed_snapshots
      ORDER BY "key"
    `);
  },
};
