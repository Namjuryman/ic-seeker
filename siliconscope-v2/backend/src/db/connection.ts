import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { appConfig } from "../config.js";
import { applyPerformanceSettings } from "./performance.js";

export const sqlite = new Database(appConfig.dbPath);

// Apply SQLite read-performance pragmas and indexes at startup.
applyPerformanceSettings(sqlite);

export const db = drizzle(sqlite, { schema });

export type DatabaseClient = typeof db;
