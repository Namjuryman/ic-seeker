import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.resolve(__dirname, "../../.env") });

export const appConfig = {
  port: Number(process.env.PORT || 8751),
  host: process.env.HOST || "127.0.0.1",
  appName: process.env.APP_NAME || "SiliconScope",
  
  dbPath: process.env.DATABASE_URL || path.resolve(__dirname, "../../ic_database/ic_papers.sqlite"),
  csvPath: process.env.IC_SEEKER_CSV || path.resolve(__dirname, "../../ic_database/ic_chipseeker.csv"),
  pdfInboxPath: process.env.IC_SEEKER_PDF_INBOX || path.resolve(__dirname, "../../ic_database/pdf_inbox"),
  publicDir: process.env.PUBLIC_DIR || path.resolve(__dirname, "../../frontend/dist"),
  
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  adminPassword: process.env.ADMIN_PASSWORD || "change-me-now",
  authEnabled: process.env.IC_SEEKER_REQUIRE_LOGIN === "1" || process.env.IC_SEEKER_AUTH === "password",
  frontendOrigins: (process.env.FRONTEND_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  
  cookieName: "siliconscope_token",
  tokenExpiry: "14d",
  
  crossrefMailto: process.env.CROSSREF_MAILTO || "",
} as const;

export type AppConfig = typeof appConfig;
