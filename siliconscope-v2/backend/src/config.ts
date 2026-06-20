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
  
  cookieName: "siliconscope_token",
  tokenExpiry: "14d",
  
  crossrefMailto: process.env.CROSSREF_MAILTO || "",
} as const;

export type AppConfig = typeof appConfig;
