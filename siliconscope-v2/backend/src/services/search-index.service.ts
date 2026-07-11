import { appConfig } from "../config.js";
import { sqlite as metadataSqlite } from "../db/connection.js";
import { companyService } from "./company.service.js";
import { learningContentService } from "./learning-content.service.js";

export type SearchIndexName = "papers" | "companies" | "learning_routes";
export type SearchIndexTarget = "all" | SearchIndexName;

const INDEXES: Array<{ uid: SearchIndexName; primaryKey: string; label: string }> = [
  { uid: "papers", primaryKey: "id", label: "论文索引" },
  { uid: "companies", primaryKey: "id", label: "企业索引" },
  { uid: "learning_routes", primaryKey: "slug", label: "学习路线索引" },
];

const PAPER_BATCH_SIZE = 1000;

function configured() {
  return appConfig.searchEngine === "meilisearch" && Boolean(appConfig.meilisearchHost);
}

function host() {
  return appConfig.meilisearchHost.replace(/\/+$/, "");
}

async function meili<T>(path: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<T> {
  if (!configured()) throw new Error("Meilisearch 未配置。");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers(init.headers || {});
    headers.set("content-type", "application/json");
    if (appConfig.meilisearchApiKey) headers.set("authorization", `Bearer ${appConfig.meilisearchApiKey}`);
    const response = await fetch(`${host()}${path}`, { ...init, headers, signal: controller.signal });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || `Meilisearch 请求失败：${response.status}`);
    }
    return payload as T;
  } finally {
    clearTimeout(timer);
  }
}

async function ensureIndex(uid: SearchIndexName, primaryKey: string) {
  await meili(`/indexes/${encodeURIComponent(uid)}`, {
    method: "PUT",
    body: JSON.stringify({ uid, primaryKey }),
  });
}

async function configureIndex(uid: SearchIndexName) {
  if (uid === "papers") {
    await meili(`/indexes/${uid}/settings`, {
      method: "PATCH",
      body: JSON.stringify({
        searchableAttributes: ["title", "abstract", "authors", "affiliations", "doi", "venue", "publicationTitle", "field"],
        filterableAttributes: ["year", "venue", "rank", "field", "verificationStatus", "downloadStatus", "metadataConfidence"],
        sortableAttributes: ["year", "score", "citationCount", "metadataConfidence"],
        displayedAttributes: ["*"],
      }),
    });
  } else if (uid === "companies") {
    await meili(`/indexes/${uid}/settings`, {
      method: "PATCH",
      body: JSON.stringify({
        searchableAttributes: ["name", "legalName", "aliases", "description", "productLines", "domains", "technologyKeywords", "country", "city", "companyType"],
        filterableAttributes: ["country", "companyType", "status"],
        sortableAttributes: ["dataConfidence", "foundedYear"],
        displayedAttributes: ["*"],
      }),
    });
  } else {
    await meili(`/indexes/${uid}/settings`, {
      method: "PATCH",
      body: JSON.stringify({
        searchableAttributes: ["title", "shortTitle", "domain", "family", "description", "paperQuery", "terms"],
        filterableAttributes: ["domain", "family", "level", "status"],
        sortableAttributes: ["displayOrder", "lessonCount", "moduleCount"],
        displayedAttributes: ["*"],
      }),
    });
  }
}

async function addDocuments(uid: SearchIndexName, rows: unknown[]) {
  if (!rows.length) return null;
  return meili(`/indexes/${uid}/documents`, {
    method: "POST",
    body: JSON.stringify(rows),
  }, 60_000);
}

function paperRows(limit: number, offset: number) {
  return metadataSqlite.prepare(`
    SELECT
      id,
      title,
      authors,
      affiliations,
      abstract,
      year,
      venue,
      publication_title AS publicationTitle,
      venue_rank AS rank,
      domain AS field,
      quality_score AS score,
      doi,
      source_url AS sourceUrl,
      openalex_id AS openalexId,
      ieee_article_number AS ieeeArticleNumber,
      download_status AS downloadStatus,
      citation_count AS citationCount,
      verification_status AS verificationStatus,
      collection_method AS collectionMethod,
      metadata_confidence AS metadataConfidence
    FROM papers
    ORDER BY id
    LIMIT ? OFFSET ?
  `).all(limit, offset).map((row: any) => ({
    ...row,
    id: Number(row.id),
    year: Number(row.year || 0),
    score: Number(row.score || 0),
    citationCount: Number(row.citationCount || 0),
    metadataConfidence: Number(row.metadataConfidence || 0),
  }));
}

async function rebuildPapers() {
  let indexed = 0;
  for (let offset = 0; ; offset += PAPER_BATCH_SIZE) {
    const rows = paperRows(PAPER_BATCH_SIZE, offset);
    if (!rows.length) break;
    await addDocuments("papers", rows);
    indexed += rows.length;
  }
  return indexed;
}

async function rebuildCompanies() {
  const result = companyService.listCompanies({ limit: "10000", offset: "0" });
  const rows = result.rows.map((company: any) => ({
    id: company.id,
    name: company.name,
    legalName: company.legalName || "",
    aliases: company.aliases || [],
    country: company.country || "",
    city: company.city || "",
    website: company.website || "",
    companyType: company.companyType || "",
    status: company.status || "unknown",
    foundedYear: company.foundedYear || null,
    description: company.description || "",
    productLines: company.productLines || [],
    domains: company.domains || [],
    technologyKeywords: company.technologyKeywords || [],
    applicationMarkets: company.applicationMarkets || [],
    careerRoles: company.careerRoles || [],
    dataConfidence: Number(company.dataConfidence || 0),
  }));
  await addDocuments("companies", rows);
  return rows.length;
}

async function rebuildLearningRoutes() {
  const content = learningContentService.activeContent();
  const termsByRoute = new Map<string, string[]>();
  for (const roadmap of content.roadmaps) {
    termsByRoute.set(roadmap.slug, [
      ...(roadmap.relatedTopics || []),
      ...(roadmap.relatedVenues || []),
      ...(roadmap.relatedSearchQueries || []),
      ...(roadmap.outcomes || []),
    ]);
  }
  const rows = content.roadmaps.map((roadmap, index) => ({
    slug: roadmap.slug,
    title: roadmap.title,
    shortTitle: roadmap.shortTitle,
    domain: roadmap.domain,
    level: roadmap.level,
    family: roadmap.family || "",
    description: roadmap.description,
    paperQuery: roadmap.paperQuery || roadmap.relatedSearchQueries?.[0] || roadmap.title,
    status: "published",
    displayOrder: index,
    stageCount: roadmap.stages.length,
    moduleCount: roadmap.stages.reduce((sum, stage) => sum + stage.modules.length, 0),
    lessonCount: content.lessons.filter((lesson) => lesson.roadmapSlug === roadmap.slug).length,
    terms: termsByRoute.get(roadmap.slug) || [],
  }));
  await addDocuments("learning_routes", rows);
  return rows.length;
}


function safeJson(value: unknown): string {
  try { return JSON.stringify(value ?? {}); } catch { return "{}"; }
}

function writeLocalDocuments(targetType: string, rows: any[]) {
  const stmt = metadataSqlite.prepare(`
    INSERT INTO search_index_documents (id, target_type, target_id, title, body, facets_json, ranking_json, metadata_confidence, source_version, updated_at)
    VALUES (@id, @targetType, @targetId, @title, @body, @facetsJson, @rankingJson, @metadataConfidence, 'search-doc-v1', CURRENT_TIMESTAMP)
    ON CONFLICT(target_type, target_id) DO UPDATE SET
      title = excluded.title,
      body = excluded.body,
      facets_json = excluded.facets_json,
      ranking_json = excluded.ranking_json,
      metadata_confidence = excluded.metadata_confidence,
      updated_at = CURRENT_TIMESTAMP
  `);
  const tx = metadataSqlite.transaction((items: any[]) => {
    for (const row of items) stmt.run(row);
  });
  tx(rows.map((row) => ({
    id: `${targetType}:${row.id ?? row.slug}`,
    targetType,
    targetId: String(row.id ?? row.slug),
    title: String(row.title || row.name || row.shortTitle || ""),
    body: [row.abstract, row.authors, row.affiliations, row.description, row.domain, row.field, row.venue, ...(row.terms || [])].filter(Boolean).join("\n"),
    facetsJson: safeJson({
      year: row.year,
      venue: row.venue,
      rank: row.rank,
      field: row.field || row.domain,
      country: row.country,
      city: row.city,
      companyType: row.companyType,
      family: row.family,
      level: row.level,
    }),
    rankingJson: safeJson({ score: row.score, citationCount: row.citationCount, dataConfidence: row.dataConfidence, displayOrder: row.displayOrder }),
    metadataConfidence: Number(row.metadataConfidence ?? row.dataConfidence ?? 80),
  })));
  return rows.length;
}

async function rebuildLocalPapers() {
  let indexed = 0;
  for (let offset = 0; ; offset += PAPER_BATCH_SIZE) {
    const rows = paperRows(PAPER_BATCH_SIZE, offset);
    if (!rows.length) break;
    indexed += writeLocalDocuments("paper", rows);
  }
  return indexed;
}

async function rebuildLocalCompanies() {
  const result = companyService.listCompanies({ limit: "10000", offset: "0" });
  const rows = result.rows.map((company: any) => ({ ...company, id: company.id, title: company.name }));
  return writeLocalDocuments("company", rows);
}

async function rebuildLocalLearningRoutes() {
  const content = learningContentService.activeContent();
  const rows = content.roadmaps.map((roadmap, index) => ({
    slug: roadmap.slug,
    title: roadmap.title,
    shortTitle: roadmap.shortTitle,
    domain: roadmap.domain,
    level: roadmap.level,
    family: roadmap.family || "",
    description: roadmap.description,
    paperQuery: roadmap.paperQuery || roadmap.relatedSearchQueries?.[0] || roadmap.title,
    status: "published",
    displayOrder: index,
    terms: [...(roadmap.relatedTopics || []), ...(roadmap.relatedVenues || []), ...(roadmap.relatedSearchQueries || []), ...(roadmap.outcomes || [])],
  }));
  return writeLocalDocuments("learning_route", rows);
}

async function rebuildLocal(target: SearchIndexTarget = "all") {
  const indexed: Record<string, number> = {};
  if (target === "all" || target === "papers") indexed.papers = await rebuildLocalPapers();
  if (target === "all" || target === "companies") indexed.companies = await rebuildLocalCompanies();
  if (target === "all" || target === "learning_routes") indexed.learning_routes = await rebuildLocalLearningRoutes();
  return {
    ok: true,
    provider: "sqlite",
    target,
    indexed,
    tasks: Object.fromEntries(Object.entries(indexed).map(([key, documents]) => [key, { documents, localCache: true }])),
    generatedAt: new Date().toISOString(),
  };
}

export const searchIndexService = {
  provider() {
    return {
      provider: configured() ? "meilisearch" : "sqlite",
      configured: configured(),
      host: appConfig.meilisearchHost || "",
      indexes: INDEXES,
    };
  },

  async status() {
    const base = this.provider();
    if (!base.configured) {
      const localCounts = {
        papers: Number((metadataSqlite.prepare("SELECT COUNT(*) AS n FROM search_index_documents WHERE target_type = 'paper'").get() as any)?.n || 0),
        companies: Number((metadataSqlite.prepare("SELECT COUNT(*) AS n FROM search_index_documents WHERE target_type = 'company'").get() as any)?.n || 0),
        learning_routes: Number((metadataSqlite.prepare("SELECT COUNT(*) AS n FROM search_index_documents WHERE target_type = 'learning_route'").get() as any)?.n || 0),
      } as Record<string, number>;
      return {
        ...base,
        reachable: false,
        message: "Meilisearch 未配置；本地 SQLite 搜索文档缓存仍可用于分面和就绪检查。",
        indexes: INDEXES.map((index) => ({ ...index, exists: localCounts[index.uid] > 0, documents: localCounts[index.uid] || 0 })),
      };
    }

    try {
      const health = await meili<{ status?: string }>("/health", { method: "GET" }, 3_000);
      const stats = await Promise.all(INDEXES.map(async (index) => {
        try {
          const row = await meili<any>(`/indexes/${index.uid}/stats`, { method: "GET" }, 3_000);
          return { ...index, exists: true, documents: Number(row.numberOfDocuments || 0), isIndexing: Boolean(row.isIndexing) };
        } catch {
          return { ...index, exists: false, documents: 0, isIndexing: false };
        }
      }));
      return { ...base, reachable: true, message: health.status || "available", indexes: stats };
    } catch (err) {
      return {
        ...base,
        reachable: false,
        message: (err as Error).message,
        indexes: INDEXES.map((index) => ({ ...index, exists: false, documents: 0 })),
      };
    }
  },

  async rebuild(target: SearchIndexTarget = "all") {
    if (!configured()) return rebuildLocal(target);
    const selected = target === "all" ? INDEXES : INDEXES.filter((index) => index.uid === target);
    if (!selected.length) throw new Error("未知搜索索引。");

    const indexed: Record<string, number> = {};
    const tasks: Record<string, unknown> = {};

    for (const index of selected) {
      await ensureIndex(index.uid, index.primaryKey);
      await configureIndex(index.uid);
      if (index.uid === "papers") indexed[index.uid] = await rebuildPapers();
      if (index.uid === "companies") indexed[index.uid] = await rebuildCompanies();
      if (index.uid === "learning_routes") indexed[index.uid] = await rebuildLearningRoutes();
      tasks[index.uid] = { documents: indexed[index.uid] || 0 };
    }

    return {
      ok: true,
      provider: "meilisearch",
      target,
      indexed,
      tasks,
      generatedAt: new Date().toISOString(),
    };
  },
};
