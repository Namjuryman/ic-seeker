import { eq } from "drizzle-orm";
import { appDb } from "../db/app-db.js";
import { users } from "../db/schema.js";

export type AuthUserPayload = {
  userId: number;
  email: string;
  role: "admin" | "user";
};

const ADMIN_EMAIL = "admin@siliconscope.local";
function ensureRuntimeUser(email: string, role: "admin" | "user"): AuthUserPayload {
  const existing = appDb.select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (existing) {
    return { userId: existing.id, email: existing.email, role };
  }

  const created = appDb.insert(users).values({
    email,
    passwordHash: "managed-by-env-password",
    nickname: role === "admin" ? "Admin" : "Local User",
    verificationStatus: "verified",
    verificationLevel: "admin",
    subscriptionPlan: "internal",
  }).returning({ id: users.id, email: users.email }).get();

  return { userId: created.id, email: created.email, role };
}

export const authService = {
  ensureAdminUser(): AuthUserPayload {
    return ensureRuntimeUser(ADMIN_EMAIL, "admin");
  },

};
