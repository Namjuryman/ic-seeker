import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { billingService } from "../services/billing.service.js";
import { exportService, type ExportFormat } from "../services/export.service.js";

const router = Router();

function exportFormat(value: unknown): ExportFormat {
  const format = String(value || "markdown").toLowerCase();
  if (format === "json" || format === "markdown" || format === "csv") return format;
  throw new Error("导出格式必须是 json、markdown 或 csv。");
}

function sendExport(
  req: AuthenticatedRequest,
  res: { status: (code: number) => typeof res; json: (body: unknown) => void; setHeader: (name: string, value: string) => void; send: (body: string) => void },
  create: (format: ExportFormat) => ReturnType<typeof exportService.exportTopicReport>,
) {
  const userId = req.user?.userId ?? 0;
  const quota = billingService.checkQuota(userId, "exportsPerMonth", 1);
  if (!quota.allowed) {
    res.status(402).json({ error: quota.reason || "导出配额已用完。", quota });
    return;
  }

  const payload = create(exportFormat(req.query.format));
  billingService.recordUsageEvent({
    userId,
    metric: "exportsPerMonth",
    source: "export-center",
    resourceType: payload.kind,
    resourceId: payload.filename,
    metadata: { format: payload.format, source: payload.source },
  });

  res.setHeader("content-type", payload.contentType);
  res.setHeader("content-disposition", `attachment; filename="${payload.filename}"`);
  res.send(payload.content);
}

router.get("/topic-report", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    sendExport(req, res, (format) => exportService.exportTopicReport(req.query as Record<string, unknown>, format));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/:kind", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const kind = String(req.params.kind || "");
    if (!["company-compare", "institution-compare", "author-compare", "mentor-compare"].includes(kind)) {
      res.status(404).json({ error: "未知导出类型。" });
      return;
    }
    sendExport(req, res, (format) => exportService.exportCompare(kind as any, req.query as Record<string, unknown>, format));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export { router as exportsRouter };
