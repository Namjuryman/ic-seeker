import { Router } from "express";
import { requireAuth, requireAdmin, type AuthenticatedRequest } from "../middleware/auth.js";
import { statsService } from "../services/stats.service.js";
import { searchService } from "../services/search.service.js";
import { paperService } from "../services/paper.service.js";
import { profileService } from "../services/profile.service.js";
import { authorProfileService } from "../services/author-profile.service.js";
import { topicService } from "../services/topic.service.js";
import { topicTaxonomyService } from "../services/topic-taxonomy.service.js";
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
import { backupService } from "../services/backup.service.js";
import { maintenanceService, type MaintenanceJobId } from "../services/maintenance.service.js";
import { observabilityService } from "../services/observability.service.js";
import { schedulerService, type SchedulerJobId } from "../services/scheduler.service.js";
import { jobOperationsService } from "../services/job-operations.service.js";
import { ingestionJobService } from "../services/ingestion-job.service.js";
import { ingestionRunnerService } from "../services/ingestion-runner.service.js";
import { siteSettingsService } from "../services/site-settings.service.js";
import { accessRequestService } from "../services/access-request.service.js";
import { learningContentService } from "../services/learning-content.service.js";
import { learningProgressService } from "../services/learning-progress.service.js";
import { searchIndexService, type SearchIndexTarget } from "../services/search-index.service.js";
import { paperAiEnrichmentService } from "../services/paper-ai-enrichment.service.js";
import { paperIngestionControlService } from "../services/paper-ingestion-control.service.js";
import { paperDedupeService } from "../services/paper-dedupe.service.js";
import { dailyCircuitService } from "../services/daily-circuit.service.js";
import { readingWorkflowService } from "../services/reading-workflow.service.js";
import { localPdfService } from "../services/local-pdf.service.js";
import { entityIntelligenceService } from "../services/entity-intelligence.service.js";
import { featureCompletionService } from "../services/feature-completion.service.js";
import {
  aiEnrichmentRunBodySchema,
  accessRequestUpdateBodySchema,
  backupCreateBodySchema,
  backupPruneBodySchema,
  contentQualityStatusBodySchema,
  contentQualitySyncBodySchema,
  ingestionJobCreateBodySchema,
  ingestionJobUpdateBodySchema,
  learningContentUpdateBodySchema,
  moderationActionBodySchema,
  notificationCreateBodySchema,
  paperDedupeScanBodySchema,
  paperDedupeStatusBodySchema,
  parseBody,
  searchIndexRebuildBodySchema,
  siteSettingUpdateBodySchema,
  snapshotClearBodySchema,
  snapshotRefreshBodySchema,
} from "./route-validation.js";
import { exportsRouter } from "./exports.js";
import { adminBillingRouter, billingRouter } from "./billing.js";

const router = Router();

function privateCache(res: { setHeader: (name: string, value: string) => void }, seconds: number) {
  res.setHeader("cache-control", `private, max-age=${seconds}`);
}

router.get("/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId ?? 0;
  privateCache(res, 30);
  res.json(memoCache(`stats:${userId}`, 30_000, () => statsService.getStats(userId)));
});

router.get("/platform", requireAuth, async (_req, res) => {
  privateCache(res, 300);
  res.json(platformService.getOverview());
});

router.get("/topic-taxonomy", requireAuth, async (_req, res) => {
  privateCache(res, 300);
  res.json(topicTaxonomyService.list());
});

router.get("/admin/topic-taxonomy", requireAdmin, async (_req, res) => {
  res.json(topicTaxonomyService.adminOverview());
});

router.post("/admin/topic-taxonomy/sync", requireAdmin, async (req: AuthenticatedRequest, res) => {
  const result = topicTaxonomyService.syncSeedToDatabase();
  adminAuditService.record({
    req,
    action: "topic-taxonomy.sync",
    resourceType: "topic_taxonomy",
    metadata: { nodes: result.database.nodes, aliases: result.database.aliases, keywordRules: result.database.keywordRules },
  });
  res.json(result);
});

router.post("/admin/topic-taxonomy/paper-edges/refresh", requireAdmin, async (req: AuthenticatedRequest, res) => {
  const body = req.body || {};
  const result = topicTaxonomyService.refreshPaperTopicEdges({
    limit: body.limit,
    minConfidence: body.minConfidence,
    reset: body.reset !== false,
  });
  adminAuditService.record({
    req,
    action: "topic-taxonomy.paper-edges.refresh",
    resourceType: "paper_topic_edges",
    metadata: {
      scannedPapers: result.scannedPapers,
      matchedPapers: result.matchedPapers,
      writtenEdges: result.writtenEdges,
      minConfidence: result.minConfidence,
    },
  });
  res.json(result);
});

router.get("/site-settings", requireAuth, async (_req, res) => {
  privateCache(res, 60);
  res.json(siteSettingsService.publicSettings());
});

router.post("/access-requests", async (req, res) => {
  try {
    const result = accessRequestService.create({
      email: req.body?.email,
      name: req.body?.name,
      affiliation: req.body?.affiliation,
      intendedUse: req.body?.intendedUse,
      planInterest: req.body?.planInterest,
      source: "public-form",
    });
    res.status(result.duplicate ? 200 : 201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.use("/billing", billingRouter);
router.use("/exports", exportsRouter);

router.get("/admin/overview", requireAdmin, async (req: AuthenticatedRequest, res) => {
  res.json(await adminService.getOverview(req.user?.userId ?? 0));
});

router.use("/admin/billing", adminBillingRouter);

router.get("/admin/runtime", requireAdmin, async (_req, res) => {
  const runtime = runtimeHealthService.getHealth();
  res.status(runtime.status === "error" ? 503 : 200).json(runtime);
});

router.get("/admin/search-index", requireAdmin, async (_req, res) => {
  res.json(await searchIndexService.status());
});

router.post("/admin/search-index/rebuild", requireAdmin, async (req: AuthenticatedRequest, res) => {
  let target: SearchIndexTarget | "all" = "all";
  try {
    target = parseBody(searchIndexRebuildBodySchema, req.body).target;
  } catch (err) {
    adminAuditService.record({
      req,
      action: "search_index.rebuild",
      resourceType: "search_index",
      resourceId: target,
      status: "failure",
      error: err,
    });
    res.status(400).json({ error: (err as Error).message });
    return;
  }
  try {
    const result = await searchIndexService.rebuild(target as SearchIndexTarget);
    adminAuditService.record({
      req,
      action: "search_index.rebuild",
      resourceType: "search_index",
      resourceId: target,
      metadata: result,
    });
    res.json(result);
  } catch (err) {
    adminAuditService.record({
      req,
      action: "search_index.rebuild",
      resourceType: "search_index",
      resourceId: target,
      status: "failure",
      error: err,
    });
    res.status(400).json({ error: (err as Error).message });
  }
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

router.get("/admin/scheduler", requireAdmin, async (_req, res) => {
  res.json(schedulerService.status());
});

router.get("/admin/job-operations", requireAdmin, async (_req, res) => {
  res.json(jobOperationsService.overview());
});

router.get("/admin/site-settings", requireAdmin, async (_req, res) => {
  res.json({ rows: siteSettingsService.list(), summary: siteSettingsService.summary() });
});

router.patch("/admin/site-settings/:key", requireAdmin, async (req: AuthenticatedRequest, res) => {
  const key = String(req.params.key || "");
  try {
    const body = parseBody(siteSettingUpdateBodySchema, req.body);
    const row = siteSettingsService.update(key, body.value, req.user?.userId ?? 0);
    adminAuditService.record({
      req,
      action: "site_settings.update",
      resourceType: "site_setting",
      resourceId: key,
      metadata: { value: row?.value },
    });
    res.json(row);
  } catch (err) {
    adminAuditService.record({ req, action: "site_settings.update", resourceType: "site_setting", resourceId: key, status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/admin/access-requests", requireAdmin, async (req, res) => {
  res.json(accessRequestService.list(req.query as Record<string, unknown>));
});

router.patch("/admin/access-requests/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  try {
    const body = parseBody(accessRequestUpdateBodySchema, req.body);
    const row = accessRequestService.updateStatus(id, {
      status: body.status,
      notes: body.notes,
      actorUserId: req.user?.userId ?? null,
    });
    adminAuditService.record({
      req,
      action: "access_request.update_status",
      resourceType: "access_request",
      resourceId: id,
      metadata: { status: row.status, email: row.email },
    });
    res.json(row);
  } catch (err) {
    adminAuditService.record({
      req,
      action: "access_request.update_status",
      resourceType: "access_request",
      resourceId: Number.isFinite(id) ? id : req.params.id,
      status: "failure",
      error: err,
    });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/admin/ingestion/jobs", requireAdmin, async (req, res) => {
  res.json(ingestionJobService.list(req.query as Record<string, string>));
});

router.post("/admin/ingestion/jobs", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const body = parseBody(ingestionJobCreateBodySchema, req.body);
    const job = ingestionJobService.create({
      provider: body.provider,
      mode: body.mode,
      scope: body.scope,
      notes: body.notes,
      createdByUserId: req.user?.userId ?? 0,
    });
    adminAuditService.record({
      req,
      action: "ingestion.create",
      resourceType: "ingestion_job",
      resourceId: job.id,
      metadata: { provider: job.provider, mode: job.mode, scope: job.scope },
    });
    res.status(201).json(job);
  } catch (err) {
    adminAuditService.record({ req, action: "ingestion.create", resourceType: "ingestion_job", status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.patch("/admin/ingestion/jobs/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid ingestion job ID" });
    return;
  }
  try {
    const body = parseBody(ingestionJobUpdateBodySchema, req.body);
    const job = ingestionJobService.updateStatus(id, {
      status: body.status,
      counts: body.counts,
      error: body.error,
      notes: body.notes,
      actorUserId: req.user?.userId ?? 0,
    });
    adminAuditService.record({
      req,
      action: "ingestion.update",
      resourceType: "ingestion_job",
      resourceId: id,
      metadata: { status: job.status, counts: job.counts },
    });
    res.json(job);
  } catch (err) {
    adminAuditService.record({ req, action: "ingestion.update", resourceType: "ingestion_job", resourceId: id, status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/admin/ingestion/jobs/:id/start", requireAdmin, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid ingestion job ID" });
    return;
  }
  try {
    const job = ingestionRunnerService.start(id, req.user?.userId ?? 0);
    adminAuditService.record({
      req,
      action: "ingestion.start",
      resourceType: "ingestion_job",
      resourceId: id,
      metadata: { status: job.status, provider: job.provider },
    });
    res.json(job);
  } catch (err) {
    adminAuditService.record({ req, action: "ingestion.start", resourceType: "ingestion_job", resourceId: id, status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/admin/ingestion/jobs/:id/cancel", requireAdmin, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid ingestion job ID" });
    return;
  }
  try {
    const job = ingestionJobService.cancel(id, req.user?.userId ?? 0);
    adminAuditService.record({
      req,
      action: "ingestion.cancel",
      resourceType: "ingestion_job",
      resourceId: id,
      metadata: { status: job.status, provider: job.provider },
    });
    res.json(job);
  } catch (err) {
    adminAuditService.record({ req, action: "ingestion.cancel", resourceType: "ingestion_job", resourceId: id, status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/admin/ingestion/jobs/:id/retry", requireAdmin, async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid ingestion job ID" });
    return;
  }
  try {
    const job = ingestionJobService.retry(id, req.user?.userId ?? 0);
    adminAuditService.record({
      req,
      action: "ingestion.retry",
      resourceType: "ingestion_job",
      resourceId: id,
      metadata: { retryJobId: job.id, provider: job.provider },
    });
    res.status(201).json(job);
  } catch (err) {
    adminAuditService.record({ req, action: "ingestion.retry", resourceType: "ingestion_job", resourceId: id, status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/admin/ingestion/jobs/:id/events", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid ingestion job ID" });
    return;
  }
  res.json(ingestionJobService.events(id, req.query as Record<string, string>));
});

router.patch("/admin/scheduler/:jobId", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const job = schedulerService.update(req.params.jobId as SchedulerJobId, req.body || {});
    adminAuditService.record({
      req,
      action: "scheduler.update",
      resourceType: "scheduler_job",
      resourceId: req.params.jobId,
      metadata: { enabled: job.enabled, intervalMinutes: job.intervalMinutes },
    });
    res.json(job);
  } catch (err) {
    adminAuditService.record({ req, action: "scheduler.update", resourceType: "scheduler_job", resourceId: req.params.jobId, status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/admin/scheduler/:jobId/run", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const run = await schedulerService.runNow(req.params.jobId as SchedulerJobId, req.user?.email || "admin");
    adminAuditService.record({
      req,
      action: "scheduler.run_now",
      resourceType: "scheduler_job",
      resourceId: req.params.jobId,
      status: run?.status === "failure" ? "failure" : "success",
      metadata: { runId: run?.id, status: run?.status },
      error: run?.error || undefined,
    });
    res.status(run?.status === "failure" ? 500 : 200).json(run);
  } catch (err) {
    adminAuditService.record({ req, action: "scheduler.run_now", resourceType: "scheduler_job", resourceId: req.params.jobId, status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
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
    const body = parseBody(backupCreateBodySchema, req.body);
    const backup = await backupService.create({
      label: body.label,
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
    const { keep } = parseBody(backupPruneBodySchema, req.body);
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
    const body = parseBody(notificationCreateBodySchema, req.body);
    const notification = notificationService.create(body);
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

router.get("/search/suggestions", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(searchService.suggestions(req.query as Record<string, string>));
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

router.post("/papers/:id/ai-summary", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid paper ID" });
    return;
  }
  try {
    const summary = await paperAiEnrichmentService.getOrCreatePaperSummary(id, {
      provider: req.body?.provider,
      model: req.body?.model,
      refresh: Boolean(req.body?.refresh),
    });
    if (!summary) {
      res.status(404).json({ error: "Paper not found" });
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
  privateCache(res, 300);
  res.json(snapshotService.getProfessors(req.query as Record<string, string>));
});

router.get("/authors/:name", requireAuth, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  privateCache(res, 300);
  res.json(snapshotService.getAuthorProfile(name));
});

router.get("/author-profiles/:id/photo", requireAuth, async (req, res) => {
  try {
    const photo = await authorProfileService.readLocalPhoto(decodeURIComponent(req.params.id));
    if (!photo) {
      res.status(404).json({ error: "Author photo not found" });
      return;
    }
    res.setHeader("content-type", photo.contentType);
    res.setHeader("cache-control", "private, max-age=86400");
    res.end(photo.bytes);
  } catch {
    res.status(404).json({ error: "Author photo not found" });
  }
});

router.get("/institutions", requireAuth, async (req, res) => {
  privateCache(res, 300);
  res.json(snapshotService.getInstitutions(req.query as Record<string, string>));
});

router.get("/institutions/:name", requireAuth, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  privateCache(res, 300);
  res.json(snapshotService.getInstitutionProfile(name));
});

router.get("/topics", requireAuth, async (_req, res) => {
  privateCache(res, 300);
  res.json(snapshotService.getTopics());
});

router.get("/topics/detail", requireAuth, async (req, res) => {
  const field = req.query.field as string;
  if (!field) {
    res.status(400).json({ error: "field is required" });
    return;
  }
  privateCache(res, 300);
  res.json(snapshotService.getTopicDetail(field));
});

router.get("/geo", requireAuth, async (req, res) => {
  privateCache(res, 300);
  res.json(snapshotService.getGeo(req.query as Record<string, string>));
});

router.get("/venue-matrix", requireAuth, async (_req, res) => {
  privateCache(res, 300);
  res.json(snapshotService.getVenueMatrix());
});

router.get("/learning", requireAuth, async (_req, res) => {
  privateCache(res, 300);
  res.json(learningService.getDashboard());
});

router.get("/learning/route-families", requireAuth, async (_req, res) => {
  privateCache(res, 300);
  res.json(learningService.listRouteFamilies());
});

router.get("/learning/foundations", requireAuth, async (_req, res) => {
  privateCache(res, 300);
  res.json(learningService.listFoundations());
});

router.get("/learning/roadmaps", requireAuth, async (_req, res) => {
  privateCache(res, 300);
  res.json(learningService.listRoadmaps());
});

router.get("/learning/roadmaps/:slug", requireAuth, async (req, res) => {
  const roadmap = learningService.getRoadmap(req.params.slug);
  if (!roadmap) {
    res.status(404).json({ error: "Roadmap not found", requested: req.params.slug });
    return;
  }
  privateCache(res, 300);
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
  privateCache(res, 300);
  res.json(learningService.listLessons(req.query as Record<string, string>));
});

router.get("/learning/today", requireAuth, async (_req, res) => {
  privateCache(res, 300);
  res.json(learningService.getTodayLesson());
});

router.get("/daily-circuit", requireAuth, async (req, res) => {
  privateCache(res, 120);
  res.json(dailyCircuitService.list({ roadmapSlug: req.query.roadmapSlug as string | undefined, limit: Number(req.query.limit || 80) }));
});

router.get("/daily-circuit/today", requireAuth, async (_req, res) => {
  res.json(dailyCircuitService.today());
});

router.get("/daily-circuit/:id", requireAuth, async (req, res) => {
  const item = dailyCircuitService.get(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Daily circuit item not found" });
    return;
  }
  res.json(item);
});

router.get("/learning/progress", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(learningProgressService.list(req.user?.userId ?? 0));
});

router.get("/learning/progress/:targetType/:targetId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(learningProgressService.get(req.user?.userId ?? 0, req.params.targetType, decodeURIComponent(req.params.targetId)));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/learning/progress/:targetType/:targetId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(learningProgressService.update(
      req.user?.userId ?? 0,
      req.params.targetType,
      decodeURIComponent(req.params.targetId),
      String(req.body?.status || "in_progress"),
    ));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/learning/progress/:targetType/:targetId/queue-related", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const result = learningProgressService.addRelatedPapersToQueue(
      req.user?.userId ?? 0,
      req.params.targetType,
      decodeURIComponent(req.params.targetId),
      Number(req.body?.limit || 5),
    );
    res.status(result.ok ? 200 : 207).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/learning/lessons/:lessonId", requireAuth, async (req, res) => {
  const lesson = learningService.getLesson(req.params.lessonId);
  if (!lesson) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }
  privateCache(res, 300);
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
  privateCache(res, 300);
  res.json(snapshotService.getMentorInstitutions(req.query as Record<string, string>));
});

router.get("/mentor/institutions/:name", requireAuth, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  privateCache(res, 300);
  res.json(snapshotService.getMentorInstitution(name, req.query as Record<string, string>));
});

router.get("/mentor/authors/:name", requireAuth, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  privateCache(res, 120);
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
    privateCache(res, 60);
    const result = companyService.listCompanies(req.query as Record<string, string>);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/companies/types", requireAuth, async (_req, res) => {
  privateCache(res, 300);
  res.json(companyService.getCompanyTypes());
});

router.get("/companies/domains", requireAuth, async (_req, res) => {
  privateCache(res, 300);
  res.json(companyService.getDomains());
});

router.get("/companies/:id", requireAuth, async (req, res) => {
  const company = companyService.getCompany(req.params.id);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  privateCache(res, 120);
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

router.get("/companies/:id/intelligence", requireAuth, async (req, res) => {
  const result = entityIntelligenceService.company(req.params.id);
  if (!result) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(result);
});

router.get("/institutions/:name/intelligence", requireAuth, async (req, res) => {
  res.json(entityIntelligenceService.institution(decodeURIComponent(req.params.name)));
});

router.get("/mentors/:name/intelligence", requireAuth, async (req, res) => {
  res.json(entityIntelligenceService.mentor(decodeURIComponent(req.params.name), req.query as Record<string, string>));
});

router.get("/geo/cities", requireAuth, async (req, res) => {
  res.json(entityIntelligenceService.cityMap({
    field: req.query.field as string | undefined,
    yearFrom: req.query.yearFrom ? Number(req.query.yearFrom) : undefined,
    yearTo: req.query.yearTo ? Number(req.query.yearTo) : undefined,
  }));
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
  res.json(readingQueueService.getPaperStatus(req.user?.userId ?? 0, paperId));
});

router.post("/reading-queue/:paperId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const paperId = Number(req.params.paperId);
  const body = req.body as Record<string, unknown>;
  const payload = body?.readingStatus || body?.readingState || body?.status
    ? body
    : null;
  if (!Number.isFinite(paperId) || !payload) {
    res.status(400).json({ error: 'paperId and reading status payload are required' });
    return;
  }
  const result = readingQueueService.updateReadingStatus(req.user?.userId ?? 0, paperId, payload as any);
  if (result.error) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

router.get("/reading-workflow/due", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(readingWorkflowService.reviewDue(req.user?.userId ?? 0, { limit: Number(req.query.limit || 30) }));
});

router.get("/reading-workflow/export", requireAuth, async (req: AuthenticatedRequest, res) => {
  const result = readingWorkflowService.exportLiteratureMaterial(req.user?.userId ?? 0, {
    format: req.query.format === "json" ? "json" : "markdown",
    useCase: req.query.useCase as string | undefined,
  });
  res.setHeader("content-type", result.format === "json" ? "application/json" : "text/markdown; charset=utf-8");
  res.send(result.content);
});

router.get("/reading-workflow/:paperId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const paperId = Number(req.params.paperId);
  if (!Number.isFinite(paperId)) {
    res.status(400).json({ error: "Invalid paperId" });
    return;
  }
  res.json(readingWorkflowService.get(req.user?.userId ?? 0, paperId));
});

router.put("/reading-workflow/:paperId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const paperId = Number(req.params.paperId);
  if (!Number.isFinite(paperId)) {
    res.status(400).json({ error: "Invalid paperId" });
    return;
  }
  try {
    res.json(readingWorkflowService.update(req.user?.userId ?? 0, paperId, req.body || {}));
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

router.get("/admin/content-quality/findings", requireAdmin, async (req, res) => {
  res.json(dataQualityService.listFindings({
    status: req.query.status as string,
    type: req.query.type as string,
    severity: req.query.severity as string,
    limit: Number(req.query.limit || 50),
    offset: Number(req.query.offset || 0),
  }));
});

router.post("/admin/content-quality/sync", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const body = parseBody(contentQualitySyncBodySchema, req.body);
    const result = dataQualityService.syncFindings({
      scanLimit: body.scanLimit ?? 12000,
      sampleLimit: body.sampleLimit ?? 50,
    });
    adminAuditService.record({
      req,
      action: "content_quality.sync",
      resourceType: "content_quality_findings",
      metadata: { scanLimit: body.scanLimit, sampleLimit: body.sampleLimit, total: result.total },
    });
    clearCache("data-quality");
    res.json(result);
  } catch (err) {
    adminAuditService.record({ req, action: "content_quality.sync", resourceType: "content_quality_findings", status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.patch("/admin/content-quality/findings/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const body = parseBody(contentQualityStatusBodySchema, req.body);
    const result = dataQualityService.updateFinding(id, { status: body.status });
    adminAuditService.record({
      req,
      action: `content_quality.${body.status}`,
      resourceType: "content_quality_finding",
      resourceId: id,
    });
    clearCache("data-quality");
    res.json(result);
  } catch (err) {
    adminAuditService.record({ req, action: "content_quality.update", resourceType: "content_quality_finding", resourceId: req.params.id, status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
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
    const { action, reason } = parseBody(moderationActionBodySchema, req.body);
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

router.get("/admin/completion-report", requireAdmin, async (_req, res) => {
  res.json(featureCompletionService.report());
});

router.get("/admin/paper-ingestion/plan", requireAdmin, async (req, res) => {
  res.json(paperIngestionControlService.plan({
    sources: typeof req.query.sources === "string" ? req.query.sources.split(",") : undefined,
    queries: typeof req.query.queries === "string" ? req.query.queries.split(",") : undefined,
    venues: typeof req.query.venues === "string" ? req.query.venues.split(",") : undefined,
    yearFrom: req.query.yearFrom ? Number(req.query.yearFrom) : undefined,
    yearTo: req.query.yearTo ? Number(req.query.yearTo) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  }));
});

router.get("/admin/paper-ingestion/runs", requireAdmin, async (req, res) => {
  res.json(paperIngestionControlService.listRuns({ status: req.query.status as string | undefined, limit: Number(req.query.limit || 30), offset: Number(req.query.offset || 0) }));
});

router.post("/admin/paper-ingestion/run", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await paperIngestionControlService.run(req.body || {});
    adminAuditService.record({ req, action: "paper_ingestion.run", resourceType: "paper_ingestion_run", resourceId: result.id, metadata: result });
    res.json(result);
  } catch (err) {
    adminAuditService.record({ req, action: "paper_ingestion.run", resourceType: "paper_ingestion_run", status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/admin/paper-ingestion/source-attempts", requireAdmin, async (req, res) => {
  res.json(paperIngestionControlService.sourceAttempts({ runId: req.query.runId as string | undefined, limit: Number(req.query.limit || 100) }));
});

router.get("/admin/paper-dedupe", requireAdmin, async (req, res) => {
  res.json(paperDedupeService.list({ status: req.query.status as string | undefined, limit: Number(req.query.limit || 50), offset: Number(req.query.offset || 0) }));
});

router.post("/admin/paper-dedupe/scan", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const body = parseBody(paperDedupeScanBodySchema, req.body);
    const result = paperDedupeService.scan({ limit: body.limit ?? 100, persist: body.persist !== false });
    adminAuditService.record({ req, action: "paper_dedupe.scan", resourceType: "paper_dedupe_candidate", metadata: { total: result.total, persisted: result.persisted } });
    res.json(result);
  } catch (err) {
    adminAuditService.record({ req, action: "paper_dedupe.scan", resourceType: "paper_dedupe_candidate", status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.patch("/admin/paper-dedupe/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const body = parseBody(paperDedupeStatusBodySchema, req.body);
    const result = paperDedupeService.updateStatus(req.params.id, body.status);
    adminAuditService.record({ req, action: "paper_dedupe.update", resourceType: "paper_dedupe_candidate", resourceId: req.params.id, metadata: { status: result.status } });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/admin/local-pdfs", requireAdmin, async (req, res) => {
  res.json(localPdfService.list({ status: req.query.status as string | undefined, limit: Number(req.query.limit || 50), offset: Number(req.query.offset || 0) }));
});

router.patch("/admin/local-pdfs/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const result = localPdfService.update(req.params.id, req.body || {});
    adminAuditService.record({ req, action: "local_pdf.update", resourceType: "local_pdf", resourceId: req.params.id, metadata: { matchStatus: result.matchStatus, paperId: result.paperId } });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/admin/daily-circuit/sync", requireAdmin, async (req: AuthenticatedRequest, res) => {
  const result = dailyCircuitService.syncSeed();
  adminAuditService.record({ req, action: "daily_circuit.sync_seed", resourceType: "daily_circuit", metadata: result });
  res.json(result);
});

router.get("/admin/snapshots", requireAdmin, async (_req, res) => {
  res.json(snapshotService.list());
});

router.get("/admin/ai-enrichment/overview", requireAdmin, async (_req, res) => {
  res.json(paperAiEnrichmentService.overview());
});

router.get("/admin/ai-enrichment/annotations", requireAdmin, async (req, res) => {
  res.json(paperAiEnrichmentService.listAnnotations({
    limit: Number(req.query.limit || 50),
    needsReview: req.query.needsReview === "1" || req.query.needsReview === "true",
  }));
});

router.post("/admin/ai-enrichment/run", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const body = parseBody(aiEnrichmentRunBodySchema, req.body);
    const result = await paperAiEnrichmentService.runBatch({
      mode: body.mode,
      limit: body.limit,
      provider: body.provider,
      model: body.model,
      dryRun: Boolean(body.dryRun),
      writeTopicEdges: body.writeTopicEdges !== false,
      minTopicConfidence: body.minTopicConfidence,
    });
    adminAuditService.record({
      req,
      action: "ai_enrichment.run",
      resourceType: "paper_ai_annotations",
      metadata: {
        mode: result.mode,
        queued: result.queued,
        processed: result.processed,
        failed: result.failed,
        dryRun: result.dryRun,
        topicEdgesWritten: result.topicEdgesWritten,
      },
    });
    res.json(result);
  } catch (err) {
    adminAuditService.record({ req, action: "ai_enrichment.run", resourceType: "paper_ai_annotations", status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/admin/learning-content", requireAdmin, async (_req, res) => {
  res.json(learningContentService.adminOverview());
});

router.get("/admin/learning-content/:kind/:id", requireAdmin, async (req, res) => {
  try {
    const item = learningContentService.getItem(req.params.kind, decodeURIComponent(req.params.id));
    if (!item) {
      res.status(404).json({ error: "Learning content item not found" });
      return;
    }
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.patch("/admin/learning-content/:kind/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
  const kind = req.params.kind;
  const itemId = decodeURIComponent(req.params.id);
  try {
    const body = parseBody(learningContentUpdateBodySchema, req.body);
    const item = learningContentService.updateItem(kind, itemId, {
      status: body.status,
      title: body.title,
      payloadJson: body.payloadJson,
      actorUserId: req.user?.userId ?? null,
    });
    adminAuditService.record({
      req,
      action: "learning_content.update",
      resourceType: "learning_content",
      resourceId: `${kind}:${itemId}`,
      metadata: { status: item.status, title: item.title, bytes: item.bytes },
    });
    res.json(item);
  } catch (err) {
    adminAuditService.record({
      req,
      action: "learning_content.update",
      resourceType: "learning_content",
      resourceId: `${kind}:${itemId}`,
      status: "failure",
      error: err,
    });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/admin/learning-content/sync-seed", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const result = learningContentService.syncSeedToDatabase(req.user?.userId ?? null);
    adminAuditService.record({
      req,
      action: "learning_content.sync_seed",
      resourceType: "learning_content",
      resourceId: learningContentService.sourceVersion,
      metadata: result,
    });
    res.json(result);
  } catch (err) {
    adminAuditService.record({
      req,
      action: "learning_content.sync_seed",
      resourceType: "learning_content",
      resourceId: learningContentService.sourceVersion,
      status: "failure",
      error: err,
    });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/admin/snapshots/refresh", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const body = parseBody(snapshotRefreshBodySchema, req.body);
    const keys = body.keys ?? String(body.key || "all").split(",").map((key) => key.trim()).filter(Boolean);
    const result = snapshotService.refresh(keys.length ? keys : ["all"]);
    adminAuditService.record({ req, action: "snapshot.refresh", resourceType: "snapshot", resourceId: keys.join(",") || "all", metadata: { count: result.length } });
    res.json(result);
  } catch (err) {
    adminAuditService.record({ req, action: "snapshot.refresh", resourceType: "snapshot", status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/admin/snapshots/clear", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const body = parseBody(snapshotClearBodySchema, req.body);
    const key = body.key || "";
    const prefix = body.prefix || "";
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
  } catch (err) {
    adminAuditService.record({ req, action: "snapshot.clear", resourceType: "snapshot", status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
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

router.get("/admin/identity/candidates", requireAdmin, async (req, res) => {
  try {
    res.json(identityAdminService.listCandidates(req.query.type, {
      status: req.query.status,
      limit: req.query.limit,
      offset: req.query.offset,
    }));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.patch("/admin/identity/candidates/:type/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const result = identityAdminService.updateCandidateStatus(req.params.type, req.params.id, req.body?.status);
    adminAuditService.record({ req, action: "identity.candidate_status", resourceType: `identity_candidate.${req.params.type}`, resourceId: req.params.id, metadata: result });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/admin/identity/candidates/:type/:id/:action", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const result = identityAdminService.reviewCandidate(req.params.type, req.params.id, req.params.action);
    adminAuditService.record({
      req,
      action: `identity.candidate_${String(req.params.action || "").replace(/-/g, "_")}`,
      resourceType: `identity_candidate.${req.params.type}`,
      resourceId: req.params.id,
      metadata: result,
    });
    clearCache();
    snapshotService.invalidateAllSnapshots();
    res.json(result);
  } catch (err) {
    adminAuditService.record({
      req,
      action: `identity.candidate_${String(req.params.action || "").replace(/-/g, "_")}`,
      resourceType: `identity_candidate.${req.params.type}`,
      resourceId: req.params.id,
      status: "failure",
      error: err,
    });
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
