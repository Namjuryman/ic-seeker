import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { appConfig } from "../config.js";

export interface AuthenticatedRequest extends Request {
  user?: { userId: number; email: string; role: string };
}

function localUser() {
  return {
    userId: 0,
    email: "local",
    role: appConfig.localAdminEnabled ? "admin" : "user",
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!appConfig.authEnabled) {
    req.user = localUser();
    next();
    return;
  }

  const token = req.cookies?.[appConfig.cookieName] || req.headers.authorization?.replace("Bearer ", "");
  
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, appConfig.jwtSecret) as { userId: number; email: string; role: string };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
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

  const token = req.cookies?.[appConfig.cookieName] || req.headers.authorization?.replace("Bearer ", "");
  
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, appConfig.jwtSecret) as { userId: number; email: string; role: string };
    if (payload.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
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
      const payload = jwt.verify(token, appConfig.jwtSecret) as { userId: number; email: string; role: string };
      req.user = payload;
    } catch {
      // ignore invalid token for optional auth
    }
  }
  
  next();
}
