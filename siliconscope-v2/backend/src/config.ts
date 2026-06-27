import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.resolve(__dirname, "../../.env") });

export const appConfig = {
  port: Number(process.env.PORT || 8751),
  host: process.env.HOST || "127.0.0.1",
  appName: process.env.APP_NAME || "SiliconScope",
  publicSiteUrl: process.env.PUBLIC_SITE_URL || "",
  adminSiteUrl: process.env.ADMIN_SITE_URL || "",
  apiBaseUrl: process.env.API_BASE_URL || "",
  deploymentMode: process.env.DEPLOYMENT_MODE || "local",
  trustProxy: process.env.TRUST_PROXY === "1" || process.env.DEPLOYMENT_MODE === "production",
  
  dbPath: process.env.DATABASE_URL || path.resolve(__dirname, "../../ic_database/ic_papers.sqlite"),
  csvPath: process.env.IC_SEEKER_CSV || path.resolve(__dirname, "../../ic_database/ic_chipseeker.csv"),
  pdfInboxPath: process.env.IC_SEEKER_PDF_INBOX || path.resolve(__dirname, "../../ic_database/pdf_inbox"),
  backupDir: process.env.BACKUP_DIR || path.resolve(__dirname, "../../backups"),
  publicDir: process.env.PUBLIC_DIR || path.resolve(__dirname, "../../frontend/dist"),
  
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  adminPassword: process.env.ADMIN_PASSWORD || "change-me-now",
  authEnabled: process.env.IC_SEEKER_REQUIRE_LOGIN === "1" || process.env.IC_SEEKER_AUTH === "password",
  localAdminEnabled: process.env.IC_SEEKER_LOCAL_ADMIN === "1",
  frontendOrigins: (process.env.FRONTEND_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175,http://localhost:5176,http://127.0.0.1:5176")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  
  cookieName: "siliconscope_token",
  tokenExpiry: "14d",

  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== "0",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 400),
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 60 * 1000),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 8),
  adminRateLimitWindowMs: Number(process.env.ADMIN_RATE_LIMIT_WINDOW_MS || 5 * 60 * 1000),
  adminRateLimitMax: Number(process.env.ADMIN_RATE_LIMIT_MAX || 120),
  
  crossrefMailto: process.env.CROSSREF_MAILTO || "",

  postgresUrl: process.env.POSTGRES_URL || "",
  redisUrl: process.env.REDIS_URL || "",
  searchEngine: process.env.SEARCH_ENGINE || "sqlite",
  meilisearchHost: process.env.MEILISEARCH_HOST || "",
  meilisearchApiKey: process.env.MEILISEARCH_API_KEY || "",

  objectStorageProvider: process.env.OBJECT_STORAGE_PROVIDER || "local",
  objectStorageEndpoint: process.env.OBJECT_STORAGE_ENDPOINT || "",
  objectStorageRegion: process.env.OBJECT_STORAGE_REGION || "auto",
  objectStorageBucket: process.env.OBJECT_STORAGE_BUCKET || "",
  objectStorageAccessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID || "",
  objectStorageSecretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY || "",
  objectStoragePublicBaseUrl: process.env.OBJECT_STORAGE_PUBLIC_BASE_URL || "",

  queueBackend: process.env.QUEUE_BACKEND || "disabled",
  schedulerEnabled: process.env.SCHEDULER_ENABLED === "1",
  schedulerTickSeconds: Number(process.env.SCHEDULER_TICK_SECONDS || 60),
  realtimeEnabled: process.env.REALTIME_ENABLED === "1",
  socketIoPath: process.env.SOCKET_IO_PATH || "/socket.io",

  paymentProvider: process.env.PAYMENT_PROVIDER || "disabled",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  paddleApiKey: process.env.PADDLE_API_KEY || "",

  emailProvider: process.env.EMAIL_PROVIDER || "disabled",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPassword: process.env.SMTP_PASSWORD || "",
  oauthGoogleClientId: process.env.OAUTH_GOOGLE_CLIENT_ID || "",
  oauthGoogleClientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET || "",

  sentryDsn: process.env.SENTRY_DSN || "",
  prometheusEnabled: process.env.PROMETHEUS_ENABLED === "1",
} as const;

export type AppConfig = typeof appConfig;
