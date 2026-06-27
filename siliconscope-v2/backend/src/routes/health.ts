import { Router } from "express";
import { appConfig } from "../config.js";
import { db as metadataDb } from "../db/connection.js";
import { getDataLayerTopology } from "../db/topology.js";
import { runtimeHealthService } from "../services/runtime-health.service.js";
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

router.get("/live", (_req, res) => {
  res.json({
    status: "ok",
    appName: appConfig.appName,
    uptimeSeconds: Math.round(process.uptime()),
    generatedAt: new Date().toISOString(),
  });
});

router.get("/ready", (_req, res) => {
  const health = runtimeHealthService.getHealth();
  res.status(health.status === "error" ? 503 : 200).json(health);
});

export { router as healthRouter };
