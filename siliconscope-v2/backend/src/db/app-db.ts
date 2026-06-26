import { db, sqlite } from "./connection.js";
import { appConfig } from "../config.js";

export type AppDbRuntime = {
  provider: "sqlite" | "postgres-planned";
  writable: boolean;
  description: string;
};

export const appDbRuntime: AppDbRuntime = appConfig.postgresUrl
  ? {
      provider: "postgres-planned",
      writable: true,
      description: "POSTGRES_URL is configured, but the current app-db adapter still falls back to SQLite until the Postgres driver is implemented.",
    }
  : {
      provider: "sqlite",
      writable: true,
      description: "Private MVP mode: user, community, admin, and company data are stored in the local SQLite database.",
    };

// App/business data adapter. Today this intentionally points at SQLite to preserve
// the private MVP workflow. Services should import this for user/community/admin data
// so the future Postgres adapter can be swapped in one place.
export const appDb = db;
export const appSqlite = sqlite;

export type AppDatabaseClient = typeof appDb;
