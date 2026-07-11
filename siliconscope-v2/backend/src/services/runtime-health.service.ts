import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { appConfig } from "../config.js";
import { db as metadataDb } from "../db/connection.js";
import { appDb, appDbRuntime } from "../db/app-db.js";
import { cacheDbRuntime } from "../db/cache-db.js";
import { getDataLayerTopology } from "../db/topology.js";

export type RuntimeCheckStatus = "ok" | "warn" | "error";

export type RuntimeCheck = {
  id: string;
  label: string;
  status: RuntimeCheckStatus;
  message: string;
  detail?: string;
};

export type RuntimeHealth = {
  status: RuntimeCheckStatus;
  generatedAt: string;
  uptimeSeconds: number;
  nodeVersion: string;
  environment: string;
  topology: ReturnType<typeof getDataLayerTopology>;
  checks: RuntimeCheck[];
  warnings: string[];
};

function checkStatus(checks: RuntimeCheck[]): RuntimeCheckStatus {
  if (checks.some((check) => check.status === "error")) return "error";
  if (checks.some((check) => check.status === "warn")) return "warn";
  return "ok";
}

function safeFileExists(pathname: string): boolean {
  try {
    return fs.existsSync(pathname);
  } catch {
    return false;
  }
}

function secretLooksWeak(value: string, fallback: string): boolean {
  return !value || value === fallback || value.length < 24;
}

function runCheck(checks: RuntimeCheck[], check: () => RuntimeCheck) {
  try {
    checks.push(check());
  } catch (err) {
    checks.push({
      id: "runtime.exception",
      label: "运行时异常",
      status: "error",
      message: (err as Error).message,
    });
  }
}

function providerLabel(provider: string) {
  const labels: Record<string, string> = {
    sqlite: "SQLite 本地模式",
    "postgres-planned": "Postgres 计划接入",
    "redis-planned": "Redis 计划接入",
    memory: "内存模式",
  };
  return labels[provider] || provider;
}

export const runtimeHealthService = {
  getHealth(): RuntimeHealth {
    const checks: RuntimeCheck[] = [];

    runCheck(checks, () => {
      const result = metadataDb.get<{ count: number }>(sql`SELECT COUNT(*) as count FROM papers`);
      const count = Number(result?.count || 0);
      return {
        id: "metadata-db",
        label: "论文元数据库",
        status: count > 0 ? "ok" : "warn",
        message: `${count.toLocaleString()} 篇论文`,
        detail: appConfig.dbPath,
      };
    });

    runCheck(checks, () => {
      appDb.get<{ ok: number }>(sql`SELECT 1 as ok`);
      return {
        id: "app-db",
        label: "应用数据存储",
        status: appDbRuntime.provider === "postgres-planned" ? "warn" : "ok",
        message: providerLabel(appDbRuntime.provider),
        detail: appDbRuntime.description,
      };
    });

    runCheck(checks, () => ({
      id: "cache",
      label: "缓存层",
      status: cacheDbRuntime.provider === "redis-planned" ? "warn" : "ok",
      message: providerLabel(cacheDbRuntime.provider),
      detail: cacheDbRuntime.detail,
    }));

    runCheck(checks, () => ({
      id: "public-dir",
      label: "公开前端构建",
      status: safeFileExists(appConfig.publicDir) ? "ok" : "warn",
      message: safeFileExists(appConfig.publicDir) ? "frontend/dist 已存在" : "未找到 frontend/dist",
      detail: appConfig.publicDir,
    }));

    runCheck(checks, () => {
      const backupDir = path.resolve(appConfig.backupDir);
      return {
        id: "backup-dir",
        label: "备份目录",
        status: safeFileExists(backupDir) ? "ok" : "warn",
        message: safeFileExists(backupDir) ? "已配置" : "尚未创建",
        detail: backupDir,
      };
    });

    runCheck(checks, () => ({
      id: "auth-mode",
      label: "认证模式",
      status: appConfig.authEnabled && !appConfig.localAdminEnabled ? "ok" : "warn",
      message: appConfig.authEnabled ? "已启用密码登录" : "登录已关闭",
      detail: appConfig.localAdminEnabled
        ? "IC_SEEKER_LOCAL_ADMIN 已开启，仅应在 localhost 使用。"
        : "公网部署应要求登录并校验管理员角色。",
    }));

    runCheck(checks, () => ({
      id: "jwt-secret",
      label: "JWT 密钥",
      status: secretLooksWeak(appConfig.jwtSecret, "change-me-in-production") ? "warn" : "ok",
      message: secretLooksWeak(appConfig.jwtSecret, "change-me-in-production") ? "较弱或仍为默认值" : "已配置",
    }));

    runCheck(checks, () => ({
      id: "cors",
      label: "允许的前端来源",
      status: appConfig.frontendOrigins.length ? "ok" : "error",
      message: `${appConfig.frontendOrigins.length} 个来源`,
      detail: appConfig.frontendOrigins.join(", "),
    }));

    runCheck(checks, () => ({
      id: "rate-limits",
      label: "API 速率限制",
      status: appConfig.rateLimitEnabled ? "ok" : appConfig.deploymentMode === "production" ? "warn" : "ok",
      message: appConfig.rateLimitEnabled
        ? `通用 ${appConfig.rateLimitMax}，认证 ${appConfig.authRateLimitMax}，后台 ${appConfig.adminRateLimitMax}`
        : "未启用",
      detail: "公网流量建议配置 RATE_LIMIT_MAX、AUTH_RATE_LIMIT_MAX 和 ADMIN_RATE_LIMIT_MAX。",
    }));

    runCheck(checks, () => ({
      id: "scheduler",
      label: "后台定时任务",
      status: appConfig.schedulerEnabled ? "ok" : appConfig.deploymentMode === "production" ? "warn" : "ok",
      message: appConfig.schedulerEnabled ? `已启用，间隔 ${appConfig.schedulerTickSeconds}s` : "未启用",
      detail: "服务器可设置 SCHEDULER_ENABLED=1，自动执行备份、快照和数据质量维护任务。",
    }));

    runCheck(checks, () => ({
      id: "public-domain",
      label: "公开站点域名",
      status: appConfig.deploymentMode === "production" && !appConfig.publicSiteUrl ? "warn" : "ok",
      message: appConfig.publicSiteUrl || "未配置",
      detail: "独立域名部署应设置 PUBLIC_SITE_URL。",
    }));

    runCheck(checks, () => ({
      id: "admin-domain",
      label: "管理后台域名",
      status: appConfig.deploymentMode === "production" && !appConfig.adminSiteUrl ? "warn" : "ok",
      message: appConfig.adminSiteUrl || "未配置",
      detail: "建议使用独立 admin 域名，并叠加登录、访问网关或 VPN 保护。",
    }));

    runCheck(checks, () => ({
      id: "api-domain",
      label: "API 域名",
      status: appConfig.deploymentMode === "production" && !appConfig.apiBaseUrl ? "warn" : "ok",
      message: appConfig.apiBaseUrl || "使用相对路径 /api",
      detail: "静态前端部署时，应将 VITE_API_BASE_URL 指向该 API 来源。",
    }));

    runCheck(checks, () => ({
      id: "commercial-adapters",
      label: "商业化适配器",
      status: appConfig.postgresUrl || appConfig.redisUrl || appConfig.objectStorageEndpoint ? "warn" : "ok",
      message: appConfig.meilisearchHost
        ? "已配置 Meilisearch 适配器"
        : appConfig.postgresUrl || appConfig.redisUrl || appConfig.objectStorageEndpoint
        ? "部分适配器已配置，但仍处于回退或计划接入状态"
        : "私有 SQLite 模式",
      detail: "Meilisearch 索引可用；Postgres、Redis 和对象存储仍是可选迁移目标。",
    }));

    const warnings = checks
      .filter((check) => check.status !== "ok")
      .map((check) => `${check.label}: ${check.message}`);

    return {
      status: checkStatus(checks),
      generatedAt: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || "development",
      topology: getDataLayerTopology(),
      checks,
      warnings,
    };
  },
};
