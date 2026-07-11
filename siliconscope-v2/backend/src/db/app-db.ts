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
      description: "已配置 POSTGRES_URL；当前 app-db 适配器仍回退到 SQLite，等待 Postgres 驱动接入。",
    }
  : {
      provider: "sqlite",
      writable: true,
      description: "私有 MVP 模式：用户、社区、后台和公司数据存储在本地 SQLite 数据库中。",
    };

// App/business data adapter. Today this intentionally points at SQLite to preserve
// the private MVP workflow. Services should import this for user/community/admin data
// so the future Postgres adapter can be swapped in one place.
export const appDb = db;
export const appSqlite = sqlite;

export type AppDatabaseClient = typeof appDb;
