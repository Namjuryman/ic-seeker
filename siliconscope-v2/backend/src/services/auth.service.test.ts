import { afterEach, describe, expect, it } from "vitest";
import { appSqlite } from "../db/app-db.js";
import { authService, timingSafeStringEqual } from "./auth.service.js";

const createdEmails: string[] = [];

function createUser(tokenVersion: number) {
  const email = `auth-test-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  createdEmails.push(email);
  return appSqlite.prepare(`
    INSERT INTO users (email, password_hash, nickname, verification_status, verification_level, subscription_plan, token_version)
    VALUES (?, 'test', 'Auth Test', 'verified', 'admin', 'internal', ?)
    RETURNING id, email, token_version AS tokenVersion
  `).get(email, tokenVersion) as { id: number; email: string; tokenVersion: number };
}

afterEach(() => {
  for (const email of createdEmails.splice(0)) {
    appSqlite.prepare("DELETE FROM users WHERE email = ?").run(email);
  }
});

describe("authService", () => {
  it("compares configured passwords with a timing-safe fixed-length digest", () => {
    expect(timingSafeStringEqual("same-password", "same-password")).toBe(true);
    expect(timingSafeStringEqual("same-password", "different-password")).toBe(false);
  });

  it("rejects stale token versions and can revoke issued tokens", () => {
    const user = createUser(2);

    expect(authService.verifyTokenPayload({
      userId: user.id,
      email: user.email,
      role: "admin",
      tokenVersion: 1,
    })).toBeNull();

    expect(authService.verifyTokenPayload({
      userId: user.id,
      email: user.email,
      role: "admin",
      tokenVersion: 2,
    })?.tokenVersion).toBe(2);

    expect(authService.revokeUserTokens(user.id)).toBe(3);
    expect(authService.verifyTokenPayload({
      userId: user.id,
      email: user.email,
      role: "admin",
      tokenVersion: 2,
    })).toBeNull();
  });
});
