import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { appConfig } from "../config.js";
import { authService } from "../services/auth.service.js";

export interface AuthenticatedRequest extends Request {
  user?: { userId: number; email: string; role: string; tokenVersion?: number };
}

function localUser() {
  return {
    userId: 0,
    email: "local",
    role: appConfig.localAdminEnabled ? "admin" : "user",
    tokenVersion: 0,
  };
}

function readVerifiedUser(req: AuthenticatedRequest) {
  const token = req.cookies?.[appConfig.cookieName] || req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  const payload = jwt.verify(token, appConfig.jwtSecret) as { userId: number; email: string; role: string; tokenVersion?: number };
  return authService.verifyTokenPayload(payload);
}

function hasToken(req: AuthenticatedRequest) {
  return Boolean(req.cookies?.[appConfig.cookieName] || req.headers.authorization?.replace("Bearer ", ""));
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!appConfig.authEnabled) {
    req.user = localUser();
    next();
    return;
  }

  try {
    const user = readVerifiedUser(req);
    if (!user) {
      res.status(401).json({ error: hasToken(req) ? "Invalid or expired token" : "Authentication required" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Authentication required" });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!appConfig.authEnabled) {
    const user = localUser();
    if (user.role !== "admin") {
      res.status(403).json({ error: "Admin access disabled in local public mode" });
      return;
    }
    req.user = user;
    next();
    return;
  }

  try {
    const user = readVerifiedUser(req);
    if (!user) {
      res.status(401).json({ error: hasToken(req) ? "Invalid or expired token" : "Authentication required" });
      return;
    }
    if (user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Authentication required" });
  }
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!appConfig.authEnabled) {
    req.user = localUser();
    next();
    return;
  }

  const token = req.cookies?.[appConfig.cookieName] || req.headers.authorization?.replace("Bearer ", "");
  
  if (token) {
    try {
      const payload = jwt.verify(token, appConfig.jwtSecret) as { userId: number; email: string; role: string; tokenVersion?: number };
      req.user = authService.verifyTokenPayload(payload) || undefined;
    } catch {
      // ignore invalid token for optional auth
    }
  }
  
  next();
}
