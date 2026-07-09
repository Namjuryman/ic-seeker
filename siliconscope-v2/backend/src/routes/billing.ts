import { Router } from "express";
import { requireAdmin, requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { adminAuditService } from "../services/admin-audit.service.js";
import { billingService } from "../services/billing.service.js";
import { billingCheckoutBodySchema, billingPlanUpdateBodySchema, parseBody } from "./route-validation.js";

const router = Router();
const adminRouter = Router();

function privateCache(res: { setHeader: (name: string, value: string) => void }, seconds: number) {
  res.setHeader("cache-control", `private, max-age=${seconds}`);
}

router.get("/plans", requireAuth, async (_req, res) => {
  privateCache(res, 300);
  res.json(billingService.getPlans());
});

router.get("/status", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(billingService.getBillingStatus(req.user?.userId ?? 0));
});

router.get("/usage", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(billingService.getUsageSummary(req.user?.userId ?? 0));
});

router.post("/checkout", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = parseBody(billingCheckoutBodySchema, req.body);
    const result = billingService.createCheckoutSession(req.user?.userId ?? 0, body.planId);
    res.status(result.checkoutAvailable ? 501 : 400).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

adminRouter.get("/", requireAdmin, async (_req, res) => {
  res.json(billingService.getAdminBillingOverview());
});

adminRouter.get("/users", requireAdmin, async (req, res) => {
  res.json(billingService.listBillingUsers(req.query));
});

adminRouter.get("/users/:id", requireAdmin, async (req, res) => {
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

adminRouter.patch("/users/:id/plan", requireAdmin, async (req: AuthenticatedRequest, res) => {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  try {
    const body = parseBody(billingPlanUpdateBodySchema, req.body);
    const result = billingService.updateUserPlan({
      userId,
      planId: body.planId,
      reason: body.reason,
      actorUserId: req.user?.userId ?? 0,
    });
    adminAuditService.record({
      req,
      action: "billing.update_plan",
      resourceType: "user",
      resourceId: userId,
      metadata: { planId: body.planId, reason: body.reason },
    });
    res.json(result);
  } catch (err) {
    adminAuditService.record({ req, action: "billing.update_plan", resourceType: "user", resourceId: userId, status: "failure", error: err });
    res.status(400).json({ error: (err as Error).message });
  }
});

export { adminRouter as adminBillingRouter, router as billingRouter };
