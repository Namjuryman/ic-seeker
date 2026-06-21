import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { statsService } from "../services/stats.service.js";
import { searchService } from "../services/search.service.js";
import { paperService } from "../services/paper.service.js";
import { profileService } from "../services/profile.service.js";
import { topicService } from "../services/topic.service.js";
import { geoService } from "../services/geo.service.js";
import { venueMatrixService } from "../services/venue-matrix.service.js";
import { mentorService } from "../services/mentor.service.js";
import { discussionService } from "../services/discussion.service.js";
import { reviewService } from "../services/review.service.js";
import { dataQualityService } from "../services/data-quality.service.js";
import { moderationService } from "../services/moderation.service.js";
import { journalFilterService } from "../services/journal-filter.service.js";
import { identityAdminService } from "../services/identity-admin.service.js";
import { clearCache, memoCache, memoCacheAsync } from "../services/cache.service.js";
import { snapshotService } from "../services/snapshot.service.js";
import { learningService } from "../services/learning.service.js";
import { companyService } from "../services/company.service.js";
import { routeFamilies, commonFoundations } from "../data/learning-catalog.js";

const router = Router();

router.get("/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId ?? 0;
  res.json(memoCache(`stats:${userId}`, 30_000, () => statsService.getStats(userId)));
});

router.get("/search", requireAuth, async (req: AuthenticatedRequest, res) => {
  const result = searchService.search(req.query as Record<string, string>, req.user?.userId ?? 0);
  res.json(result);
});

router.get("/papers/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid paper ID" });
    return;
  }
  const paper = paperService.getPaper(id, req.user?.userId ?? 0);
  if (!paper) {
    res.status(404).json({ error: "Paper not found" });
    return;
  }
  res.json(paper);
});

router.put("/private/papers/:id/state", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const paper = paperService.upsertPaperState(id, req.body, req.user?.userId ?? 0);
  if (!paper) {
    res.status(404).json({ error: "Paper not found" });
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
    const paper = await paperService.importByDoi(req.body.doi);
    clearCache();
    res.json(paper);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/professors", requireAuth, async (req, res) => {
  res.json(snapshotService.getProfessors(req.query as Record<string, string>));
});

router.get("/authors/:name", requireAuth, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  res.json(snapshotService.getAuthorProfile(name));
});

router.get("/institutions", requireAuth, async (req, res) => {
  res.json(snapshotService.getInstitutions(req.query as Record<string, string>));
});

router.get("/institutions/:name", requireAuth, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  res.json(snapshotService.getInstitutionProfile(name));
});

router.get("/topics", requireAuth, async (_req, res) => {
  res.json(snapshotService.getTopics());
});

router.get("/topics/detail", requireAuth, async (req, res) => {
  const field = req.query.field as string;
  if (!field) {
    res.status(400).json({ error: "field is required" });
    return;
  }
  res.json(snapshotService.getTopicDetail(field));
});

router.get("/geo", requireAuth, async (req, res) => {
  res.json(snapshotService.getGeo(req.query as Record<string, string>));
});

router.get("/venue-matrix", requireAuth, async (_req, res) => {
  res.json(snapshotService.getVenueMatrix());
});

router.get("/learning", requireAuth, async (_req, res) => {
  res.json(learningService.getDashboard());
});

router.get("/learning/route-families", requireAuth, async (_req, res) => {
  res.json(routeFamilies);
});

router.get("/learning/foundations", requireAuth, async (_req, res) => {
  res.json(commonFoundations);
});

router.get("/learning/roadmaps", requireAuth, async (_req, res) => {
  res.json(learningService.listRoadmaps());
});

router.get("/learning/roadmaps/:slug", requireAuth, async (req, res) => {
  const roadmap = learningService.getRoadmap(req.params.slug);
  if (!roadmap) {
    res.status(404).json({ error: "Roadmap not found", requested: req.params.slug });
    return;
  }
  res.json(roadmap);
});

router.get("/learning/roadmaps/:slug/related-papers", requireAuth, async (req: AuthenticatedRequest, res) => {
  const result = learningService.relatedPapersForRoadmap(req.params.slug, req.user?.userId ?? 0, Number(req.query.limit || 8));
  if (!result) {
    res.status(404).json({ error: "Roadmap not found" });
    return;
  }
  res.json(result);
});

router.get("/learning/lessons", requireAuth, async (req, res) => {
  res.json(learningService.listLessons(req.query as Record<string, string>));
});

router.get("/learning/today", requireAuth, async (_req, res) => {
  res.json(learningService.getTodayLesson());
});

router.get("/learning/lessons/:lessonId", requireAuth, async (req, res) => {
  const lesson = learningService.getLesson(req.params.lessonId);
  if (!lesson) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }
  res.json(lesson);
});

router.get("/learning/lessons/:lessonId/related-papers", requireAuth, async (req: AuthenticatedRequest, res) => {
  const result = learningService.relatedPapersForLesson(req.params.lessonId, req.user?.userId ?? 0, Number(req.query.limit || 8));
  if (!result) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }
  res.json(result);
});

router.get("/mentor/institutions", requireAuth, async (req, res) => {
  res.json(snapshotService.getMentorInstitutions(req.query as Record<string, string>));
});

router.get("/mentor/institutions/:name", requireAuth, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  res.json(snapshotService.getMentorInstitution(name, req.query as Record<string, string>));
});

router.get("/mentor/authors/:name", requireAuth, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const profile = snapshotService.getMentorProfile(name, req.query as Record<string, string>);
  const reviews = reviewService.listReviews(name);
  const stats = reviewService.getReviewStats(name);
  res.json({ ...profile, reviews, reviewStats: stats });
});

router.get("/authors/:name/reviews", requireAuth, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  res.json({ reviews: reviewService.listReviews(name), stats: reviewService.getReviewStats(name) });
});

router.post("/authors/:name/reviews", requireAuth, async (req: AuthenticatedRequest, res) => {
  const name = decodeURIComponent(req.params.name);
  try {
    const result = reviewService.addReview(name, req.user?.userId ?? 0, req.body);
    clearCache("moderation");
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/mentor/authors/:name/reviews", requireAuth, async (req: AuthenticatedRequest, res) => {
  const name = decodeURIComponent(req.params.name);
  try {
    const result = reviewService.addReview(name, req.user?.userId ?? 0, req.body);
    clearCache("moderation");
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Company / Employer Intelligence
router.get("/companies", requireAuth, async (req, res) => {
  try {
    const result = companyService.listCompanies(req.query as Record<string, string>);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/companies/types", requireAuth, async (_req, res) => {
  res.json(companyService.getCompanyTypes());
});

router.get("/companies/domains", requireAuth, async (_req, res) => {
  res.json(companyService.getDomains());
});

router.get("/companies/:id", requireAuth, async (req, res) => {
  const company = companyService.getCompany(req.params.id);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(company);
});

router.get("/companies/:id/related-papers", requireAuth, async (req, res) => {
  const result = companyService.getRelatedPapers(req.params.id, Number(req.query.limit || 20));
  if (!result) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(result);
});

router.get("/companies/:id/related-roadmaps", requireAuth, async (req, res) => {
  const result = companyService.getRelatedRoadmaps(req.params.id);
  if (!result) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(result);
});

router.get("/compare/companies", requireAuth, async (req, res) => {
  try {
    const ids = String(req.query.ids || "").split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length < 2) {
      res.status(400).json({ error: "At least 2 company IDs are required" });
      return;
    }
    res.json(companyService.compareCompanies(ids));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/admin/companies", requireAuth, async (req, res) => {
  try {
    const company = companyService.createCompany(req.body);
    clearCache();
    res.json(company);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.patch("/admin/companies/:id", requireAuth, async (req, res) => {
  try {
    const company = companyService.updateCompany(req.params.id, req.body);
    clearCache();
    res.json(company);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.delete("/admin/companies/:id", requireAuth, async (req, res) => {
  try {
    const result = companyService.deleteCompany(req.params.id);
    clearCache();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/papers/:id/comments", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  res.json(discussionService.listComments(id, {
    limit: Number(req.query.limit || 20),
    offset: Number(req.query.offset || 0),
  }));
});

router.post("/papers/:id/comments", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  try {
    const result = discussionService.addComment(id, req.user?.userId ?? 0, req.body);
    clearCache("moderation");
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});


router.get("/data-quality", requireAuth, async (req, res) => {
  const scanLimit = Number(req.query.scanLimit || 12000);
  const sampleLimit = Number(req.query.sampleLimit || 50);
  res.json(memoCache(`data-quality:${scanLimit}:${sampleLimit}`, 120_000, () => dataQualityService.getReport({ scanLimit, sampleLimit })));
});

router.get("/journal-filters", requireAuth, async (_req, res) => {
  res.json(await memoCacheAsync("journal-filters", 300_000, () => journalFilterService.getConfig()));
});

router.post("/journal-filters/evaluate", requireAuth, async (req, res) => {
  res.json(await journalFilterService.evaluate(req.body));
});

router.get("/admin/moderation", requireAuth, async (req, res) => {
  res.json(moderationService.getQueue({
    limit: Number(req.query.limit || 25),
    offset: Number(req.query.offset || 0),
    status: req.query.status as string,
  }));
});

router.post("/admin/moderation/:targetType/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const targetType = decodeURIComponent(req.params.targetType);
    const targetId = Number(req.params.id);
    const { action, reason } = req.body;
    const result = moderationService.moderate(targetType, targetId, action, req.user?.userId ?? null, reason);
    clearCache();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/admin/snapshots", requireAuth, async (_req, res) => {
  res.json(snapshotService.list());
});

router.post("/admin/snapshots/refresh", requireAuth, async (req, res) => {
  const keys = Array.isArray(req.body?.keys)
    ? req.body.keys.map(String)
    : String(req.body?.key || "all").split(",").map((key) => key.trim()).filter(Boolean);
  res.json(snapshotService.refresh(keys.length ? keys : ["all"]));
});

router.post("/admin/snapshots/clear", requireAuth, async (req, res) => {
  const key = typeof req.body?.key === "string" ? req.body.key.trim() : "";
  const prefix = typeof req.body?.prefix === "string" ? req.body.prefix.trim() : "";
  if (key) {
    res.json({ mode: "key", key, ...snapshotService.invalidateSnapshot(key) });
    return;
  }
  if (prefix) {
    res.json({ mode: "prefix", prefix, ...snapshotService.invalidateSnapshotsByPrefix(prefix) });
    return;
  }
  res.json({ mode: "all", ...snapshotService.invalidateAllSnapshots() });
});

router.post("/reports", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { targetType, targetId, reason } = req.body;
    const result = moderationService.report(targetType, Number(targetId), req.user?.userId ?? null, reason);
    clearCache("moderation");
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});


router.get("/admin/identity/aliases", requireAuth, async (req, res) => {
  try {
    res.json(identityAdminService.listAliases(req.query.type, {
      q: req.query.q,
      limit: req.query.limit,
      offset: req.query.offset,
    }));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.put("/admin/identity/aliases/:type", requireAuth, async (req, res) => {
  try {
    const result = identityAdminService.upsertAlias(req.params.type, req.body);
    clearCache();
    snapshotService.invalidateAllSnapshots();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.delete("/admin/identity/aliases/:type/:alias", requireAuth, async (req, res) => {
  try {
    const result = identityAdminService.deleteAlias(req.params.type, decodeURIComponent(req.params.alias));
    clearCache();
    snapshotService.invalidateAllSnapshots();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/admin/api-keys", requireAuth, async (_req, res) => {
  res.json(statsService.getApiKeys());
});

router.put("/admin/api-keys/:provider", requireAuth, async (req, res) => {
  const provider = decodeURIComponent(req.params.provider);
  const { value } = req.body;
  res.json(statsService.setApiKey(provider, value));
});

router.get("/pdf-inbox", requireAuth, async (_req, res) => {
  res.json(await statsService.getPdfInbox());
});

router.get("/methodology", requireAuth, async (_req, res) => {
  res.json(statsService.getMethodology());
});

export { router as apiRouter };
