import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { appConfig } from "../config.js";
import { applyPerformanceSettings } from "./performance.js";
import { ensureCompanyTables } from "../scripts/company-schema.js";
import { ensureTopicTaxonomyTables } from "../scripts/topic-taxonomy-schema.js";
import { ensurePaperAiTables } from "../scripts/paper-ai-schema.js";
import { ensureContentQualityTables } from "../scripts/content-quality-schema.js";
import { ensurePaperIntelligenceTables } from "../scripts/paper-intelligence-schema.js";
import { assertUsableSqliteDatabase } from "./sqlite-file-health.js";

if (process.env.SKIP_SQLITE_FILE_HEALTH !== "1") {
  assertUsableSqliteDatabase(appConfig.dbPath);
}

export const sqlite = new Database(appConfig.dbPath);

// Apply SQLite read-performance pragmas and indexes at startup.
applyPerformanceSettings(sqlite);

// Ensure company intelligence tables exist on startup
ensureCompanyTables(sqlite);
ensureTopicTaxonomyTables(sqlite);
ensurePaperAiTables(sqlite);
ensureContentQualityTables(sqlite);
ensurePaperIntelligenceTables(sqlite);

export const db = drizzle(sqlite, { schema });

export type DatabaseClient = typeof db;
