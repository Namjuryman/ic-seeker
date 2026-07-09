import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { appDb } from "../db/app-db.js";
import { users } from "../db/schema.js";
import { appConfig } from "../config.js";

export type AuthUserPayload = {
  userId: number;
  email: string;
  role: "admin" | "user";
  tokenVersion: number;
};

const ADMIN_EMAIL = "admin@siliconscope.local";

export function timingSafeStringEqual(left: string, right: string): boolean {
  const leftDigest = crypto.createHash("sha256").update(left, "utf8").digest();
  const rightDigest = crypto.createHash("sha256").update(right, "utf8").digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

function adminPasswordMarker() {
  const source = appConfig.adminPasswordHash || appConfig.adminPassword;
  return `env-admin:${crypto.createHash("sha256").update(source, "utf8").digest("hex")}`;
}

function roleFor(row: { verificationLevel?: string | null }, fallback: "admin" | "user") {
  return row.verificationLevel === "admin" ? "admin" : fallback;
}

function ensureRuntimeUser(email: string, role: "admin" | "user"): AuthUserPayload {
  const marker = role === "admin" ? adminPasswordMarker() : "local-user";
  const existing = appDb.select({ id: users.id, email: users.email, passwordHash: users.passwordHash, verificationLevel: users.verificationLevel, tokenVersion: users.tokenVersion })
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (existing) {
    let tokenVersion = existing.tokenVersion ?? 0;
    if (existing.passwordHash !== marker) {
      tokenVersion += 1;
      appDb.update(users)
        .set({ passwordHash: marker, tokenVersion })
        .where(eq(users.id, existing.id))
        .run();
    }
    return { userId: existing.id, email: existing.email, role: roleFor(existing, role), tokenVersion };
  }

  const created = appDb.insert(users).values({
    email,
    passwordHash: marker,
    nickname: role === "admin" ? "Admin" : "Local User",
    verificationStatus: "verified",
    verificationLevel: role,
    subscriptionPlan: "internal",
    tokenVersion: 0,
  }).returning({ id: users.id, email: users.email, tokenVersion: users.tokenVersion }).get();

  return { userId: created.id, email: created.email, role, tokenVersion: created.tokenVersion ?? 0 };
}

export const authService = {
  verifyAdminPassword(password: string): boolean {
    if (!appConfig.authEnabled) return true;
    if (appConfig.adminPasswordHash) {
      return bcrypt.compareSync(password, appConfig.adminPasswordHash);
    }
    return timingSafeStringEqual(password, appConfig.adminPassword);
  },

  ensureAdminUser(): AuthUserPayload {
    return ensureRuntimeUser(ADMIN_EMAIL, "admin");
  },

  syncRuntimeAdminUser(): AuthUserPayload | null {
    if (!appConfig.authEnabled) return null;
    return this.ensureAdminUser();
  },

  verifyTokenPayload(payload: { userId?: number; email?: string; role?: string; tokenVersion?: number }): AuthUserPayload | null {
    const userId = Number(payload.userId);
    if (!Number.isFinite(userId)) return null;
    const row = appDb.select({ id: users.id, email: users.email, verificationLevel: users.verificationLevel, tokenVersion: users.tokenVersion })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    if (!row) return null;
    if ((row.tokenVersion ?? 0) !== Number(payload.tokenVersion ?? -1)) return null;
    const role = row.verificationLevel === "admin" ? "admin" : "user";
    if (payload.role === "admin" && role !== "admin") return null;
    return { userId: row.id, email: row.email, role, tokenVersion: row.tokenVersion ?? 0 };
  },

  revokeUserTokens(userId: number): number {
    const row = appDb.select({ id: users.id, tokenVersion: users.tokenVersion })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    if (!row) return 0;
    const tokenVersion = (row.tokenVersion ?? 0) + 1;
    appDb.update(users).set({ tokenVersion }).where(eq(users.id, userId)).run();
    return tokenVersion;
  },
};
