import { appSqlite } from "../db/app-db.js";
import { topicNodes as seedTopicNodes, type TopicNode } from "../data/topic-taxonomy.js";

const SOURCE_VERSION = "topic-taxonomy-v2-db-projection";

type TopicRow = {
  id: string;
  label: string;
  parent_id: string | null;
  domain: string;
  status: string;
  source_version: string;
  display_order: number;
};

type AliasRow = {
  topic_id: string;
  alias: string;
  alias_kind: string;
  confidence: number;
};

type RuleRow = {
  topic_id: string;
  keyword: string;
  polarity: "positive" | "negative";
  weight: number;
};

function rowsExist(): boolean {
  const row = appSqlite.prepare("SELECT COUNT(*) as n FROM topic_nodes WHERE status = 'active'").get() as { n: number } | undefined;
  return Number(row?.n || 0) > 0;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function rowId(...parts: string[]) {
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

function seedSummary() {
  const aliasIds = new Set<string>();
  const ruleIds = new Set<string>();
  for (const node of seedTopicNodes) {
    unique(node.aliases).forEach((alias) => aliasIds.add(rowId("alias", node.id, alias)));
    unique(node.positiveKeywords).forEach((keyword) => ruleIds.add(rowId("rule", node.id, "positive", keyword)));
    unique(node.negativeKeywords).forEach((keyword) => ruleIds.add(rowId("rule", node.id, "negative", keyword)));
  }
  return {
    nodes: seedTopicNodes.length,
    aliases: aliasIds.size,
    keywordRules: ruleIds.size,
  };
}

function seedTree() {
  return buildTree(seedTopicNodes);
}

function buildTree(nodes: TopicNode[]) {
  const byParent = new Map<string, TopicNode[]>();
  for (const node of nodes) {
    const key = node.parentId || "root";
    byParent.set(key, [...(byParent.get(key) || []), node]);
  }
  return (byParent.get("root") || []).map((node) => ({
    ...node,
    children: byParent.get(node.id) || [],
  }));
}

function listFromSeed() {
  return {
    version: "taxonomy-seed-v1",
    source: "seed",
    generatedAt: new Date().toISOString(),
    summary: {
      ...seedSummary(),
      rootNodes: seedTopicNodes.filter((node) => !node.parentId).length,
      paperEdges: 0,
    },
    nodes: seedTopicNodes,
    tree: seedTree(),
    caveat: "This taxonomy is a curated IC hierarchy for search, reports, and future paper_topic_edges. Paper-level labels still require confidence scoring and manual correction.",
  };
}

function listFromDatabase() {
  const topicRows = appSqlite
    .prepare("SELECT * FROM topic_nodes WHERE status = 'active' ORDER BY display_order ASC, label COLLATE NOCASE ASC")
    .all() as TopicRow[];

  const aliasRows = appSqlite
    .prepare("SELECT topic_id, alias, alias_kind, confidence FROM topic_aliases ORDER BY topic_id, alias COLLATE NOCASE")
    .all() as AliasRow[];

  const ruleRows = appSqlite
    .prepare("SELECT topic_id, keyword, polarity, weight FROM topic_keyword_rules ORDER BY topic_id, polarity, keyword COLLATE NOCASE")
    .all() as RuleRow[];

  const aliasesByTopic = new Map<string, string[]>();
  const positivesByTopic = new Map<string, string[]>();
  const negativesByTopic = new Map<string, string[]>();

  for (const row of aliasRows) {
    aliasesByTopic.set(row.topic_id, [...(aliasesByTopic.get(row.topic_id) || []), row.alias]);
  }
  for (const row of ruleRows) {
    const map = row.polarity === "negative" ? negativesByTopic : positivesByTopic;
    map.set(row.topic_id, [...(map.get(row.topic_id) || []), row.keyword]);
  }

  const nodes: TopicNode[] = topicRows.map((row) => ({
    id: row.id,
    label: row.label,
    parentId: row.parent_id || undefined,
    domain: row.domain,
    aliases: unique(aliasesByTopic.get(row.id) || []),
    positiveKeywords: unique(positivesByTopic.get(row.id) || []),
    negativeKeywords: unique(negativesByTopic.get(row.id) || []),
  }));

  const edgeCount = appSqlite.prepare("SELECT COUNT(*) as n FROM paper_topic_edges").get() as { n: number } | undefined;

  return {
    version: topicRows[0]?.source_version || SOURCE_VERSION,
    source: "database",
    generatedAt: new Date().toISOString(),
    summary: {
      nodes: nodes.length,
      rootNodes: nodes.filter((node) => !node.parentId).length,
      aliases: aliasRows.length,
      keywordRules: ruleRows.length,
      paperEdges: Number(edgeCount?.n || 0),
    },
    nodes,
    tree: buildTree(nodes),
    caveat: "This taxonomy is loaded from the database projection. Paper-level topic edges are still heuristic-ready infrastructure until the classifier writes confidence scores.",
  };
}

function syncSeedToDatabase() {
  const now = new Date().toISOString();
  const seedIds = new Set(seedTopicNodes.map((node) => node.id));

  const tx = appSqlite.transaction(() => {
    appSqlite.prepare("UPDATE topic_nodes SET status = 'archived', updated_at = ? WHERE source_version = ?").run(now, SOURCE_VERSION);
    appSqlite.prepare("DELETE FROM topic_aliases WHERE source = 'seed'").run();
    appSqlite.prepare("DELETE FROM topic_keyword_rules WHERE source = 'seed'").run();

    const upsertNode = appSqlite.prepare(`
      INSERT INTO topic_nodes (id, label, parent_id, domain, status, source_version, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        parent_id = excluded.parent_id,
        domain = excluded.domain,
        status = 'active',
        source_version = excluded.source_version,
        display_order = excluded.display_order,
        updated_at = excluded.updated_at
    `);

    const insertAlias = appSqlite.prepare(`
      INSERT INTO topic_aliases (id, topic_id, alias, alias_kind, confidence, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'seed', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        alias = excluded.alias,
        alias_kind = excluded.alias_kind,
        confidence = excluded.confidence,
        updated_at = excluded.updated_at
    `);

    const insertRule = appSqlite.prepare(`
      INSERT INTO topic_keyword_rules (id, topic_id, keyword, polarity, weight, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'seed', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        keyword = excluded.keyword,
        polarity = excluded.polarity,
        weight = excluded.weight,
        updated_at = excluded.updated_at
    `);

    seedTopicNodes.forEach((node, index) => {
      upsertNode.run(node.id, node.label, node.parentId || null, node.domain, SOURCE_VERSION, index, now, now);
      unique(node.aliases).forEach((alias) => {
        insertAlias.run(rowId("alias", node.id, alias), node.id, alias, "alias", 92, now, now);
      });
      unique(node.positiveKeywords).forEach((keyword) => {
        insertRule.run(rowId("rule", node.id, "positive", keyword), node.id, keyword, "positive", 2, now, now);
      });
      unique(node.negativeKeywords).forEach((keyword) => {
        insertRule.run(rowId("rule", node.id, "negative", keyword), node.id, keyword, "negative", -3, now, now);
      });
    });

    const placeholders = [...seedIds].map(() => "?").join(", ");
    if (placeholders) {
      appSqlite.prepare(`UPDATE topic_nodes SET status = 'archived', updated_at = ? WHERE source_version = ? AND id NOT IN (${placeholders})`)
        .run(now, SOURCE_VERSION, ...seedIds);
    }
  });

  tx();
  return adminOverview();
}

function adminOverview() {
  const nodes = appSqlite.prepare("SELECT COUNT(*) as n FROM topic_nodes WHERE status = 'active'").get() as { n: number } | undefined;
  const aliases = appSqlite.prepare("SELECT COUNT(*) as n FROM topic_aliases").get() as { n: number } | undefined;
  const rules = appSqlite.prepare("SELECT COUNT(*) as n FROM topic_keyword_rules").get() as { n: number } | undefined;
  const edges = appSqlite.prepare("SELECT COUNT(*) as n FROM paper_topic_edges").get() as { n: number } | undefined;
  const dbIds = new Set((appSqlite.prepare("SELECT id FROM topic_nodes WHERE status = 'active'").all() as Array<{ id: string }>).map((row) => row.id));
  const seedIds = new Set(seedTopicNodes.map((node) => node.id));
  const missingInDb = [...seedIds].filter((id) => !dbIds.has(id));
  const extraInDb = [...dbIds].filter((id) => !seedIds.has(id));

  return {
    sourceVersion: SOURCE_VERSION,
    generatedAt: new Date().toISOString(),
    seed: seedSummary(),
    database: {
      nodes: Number(nodes?.n || 0),
      aliases: Number(aliases?.n || 0),
      keywordRules: Number(rules?.n || 0),
      paperEdges: Number(edges?.n || 0),
    },
    drift: {
      missingInDb,
      extraInDb,
      inSync: missingInDb.length === 0 && extraInDb.length === 0,
    },
    next: [
      "Write paper_topic_edges with confidence for high-impact papers.",
      "Add admin manual correction for topic aliases and keyword rules.",
      "Expose topic confidence badges on paper detail and topic reports.",
    ],
  };
}

export const topicTaxonomyService = {
  list() {
    return rowsExist() ? listFromDatabase() : listFromSeed();
  },
  syncSeedToDatabase,
  adminOverview,
};
