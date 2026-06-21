import { Router } from "express";
import { requireAuth, requireAdmin, type AuthenticatedRequest } from "../middleware/auth.js";
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
import { watchlistService } from "../services/watchlist.service.js";
import { readingQueueService } from "../services/reading-queue.service.js";
import { WATCHLIST_VALID_TYPES } from "../services/watchlist.service.js";
import { institutionCompareService } from "../services/institution-compare.service.js";
import { authorCompareService } from "../services/author-compare.service.js";
import { mentorCompareService } from "../services/mentor-compare.service.js";
import { topicReportService } from "../services/topic-report.service.js";
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

router.get("/compare/institutions", requireAuth, async (req, res) => {
  try {
    const names = String(req.query.names || "").split(",").map((n) => n.trim()).filter(Boolean);
    if (names.length < 2) {
      res.status(400).json({ error: "At least 2 institution names are required" });
      return;
    }
    res.json(institutionCompareService.compare(names));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/compare/authors", requireAuth, async (req, res) => {
  try {
    const names = String(req.query.names || "").split(",").map((n) => n.trim()).filter(Boolean);
    if (names.length < 2) {
      res.status(400).json({ error: "At least 2 author names are required" });
      return;
    }
    res.json(authorCompareService.compare(names));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/compare/mentors", requireAuth, async (req, res) => {
  try {
    const names = String(req.query.names || "").split(",").map((n) => n.trim()).filter(Boolean);
    if (names.length < 2) {
      res.status(400).json({ error: "At least 2 mentor names are required" });
      return;
    }
    res.json(mentorCompareService.compare(names));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/reports/topics/:field", requireAuth, async (req, res) => {
  try {
    const field = String(req.params.field || "").trim();
    if (!field) {
      res.status(400).json({ error: "Topic field is required" });
      return;
    }
    res.json(topicReportService.getReport(field));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/admin/companies", requireAdmin, async (req, res) => {
  try {
    const company = companyService.createCompany(req.body);
    clearCache();
    res.json(company);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.patch("/admin/companies/:id", requireAdmin, async (req, res) => {
  try {
    const company = companyService.updateCompany(req.params.id, req.body);
    clearCache();
    res.json(company);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.delete("/admin/companies/:id", requireAdmin, async (req, res) => {
  try {
    const result = companyService.deleteCompany(req.params.id);
    clearCache();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/watchlist/companies", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(companyService.listWatchedCompanies(req.user?.userId ?? 0));
});

router.get("/watchlist/companies/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json({ watched: companyService.isWatchedCompany(req.user?.userId ?? 0, req.params.id) });
});

router.post("/watchlist/companies/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(companyService.watchCompany(req.user?.userId ?? 0, req.params.id));
});

router.delete("/watchlist/companies/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(companyService.unwatchCompany(req.user?.userId ?? 0, req.params.id));
});

// Generic watchlist routes (works for all target types)
router.get("/watchlist", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(watchlistService.listWatchlistItems(req.user?.userId ?? 0));
});

router.get("/watchlist/type/:type", requireAuth, async (req: AuthenticatedRequest, res) => {
  const type = req.params.type;
  if (!WATCHLIST_VALID_TYPES.includes(type as any)) {
    res.status(400).json({ error: 'Invalid target type' });
    return;
  }
  res.json(watchlistService.listWatchlistByType(req.user?.userId ?? 0, type));
});

router.post("/watchlist", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { targetType, targetId, queryJson } = req.body as { targetType: string; targetId: string; queryJson?: Record<string, unknown> | string };
  if (!WATCHLIST_VALID_TYPES.includes(targetType as any)) {
    res.status(400).json({ error: 'Invalid target type' });
    return;
  }
  if (!targetId || targetId.length > 256) {
    res.status(400).json({ error: 'targetId is required and must be <= 256 chars' });
    return;
  }
  const result = watchlistService.addWatchlistItem(req.user?.userId ?? 0, targetType, targetId, queryJson);
  if (result.error) {
    res.status(400).json(result);
    return;
  }
  res.status(result.alreadyExists ? 200 : 201).json(result);
});

router.delete("/watchlist/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const result = watchlistService.deleteWatchlistItem(req.user?.userId ?? 0, id);
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

// Reading Queue routes
router.get("/reading-queue", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(readingQueueService.getReadingQueue(req.user?.userId ?? 0));
});

router.get("/reading-queue/:paperId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const paperId = Number(req.params.paperId);
  if (!Number.isFinite(paperId)) {
    res.status(400).json({ error: 'Invalid paperId' });
    return;
  }
  res.json({ status: readingQueueService.getPaperStatus(req.user?.userId ?? 0, paperId) });
});

router.post("/reading-queue/:paperId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const paperId = Number(req.params.paperId);
  const { status } = req.body as { status: string };
  if (!Number.isFinite(paperId) || !status) {
    res.status(400).json({ error: 'paperId and status are required' });
    return;
  }
  const result = readingQueueService.updateReadingStatus(req.user?.userId ?? 0, paperId, status);
  if (result.error) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
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

router.get("/admin/moderation", requireAdmin, async (req, res) => {
  res.json(moderationService.getQueue({
    limit: Number(req.query.limit || 25),
    offset: Number(req.query.offset || 0),
    status: req.query.status as string,
  }));
});

router.post("/admin/moderation/:targetType/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
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

router.get("/admin/snapshots", requireAdmin, async (_req, res) => {
  res.json(snapshotService.list());
});

router.post("/admin/snapshots/refresh", requireAdmin, async (req, res) => {
  const keys = Array.isArray(req.body?.keys)
    ? req.body.keys.map(String)
    : String(req.body?.key || "all").split(",").map((key) => key.trim()).filter(Boolean);
  res.json(snapshotService.refresh(keys.length ? keys : ["all"]));
});

router.post("/admin/snapshots/clear", requireAdmin, async (req, res) => {
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


router.get("/admin/identity/aliases", requireAdmin, async (req, res) => {
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

router.put("/admin/identity/aliases/:type", requireAdmin, async (req, res) => {
  try {
    const result = identityAdminService.upsertAlias(req.params.type, req.body);
    clearCache();
    snapshotService.invalidateAllSnapshots();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.delete("/admin/identity/aliases/:type/:alias", requireAdmin, async (req, res) => {
  try {
    const result = identityAdminService.deleteAlias(req.params.type, decodeURIComponent(req.params.alias));
    clearCache();
    snapshotService.invalidateAllSnapshots();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/admin/api-keys", requireAdmin, async (_req, res) => {
  res.json(statsService.getApiKeys());
});

router.put("/admin/api-keys/:provider", requireAdmin, async (req, res) => {
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
