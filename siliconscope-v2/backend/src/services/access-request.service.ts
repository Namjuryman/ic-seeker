import { appSqlite } from "../db/app-db.js";

export type AccessRequestStatus = "pending" | "approved" | "rejected" | "invited";

export type AccessRequestRow = {
  id: number;
  email: string;
  name: string;
  affiliation: string;
  intendedUse: string;
  planInterest: string;
  status: AccessRequestStatus;
  source: string;
  notes: string | null;
  reviewedByUserId: number | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CreateAccessRequestInput = {
  email: unknown;
  name?: unknown;
  affiliation?: unknown;
  intendedUse?: unknown;
  planInterest?: unknown;
  source?: unknown;
};

type UpdateAccessRequestInput = {
  status?: unknown;
  notes?: unknown;
  actorUserId?: number | null;
};

const VALID_STATUSES = new Set<AccessRequestStatus>(["pending", "approved", "rejected", "invited"]);
const VALID_PLAN_INTERESTS = new Set(["research", "pro", "lab", "enterprise", "private_deploy"]);

function cleanText(value: unknown, max = 1000) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeEmail(value: unknown) {
  const email = cleanText(value, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("请输入有效邮箱。");
  }
  return email;
}

function normalizePlanInterest(value: unknown) {
  const plan = cleanText(value, 40) || "research";
  return VALID_PLAN_INTERESTS.has(plan) ? plan : "research";
}

function toRow(row: any): AccessRequestRow {
  return {
    id: Number(row.id),
    email: String(row.email || ""),
    name: String(row.name || ""),
    affiliation: String(row.affiliation || ""),
    intendedUse: String(row.intendedUse || row.intended_use || ""),
    planInterest: String(row.planInterest || row.plan_interest || "research"),
    status: String(row.status || "pending") as AccessRequestStatus,
    source: String(row.source || "public"),
    notes: row.notes == null ? null : String(row.notes),
    reviewedByUserId: row.reviewedByUserId ?? row.reviewed_by_user_id ?? null,
    reviewedAt: row.reviewedAt ?? row.reviewed_at ?? null,
    createdAt: String(row.createdAt || row.created_at || ""),
    updatedAt: String(row.updatedAt || row.updated_at || ""),
  };
}

function selectSql(whereSql = "") {
  return `
    SELECT
      id,
      email,
      name,
      affiliation,
      intended_use AS intendedUse,
      plan_interest AS planInterest,
      status,
      source,
      notes,
      reviewed_by_user_id AS reviewedByUserId,
      reviewed_at AS reviewedAt,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM access_requests
    ${whereSql}
  `;
}

export const accessRequestService = {
  create(input: CreateAccessRequestInput) {
    const email = normalizeEmail(input.email);
    const name = cleanText(input.name, 120);
    const affiliation = cleanText(input.affiliation, 180);
    const intendedUse = cleanText(input.intendedUse, 2000);
    const planInterest = normalizePlanInterest(input.planInterest);
    const source = cleanText(input.source, 80) || "public";

    const existing = appSqlite.prepare(`
      ${selectSql("WHERE email = ? AND status IN ('pending', 'approved', 'invited')")}
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT 1
    `).get(email);

    if (existing) {
      appSqlite.prepare(`
        UPDATE access_requests
        SET
          name = CASE WHEN ? <> '' THEN ? ELSE name END,
          affiliation = CASE WHEN ? <> '' THEN ? ELSE affiliation END,
          intended_use = CASE WHEN ? <> '' THEN ? ELSE intended_use END,
          plan_interest = ?,
          source = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name, name, affiliation, affiliation, intendedUse, intendedUse, planInterest, source, (existing as any).id);
      return { row: this.get((existing as any).id), duplicate: true };
    }

    const result = appSqlite.prepare(`
      INSERT INTO access_requests (
        email, name, affiliation, intended_use, plan_interest, status, source,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(email, name, affiliation, intendedUse, planInterest, source);

    return { row: this.get(Number(result.lastInsertRowid)), duplicate: false };
  },

  get(id: number) {
    const row = appSqlite.prepare(`${selectSql("WHERE id = ?")}`).get(id);
    if (!row) throw new Error("没有找到这条访问申请。");
    return toRow(row);
  },

  list(params: Record<string, unknown> = {}) {
    const limit = Math.min(Math.max(Number(params.limit || 50), 1), 200);
    const offset = Math.max(Number(params.offset || 0), 0);
    const status = cleanText(params.status, 40);
    const q = cleanText(params.q, 120);

    const where: string[] = [];
    const values: unknown[] = [];

    if (status && VALID_STATUSES.has(status as AccessRequestStatus)) {
      where.push("status = ?");
      values.push(status);
    }

    if (q) {
      where.push("(email LIKE ? OR name LIKE ? OR affiliation LIKE ? OR intended_use LIKE ?)");
      const pattern = `%${q}%`;
      values.push(pattern, pattern, pattern, pattern);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = appSqlite.prepare(`
      ${selectSql(whereSql)}
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ? OFFSET ?
    `).all(...values, limit, offset).map(toRow);

    const total = appSqlite.prepare(`SELECT COUNT(*) AS count FROM access_requests ${whereSql}`).get(...values) as { count: number };

    return {
      rows,
      total: total?.count || 0,
      limit,
      offset,
      stats: this.stats(),
    };
  },

  updateStatus(id: number, input: UpdateAccessRequestInput) {
    const status = cleanText(input.status, 40) as AccessRequestStatus;
    if (!VALID_STATUSES.has(status)) {
      throw new Error("申请状态必须是待审核、已通过、未通过或已邀请。");
    }

    const notes = input.notes == null ? null : cleanText(input.notes, 2000);
    appSqlite.prepare(`
      UPDATE access_requests
      SET status = ?,
          notes = ?,
          reviewed_by_user_id = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, notes, input.actorUserId ?? null, id);

    return this.get(id);
  },

  stats() {
    const rows = appSqlite.prepare(`
      SELECT status, COUNT(*) AS count
      FROM access_requests
      GROUP BY status
    `).all() as Array<{ status: string; count: number }>;

    const summary = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      invited: 0,
    };

    for (const row of rows) {
      const key = row.status as keyof typeof summary;
      if (key in summary) summary[key] = Number(row.count || 0);
      summary.total += Number(row.count || 0);
    }

    return summary;
  },
};
