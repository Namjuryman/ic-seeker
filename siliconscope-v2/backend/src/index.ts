import { appConfig } from "./config.js";
import { db } from "./db/connection.js";
import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/auth.js";
import { apiRouter } from "./routes/api.js";
import { staticRouter } from "./routes/static.js";
import { healthRouter } from "./routes/health.js";

const app = express();

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
  origin: appConfig.authEnabled ? false : ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);

// Routes
app.use("/api/auth", authRouter);
app.use("/api", apiRouter);
app.use("/api/health", healthRouter);
app.use(staticRouter);

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(appConfig.port, appConfig.host, () => {
  console.log(`${appConfig.appName} v2 running at http://${appConfig.host}:${appConfig.port}`);
  console.log(`Database: ${appConfig.dbPath}`);
});

export default app;
