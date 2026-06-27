import type { AuthenticatedRequest } from "../middleware/auth.js";
import { appSqlite } from "../db/app-db.js";

type AuditStatus = "success" | "failure";

export type AuditInput = {
  req?: AuthenticatedRequest;
  actorUserId?: number | null;
  actorEmail?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | number | null;
  status?: AuditStatus;
  metadata?: Record<string, unknown>;
  error?: unknown;
};

function stringifyMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return null;
  try {
    return JSON.stringify(metadata).slice(0, 20000);
  } catch {
    return JSON.stringify({ note: "metadata_not_serializable" });
  }
}

function errorText(error?: unknown) {
  if (!error) return null;
  if (error instanceof Error) return error.message.slice(0, 2000);
  return String(error).slice(0, 2000);
}

function requestIp(req?: AuthenticatedRequest) {
  const forwarded = req?.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return req?.ip || req?.socket?.remoteAddress || null;
}

export const adminAuditService = {
  record(input: AuditInput) {
    try {
      const actorUserId = input.actorUserId ?? input.req?.user?.userId ?? null;
      const actorEmail = input.actorEmail ?? input.req?.user?.email ?? null;
      appSqlite.prepare(`
        INSERT INTO admin_audit_logs (
          actor_user_id, actor_email, action, resource_type, resource_id,
          status, ip_address, user_agent, metadata_json, error, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        actorUserId,
        actorEmail,
        input.action,
        input.resourceType,
        input.resourceId == null ? null : String(input.resourceId),
        input.status || "success",
        requestIp(input.req),
        input.req?.headers?.["user-agent"] || null,
        stringifyMetadata(input.metadata),
        errorText(input.error),
      );
    } catch (err) {
      console.warn("Failed to write admin audit log", err);
    }
  },

  list(params: Record<string, unknown> = {}) {
    const limit = Math.min(Math.max(Number(params.limit || 50), 1), 200);
    const offset = Math.max(Number(params.offset || 0), 0);
    const q = String(params.q || "").trim();
    const action = String(params.action || "").trim();
    const resourceType = String(params.resourceType || "").trim();
    const status = String(params.status || "").trim();

    const where: string[] = [];
    const values: unknown[] = [];

    if (q) {
      where.push("(actor_email LIKE ? OR action LIKE ? OR resource_type LIKE ? OR resource_id LIKE ?)");
      const pattern = `%${q}%`;
      values.push(pattern, pattern, pattern, pattern);
    }
    if (action) {
      where.push("action = ?");
      values.push(action);
    }
    if (resourceType) {
      where.push("resource_type = ?");
      values.push(resourceType);
    }
    if (status) {
      where.push("status = ?");
      values.push(status);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = appSqlite.prepare(`
      SELECT
        id,
        actor_user_id AS actorUserId,
        actor_email AS actorEmail,
        action,
        resource_type AS resourceType,
        resource_id AS resourceId,
        status,
        ip_address AS ipAddress,
        user_agent AS userAgent,
        metadata_json AS metadataJson,
        error,
        created_at AS createdAt
      FROM admin_audit_logs
      ${whereSql}
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ? OFFSET ?
    `).all(...values, limit, offset) as Array<Record<string, unknown>>;

    const total = appSqlite.prepare(`SELECT COUNT(*) AS count FROM admin_audit_logs ${whereSql}`).get(...values) as { count: number };
    const actions = appSqlite.prepare(`
      SELECT action, COUNT(*) AS count
      FROM admin_audit_logs
      GROUP BY action
      ORDER BY count DESC, action ASC
      LIMIT 20
    `).all();
    const resourceTypes = appSqlite.prepare(`
      SELECT resource_type AS resourceType, COUNT(*) AS count
      FROM admin_audit_logs
      GROUP BY resource_type
      ORDER BY count DESC, resource_type ASC
      LIMIT 20
    `).all();

    return {
      rows: rows.map((row) => ({
        ...row,
        metadata: row.metadataJson ? JSON.parse(String(row.metadataJson)) : null,
        metadataJson: undefined,
      })),
      total: total?.count || 0,
      limit,
      offset,
      actions,
      resourceTypes,
    };
  },

  count() {
    return appSqlite.prepare("SELECT COUNT(*) AS count FROM admin_audit_logs").get() as { count: number };
  },

  recent(limit = 6) {
    return this.list({ limit }).rows;
  },
};
