import { Router } from "express";
import jwt from "jsonwebtoken";
import { appConfig } from "../config.js";
import { z } from "zod";
import { authService } from "../services/auth.service.js";

const router = Router();

const loginSchema = z.object({
  password: z.string().min(1),
});

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 14 * 24 * 60 * 60 * 1000,
  };
}

function readPayload(req: any) {
  const token = req.cookies?.[appConfig.cookieName] || req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  try {
    return jwt.verify(token, appConfig.jwtSecret) as { userId: number; email: string; role: string };
  } catch {
    return null;
  }
}

router.get("/status", (req, res) => {
  const payload = readPayload(req);
  res.json({
    authenticated: Boolean(payload) || !appConfig.authEnabled,
    authEnabled: appConfig.authEnabled,
    appName: appConfig.appName,
    user: payload || (!appConfig.authEnabled ? { userId: 0, email: "local", role: "admin" } : null),
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { password } = parsed.data;
  if (appConfig.authEnabled && password !== appConfig.adminPassword) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const payload = appConfig.authEnabled
    ? authService.ensureAdminUser()
    : { userId: 0, email: "local", role: "admin" as const };

  const token = jwt.sign(payload, appConfig.jwtSecret, { expiresIn: appConfig.tokenExpiry });
  res.cookie(appConfig.cookieName, token, cookieOptions());
  res.json({ ok: true, user: payload, appName: appConfig.appName });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(appConfig.cookieName);
  res.json({ ok: true });
});

export { router as authRouter };
