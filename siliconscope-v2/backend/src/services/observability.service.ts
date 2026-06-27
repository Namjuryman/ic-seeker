import type { NextFunction, Request, Response } from "express";

export type ObservedRoute = {
  key: string;
  method: string;
  path: string;
  count: number;
  errorCount: number;
  rateLimitedCount: number;
  totalDurationMs: number;
  averageDurationMs: number;
  maxDurationMs: number;
  lastStatus: number;
  lastSeenAt: string;
};

export type ObservabilitySnapshot = {
  startedAt: string;
  generatedAt: string;
  uptimeSeconds: number;
  totalRequests: number;
  totalErrors: number;
  totalRateLimited: number;
  errorRate: number;
  requestsLastMinute: number;
  requestsLastFiveMinutes: number;
  averageDurationMs: number;
  maxDurationMs: number;
  statusBuckets: Record<string, number>;
  slowRoutes: ObservedRoute[];
  hotRoutes: ObservedRoute[];
  recentErrors: Array<{
    requestId: string | null;
    method: string;
    path: string;
    status: number;
    durationMs: number;
    at: string;
  }>;
};

type RequestEvent = {
  at: number;
  durationMs: number;
  status: number;
};

type RouteStats = Omit<ObservedRoute, "averageDurationMs">;

const startedAtMs = Date.now();
const startedAt = new Date(startedAtMs).toISOString();
const routes = new Map<string, RouteStats>();
const recentEvents: RequestEvent[] = [];
const recentErrors: ObservabilitySnapshot["recentErrors"] = [];
const statusBuckets: Record<string, number> = {};

let totalRequests = 0;
let totalErrors = 0;
let totalRateLimited = 0;
let totalDurationMs = 0;
let maxDurationMs = 0;

function bucketFor(status: number) {
  if (status < 200) return "1xx";
  if (status < 300) return "2xx";
  if (status < 400) return "3xx";
  if (status < 500) return "4xx";
  return "5xx";
}

function normalizeRoute(req: Request) {
  const routePath = typeof req.route?.path === "string" ? req.route.path : "";
  const baseUrl = req.baseUrl || "";
  if (routePath) return `${baseUrl}${routePath}` || "/";

  return (req.originalUrl || req.url || "/")
    .split("?")[0]
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    .replace(/\/[0-9a-f]{16,}(?=\/|$)/gi, "/:id");
}

function toObserved(row: RouteStats): ObservedRoute {
  return {
    ...row,
    averageDurationMs: row.count ? Math.round(row.totalDurationMs / row.count) : 0,
  };
}

function pruneEvents(now = Date.now()) {
  const cutoff = now - 15 * 60 * 1000;
  while (recentEvents.length && recentEvents[0].at < cutoff) {
    recentEvents.shift();
  }
}

export const observabilityService = {
  middleware(req: Request, res: Response, next: NextFunction) {
    const started = process.hrtime.bigint();

    res.on("finish", () => {
      const durationMs = Math.max(0, Number(process.hrtime.bigint() - started) / 1_000_000);
      const status = res.statusCode || 0;
      const method = req.method.toUpperCase();
      const path = normalizeRoute(req);
      const key = `${method} ${path}`;
      const now = Date.now();
      const at = new Date(now).toISOString();
      const isError = status >= 500;
      const isRateLimited = status === 429;

      totalRequests += 1;
      totalDurationMs += durationMs;
      maxDurationMs = Math.max(maxDurationMs, durationMs);
      if (isError) totalErrors += 1;
      if (isRateLimited) totalRateLimited += 1;

      const bucket = bucketFor(status);
      statusBuckets[bucket] = (statusBuckets[bucket] || 0) + 1;

      const row = routes.get(key) || {
        key,
        method,
        path,
        count: 0,
        errorCount: 0,
        rateLimitedCount: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
        lastStatus: status,
        lastSeenAt: at,
      };

      row.count += 1;
      row.totalDurationMs += durationMs;
      row.maxDurationMs = Math.max(row.maxDurationMs, durationMs);
      row.lastStatus = status;
      row.lastSeenAt = at;
      if (isError) row.errorCount += 1;
      if (isRateLimited) row.rateLimitedCount += 1;
      routes.set(key, row);

      recentEvents.push({ at: now, durationMs, status });
      pruneEvents(now);

      if (status >= 500 || status === 429) {
        recentErrors.unshift({
          requestId: String(res.locals.requestId || "") || null,
          method,
          path,
          status,
          durationMs: Math.round(durationMs),
          at,
        });
        recentErrors.splice(50);
      }
    });

    next();
  },

  snapshot(): ObservabilitySnapshot {
    const now = Date.now();
    pruneEvents(now);
    const minuteAgo = now - 60 * 1000;
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const observedRoutes = [...routes.values()].map(toObserved);

    return {
      startedAt,
      generatedAt: new Date(now).toISOString(),
      uptimeSeconds: Math.round((now - startedAtMs) / 1000),
      totalRequests,
      totalErrors,
      totalRateLimited,
      errorRate: totalRequests ? Number((totalErrors / totalRequests).toFixed(4)) : 0,
      requestsLastMinute: recentEvents.filter((event) => event.at >= minuteAgo).length,
      requestsLastFiveMinutes: recentEvents.filter((event) => event.at >= fiveMinutesAgo).length,
      averageDurationMs: totalRequests ? Math.round(totalDurationMs / totalRequests) : 0,
      maxDurationMs: Math.round(maxDurationMs),
      statusBuckets: { ...statusBuckets },
      slowRoutes: [...observedRoutes].sort((a, b) => b.averageDurationMs - a.averageDurationMs).slice(0, 12),
      hotRoutes: [...observedRoutes].sort((a, b) => b.count - a.count).slice(0, 12),
      recentErrors: [...recentErrors],
    };
  },

  resetForTests() {
    routes.clear();
    recentEvents.splice(0);
    recentErrors.splice(0);
    for (const key of Object.keys(statusBuckets)) delete statusBuckets[key];
    totalRequests = 0;
    totalErrors = 0;
    totalRateLimited = 0;
    totalDurationMs = 0;
    maxDurationMs = 0;
  },
};
