import { requireAuth } from "../middleware/auth.js";
import { Router, Request, Response } from "express";
import path from "node:path";
import { appConfig } from "../config.js";
import { promises as fs } from "node:fs";

const router = Router();

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".csv": "text/csv; charset=utf-8",
};

router.get("/download/csv", requireAuth, async (_req, res) => {
  try {
    const bytes = await fs.readFile(appConfig.csvPath);
    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader("content-disposition", 'attachment; filename="ic_chipseeker.csv"');
    res.end(bytes);
  } catch {
    res.status(404).json({ error: "CSV not found" });
  }
});

router.get("/*", async (req, res) => {
  const requested = req.path === "/" ? "/index.html" : decodeURIComponent(req.path);
  const filePath = path.resolve(appConfig.publicDir, `.${requested}`);
  
  // Security: prevent path traversal
  if (!filePath.startsWith(path.resolve(appConfig.publicDir))) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  
  try {
    const bytes = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader("content-type", mimeTypes[ext] || "application/octet-stream");
    res.end(bytes);
  } catch {
    // Fallback to index.html for SPA client-side routing
    if (req.headers.accept?.includes("text/html")) {
      try {
        const bytes = await fs.readFile(path.resolve(appConfig.publicDir, "index.html"));
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end(bytes);
        return;
      } catch {
        // ignore
      }
    }
    res.status(404).json({ error: "Not found" });
  }
});

export { router as staticRouter };

