import { appConfig } from "../config.js";
import { getDataLayerTopology } from "../db/topology.js";

type ModuleStatus = "ready" | "partial" | "planned";
type ModuleTrack = "research" | "learning" | "business" | "operations" | "community" | "commercial";

export type PlatformModule = {
  id: string;
  name: string;
  track: ModuleTrack;
  status: ModuleStatus;
  maturity: number;
  summary: string;
  shipped: string[];
  next: string[];
};

const modules: PlatformModule[] = [
  {
    id: "paper-search",
    name: "Paper Search Workbench",
    track: "research",
    status: "ready",
    maturity: 82,
    summary: "Structured paper search, detail rail, reading state, notes, tags, and DOI/PDF links.",
    shipped: ["SQLite FTS search", "semantic-lite expansion", "paper detail rail", "reading state"],
    next: ["Meilisearch/OpenSearch index", "IEEE ingestion adapter", "PDF local matching"],
  },
  {
    id: "profiles",
    name: "Scholar and Institution Profiles",
    track: "research",
    status: "partial",
    maturity: 64,
    summary: "Author and institution pages are useful, but identity resolution still needs verified affiliation sources.",
    shipped: ["author profile", "institution profile", "career/activity charts", "alias admin"],
    next: ["ORCID/IEEE affiliation merge", "faculty homepage crawler", "photo/logo object storage"],
  },
  {
    id: "mentor-intelligence",
    name: "Mentor Intelligence",
    track: "community",
    status: "partial",
    maturity: 52,
    summary: "Mentor candidates and reviews exist; production use needs verification, thresholds, and stronger moderation.",
    shipped: ["mentor institutions", "mentor profiles", "anonymous reviews", "thresholded comparison"],
    next: ["verified reviewer workflow", "abuse reporting", "career timeline enrichment"],
  },
  {
    id: "company-intelligence",
    name: "Company Intelligence",
    track: "business",
    status: "partial",
    maturity: 58,
    summary: "Company database is seeded and searchable, with related papers and roadmaps wired in.",
    shipped: ["company seed data", "company search", "watchlist", "company comparison"],
    next: ["job signal ingestion", "company aliases review", "funding/news/event timeline"],
  },
  {
    id: "learning",
    name: "Learning and Daily Circuit",
    track: "learning",
    status: "ready",
    maturity: 74,
    summary: "Route library and daily lesson workspace are in place for IC self-study and mobile-style learning.",
    shipped: ["route families", "common foundations", "daily lessons", "related papers"],
    next: ["progress tracking", "spaced review", "reading queue handoff"],
  },
  {
    id: "geo-venue",
    name: "Geo, Topic, and Venue Intelligence",
    track: "research",
    status: "partial",
    maturity: 61,
    summary: "Geographic maps, topic reports, and venue matrix are available, but geocoding and topic classification need hardening.",
    shipped: ["geo map", "topic reports", "venue matrix", "journal filter evaluation"],
    next: ["city-level geocoding", "venue weighting audit", "topic classifier retraining"],
  },
  {
    id: "data-ops",
    name: "Data Operations",
    track: "operations",
    status: "partial",
    maturity: 55,
    summary: "Snapshots, data quality, identity aliases, and ingestion admin pages exist for weekly maintenance.",
    shipped: ["snapshot admin", "data quality report", "alias admin", "journal ingestion page"],
    next: ["scheduled weekly jobs", "snapshot diff report", "import provenance review"],
  },
  {
    id: "commercial-stack",
    name: "Commercial Stack",
    track: "commercial",
    status: "partial",
    maturity: 47,
    summary: "Independent-domain deployment, notification center, billing catalog, usage ledger, partial quota enforcement, admin plan management, local backup operations, and maintenance task records are in place; real payment and infrastructure adapters still need to be connected.",
    shipped: ["appDb adapter", "cacheDb adapter", "infra compose", "independent-domain templates", "notification center", "billing plan catalog", "usage ledger", "admin plan management", "backup operations", "maintenance task center"],
    next: ["Stripe/Paddle checkout adapter", "billing webhooks", "PostgreSQL app store", "Redis cache/queue", "object storage", "email/OAuth", "observability"],
  },
];

function trackScore(track: ModuleTrack) {
  const items = modules.filter((item) => item.track === track);
  if (!items.length) return 0;
  return Math.round(items.reduce((sum, item) => sum + item.maturity, 0) / items.length);
}

export const platformService = {
  getOverview() {
    const topology = getDataLayerTopology();
    const tracks: Array<{ id: ModuleTrack; name: string; score: number; modules: number }> = [
      { id: "research", name: "Research Intelligence", score: trackScore("research"), modules: modules.filter((m) => m.track === "research").length },
      { id: "learning", name: "Learning Product", score: trackScore("learning"), modules: modules.filter((m) => m.track === "learning").length },
      { id: "business", name: "Business Intelligence", score: trackScore("business"), modules: modules.filter((m) => m.track === "business").length },
      { id: "community", name: "Community", score: trackScore("community"), modules: modules.filter((m) => m.track === "community").length },
      { id: "operations", name: "Operations", score: trackScore("operations"), modules: modules.filter((m) => m.track === "operations").length },
      { id: "commercial", name: "Commercial Infra", score: trackScore("commercial"), modules: modules.filter((m) => m.track === "commercial").length },
    ];

    return {
      appName: appConfig.appName,
      generatedAt: new Date().toISOString(),
      topology,
      summary: {
        modules: modules.length,
        ready: modules.filter((m) => m.status === "ready").length,
        partial: modules.filter((m) => m.status === "partial").length,
        planned: modules.filter((m) => m.status === "planned").length,
        averageMaturity: Math.round(modules.reduce((sum, item) => sum + item.maturity, 0) / modules.length),
      },
      tracks,
      modules,
      nextMilestones: [
        "Make weekly ingestion jobs idempotent and visible in an operations page.",
        "Move app/business tables to PostgreSQL behind the existing appDb boundary.",
        "Move computed snapshots to Redis or a snapshot registry behind cacheDb.",
        "Add Meilisearch for papers, authors, institutions, companies, roadmaps, and venues.",
        "Add object storage for PDFs, avatars, institution logos, company logos, and uploaded attachments.",
        "Connect Stripe/Paddle checkout after the metadata policy, access control, and public demo boundaries are stable.",
      ],
    };
  },
};
