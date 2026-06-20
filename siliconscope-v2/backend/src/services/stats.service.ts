import { appConfig } from "../config.js";
import { db } from "../db/connection.js";
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
  if (/^manual/i.test(value)) return "Manual";
  return value;
}

export const statsService = {
  getStats(userId = 0) {
    const total = db.select({ count: count() }).from(papers).get()?.count ?? 0;
    const pdfs = db.select({ count: count() }).from(papers).where(ne(papers.localPdf, "")).get()?.count ?? 0;
    const aminerRows = db.select({ count: count() }).from(papers)
      .where(sql`${papers.openalexId} LIKE 'aminer:%' OR ${papers.collectionMethod} LIKE 'aminer%'`)
      .get()?.count ?? 0;
    const favoriteCount = db.select({ count: count() }).from(favorites).where(eq(favorites.userId, userId)).get()?.count ?? 0;
    const notesCount = db.select({ count: count() }).from(notes).where(and(eq(notes.userId, userId), ne(notes.body, ""))).get()?.count ?? 0;
    const tagsList = db.select().from(tags).orderBy(tags.name).all();
    const years = db.select({
      minYear: sql<number>`MIN(${papers.year})`,
      maxYear: sql<number>`MAX(${papers.year})`,
    }).from(papers).get();

    const byVenue = db.select({
      venue: papers.venue,
      rank: papers.venueRank,
      count: count(),
      avgScore: sql<number>`ROUND(AVG(${papers.qualityScore}), 1)`,
    }).from(papers).groupBy(papers.venue, papers.venueRank)
      .orderBy(sql`MAX(${papers.qualityScore}) DESC`).all();

    const byField = db.select({
      field: papers.domain,
      count: count(),
    }).from(papers).groupBy(papers.domain).orderBy(sql`COUNT(*) DESC`).all();

    const byVenueYear = db.select({
      venue: papers.venue,
      year: papers.year,
      count: count(),
    }).from(papers).groupBy(papers.venue, papers.year)
      .orderBy(papers.venue, papers.year).all();

    const byCollectionMethod = db.select({
      method: sql<string>`COALESCE(NULLIF(${papers.collectionMethod}, ''), 'unknown')`,
      count: count(),
    }).from(papers)
      .groupBy(sql`COALESCE(NULLIF(${papers.collectionMethod}, ''), 'unknown')`)
      .orderBy(sql`COUNT(*) DESC, COALESCE(NULLIF(${papers.collectionMethod}, ''), 'unknown')`).all();

    const byVerification = db.select({
      status: sql<string>`COALESCE(NULLIF(${papers.verificationStatus}, ''), 'unverified')`,
      count: count(),
    }).from(papers)
      .groupBy(sql`COALESCE(NULLIF(${papers.verificationStatus}, ''), 'unverified')`)
      .orderBy(sql`COUNT(*) DESC, COALESCE(NULLIF(${papers.verificationStatus}, ''), 'unverified')`).all();

    const venues = db.selectDistinct({ venue: papers.venue }).from(papers)
      .orderBy(papers.venue).all().map(r => r.venue);
    const fields = db.selectDistinct({ domain: papers.domain }).from(papers)
      .orderBy(papers.domain).all().map(r => r.domain);
    const ranks = db.selectDistinct({ rank: papers.venueRank }).from(papers)
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
    const rows = db.select().from(apiKeys).orderBy(apiKeys.provider).all();
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
    if (!clean) throw new Error("Invalid provider");
    if (value) {
      db.insert(apiKeys).values({ provider: clean, value: String(value).trim() })
        .onConflictDoUpdate({ target: apiKeys.provider, set: { value: String(value).trim(), updatedAt: sql`CURRENT_TIMESTAMP` } })
        .run();
    } else {
      db.delete(apiKeys).where(eq(apiKeys.provider, clean)).run();
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
      importCommand: "npm run import:pdfs",
    };
  },

  getMethodology() {
    return {
      scoring: {
        formula: "quality_score = venue_base + citation_boost + recency_boost",
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
        "Each paper is scored against IC-domain keyword dictionaries using title, abstract, source name, and OpenAlex concepts.",
        "The domain with the most keyword hits wins; if no domain wins but IC terms are present, it falls back to General IC.",
        "Broad IC-adjacent journals are visible as metadata but heavily downweighted.",
        "This is intentionally transparent and editable. It is not a learned model yet.",
      ],
      coverage: [
        "The builder now uses venue-year OpenAlex search for every configured year, then backfills from resolved OpenAlex sources.",
        "Conference coverage can still depend on how OpenAlex indexes a specific proceedings year.",
        "Publisher PDFs are not mass-downloaded; local PDFs can be attached through the pdf_inbox workflow.",
      ],
      professorScoring: {
        formula: "author_score = score_sum + 5 * s_plus_count + 2 * s_count + citation_count / 50",
        caveat: "Current author identity is name-based. ORCID/institution disambiguation should be added before using it seriously.",
      },
    };
  },
};
