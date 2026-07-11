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
      detail: "已配置 REDIS_URL；在 Redis 缓存适配器接入前，计算快照仍回退到 SQLite。",
    }
  : {
      provider: "sqlite",
      mode: "local-cache",
      detail: "计算快照使用本地 SQLite 回退方案。",
    };

export const cacheDb = appDb;
export const cacheSqlite = appSqlite;
