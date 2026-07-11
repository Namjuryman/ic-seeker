import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { clearCache } from "../services/cache.service.js";
import { paperAiEnrichmentService } from "../services/paper-ai-enrichment.service.js";
import { paperService } from "../services/paper.service.js";
import { searchService } from "../services/search.service.js";
import { importDoiBodySchema, paperAiSummaryBodySchema, parseBody } from "./route-validation.js";

const router = Router();

router.get("/public/search-demo", async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 120);
  if (q.length < 2) {
    res.json({ total: 0, limit: 3, offset: 0, engine: "public-demo", query: q, rows: [] });
    return;
  }
  const result = searchService.search({ q, semantic: "1", limit: "3", offset: "0" }, 0);
  res.json({ ...result, rows: result.rows.slice(0, 3), limit: 3, offset: 0, engine: `${result.engine}:public-demo` });
});

router.get("/search", requireAuth, async (req: AuthenticatedRequest, res) => {
  const result = searchService.search(req.query as Record<string, string>, req.user?.userId ?? 0);
  res.json(result);
});

router.get("/search/suggestions", requireAuth, async (req, res) => {
  res.json(searchService.suggestions(req.query as Record<string, string>));
});

router.get("/papers/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "论文 ID 无效。" });
    return;
  }
  const paper = paperService.getPaper(id, req.user?.userId ?? 0);
  if (!paper) {
    res.status(404).json({ error: "论文不存在。" });
    return;
  }
  res.json(paper);
});

router.post("/papers/:id/ai-summary", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "论文 ID 无效。" });
    return;
  }
  try {
    const body = parseBody(paperAiSummaryBodySchema, req.body);
    const summary = await paperAiEnrichmentService.getOrCreatePaperSummary(id, body);
    if (!summary) {
      res.status(404).json({ error: "论文不存在。" });
      return;
    }
    res.json(summary);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.put("/private/papers/:id/state", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const paper = paperService.upsertPaperState(id, req.body, req.user?.userId ?? 0);
  if (!paper) {
    res.status(404).json({ error: "论文不存在。" });
    return;
  }
  clearCache();
  res.json(paper);
});

router.get("/private/tags", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(paperService.getAllTags(req.user?.userId ?? 0));
});

router.post("/import/manual", requireAuth, async (req, res) => {
  try {
    const paper = paperService.insertPaper(req.body);
    clearCache();
    res.json(paper);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/import/doi", requireAuth, async (req, res) => {
  try {
    const body = parseBody(importDoiBodySchema, req.body);
    const paper = await paperService.importByDoi(body.doi);
    clearCache();
    res.json(paper);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export { router as papersRouter };
