import { appDb, appSqlite } from "./app-db.js";

export type CacheDbRuntime = {
  provider: "sqlite" | "redis-planned";
  mode: "local-cache" | "external-cache-planned";
  detail: string;
};

export const cacheDbRuntime: CacheDbRuntime = process.env.REDIS_URL
  ? {
      provider: "redis-planned",
      mode: "external-cache-planned",
      detail: "REDIS_URL is configured; computed snapshots still use the SQLite fallback until the Redis cache adapter is implemented.",
    }
  : {
      provider: "sqlite",
      mode: "local-cache",
      detail: "Computed snapshots use the local SQLite fallback.",
    };

export const cacheDb = appDb;
export const cacheSqlite = appSqlite;
