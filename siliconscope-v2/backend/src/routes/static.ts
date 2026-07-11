import { requireAuth } from "../middleware/auth.js";
import { Router, Request, Response } from "express";
import path from "node:path";
import { appConfig } from "../config.js";
import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import { brotliCompressSync, gzipSync } from "node:zlib";

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

type StaticCacheEntry = {
  bytes: Buffer;
  brotli?: Buffer;
  gzip?: Buffer;
  etag: string;
  contentType: string;
  cacheControl: string;
  mtimeMs: number;
  size: number;
};

const staticAssetCache = new Map<string, StaticCacheEntry>();
const publicRoot = path.resolve(appConfig.publicDir);

function isInsidePublicDir(filePath: string) {
  const relative = path.relative(publicRoot, filePath);
  return Boolean(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function cacheControlFor(requested: string) {
  if (requested === "/index.html" || requested.endsWith(".html")) {
    return "no-cache";
  }
  if (requested.startsWith("/assets/")) {
    return "public, max-age=31536000, immutable";
  }
  return "public, max-age=3600";
}

function canMemoryCache(requested: string, size: number) {
  return requested.startsWith("/assets/") && size <= 2 * 1024 * 1024;
}

function shouldCompress(entry: StaticCacheEntry) {
  return entry.size >= 1024 && /^(text\/|application\/(javascript|json)|image\/svg\+xml)/.test(entry.contentType);
}

async function readStaticFile(filePath: string, requested: string): Promise<StaticCacheEntry> {
  const stat = await fs.stat(filePath);
  const cached = staticAssetCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached;

  const ext = path.extname(filePath).toLowerCase();
  const entry: StaticCacheEntry = {
    bytes: await fs.readFile(filePath),
    etag: `W/"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`,
    contentType: mimeTypes[ext] || "application/octet-stream",
    cacheControl: cacheControlFor(requested),
    mtimeMs: stat.mtimeMs,
    size: stat.size,
  };

  if (canMemoryCache(requested, stat.size)) {
    staticAssetCache.set(filePath, entry);
  }
  return entry;
}

function sendStaticEntry(req: Request, res: Response, entry: StaticCacheEntry) {
  res.setHeader("content-type", entry.contentType);
  res.setHeader("cache-control", entry.cacheControl);
  res.setHeader("etag", entry.etag);
  res.setHeader("vary", "Accept-Encoding");
  if (req.headers["if-none-match"] === entry.etag) {
    res.status(304).end();
    return;
  }
  const acceptEncoding = String(req.headers["accept-encoding"] || "");
  if (shouldCompress(entry) && acceptEncoding.includes("br")) {
    entry.brotli ||= brotliCompressSync(entry.bytes);
    res.setHeader("content-encoding", "br");
    res.end(entry.brotli);
    return;
  }
  if (shouldCompress(entry) && acceptEncoding.includes("gzip")) {
    entry.gzip ||= gzipSync(entry.bytes);
    res.setHeader("content-encoding", "gzip");
    res.end(entry.gzip);
    return;
  }
  res.end(entry.bytes);
}

router.get("/download/csv", requireAuth, async (_req, res) => {
  const stat = await fs.stat(appConfig.csvPath).catch(() => null);
  if (!stat?.isFile()) {
    res.status(404).json({ error: "CSV 文件不存在。" });
    return;
  }

  res.setHeader("content-type", "text/csv; charset=utf-8");
  res.setHeader("content-disposition", 'attachment; filename="ic_chipseeker.csv"');
  res.setHeader("content-length", stat.size);
  const stream = createReadStream(appConfig.csvPath);
  stream.on("error", (err) => {
    if (!res.headersSent) {
      res.status(500).json({ error: "CSV download failed" });
      return;
    }
    res.destroy(err);
  });
  stream.pipe(res);
});

router.get("/*", async (req, res) => {
  const requested = req.path === "/" ? "/index.html" : decodeURIComponent(req.path);
  const filePath = path.resolve(publicRoot, `.${requested}`);
  
  // Security: prevent path traversal
  if (!isInsidePublicDir(filePath)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  
  try {
    const entry = await readStaticFile(filePath, requested);
    sendStaticEntry(req, res, entry);
  } catch {
    // Fallback to index.html for SPA client-side routing
    if (req.headers.accept?.includes("text/html")) {
      try {
        const entry = await readStaticFile(path.resolve(publicRoot, "index.html"), "/index.html");
        sendStaticEntry(req, res, entry);
        return;
      } catch {
        // ignore
      }
    }
    res.status(404).json({ error: "Not found" });
  }
});

export { router as staticRouter };
