import { appConfig } from "./config.js";
import { db } from "./db/connection.js";
import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";
import { authRouter } from "./routes/auth.js";
import { apiRouter } from "./routes/api.js";
import { staticRouter } from "./routes/static.js";
import { healthRouter } from "./routes/health.js";
import { observabilityService } from "./services/observability.service.js";

const app = express();

if (appConfig.trustProxy) {
  app.set("trust proxy", 1);
}

function requestId(req: Request, res: Response, next: NextFunction) {
  const existing = req.headers["x-request-id"];
  const id = Array.isArray(existing) ? existing[0] : existing || crypto.randomUUID();
  res.locals.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

function rateLimitHandler(req: Request, res: Response) {
  res.status(429).json({
    error: "Too many requests",
    requestId: res.locals.requestId,
    retryAfter: res.getHeader("Retry-After") || null,
    path: req.path,
  });
}

app.use(requestId);
app.use(observabilityService.middleware);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // allow local static assets
}));

app.use(cors({
  origin: appConfig.frontendOrigins,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: appConfig.rateLimitWindowMs,
  max: appConfig.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => req.originalUrl.startsWith("/api/health/"),
});

const authLimiter = rateLimit({
  windowMs: appConfig.authRateLimitWindowMs,
  max: appConfig.authRateLimitMax,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

const adminLimiter = rateLimit({
  windowMs: appConfig.adminRateLimitWindowMs,
  max: appConfig.adminRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

if (appConfig.rateLimitEnabled) {
  app.use("/api/auth/login", authLimiter);
  app.use("/api/admin", adminLimiter);
  app.use("/api", generalLimiter);
}

// Routes
app.use("/api/auth", authRouter);
app.use("/api", apiRouter);
app.use("/api/health", healthRouter);
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found", requestId: res.locals.requestId, path: req.path });
});
app.use(staticRouter);

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const requestIdValue = res.locals.requestId;
  console.error(`[${requestIdValue}] ${req.method} ${req.originalUrl}`, err);
  const isProduction = process.env.NODE_ENV === "production";
  res.status(500).json({
    error: isProduction ? "Internal server error" : err.message || "Internal server error",
    requestId: requestIdValue,
  });
});

app.listen(appConfig.port, appConfig.host, () => {
  console.log(`${appConfig.appName} v2 running at http://${appConfig.host}:${appConfig.port}`);
  console.log(`Database: ${appConfig.dbPath}`);
});

export default app;
