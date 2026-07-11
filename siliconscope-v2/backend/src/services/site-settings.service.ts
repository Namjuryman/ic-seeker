import { appSqlite } from "../db/app-db.js";

export type SiteSettingValueType = "boolean" | "string" | "number";

export type SiteSettingDefinition = {
  key: string;
  label: string;
  description: string;
  groupName: "Access" | "Commercial" | "Research" | "Community" | "Operations";
  valueType: SiteSettingValueType;
  defaultValue: boolean | string | number;
  isPublic: boolean;
  isSensitive?: boolean;
  displayOrder: number;
};

export type SiteSettingRow = SiteSettingDefinition & {
  value: boolean | string | number;
  updatedAt: string | null;
  updatedByUserId: number | null;
};

const SETTING_DEFINITIONS: SiteSettingDefinition[] = [
  {
    key: "public_registration_enabled",
    label: "开放注册",
    description: "允许访客无需邀请创建账号。受控开放或数据复核阶段建议保持关闭。",
    groupName: "Access",
    valueType: "boolean",
    defaultValue: false,
    isPublic: true,
    displayOrder: 10,
  },
  {
    key: "invite_only_mode",
    label: "邀请制访问",
    description: "即使公共页面可访问，也将核心功能保持在受控邀请范围内。",
    groupName: "Access",
    valueType: "boolean",
    defaultValue: true,
    isPublic: true,
    displayOrder: 20,
  },
  {
    key: "maintenance_mode",
    label: "维护模式",
    description: "当采集、备份或迁移任务运行时，向公开页面展示维护提示。",
    groupName: "Operations",
    valueType: "boolean",
    defaultValue: false,
    isPublic: true,
    displayOrder: 30,
  },
  {
    key: "data_readiness_banner",
    label: "数据状态提示",
    description: "面向公开页面的简短说明，用于提示元数据覆盖范围、来源限制和核验状态。",
    groupName: "Operations",
    valueType: "string",
    defaultValue: "当前情报主要基于论文元数据；PDF 访问会跳转到出版方来源，排行仅作为探索性信号。",
    isPublic: true,
    displayOrder: 40,
  },
  {
    key: "ai_reports_enabled",
    label: "AI 报告",
    description: "在模型预算、引用来源和审核边界就绪后，开放 AI 辅助报告入口。",
    groupName: "Commercial",
    valueType: "boolean",
    defaultValue: false,
    isPublic: true,
    displayOrder: 50,
  },
  {
    key: "export_center_enabled",
    label: "高级导出",
    description: "在配额约束和版权边界复核后，开放 CSV、BibTeX 和研究组合导出。",
    groupName: "Commercial",
    valueType: "boolean",
    defaultValue: false,
    isPublic: true,
    displayOrder: 60,
  },
  {
    key: "checkout_enabled",
    label: "支付入口",
    description: "仅在 Stripe/Paddle 适配器和支付回调校验完成后开放真实支付。",
    groupName: "Commercial",
    valueType: "boolean",
    defaultValue: false,
    isPublic: true,
    displayOrder: 70,
  },
  {
    key: "team_workspace_enabled",
    label: "团队工作台",
    description: "开放实验室/团队席位、共享阅读队列和工作台级权限。",
    groupName: "Commercial",
    valueType: "boolean",
    defaultValue: false,
    isPublic: true,
    displayOrder: 80,
  },
  {
    key: "paper_discussion_enabled",
    label: "论文讨论",
    description: "允许公开论文评论；评论展示仍由管理端审核控制。",
    groupName: "Community",
    valueType: "boolean",
    defaultValue: true,
    isPublic: true,
    displayOrder: 90,
  },
  {
    key: "mentor_reviews_enabled",
    label: "研究者评价",
    description: "允许提交研究者/课题组评价，仅展示通过审核且满足阈值保护的汇总内容。",
    groupName: "Community",
    valueType: "boolean",
    defaultValue: true,
    isPublic: true,
    displayOrder: 100,
  },
  {
    key: "company_intelligence_enabled",
    label: "企业情报",
    description: "开放企业数据库、企业对比和相关论文链接。",
    groupName: "Research",
    valueType: "boolean",
    defaultValue: true,
    isPublic: true,
    displayOrder: 110,
  },
  {
    key: "topic_reports_enabled",
    label: "方向报告",
    description: "在 AI 综合生成接入前，开放基于规则和元数据的方向报告。",
    groupName: "Research",
    valueType: "boolean",
    defaultValue: true,
    isPublic: true,
    displayOrder: 120,
  },
  {
    key: "weekly_ingestion_enabled",
    label: "周度采集",
    description: "控制定时元数据更新任务；实际执行仍由管理端和后端任务负责。",
    groupName: "Operations",
    valueType: "boolean",
    defaultValue: false,
    isPublic: false,
    displayOrder: 130,
  },
  {
    key: "admin_access_policy",
    label: "管理端访问策略",
    description: "生产环境管理端访问控制提醒。",
    groupName: "Access",
    valueType: "string",
    defaultValue: "使用独立管理域名、后端管理员角色，并配合 Cloudflare Access 或 VPN。",
    isPublic: false,
    displayOrder: 140,
  },
];

const definitionsByKey = new Map(SETTING_DEFINITIONS.map((definition) => [definition.key, definition]));

function encodeValue(value: boolean | string | number) {
  return JSON.stringify(value);
}

function decodeValue(raw: string, definition: SiteSettingDefinition) {
  try {
    const parsed = JSON.parse(raw);
    return coerceValue(definition, parsed);
  } catch {
    return definition.defaultValue;
  }
}

function coerceValue(definition: SiteSettingDefinition, value: unknown) {
  if (definition.valueType === "boolean") {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.toLowerCase());
    return Boolean(value);
  }
  if (definition.valueType === "number") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new Error(`${definition.label} must be a finite number.`);
    }
    return numeric;
  }
  return String(value ?? "").slice(0, 2000);
}

function ensureDefaults() {
  const insert = appSqlite.prepare(`
    INSERT OR IGNORE INTO site_settings (
      key, value_json, value_type, group_name, label, description,
      is_public, is_sensitive, display_order, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const updateMetadata = appSqlite.prepare(`
    UPDATE site_settings
    SET
      value_type = ?,
      group_name = ?,
      label = ?,
      description = ?,
      is_public = ?,
      is_sensitive = ?,
      display_order = ?
    WHERE key = ?
  `);

  const tx = appSqlite.transaction(() => {
    for (const definition of SETTING_DEFINITIONS) {
      insert.run(
        definition.key,
        encodeValue(definition.defaultValue),
        definition.valueType,
        definition.groupName,
        definition.label,
        definition.description,
        definition.isPublic ? 1 : 0,
        definition.isSensitive ? 1 : 0,
        definition.displayOrder,
      );
      updateMetadata.run(
        definition.valueType,
        definition.groupName,
        definition.label,
        definition.description,
        definition.isPublic ? 1 : 0,
        definition.isSensitive ? 1 : 0,
        definition.displayOrder,
        definition.key,
      );
    }
  });

  tx();
}

function mapRow(row: any): SiteSettingRow {
  const definition = definitionsByKey.get(String(row.key)) || {
    key: String(row.key),
    label: String(row.label || row.key),
    description: String(row.description || ""),
    groupName: String(row.group_name || "Operations") as SiteSettingDefinition["groupName"],
    valueType: String(row.value_type || "string") as SiteSettingValueType,
    defaultValue: "",
    isPublic: Boolean(row.is_public),
    isSensitive: Boolean(row.is_sensitive),
    displayOrder: Number(row.display_order || 999),
  };

  return {
    ...definition,
    groupName: String(row.group_name || definition.groupName) as SiteSettingDefinition["groupName"],
    valueType: String(row.value_type || definition.valueType) as SiteSettingValueType,
    label: String(row.label || definition.label),
    description: String(row.description || definition.description),
    isPublic: Boolean(row.is_public),
    isSensitive: Boolean(row.is_sensitive),
    displayOrder: Number(row.display_order ?? definition.displayOrder),
    value: decodeValue(String(row.value_json), definition),
    updatedAt: row.updated_at || null,
    updatedByUserId: row.updated_by_user_id ?? null,
  };
}

function allRows(): SiteSettingRow[] {
  ensureDefaults();
  const rows = appSqlite.prepare(`
    SELECT
      key, value_json, value_type, group_name, label, description,
      is_public, is_sensitive, display_order, updated_by_user_id, updated_at
    FROM site_settings
    ORDER BY display_order ASC, key ASC
  `).all() as any[];
  return rows.map(mapRow);
}

export const siteSettingsService = {
  definitions() {
    return SETTING_DEFINITIONS;
  },

  list() {
    return allRows();
  },

  publicSettings() {
    return allRows()
      .filter((row) => row.isPublic)
      .reduce<Record<string, boolean | string | number>>((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
  },

  update(key: string, value: unknown, actorUserId: number | null) {
    ensureDefaults();
    const definition = definitionsByKey.get(key);
    if (!definition) {
      throw new Error(`未知站点设置：${key}`);
    }
    if (definition.isSensitive) {
      throw new Error(`${definition.label} 是敏感设置，不能通过该接口修改。`);
    }

    const nextValue = coerceValue(definition, value);
    appSqlite.prepare(`
      UPDATE site_settings
      SET value_json = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE key = ?
    `).run(encodeValue(nextValue), actorUserId, key);

    return allRows().find((row) => row.key === key);
  },

  summary() {
    const rows = allRows();
    const flags = rows.filter((row) => row.valueType === "boolean");
    return {
      total: rows.length,
      public: rows.filter((row) => row.isPublic).length,
      enabledFlags: flags.filter((row) => row.value === true).length,
      disabledFlags: flags.filter((row) => row.value === false).length,
      maintenanceMode: Boolean(rows.find((row) => row.key === "maintenance_mode")?.value),
      checkoutEnabled: Boolean(rows.find((row) => row.key === "checkout_enabled")?.value),
      inviteOnlyMode: Boolean(rows.find((row) => row.key === "invite_only_mode")?.value),
    };
  },
};
