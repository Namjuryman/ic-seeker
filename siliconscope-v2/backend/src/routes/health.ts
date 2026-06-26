import { Router } from "express";
import { appConfig } from "../config.js";
import { db as metadataDb } from "../db/connection.js";
import { getDataLayerTopology } from "../db/topology.js";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const result = metadataDb.get<{ count: number }>(sql`SELECT COUNT(*) as count FROM papers`);
    res.json({
      status: "ok",
      appName: appConfig.appName,
      database: appConfig.dbPath,
      papers: result?.count ?? 0,
      dataLayer: getDataLayerTopology(),
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: (err as Error).message });
  }
});

export { router as healthRouter };
