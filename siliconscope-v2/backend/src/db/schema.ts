import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const papers = sqliteTable("papers", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  title: text("title").notNull().default(""),
  authors: text("authors").notNull().default(""),
  affiliations: text("affiliations").notNull().default(""),
  abstract: text("abstract").notNull().default(""),
  year: integer("year", { mode: "number" }).notNull().default(2024),
  venue: text("venue").notNull().default(""),
  publicationTitle: text("publication_title").notNull().default(""),
  venueRank: text("venue_rank").notNull().default(""),
  domain: text("domain").notNull().default("General IC"),
  domainHits: integer("domain_hits", { mode: "number" }).notNull().default(0),
  qualityScore: integer("quality_score", { mode: "number" }).notNull().default(0),
  doi: text("doi").notNull().default(""),
  pdfLink: text("pdf_link").notNull().default(""),
  sourceUrl: text("source_url").notNull().default(""),
  openalexId: text("openalex_id").notNull().default(""),
  ieeeArticleNumber: text("ieee_article_number").notNull().default(""),
  collectionMethod: text("collection_method").notNull().default(""),
  downloadStatus: text("download_status").notNull().default("metadata_only"),
  localPdf: text("local_pdf").notNull().default(""),
  citationCount: integer("citation_count", { mode: "number" }).notNull().default(0),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  userAdded: integer("user_added", { mode: "boolean" }).notNull().default(false),
  semanticText: text("semantic_text").notNull().default(""),
});

export const favorites = sqliteTable("favorites", {
  userId: integer("user_id", { mode: "number" }).notNull().default(0),
  paperId: integer("paper_id", { mode: "number" }).notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  primaryKey({ columns: [table.userId, table.paperId] }),
]);

export const readingStatus = sqliteTable("reading_status", {
  userId: integer("user_id", { mode: "number" }).notNull().default(0),
  paperId: integer("paper_id", { mode: "number" }).notNull(),
  status: text("status").notNull().default("unread"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  primaryKey({ columns: [table.userId, table.paperId] }),
]);

export const notes = sqliteTable("notes", {
  userId: integer("user_id", { mode: "number" }).notNull().default(0),
  paperId: integer("paper_id", { mode: "number" }).notNull(),
  body: text("body").notNull().default(""),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  primaryKey({ columns: [table.userId, table.paperId] }),
]);

export const tags = sqliteTable("tags", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#1d6fb8"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const paperTags = sqliteTable("paper_tags", {
  userId: integer("user_id", { mode: "number" }).notNull().default(0),
  paperId: integer("paper_id", { mode: "number" }).notNull(),
  tagId: integer("tag_id", { mode: "number" }).notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  primaryKey({ columns: [table.userId, table.paperId, table.tagId] }),
]);

export const apiKeys = sqliteTable("api_keys", {
  provider: text("provider").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const importLog = sqliteTable("import_log", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  source: text("source").notNull(),
  status: text("status").notNull(),
  message: text("message"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nickname: text("nickname"),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  verificationLevel: text("verification_level").notNull().default("none"),
  subscriptionPlan: text("subscription_plan").notNull().default("free"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const paperComments = sqliteTable("paper_comments", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  paperId: integer("paper_id", { mode: "number" }).notNull(),
  userId: integer("user_id", { mode: "number" }).notNull(),
  commentType: text("comment_type").notNull().default("Technical Note"),
  body: text("body").notNull().default(""),
  moderationStatus: text("moderation_status").notNull().default("pending"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const mentorReviews = sqliteTable("mentor_reviews", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  professorId: text("professor_id").notNull(),
  userId: integer("user_id", { mode: "number" }).notNull(),
  publicAlias: text("public_alias").notNull().default("Anonymous Verified Reviewer"),
  isVerifiedReview: integer("is_verified_review", { mode: "boolean" })
    .notNull()
    .default(false),
  relationshipType: text("relationship_type"),
  structuredScoresJson: text("structured_scores_json"),
  strengthsText: text("strengths_text"),
  cautionsText: text("cautions_text"),
  fitText: text("fit_text"),
  moderationStatus: text("moderation_status").notNull().default("pending"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const contentReports = sqliteTable("content_reports", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id", { mode: "number" }).notNull(),
  reporterUserId: integer("reporter_user_id", { mode: "number" }),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const moderationLogs = sqliteTable("moderation_logs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id", { mode: "number" }).notNull(),
  moderatorId: integer("moderator_id", { mode: "number" }),
  action: text("action").notNull(),
  reason: text("reason"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const qsRankings = sqliteTable("qs_rankings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  aliases: text("aliases").notNull().default(""),
  qsWorldRank: integer("qs_world_rank", { mode: "number" }),
  qsRegionRank: integer("qs_region_rank", { mode: "number" }),
  region: text("region"),
});

export const institutionAliases = sqliteTable("institution_aliases", {
  alias: text("alias").primaryKey(),
  canonicalName: text("canonical_name").notNull(),
  countryCode: text("country_code"),
  countryName: text("country_name"),
  city: text("city"),
  source: text("source").notNull().default("manual"),
  confidence: integer("confidence", { mode: "number" }).notNull().default(100),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const authorAliases = sqliteTable("author_aliases", {
  alias: text("alias").primaryKey(),
  canonicalName: text("canonical_name").notNull(),
  institutionHint: text("institution_hint"),
  source: text("source").notNull().default("manual"),
  confidence: integer("confidence", { mode: "number" }).notNull().default(100),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// FTS5 virtual table is handled via raw SQL in migrations since Drizzle doesn't natively support FTS5
export const papersFts = sqliteTable("papers_fts", {
  rowid: integer("rowid", { mode: "number" }).primaryKey(),
  title: text("title").notNull().default(""),
  authors: text("authors").notNull().default(""),
  abstract: text("abstract").notNull().default(""),
  venue: text("venue").notNull().default(""),
  domain: text("domain").notNull().default(""),
  doi: text("doi").notNull().default(""),
});

// Coming soon: lightweight user learning progress (reserved table; no backend logic yet)
export const learningProgress = sqliteTable("learning_progress", {
  id: text("id").primaryKey(),
  userId: integer("user_id", { mode: "number" }).notNull().default(0),
  lessonId: text("lesson_id").notNull(),
  status: text("status").notNull().default("not_started"), // not_started | reading | completed | review_later
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
