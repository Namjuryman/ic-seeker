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
    label: "Public registration",
    description: "Allow visitors to create accounts without an invitation. Keep off during private beta.",
    groupName: "Access",
    valueType: "boolean",
    defaultValue: false,
    isPublic: true,
    displayOrder: 10,
  },
  {
    key: "invite_only_mode",
    label: "Invite-only mode",
    description: "Treat the product as a controlled private beta even when public pages are reachable.",
    groupName: "Access",
    valueType: "boolean",
    defaultValue: true,
    isPublic: true,
    displayOrder: 20,
  },
  {
    key: "maintenance_mode",
    label: "Maintenance mode",
    description: "Show a public maintenance notice while admin-side ingestion, backup, or migration work is running.",
    groupName: "Operations",
    valueType: "boolean",
    defaultValue: false,
    isPublic: true,
    displayOrder: 30,
  },
  {
    key: "data_readiness_banner",
    label: "Data readiness banner",
    description: "Short public note about metadata-only coverage, source limitations, and verification status.",
    groupName: "Operations",
    valueType: "string",
    defaultValue: "Metadata-only intelligence. PDF access redirects to publisher sources; rankings are exploratory signals.",
    isPublic: true,
    displayOrder: 40,
  },
  {
    key: "ai_reports_enabled",
    label: "AI reports",
    description: "Enable paid AI-assisted report entry points after provider budgets and citations are ready.",
    groupName: "Commercial",
    valueType: "boolean",
    defaultValue: false,
    isPublic: true,
    displayOrder: 50,
  },
  {
    key: "export_center_enabled",
    label: "Advanced exports",
    description: "Enable paid CSV/BibTeX/portfolio exports after quota enforcement and copyright boundaries are reviewed.",
    groupName: "Commercial",
    valueType: "boolean",
    defaultValue: false,
    isPublic: true,
    displayOrder: 60,
  },
  {
    key: "checkout_enabled",
    label: "Checkout",
    description: "Expose real paid checkout only after Stripe/Paddle adapters and webhook verification are implemented.",
    groupName: "Commercial",
    valueType: "boolean",
    defaultValue: false,
    isPublic: true,
    displayOrder: 70,
  },
  {
    key: "team_workspace_enabled",
    label: "Team workspace",
    description: "Enable lab/team seats, shared reading queues, and workspace-level permissions.",
    groupName: "Commercial",
    valueType: "boolean",
    defaultValue: false,
    isPublic: true,
    displayOrder: 80,
  },
  {
    key: "paper_discussion_enabled",
    label: "Paper discussion",
    description: "Allow public paper comments. Moderation remains admin-controlled.",
    groupName: "Community",
    valueType: "boolean",
    defaultValue: true,
    isPublic: true,
    displayOrder: 90,
  },
  {
    key: "mentor_reviews_enabled",
    label: "Mentor reviews",
    description: "Allow mentor review submission and display only approved, threshold-protected summaries.",
    groupName: "Community",
    valueType: "boolean",
    defaultValue: true,
    isPublic: true,
    displayOrder: 100,
  },
  {
    key: "company_intelligence_enabled",
    label: "Company intelligence",
    description: "Expose company database, comparisons, and related paper links.",
    groupName: "Research",
    valueType: "boolean",
    defaultValue: true,
    isPublic: true,
    displayOrder: 110,
  },
  {
    key: "topic_reports_enabled",
    label: "Topic reports",
    description: "Expose deterministic topic reports before AI synthesis is connected.",
    groupName: "Research",
    valueType: "boolean",
    defaultValue: true,
    isPublic: true,
    displayOrder: 120,
  },
  {
    key: "weekly_ingestion_enabled",
    label: "Weekly ingestion",
    description: "Operational flag for scheduled metadata update jobs. Actual workers still run from admin/backend only.",
    groupName: "Operations",
    valueType: "boolean",
    defaultValue: false,
    isPublic: false,
    displayOrder: 130,
  },
  {
    key: "admin_access_policy",
    label: "Admin access policy",
    description: "Internal reminder for production admin access controls.",
    groupName: "Access",
    valueType: "string",
    defaultValue: "Use independent admin domain + backend admin role + Cloudflare Access or VPN.",
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
      throw new Error(`Unknown site setting: ${key}`);
    }
    if (definition.isSensitive) {
      throw new Error(`${definition.label} is sensitive and cannot be changed through this endpoint.`);
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
