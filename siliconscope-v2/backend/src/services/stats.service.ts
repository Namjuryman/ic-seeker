import { appConfig } from "../config.js";
import { db as metadataDb } from "../db/connection.js";
import { appDb } from "../db/app-db.js";
import { papers, favorites, notes, tags, apiKeys, importLog, qsRankings } from "../db/schema.js";
import { sql, count, eq, ne, and, gte, lte, like, inArray, isNotNull, not } from "drizzle-orm";
import { promises as fs } from "node:fs";
import path from "node:path";

function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return "*".repeat(value.length);
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function methodLabel(method: string): string {
  const value = String(method || "unknown");
  if (/^aminer/i.test(value)) return "AMiner";
  if (/^openalex/i.test(value)) return "OpenAlex";
  if (/^venue_year_search/i.test(value)) return "OpenAlex";
  if (/^crossref/i.test(value)) return "Crossref";
  if (/^manual/i.test(value)) return "人工导入";
  return value;
}

export const statsService = {
  getStats(userId = 0) {
    const total = metadataDb.select({ count: count() }).from(papers).get()?.count ?? 0;
    const pdfs = metadataDb.select({ count: count() }).from(papers).where(ne(papers.localPdf, "")).get()?.count ?? 0;
    const aminerRows = metadataDb.select({ count: count() }).from(papers)
      .where(sql`${papers.openalexId} LIKE 'aminer:%' OR ${papers.collectionMethod} LIKE 'aminer%'`)
      .get()?.count ?? 0;
    const favoriteCount = appDb.select({ count: count() }).from(favorites).where(eq(favorites.userId, userId)).get()?.count ?? 0;
    const notesCount = appDb.select({ count: count() }).from(notes).where(and(eq(notes.userId, userId), ne(notes.body, ""))).get()?.count ?? 0;
    const tagsList = appDb.select().from(tags).orderBy(tags.name).all();
    const years = metadataDb.select({
      minYear: sql<number>`MIN(${papers.year})`,
      maxYear: sql<number>`MAX(${papers.year})`,
    }).from(papers).get();

    const byVenue = metadataDb.select({
      venue: papers.venue,
      rank: papers.venueRank,
      count: count(),
      avgScore: sql<number>`ROUND(AVG(${papers.qualityScore}), 1)`,
    }).from(papers).groupBy(papers.venue, papers.venueRank)
      .orderBy(sql`MAX(${papers.qualityScore}) DESC`).all();

    const byField = metadataDb.select({
      field: papers.domain,
      count: count(),
    }).from(papers).groupBy(papers.domain).orderBy(sql`COUNT(*) DESC`).all();

    const byVenueYear = metadataDb.select({
      venue: papers.venue,
      year: papers.year,
      count: count(),
    }).from(papers).groupBy(papers.venue, papers.year)
      .orderBy(papers.venue, papers.year).all();

    const byCollectionMethod = metadataDb.select({
      method: sql<string>`COALESCE(NULLIF(${papers.collectionMethod}, ''), 'unknown')`,
      count: count(),
    }).from(papers)
      .groupBy(sql`COALESCE(NULLIF(${papers.collectionMethod}, ''), 'unknown')`)
      .orderBy(sql`COUNT(*) DESC, COALESCE(NULLIF(${papers.collectionMethod}, ''), 'unknown')`).all();

    const byVerification = metadataDb.select({
      status: sql<string>`COALESCE(NULLIF(${papers.verificationStatus}, ''), 'unverified')`,
      count: count(),
    }).from(papers)
      .groupBy(sql`COALESCE(NULLIF(${papers.verificationStatus}, ''), 'unverified')`)
      .orderBy(sql`COUNT(*) DESC, COALESCE(NULLIF(${papers.verificationStatus}, ''), 'unverified')`).all();

    const venues = metadataDb.selectDistinct({ venue: papers.venue }).from(papers)
      .orderBy(papers.venue).all().map(r => r.venue);
    const fields = metadataDb.selectDistinct({ domain: papers.domain }).from(papers)
      .orderBy(papers.domain).all().map(r => r.domain);
    const ranks = metadataDb.selectDistinct({ rank: papers.venueRank }).from(papers)
      .orderBy(papers.venueRank).all().map(r => r.rank);

    return {
      appName: appConfig.appName,
      total,
      pdfs,
      favorites: favoriteCount,
      notes: notesCount,
      aminerRows,
      byVenue,
      byField,
      byVenueYear,
      byCollectionMethod,
      byVerification,
      years,
      venues,
      fields,
      ranks,
      tags: tagsList,
      csvPath: appConfig.csvPath,
      dbPath: appConfig.dbPath,
      pdfInboxPath: appConfig.pdfInboxPath,
    };
  },

  getApiKeys() {
    const rows = appDb.select().from(apiKeys).orderBy(apiKeys.provider).all();
    const envProviders = ["OPENAI_API_KEY", "IEEE_API_KEY", "AMINER_API_KEY", "AMINER_AUTH_TOKEN", "CROSSREF_MAILTO"]
      .filter(name => process.env[name])
      .map(name => ({
        provider: name.toLowerCase(),
        masked: maskSecret(process.env[name]!),
        source: "env" as const,
      }));
    return [
      ...rows.map(row => ({
        provider: row.provider,
        masked: maskSecret(row.value),
        updatedAt: row.updatedAt,
        source: "database" as const,
      })),
      ...envProviders,
    ];
  },

  setApiKey(provider: string, value: string) {
    const clean = String(provider || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
    if (!clean) throw new Error("服务提供方无效。");
    if (value) {
      appDb.insert(apiKeys).values({ provider: clean, value: String(value).trim() })
        .onConflictDoUpdate({ target: apiKeys.provider, set: { value: String(value).trim(), updatedAt: sql`CURRENT_TIMESTAMP` } })
        .run();
    } else {
      appDb.delete(apiKeys).where(eq(apiKeys.provider, clean)).run();
    }
    return this.getApiKeys();
  },

  async getPdfInbox() {
    await fs.mkdir(appConfig.pdfInboxPath, { recursive: true });
    const entries = await fs.readdir(appConfig.pdfInboxPath, { withFileTypes: true });
    const pdfs = entries
      .filter(e => e.isFile() && e.name.toLowerCase().endsWith(".pdf"))
      .map(e => ({ name: e.name, path: path.join(appConfig.pdfInboxPath, e.name) }));
    return {
      path: appConfig.pdfInboxPath,
      count: pdfs.length,
      pdfs,
      importCommand: "PDF 导入建议通过后台采集任务执行，并保留本地文件来源记录。",
    };
  },

  getMethodology() {
    return {
      scoring: {
        formula: "metadata_score = venue_base + citation_boost + recency_boost",
        citationBoost: "min(cited_by_count, 300) / 25",
        recencyBoost: "(publication_year - 2016) * 0.35, floored at 0",
        venueBase: {
          ISSCC: 100,
          JSSC: 100,
          "VLSI Symposium": 92,
          CICC: 86,
          IEDM: 84,
          ASSCC: 78,
          ESSCIRC: 76,
          DAC: 74,
          ICCAD: 74,
          TCAD: 70,
          DATE: 66,
          "TCAS-I": 64,
          TVLSI: 62,
          "TCAS-II": 60,
          ISCAS: 54,
          "Nature Electron.": 115,
          "Nat. Electronics": 115,
          Nature: 125,
          "Nat. Commun.": 0,
          "IEEE T-MTT": 78,
          "IEEE TED": 50,
          "IEEE EDL": 0,
          "IEEE Sensors J.": 40,
          "Adv. Mater.": 0,
          "Appl. Phys. Lett.": 0,
          "Solid-State Electron.": 36,
          "IEEE JMEMS": 42,
          "IEEE T-Nano": 34,
          "Microelectron. J.": 32,
        },
      },
      classification: [
        "论文会用标题、摘要、来源名称和 OpenAlex concepts 匹配 IC 方向关键词表。",
        "命中最多的方向作为主方向；如果没有明确方向但出现 IC 术语，则回退到 General IC。",
        "宽口径 IC 邻近期刊保留为元数据，但会被明显降权。",
        "这套规则刻意保持透明、可编辑；目前还不是训练得到的模型。",
      ],
      coverage: [
        "构建器会按会议/期刊和年份在 OpenAlex 检索，再用已解析的 OpenAlex 来源回填。",
        "会议覆盖度仍会受 OpenAlex 对具体年份论文集的索引方式影响。",
        "系统不会批量下载出版商 PDF；本地 PDF 只能通过 pdf_inbox 私有流程关联。",
      ],
      professorScoring: {
        formula: "author_score = score_sum + 5 * s_plus_count + 2 * s_count + citation_count / 50",
        caveat: "当前作者身份主要基于姓名归一。严肃使用前应加入 ORCID、机构和人工合并/拆分复核。",
      },
    };
  },
};
