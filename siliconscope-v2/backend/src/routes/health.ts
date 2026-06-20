import { Router } from "express";
import { appConfig } from "../config.js";
import { db } from "../db/connection.js";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const result = db.get<{ count: number }>(sql`SELECT COUNT(*) as count FROM papers`);
    res.json({
      status: "ok",
      appName: appConfig.appName,
      database: appConfig.dbPath,
      papers: result?.count ?? 0,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: (err as Error).message });
  }
});

export { router as healthRouter };
