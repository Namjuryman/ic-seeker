import { appSqlite } from "../db/app-db.js";

export type NotificationSeverity = "info" | "success" | "warning" | "critical";

export type NotificationInput = {
  userId?: number;
  kind?: string;
  severity?: NotificationSeverity;
  title: string;
  body?: string;
  href?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
};

function parseJson(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  try {
    return JSON.parse(String(value)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toNotification(row: Record<string, any>) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    kind: String(row.kind || "system"),
    severity: String(row.severity || "info") as NotificationSeverity,
    title: String(row.title || ""),
    body: String(row.body || ""),
    href: row.href ? String(row.href) : null,
    actionLabel: row.action_label ? String(row.action_label) : null,
    metadata: parseJson(row.metadata_json),
    readAt: row.read_at ? String(row.read_at) : null,
    createdAt: String(row.created_at || ""),
  };
}

function sanitizeLimit(value: unknown, fallback = 50): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(100, Math.floor(n)));
}

function sanitizeOffset(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function ensureWelcomeNotification(userId: number) {
  const existing = appSqlite
    .prepare("SELECT id FROM notifications WHERE user_id = ? LIMIT 1")
    .get(userId);
  if (existing) return;

  appSqlite.prepare(`
    INSERT INTO notifications
      (user_id, kind, severity, title, body, href, action_label, metadata_json)
    VALUES
      (?, 'system', 'info', ?, ?, ?, ?, ?)
  `).run(
    userId,
    "欢迎使用 SiliconScope",
    "通知中心已可用于每周摘要、审核结果、导入任务和产品公告。",
    "/platform",
    "查看平台状态",
    JSON.stringify({ seeded: true, source: "notification.service" })
  );
}

export const notificationService = {
  list(userId: number, params: Record<string, unknown> = {}) {
    ensureWelcomeNotification(userId);
    const limit = sanitizeLimit(params.limit);
    const offset = sanitizeOffset(params.offset);
    const unreadOnly = String(params.unread || "") === "1" || String(params.status || "") === "unread";
    const where = unreadOnly ? "WHERE user_id = ? AND read_at IS NULL" : "WHERE user_id = ?";
    const rows = appSqlite
      .prepare(`
        SELECT *
        FROM notifications
        ${where}
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?
      `)
      .all(userId, limit, offset) as Record<string, any>[];
    const total = appSqlite
      .prepare(`SELECT COUNT(*) AS n FROM notifications ${where}`)
      .get(userId) as { n?: number } | undefined;
    const unread = this.unreadCount(userId).unread;
    return {
      rows: rows.map(toNotification),
      total: Number(total?.n || 0),
      unread,
      limit,
      offset,
    };
  },

  unreadCount(userId: number) {
    ensureWelcomeNotification(userId);
    const row = appSqlite
      .prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL")
      .get(userId) as { n?: number } | undefined;
    return { unread: Number(row?.n || 0) };
  },

  stats(userId = 0) {
    ensureWelcomeNotification(userId);
    const total = appSqlite
      .prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?")
      .get(userId) as { n?: number } | undefined;
    const unread = this.unreadCount(userId).unread;
    const bySeverity = appSqlite
      .prepare("SELECT severity, COUNT(*) AS n FROM notifications WHERE user_id = ? GROUP BY severity")
      .all(userId) as Array<{ severity: string; n: number }>;
    return {
      total: Number(total?.n || 0),
      unread,
      bySeverity: bySeverity.map((row) => ({ severity: row.severity, count: Number(row.n || 0) })),
    };
  },

  create(input: NotificationInput) {
    if (!input.title || !String(input.title).trim()) throw new Error("通知标题不能为空。");
    const severity = input.severity || "info";
    if (!["info", "success", "warning", "critical"].includes(severity)) throw new Error("通知级别无效。");
    const result = appSqlite.prepare(`
      INSERT INTO notifications
        (user_id, kind, severity, title, body, href, action_label, metadata_json)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      Number(input.userId ?? 0),
      String(input.kind || "system").slice(0, 40),
      severity,
      String(input.title).trim().slice(0, 180),
      String(input.body || "").trim().slice(0, 2000),
      input.href ? String(input.href).slice(0, 500) : null,
      input.actionLabel ? String(input.actionLabel).slice(0, 80) : null,
      input.metadata ? JSON.stringify(input.metadata) : null
    );
    const row = appSqlite.prepare("SELECT * FROM notifications WHERE id = ?").get(result.lastInsertRowid) as Record<string, any>;
    return toNotification(row);
  },

  markRead(userId: number, id: number) {
    const result = appSqlite
      .prepare("UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE user_id = ? AND id = ?")
      .run(userId, id);
    return { ok: result.changes > 0 };
  },

  markAllRead(userId: number) {
    const result = appSqlite
      .prepare("UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE user_id = ? AND read_at IS NULL")
      .run(userId);
    return { ok: true, changed: result.changes };
  },

  delete(userId: number, id: number) {
    const result = appSqlite
      .prepare("DELETE FROM notifications WHERE user_id = ? AND id = ?")
      .run(userId, id);
    return { ok: result.changes > 0 };
  },
};
