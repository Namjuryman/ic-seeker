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
import { platformService } from "../services/platform.service.js";
import { adminService } from "../services/admin.service.js";
import { adminAuditService } from "../services/admin-audit.service.js";
import { runtimeHealthService } from "../services/runtime-health.service.js";
import { notificationService } from "../services/notification.service.js";
import { billingService } from "../services/billing.service.js";
import { backupService } from "../services/backup.service.js";
import { maintenanceService, type MaintenanceJobId } from "../services/maintenance.service.js";
import { observabilityService } from "../services/observability.service.js";
import { routeFamilies, commonFoundations } from "../data/learning-catalog.js";

const router = Router();

router.get("/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId ?? 0;
  res.json(memoCache(`stats:${userId}`, 30_000, () => statsService.getStats(userId)));
});

router.get("/platform", requireAuth, async (_req, res) => {
  res.json(platformService.getOverview());
});

router.get("/billing/plans", requireAuth, async (_req, res) => {
  res.json(billingService.getPlans());
});

router.get("/billing/status", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(billingService.getBillingStatus(req.user?.userId ?? 0));
});

router.get("/billing/usage", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(billingService.getUsageSummary(req.user?.userId ?? 0));
});

router.post("/billing/checkout", requireAuth, async (req: AuthenticatedRequest, res) => {
  const planId = String(req.body?.planId || "");
  if (!planId) {
    res.status(400).json({ error: "planId is required" });
    return;
  }
  const result = billingService.createCheckoutSession(req.user?.userId ?? 0, planId);
  res.status(result.checkoutAvailable ? 501 : 400).json(result);
});

router.get("/admin/overview", requireAdmin, async (req: AuthenticatedRequest, res) => {
  res.json(await adminService.getOverview(req.user?.userId ?? 0));
});

router.get("/admin/billing", requireAdmin, async (_req, res) => {
  res.json(billingService.getAdminBillingOverview());
});

router.get("/admin/billing/users", requireAdmin, async (req, res) => {
  res.json(billingService.listBillingUsers(req.query));
});

router.get("/admin/billing/users/:id", requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const user = billingService.getBillingUser(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

router.patch("/admin/billing/users/:id/plan", requireAdmin, async (req: AuthenticatedRequest, res) => {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  try {
    const result = billingService.updateUserPlan({
      userId,
      planId: String(req.body?.planId || ""),
      reason: String(req.body?.reason || ""),
      actorUserId: req.user?.userId ?? 0,
    });
    adminAuditService.record({
      req,
      action: "billing.update_plan",
      resourceType: "user",
      resourceId: userId,
      metadata: { planId: req.body?.planId, reason: req.body?.reason },
    });
    res.json(result);
  } catch (err) {
    adminAuditService.record({ req, action: "billing.update_plan", resourceType: "user", resourceId: userId, status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/admin/runtime", requireAdmin, async (_req, res) => {
  const runtime = runtimeHealthService.getHealth();
  res.status(runtime.status === "error" ? 503 : 200).json(runtime);
});

router.get("/admin/observability", requireAdmin, async (_req, res) => {
  res.json(observabilityService.snapshot());
});

router.get("/admin/backups", requireAdmin, async (_req, res) => {
  res.json(backupService.list());
});

router.get("/admin/maintenance/jobs", requireAdmin, async (_req, res) => {
  res.json(maintenanceService.jobs());
});

router.get("/admin/maintenance/runs", requireAdmin, async (req, res) => {
  res.json(maintenanceService.runs(req.query as Record<string, string>));
});

router.post("/admin/maintenance/jobs/:jobId/run", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await maintenanceService.run(req.params.jobId as MaintenanceJobId, {
      actorUserId: req.user?.userId ?? 0,
      actorEmail: req.user?.email || "admin",
      payload: req.body || {},
    });
    adminAuditService.record({
      req,
      action: "maintenance.run",
      resourceType: "maintenance_job",
      resourceId: req.params.jobId,
      status: result.status === "failure" ? "failure" : "success",
      metadata: { runId: result.id, status: result.status, summary: result.summary },
      error: result.error || undefined,
    });
    res.status(result.status === "failure" ? 500 : 200).json(result);
  } catch (err) {
    adminAuditService.record({ req, action: "maintenance.run", resourceType: "maintenance_job", resourceId: req.params.jobId, status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/admin/backups", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const backup = await backupService.create({
      label: String(req.body?.label || "admin"),
      actor: req.user?.email || "admin",
    });
    adminAuditService.record({
      req,
      action: "backup.create",
      resourceType: "backup",
      resourceId: backup.id,
      metadata: { label: backup.label, dbBytes: backup.dbBytes },
    });
    res.json(backup);
  } catch (err) {
    adminAuditService.record({ req, action: "backup.create", resourceType: "backup", status: "failure", error: err });
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/admin/backups/prune", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const keep = Math.max(1, Math.min(100, Number(req.body?.keep || 10)));
    const result = backupService.prune(keep);
    adminAuditService.record({
      req,
      action: "backup.prune",
      resourceType: "backup",
      resourceId: "local",
      metadata: result,
    });
    res.json(result);
  } catch (err) {
    adminAuditService.record({ req, action: "backup.prune", resourceType: "backup", status: "failure", error: err });
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete("/admin/backups/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const result = backupService.delete(req.params.id);
    adminAuditService.record({
      req,
      action: "backup.delete",
      resourceType: "backup",
      resourceId: req.params.id,
      metadata: result,
    });
    res.json(result);
  } catch (err) {
    adminAuditService.record({ req, action: "backup.delete", resourceType: "backup", resourceId: req.params.id, status: "failure", error: err });
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/admin/notifications", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const notification = notificationService.create(req.body);
    adminAuditService.record({
      req,
      action: "notification.create",
      resourceType: "notification",
      resourceId: notification.id,
      metadata: { userId: notification.userId, severity: notification.severity, kind: notification.kind },
    });
    res.json(notification);
  } catch (err) {
    adminAuditService.record({ req, action: "notification.create", resourceType: "notification", status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
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

router.get("/notifications", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(notificationService.list(req.user?.userId ?? 0, req.query as Record<string, unknown>));
});

router.get("/notifications/unread-count", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(notificationService.unreadCount(req.user?.userId ?? 0));
});

router.post("/notifications/read-all", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(notificationService.markAllRead(req.user?.userId ?? 0));
});

router.post("/notifications/:id/read", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid notification ID" });
    return;
  }
  res.json(notificationService.markRead(req.user?.userId ?? 0, id));
});

router.delete("/notifications/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid notification ID" });
    return;
  }
  res.json(notificationService.delete(req.user?.userId ?? 0, id));
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

router.get("/admin/audit-logs", requireAdmin, async (req, res) => {
  res.json(adminAuditService.list(req.query));
});

router.post("/admin/companies", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const company = companyService.createCompany(req.body);
    if (!company) throw new Error("Company creation returned empty result");
    adminAuditService.record({
      req,
      action: "company.create",
      resourceType: "company",
      resourceId: company.id,
      metadata: { name: company.name, companyType: company.companyType },
    });
    clearCache();
    res.json(company);
  } catch (err) {
    adminAuditService.record({ req, action: "company.create", resourceType: "company", status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.patch("/admin/companies/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const company = companyService.updateCompany(req.params.id, req.body);
    adminAuditService.record({
      req,
      action: "company.update",
      resourceType: "company",
      resourceId: req.params.id,
      metadata: { fields: Object.keys(req.body || {}), name: company?.name },
    });
    clearCache();
    res.json(company);
  } catch (err) {
    adminAuditService.record({ req, action: "company.update", resourceType: "company", resourceId: req.params.id, status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.delete("/admin/companies/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const result = companyService.deleteCompany(req.params.id);
    adminAuditService.record({ req, action: "company.delete", resourceType: "company", resourceId: req.params.id });
    clearCache();
    res.json(result);
  } catch (err) {
    adminAuditService.record({ req, action: "company.delete", resourceType: "company", resourceId: req.params.id, status: "failure", error: err });
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
    adminAuditService.record({
      req,
      action: `moderation.${action}`,
      resourceType: targetType,
      resourceId: targetId,
      metadata: { reason },
    });
    clearCache();
    res.json(result);
  } catch (err) {
    adminAuditService.record({ req, action: "moderation.action", resourceType: decodeURIComponent(req.params.targetType), resourceId: req.params.id, status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/admin/snapshots", requireAdmin, async (_req, res) => {
  res.json(snapshotService.list());
});

router.post("/admin/snapshots/refresh", requireAdmin, async (req: AuthenticatedRequest, res) => {
  const keys = Array.isArray(req.body?.keys)
    ? req.body.keys.map(String)
    : String(req.body?.key || "all").split(",").map((key) => key.trim()).filter(Boolean);
  try {
    const result = snapshotService.refresh(keys.length ? keys : ["all"]);
    adminAuditService.record({ req, action: "snapshot.refresh", resourceType: "snapshot", resourceId: keys.join(",") || "all", metadata: { count: result.length } });
    res.json(result);
  } catch (err) {
    adminAuditService.record({ req, action: "snapshot.refresh", resourceType: "snapshot", resourceId: keys.join(",") || "all", status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/admin/snapshots/clear", requireAdmin, async (req: AuthenticatedRequest, res) => {
  const key = typeof req.body?.key === "string" ? req.body.key.trim() : "";
  const prefix = typeof req.body?.prefix === "string" ? req.body.prefix.trim() : "";
  if (key) {
    const result = { mode: "key", key, ...snapshotService.invalidateSnapshot(key) };
    adminAuditService.record({ req, action: "snapshot.clear", resourceType: "snapshot", resourceId: key, metadata: result });
    res.json(result);
    return;
  }
  if (prefix) {
    const result = { mode: "prefix", prefix, ...snapshotService.invalidateSnapshotsByPrefix(prefix) };
    adminAuditService.record({ req, action: "snapshot.clear_prefix", resourceType: "snapshot", resourceId: prefix, metadata: result });
    res.json(result);
    return;
  }
  const result = { mode: "all", ...snapshotService.invalidateAllSnapshots() };
  adminAuditService.record({ req, action: "snapshot.clear_all", resourceType: "snapshot", resourceId: "all", metadata: result });
  res.json(result);
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

router.put("/admin/identity/aliases/:type", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const result = identityAdminService.upsertAlias(req.params.type, req.body);
    adminAuditService.record({
      req,
      action: "identity.upsert_alias",
      resourceType: `identity.${req.params.type}`,
      resourceId: req.body?.alias,
      metadata: { canonicalName: req.body?.canonicalName, source: req.body?.source },
    });
    clearCache();
    snapshotService.invalidateAllSnapshots();
    res.json(result);
  } catch (err) {
    adminAuditService.record({ req, action: "identity.upsert_alias", resourceType: `identity.${req.params.type}`, resourceId: req.body?.alias, status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.delete("/admin/identity/aliases/:type/:alias", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const result = identityAdminService.deleteAlias(req.params.type, decodeURIComponent(req.params.alias));
    adminAuditService.record({ req, action: "identity.delete_alias", resourceType: `identity.${req.params.type}`, resourceId: decodeURIComponent(req.params.alias) });
    clearCache();
    snapshotService.invalidateAllSnapshots();
    res.json(result);
  } catch (err) {
    adminAuditService.record({ req, action: "identity.delete_alias", resourceType: `identity.${req.params.type}`, resourceId: decodeURIComponent(req.params.alias), status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/admin/api-keys", requireAdmin, async (_req, res) => {
  res.json(statsService.getApiKeys());
});

router.put("/admin/api-keys/:provider", requireAdmin, async (req: AuthenticatedRequest, res) => {
  const provider = decodeURIComponent(req.params.provider);
  const { value } = req.body;
  const result = statsService.setApiKey(provider, value);
  adminAuditService.record({ req, action: "api_key.update", resourceType: "api_key", resourceId: provider, metadata: { configured: Boolean(value) } });
  res.json(result);
});

router.get("/pdf-inbox", requireAuth, async (_req, res) => {
  res.json(await statsService.getPdfInbox());
});

router.get("/methodology", requireAuth, async (_req, res) => {
  res.json(statsService.getMethodology());
});

export { router as apiRouter };
