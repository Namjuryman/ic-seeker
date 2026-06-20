import { db } from "../db/connection.js";
import { papers, favorites, readingStatus, notes, tags, paperTags, importLog } from "../db/schema.js";
import { sql, eq, and } from "drizzle-orm";
import { searchService, semanticText } from "./search.service.js";
import { appConfig } from "../config.js";
import { toPaperRow } from "./paper-row.js";

function normalizeTags(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : String(raw || "").split(",");
  return [...new Set(arr.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 12))];
}

function inferDomain(text: string): string {
  const hay = String(text || "").toLowerCase();
  const rules: Array<[string, string[]]> = [
    ["Data Converters", ["adc", "dac", "converter", "sar", "pipeline", "delta-sigma", "delta sigma"]],
    ["Frequency Generation", ["pll", "oscillator", "clock", "jitter", "synthesizer"]],
    ["Power Management", ["ldo", "buck", "boost", "regulator", "dc-dc", "power management"]],
    ["RF/Wireless", ["rf", "wireless", "mixer", "lna", "pa", "transceiver"]],
    ["Wireline", ["serdes", "wireline", "cdr", "equalizer"]],
    ["Memory/Compute", ["sram", "dram", "memory", "compute-in-memory", "accelerator"]],
    ["EDA/Digital", ["placement", "routing", "verification", "fpga", "digital"]],
  ];
  for (const [domain, keys] of rules) {
    if (keys.some((key) => hay.includes(key))) return domain;
  }
  return "General IC";
}

const venueRankMap = new Map<string, string>([
  ["ISSCC", "S+"],
  ["JSSC", "S+"],
  ["VLSI Symposium", "S"],
  ["CICC", "S"],
  ["IEDM", "S"],
  ["ASSCC", "A"],
  ["ESSCIRC", "A"],
  ["DAC", "A"],
  ["ICCAD", "A"],
  ["TCAD", "A"],
  ["DATE", "A"],
  ["TCAS-I", "A"],
  ["TCAS-II", "A"],
  ["TVLSI", "A"],
  ["ISCAS", "B"],
  ["Nature Electron.", "SS+"],
  ["Nat. Electronics", "SS+"],
  ["Nature", "SSS"],
  ["Nat. Commun.", "Hidden"],
  ["IEEE T-MTT", "A+"],
  ["IEEE TED", "B+"],
  ["IEEE EDL", "Hidden"],
  ["IEEE Sensors J.", "B-"],
  ["Adv. Mater.", "Hidden"],
  ["Appl. Phys. Lett.", "Hidden"],
  ["Solid-State Electron.", "C+"],
  ["IEEE JMEMS", "B-"],
  ["IEEE T-Nano", "C+"],
  ["Microelectron. J.", "C"],
]);

function venueRank(venue: string): string {
  return venueRankMap.get(venue) || "User";
}

function baseScore(venue: string, year: number, citations = 0): number {
  const baseMap: Record<string, number> = {
    ISSCC: 100, JSSC: 100, "VLSI Symposium": 92, CICC: 86, IEDM: 84,
    ASSCC: 78, ESSCIRC: 76, DAC: 74, ICCAD: 74, TCAD: 70, DATE: 66,
    "TCAS-I": 64, TVLSI: 62, "TCAS-II": 60, ISCAS: 54,
    "Nature Electron.": 115, "Nat. Electronics": 115, Nature: 125,
    "IEEE T-MTT": 78, "IEEE TED": 50, "Solid-State Electron.": 36,
    "IEEE JMEMS": 42, "IEEE T-Nano": 34, "Microelectron. J.": 32,
  };
  const base = baseMap[venue] || 50;
  return Math.round((base + Math.min(Number(citations || 0), 300) / 25 + Math.max(0, Number(year || 2016) - 2016) * 0.35) * 10) / 10;
}

function rebuildFtsForPaper(paperId: number) {
  const row = db.select({
    id: papers.id,
    title: papers.title,
    authors: papers.authors,
    abstract: papers.abstract,
    venue: papers.venue,
    domain: papers.domain,
    doi: papers.doi,
  }).from(papers).where(eq(papers.id, paperId)).get();
  if (!row) return;
  db.run(sql`DELETE FROM papers_fts WHERE rowid = ${paperId}`);
  db.run(sql`INSERT INTO papers_fts (rowid, title, authors, abstract, venue, domain, doi) VALUES (${paperId}, ${row.title || ""}, ${row.authors || ""}, ${row.abstract || ""}, ${row.venue || ""}, ${row.domain || ""}, ${row.doi || ""})`);
}

export const paperService = {
  getPaper(id: number, userId = 0) {
    const row = db.select().from(papers).where(eq(papers.id, id)).get();
    if (!row) return null;
    const [enriched] = searchService.enrichWithUserState([toPaperRow(row) as unknown as { id: number; [key: string]: unknown }], userId);
    const note = db.select({ body: notes.body })
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.paperId, id)))
      .get();
    return { ...enriched, note: note?.body || "" };
  },

  upsertPaperState(id: number, body: Record<string, unknown>, userId = 0) {
    const exists = db.select({ id: papers.id }).from(papers).where(eq(papers.id, id)).get();
    if (!exists) return null;

    if (typeof body.favorite === "boolean") {
      if (body.favorite) {
        db.insert(favorites).values({ userId, paperId: id }).onConflictDoNothing().run();
      } else {
        db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.paperId, id))).run();
      }
    }

    if (body.readingStatus) {
      const allowed = new Set(["unread", "reading", "read", "important", "skip"]);
      const status = allowed.has(String(body.readingStatus)) ? String(body.readingStatus) : "unread";
      db.insert(readingStatus).values({ userId, paperId: id, status })
        .onConflictDoUpdate({ target: [readingStatus.userId, readingStatus.paperId], set: { status, updatedAt: sql`CURRENT_TIMESTAMP` } })
        .run();
    }

    if (typeof body.note === "string") {
      db.insert(notes).values({ userId, paperId: id, body: body.note.slice(0, 20000) })
        .onConflictDoUpdate({ target: [notes.userId, notes.paperId], set: { body: body.note.slice(0, 20000), updatedAt: sql`CURRENT_TIMESTAMP` } })
        .run();
    }

    if ("tags" in body) {
      db.delete(paperTags).where(and(eq(paperTags.userId, userId), eq(paperTags.paperId, id))).run();
      for (const tag of normalizeTags(body.tags)) {
        db.insert(tags).values({ name: tag }).onConflictDoNothing().run();
        const tagRow = db.select({ id: tags.id }).from(tags).where(eq(tags.name, tag)).get();
        if (tagRow) {
          db.insert(paperTags).values({ userId, paperId: id, tagId: tagRow.id }).onConflictDoNothing().run();
        }
      }
    }

    return this.getPaper(id, userId);
  },

  getAllTags(userId = 0) {
    return db.select({
      name: tags.name,
      color: tags.color,
      papers: sql<number>`COUNT(${paperTags.paperId})`,
    }).from(tags)
      .leftJoin(paperTags, and(eq(paperTags.tagId, tags.id), eq(paperTags.userId, userId)))
      .groupBy(tags.id)
      .orderBy(tags.name)
      .all();
  },

  insertPaper(input: Record<string, unknown>) {
    const title = String(input.title || "").trim();
    if (!title) throw new Error("Title is required");
    const doi = String(input.doi || "").trim().replace(/^https?:\/\/doi\.org\//i, "");
    const authors = Array.isArray(input.authors) ? (input.authors as string[]).join("; ") : String(input.authors || "");
    const abstract = String(input.abstract || "");
    const venue = String(input.venue || input.publication_title || "User Import").trim();
    const year = Number(input.year || new Date().getFullYear());
    const domain = String(input.domain || inferDomain(`${title} ${abstract} ${venue}`));
    const citations = Number(input.citation_count || input.citations || 0);
    const sourceUrl = String(input.source_url || (doi ? `https://doi.org/${doi}` : ""));

    if (doi) {
      const existing = db.select({ id: papers.id }).from(papers).where(sql`LOWER(${papers.doi}) = LOWER(${doi})`).get();
      if (existing) return this.getPaper(existing.id, 0);
    }

    const result = db.insert(papers).values({
      title,
      authors,
      affiliations: String(input.affiliations || ""),
      abstract,
      year,
      venue,
      publicationTitle: String(input.publication_title || venue),
      venueRank: venueRank(venue),
      domain,
      domainHits: 0,
      qualityScore: baseScore(venue, year, citations),
      doi,
      pdfLink: String(input.pdf_link || ""),
      sourceUrl,
      openalexId: String(input.openalex_id || ""),
      ieeeArticleNumber: String(input.ieee_article_number || ""),
      collectionMethod: String(input.collection_method || "manual_import"),
      downloadStatus: String(input.download_status || "metadata_only"),
      localPdf: String(input.local_pdf || ""),
      citationCount: citations,
      verificationStatus: String(input.verification_status || (doi ? "doi_verified" : "user_entered")),
      userAdded: true,
      semanticText: semanticText(`${title} ${abstract} ${domain}`),
    }).returning({ id: papers.id }).get();

    const paperId = result.id;
    rebuildFtsForPaper(paperId);
    db.insert(importLog).values({
      source: String(input.collection_method || "manual_import"),
      status: "ok",
      message: title,
    }).run();

    return this.getPaper(paperId, 0);
  },

  async importByDoi(doi: string) {
    const cleanDoi = String(doi || "").trim().replace(/^https?:\/\/doi\.org\//i, "");
    if (!cleanDoi) throw new Error("DOI is required");
    const mailto = appConfig.crossrefMailto ? `?mailto=${encodeURIComponent(appConfig.crossrefMailto)}` : "";
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}${mailto}`, {
      headers: { "user-agent": `SiliconScope (${appConfig.crossrefMailto || "local"})` },
    });
    if (!res.ok) throw new Error(`Crossref returned ${res.status}`);
    const data = await res.json() as { message?: Record<string, any> };
    const item = data.message || {};
    const published = item.published?.["date-parts"]?.[0] || item.created?.["date-parts"]?.[0] || [];
    const authors = (item.author || []).map((author: { given?: string; family?: string }) =>
      [author.given, author.family].filter(Boolean).join(" ")
    ).filter(Boolean);

    return this.insertPaper({
      title: item.title?.[0] || cleanDoi,
      authors,
      abstract: String(item.abstract || "").replace(/<[^>]+>/g, " "),
      year: published[0],
      venue: item["container-title"]?.[0] || item.publisher || "Crossref",
      publication_title: item["container-title"]?.[0] || "",
      doi: item.DOI || cleanDoi,
      source_url: item.URL || `https://doi.org/${cleanDoi}`,
      citation_count: item["is-referenced-by-count"] || 0,
      collection_method: "crossref_doi_import",
      verification_status: "doi_verified",
    });
  },
};
