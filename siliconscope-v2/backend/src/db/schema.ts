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

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: integer("user_id", { mode: "number" }).notNull().default(0),
  planId: text("plan_id").notNull().default("free"),
  status: text("status").notNull().default("active"),
  provider: text("provider").notNull().default("manual"),
  providerCustomerId: text("provider_customer_id"),
  providerSubscriptionId: text("provider_subscription_id"),
  currentPeriodStart: text("current_period_start"),
  currentPeriodEnd: text("current_period_end"),
  cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).notNull().default(false),
  metadataJson: text("metadata_json"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const paymentCustomers = sqliteTable("payment_customers", {
  id: text("id").primaryKey(),
  userId: integer("user_id", { mode: "number" }).notNull().default(0),
  provider: text("provider").notNull().default("manual"),
  providerCustomerId: text("provider_customer_id").notNull().default(""),
  email: text("email"),
  metadataJson: text("metadata_json"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_payment_customers_provider_customer").on(table.provider, table.providerCustomerId),
]);

export const billingEvents = sqliteTable("billing_events", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id", { mode: "number" }).notNull().default(0),
  provider: text("provider").notNull().default("manual"),
  eventType: text("event_type").notNull(),
  providerEventId: text("provider_event_id"),
  planId: text("plan_id"),
  status: text("status").notNull().default("recorded"),
  payloadJson: text("payload_json"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const usageEvents = sqliteTable("usage_events", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id", { mode: "number" }).notNull().default(0),
  metric: text("metric").notNull(),
  quantity: integer("quantity", { mode: "number" }).notNull().default(1),
  source: text("source").notNull().default("app"),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  metadataJson: text("metadata_json"),
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

export const learningContentItems = sqliteTable("learning_content_items", {
  itemKind: text("item_kind").notNull(),
  itemId: text("item_id").notNull(),
  title: text("title").notNull().default(""),
  status: text("status").notNull().default("published"),
  source: text("source").notNull().default("seed"),
  sourceVersion: text("source_version").notNull().default("seed-v1"),
  payloadJson: text("payload_json").notNull(),
  payloadHash: text("payload_hash").notNull().default(""),
  bytes: integer("bytes", { mode: "number" }).notNull().default(0),
  syncedAt: text("synced_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedByUserId: integer("updated_by_user_id", { mode: "number" }),
}, (table) => [
  primaryKey({ columns: [table.itemKind, table.itemId] }),
]);

export const learningRoutes = sqliteTable("learning_routes", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull().default(""),
  shortTitle: text("short_title").notNull().default(""),
  domain: text("domain").notNull().default(""),
  level: text("level").notNull().default("intermediate"),
  family: text("family").notNull().default(""),
  accent: text("accent"),
  subtitle: text("subtitle"),
  description: text("description").notNull().default(""),
  paperQuery: text("paper_query"),
  status: text("status").notNull().default("published"),
  stageCount: integer("stage_count", { mode: "number" }).notNull().default(0),
  moduleCount: integer("module_count", { mode: "number" }).notNull().default(0),
  lessonCount: integer("lesson_count", { mode: "number" }).notNull().default(0),
  displayOrder: integer("display_order", { mode: "number" }).notNull().default(0),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const learningLessons = sqliteTable("learning_lessons", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default(""),
  roadmapSlug: text("roadmap_slug").notNull().default(""),
  moduleId: text("module_id").notNull().default(""),
  level: text("level").notNull().default("core"),
  estimatedMinutes: integer("estimated_minutes", { mode: "number" }).notNull().default(0),
  status: text("status").notNull().default("published"),
  displayOrder: integer("display_order", { mode: "number" }).notNull().default(0),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const learningRouteFamilies = sqliteTable("learning_route_families", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default(""),
  description: text("description").notNull().default(""),
  displayOrder: integer("display_order", { mode: "number" }).notNull().default(0),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const learningFoundations = sqliteTable("learning_foundations", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default(""),
  note: text("note").notNull().default(""),
  itemsJson: text("items_json").notNull().default("[]"),
  displayOrder: integer("display_order", { mode: "number" }).notNull().default(0),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const learningRouteFamilyMembers = sqliteTable("learning_route_family_members", {
  familyId: text("family_id").notNull(),
  routeSlug: text("route_slug").notNull(),
  displayOrder: integer("display_order", { mode: "number" }).notNull().default(0),
}, (table) => [
  primaryKey({ columns: [table.familyId, table.routeSlug] }),
]);

export const learningTerms = sqliteTable("learning_terms", {
  targetKind: text("target_kind").notNull(),
  targetId: text("target_id").notNull(),
  termKind: text("term_kind").notNull(),
  value: text("value").notNull(),
  displayOrder: integer("display_order", { mode: "number" }).notNull().default(0),
}, (table) => [
  primaryKey({ columns: [table.targetKind, table.targetId, table.termKind, table.value] }),
]);

// Company / Employer Intelligence tables
export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  legalName: text("legal_name"),
  aliasesJson: text("aliases_json"),
  country: text("country"),
  city: text("city"),
  website: text("website"),
  companyType: text("company_type"),
  status: text("status"), // active | dissolved | acquired | merged | unknown
  foundedYear: integer("founded_year", { mode: "number" }),
  registeredCapital: text("registered_capital"),
  employeeCount: text("employee_count"),
  employeeCountRange: text("employee_count_range"), // exact | range | estimated | unknown
  stockTicker: text("stock_ticker"),
  exchange: text("exchange"),
  description: text("description"),
  productLinesJson: text("product_lines_json"),
  domainsJson: text("domains_json"),
  technologyKeywordsJson: text("technology_keywords_json"),
  applicationMarketsJson: text("application_markets_json"),
  careerRolesJson: text("career_roles_json"),
  hiringSignalsJson: text("hiring_signals_json"),
  dataConfidence: integer("data_confidence", { mode: "number" }).notNull().default(0),
  lastEnrichedAt: text("last_enriched_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const companySources = sqliteTable("company_sources", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().default(""),
  sourceType: text("source_type").notNull().default("other"), // official_registry | company_website | annual_report | sec_edgar | companies_house | opencorporates | commercial_provider | manual | other
  sourceName: text("source_name").notNull().default(""),
  sourceUrl: text("source_url"),
  fetchedAt: text("fetched_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  payloadJson: text("payload_json"),
  confidence: integer("confidence", { mode: "number" }).notNull().default(0),
  notes: text("notes"),
});

export const companyAliases = sqliteTable("company_aliases", {
  id: text("id").primaryKey(),
  alias: text("alias").notNull().default(""),
  companyId: text("company_id").notNull().default(""),
  canonicalName: text("canonical_name").notNull().default(""),
  source: text("source").notNull().default("manual"),
  confidence: integer("confidence", { mode: "number" }).notNull().default(100),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const companyFieldFacts = sqliteTable("company_field_facts", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().default(""),
  fieldName: text("field_name").notNull().default(""),
  fieldValue: text("field_value").notNull().default(""),
  sourceId: text("source_id"),
  confidence: integer("confidence", { mode: "number" }).notNull().default(0),
  fetchedAt: text("fetched_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const companyJobSignals = sqliteTable("company_job_signals", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().default(""),
  roleTitle: text("role_title").notNull().default(""),
  roleCategory: text("role_category"),
  location: text("location"),
  sourceUrl: text("source_url"),
  fetchedAt: text("fetched_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  status: text("status").default("unknown"), // active | expired | unknown
  keywordsJson: text("keywords_json"),
});

// Watchlist items: user-saved companies and searches
export const watchlistItems = sqliteTable("watchlist_items", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id", { mode: "number" }).notNull().default(0),
  targetType: text("target_type").notNull().default("company"), // company | search
  targetId: text("target_id").notNull().default(""),
  queryJson: text("query_json"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
