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
      label: "Runtime exception",
      status: "error",
      message: (err as Error).message,
    });
  }
}

export const runtimeHealthService = {
  getHealth(): RuntimeHealth {
    const checks: RuntimeCheck[] = [];

    runCheck(checks, () => {
      const result = metadataDb.get<{ count: number }>(sql`SELECT COUNT(*) as count FROM papers`);
      const count = Number(result?.count || 0);
      return {
        id: "metadata-db",
        label: "Metadata SQLite",
        status: count > 0 ? "ok" : "warn",
        message: `${count.toLocaleString()} papers`,
        detail: appConfig.dbPath,
      };
    });

    runCheck(checks, () => {
      appDb.get<{ ok: number }>(sql`SELECT 1 as ok`);
      return {
        id: "app-db",
        label: "App data store",
        status: appDbRuntime.provider === "postgres-planned" ? "warn" : "ok",
        message: appDbRuntime.provider,
        detail: appDbRuntime.description,
      };
    });

    runCheck(checks, () => ({
      id: "cache",
      label: "Cache layer",
      status: cacheDbRuntime.provider === "redis-planned" ? "warn" : "ok",
      message: cacheDbRuntime.provider,
      detail: cacheDbRuntime.detail,
    }));

    runCheck(checks, () => ({
      id: "public-dir",
      label: "Public frontend build",
      status: safeFileExists(appConfig.publicDir) ? "ok" : "warn",
      message: safeFileExists(appConfig.publicDir) ? "frontend/dist exists" : "frontend/dist not found",
      detail: appConfig.publicDir,
    }));

    runCheck(checks, () => {
      const backupDir = path.resolve(appConfig.backupDir);
      return {
        id: "backup-dir",
        label: "Backup directory",
        status: safeFileExists(backupDir) ? "ok" : "warn",
        message: safeFileExists(backupDir) ? "configured" : "not created yet",
        detail: backupDir,
      };
    });

    runCheck(checks, () => ({
      id: "auth-mode",
      label: "Authentication mode",
      status: appConfig.authEnabled && !appConfig.localAdminEnabled ? "ok" : "warn",
      message: appConfig.authEnabled ? "password auth enabled" : "login disabled",
      detail: appConfig.localAdminEnabled
        ? "IC_SEEKER_LOCAL_ADMIN is enabled. Use only on localhost."
        : "Public deployments should require login and admin role.",
    }));

    runCheck(checks, () => ({
      id: "jwt-secret",
      label: "JWT secret",
      status: secretLooksWeak(appConfig.jwtSecret, "change-me-in-production") ? "warn" : "ok",
      message: secretLooksWeak(appConfig.jwtSecret, "change-me-in-production") ? "weak or default" : "configured",
    }));

    runCheck(checks, () => ({
      id: "cors",
      label: "Allowed frontend origins",
      status: appConfig.frontendOrigins.length ? "ok" : "error",
      message: `${appConfig.frontendOrigins.length} origins`,
      detail: appConfig.frontendOrigins.join(", "),
    }));

    runCheck(checks, () => ({
      id: "rate-limits",
      label: "API rate limits",
      status: appConfig.rateLimitEnabled ? "ok" : appConfig.deploymentMode === "production" ? "warn" : "ok",
      message: appConfig.rateLimitEnabled
        ? `general ${appConfig.rateLimitMax}, auth ${appConfig.authRateLimitMax}, admin ${appConfig.adminRateLimitMax}`
        : "disabled",
      detail: "Configure RATE_LIMIT_MAX, AUTH_RATE_LIMIT_MAX, and ADMIN_RATE_LIMIT_MAX for public traffic.",
    }));

    runCheck(checks, () => ({
      id: "scheduler",
      label: "Background scheduler",
      status: appConfig.schedulerEnabled ? "ok" : appConfig.deploymentMode === "production" ? "warn" : "ok",
      message: appConfig.schedulerEnabled ? `enabled, tick ${appConfig.schedulerTickSeconds}s` : "disabled",
      detail: "Set SCHEDULER_ENABLED=1 on the server to run backup, snapshot, and data-quality maintenance jobs automatically.",
    }));

    runCheck(checks, () => ({
      id: "public-domain",
      label: "Public domain",
      status: appConfig.deploymentMode === "production" && !appConfig.publicSiteUrl ? "warn" : "ok",
      message: appConfig.publicSiteUrl || "not configured",
      detail: "Set PUBLIC_SITE_URL for independent-domain deployments.",
    }));

    runCheck(checks, () => ({
      id: "admin-domain",
      label: "Admin domain",
      status: appConfig.deploymentMode === "production" && !appConfig.adminSiteUrl ? "warn" : "ok",
      message: appConfig.adminSiteUrl || "not configured",
      detail: "Use a separate admin hostname protected by login plus Cloudflare Access/VPN.",
    }));

    runCheck(checks, () => ({
      id: "api-domain",
      label: "API domain",
      status: appConfig.deploymentMode === "production" && !appConfig.apiBaseUrl ? "warn" : "ok",
      message: appConfig.apiBaseUrl || "relative /api",
      detail: "Static frontends should set VITE_API_BASE_URL to this API origin.",
    }));

    runCheck(checks, () => ({
      id: "commercial-adapters",
      label: "Commercial adapters",
      status: appConfig.postgresUrl || appConfig.redisUrl || appConfig.meilisearchHost ? "warn" : "ok",
      message: appConfig.postgresUrl || appConfig.redisUrl || appConfig.meilisearchHost
        ? "configured but adapters are still fallback/planned"
        : "private SQLite mode",
      detail: "Postgres, Redis, Meilisearch, and object storage are optional until adapters are implemented.",
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
