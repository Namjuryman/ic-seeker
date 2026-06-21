import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { appConfig } from "../config.js";
import { ensureCompanyTables } from "./company-schema.js";
import {
  COMPANY_TYPE_MAP,
  REGION_COUNTRY_MAP,
  companySeedData,
  type RawCompanySeed,
} from "../data/company-seed/index.js";

type BetterSqliteDatabase = ReturnType<typeof Database>;

type CompanyPayload = {
  name: string;
  legalName: string;
  aliases: string[];
  country: string;
  city?: string;
  website?: string;
  companyType: string;
  status: "active";
  foundedYear?: number;
  employeeCount?: string;
  employeeCountRange: "exact" | "range" | "estimated" | "unknown";
  stockTicker?: string;
  exchange?: string;
  description: string;
  productLines: string[];
  domains: string[];
  technologyKeywords: string[];
  applicationMarkets: string[];
  careerRoles: string[];
  hiringSignals: string[];
  dataConfidence: number;
};

type CompanyServiceLike = {
  createCompany(body: Record<string, unknown>): Record<string, unknown> | null;
  updateCompany(id: string, body: Record<string, unknown>): Record<string, unknown> | null;
};

type ExistingCompany = {
  id: string;
  name: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.resolve(__dirname, "../../ic_database/ic_papers.sqlite");
const dbPath = appConfig.dbPath || defaultDbPath;

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((v) => (v || "").trim()).filter(Boolean))];
}

function inferEmployeeRange(value?: string): CompanyPayload["employeeCountRange"] {
  if (!value) return "unknown";
  if (value.includes("+") || value.includes("-")) return "estimated";
  return "range";
}

function inferCareerRoles(seed: RawCompanySeed): string[] {
  const text = `${seed.type} ${seed.specialties.join(" ")}`.toLowerCase();
  const roles = new Set<string>();
  if (text.includes("analog") || text.includes("power") || text.includes("rf") || text.includes("data converter")) {
    roles.add("Analog IC Design Engineer");
  }
  if (text.includes("rf") || text.includes("mmwave") || text.includes("wireless")) {
    roles.add("RF/mmWave IC Design Engineer");
  }
  if (text.includes("soc") || text.includes("cpu") || text.includes("gpu") || text.includes("npu") || text.includes("digital")) {
    roles.add("Digital IC / SoC Engineer");
  }
  if (text.includes("memory") || text.includes("dram") || text.includes("nand") || text.includes("sram")) {
    roles.add("Memory Circuit / Storage Architect");
  }
  if (text.includes("foundry") || text.includes("process") || text.includes("wafer") || text.includes("manufacturing")) {
    roles.add("Process Integration Engineer");
  }
  if (text.includes("packaging") || text.includes("chiplet") || text.includes("sip")) {
    roles.add("Packaging / SI-PI Engineer");
  }
  if (text.includes("eda") || text.includes("verification") || text.includes("simulation")) {
    roles.add("EDA / Verification Engineer");
  }
  if (text.includes("equipment") || text.includes("materials") || text.includes("lithography") || text.includes("etch")) {
    roles.add("Semiconductor Equipment / Materials Engineer");
  }
  return [...roles].length ? [...roles] : ["IC Product / Application Engineer"];
}

function inferMarkets(seed: RawCompanySeed): string[] {
  const text = `${seed.description} ${seed.specialties.join(" ")}`.toLowerCase();
  const markets = new Set<string>();
  if (text.includes("automotive") || text.includes("车")) markets.add("Automotive");
  if (text.includes("data center") || text.includes("server") || text.includes("hpc")) markets.add("Data Center");
  if (text.includes("mobile") || text.includes("phone")) markets.add("Mobile");
  if (text.includes("iot") || text.includes("wearable")) markets.add("IoT / Wearables");
  if (text.includes("industrial") || text.includes("工业")) markets.add("Industrial");
  if (text.includes("consumer") || text.includes("tv") || text.includes("audio")) markets.add("Consumer Electronics");
  return [...markets];
}

function toPayload(seed: RawCompanySeed): CompanyPayload {
  const companyType = COMPANY_TYPE_MAP[seed.type];
  const country = REGION_COUNTRY_MAP[seed.region];
  const aliases = unique([seed.nameEn, seed.ticker, ...(seed.aliases || [])]);
  return {
    name: seed.name,
    legalName: seed.nameEn,
    aliases,
    country,
    city: seed.city || seed.headquarters,
    website: seed.website,
    companyType,
    status: "active",
    foundedYear: seed.foundedYear,
    employeeCount: seed.employees,
    employeeCountRange: inferEmployeeRange(seed.employees),
    stockTicker: seed.ticker,
    exchange: seed.exchange,
    description: seed.description,
    productLines: seed.specialties,
    domains: seed.domains || [],
    technologyKeywords: seed.specialties,
    applicationMarkets: inferMarkets(seed),
    careerRoles: inferCareerRoles(seed),
    hiringSignals: unique([
      `${companyType} company`,
      ...(seed.domains || []),
      ...seed.specialties.slice(0, 6),
    ]),
    dataConfidence: seed.sourceUrls?.length ? 82 : 70,
  };
}

function ensureSeedSource(sqlite: BetterSqliteDatabase, companyId: string, seed: RawCompanySeed, payload: CompanyPayload): void {
  const now = new Date().toISOString();
  const sourceUrls = seed.sourceUrls && seed.sourceUrls.length ? seed.sourceUrls : [seed.website].filter(Boolean) as string[];
  for (const [index, sourceUrl] of sourceUrls.entries()) {
    const id = `seed-src-${companyId}-${index}`;
    sqlite.prepare(`
      INSERT INTO company_sources (id, company_id, source_type, source_name, source_url, fetched_at, payload_json, confidence, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        source_url = excluded.source_url,
        fetched_at = excluded.fetched_at,
        payload_json = excluded.payload_json,
        confidence = excluded.confidence,
        notes = excluded.notes
    `).run(
      id,
      companyId,
      "company_website",
      `${seed.nameEn} public source`,
      sourceUrl,
      now,
      JSON.stringify({
        name: seed.name,
        nameEn: seed.nameEn,
        type: seed.type,
        region: seed.region,
        specialties: seed.specialties,
      }),
      payload.dataConfidence,
      "Seeded from public company metadata; verify exact employee counts during future enrichment."
    );
  }
}

function ensureFieldFacts(sqlite: BetterSqliteDatabase, companyId: string, seed: RawCompanySeed, payload: CompanyPayload): void {
  const facts = [
    ["nameEn", seed.nameEn],
    ["rawType", seed.type],
    ["rawRegion", seed.region],
    ["companyType", payload.companyType],
    ["country", payload.country],
    ["employees", seed.employees || ""],
    ["specialties", seed.specialties.join(", ")],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  for (const [fieldName, fieldValue] of facts) {
    const id = `seed-fact-${companyId}-${fieldName}`;
    sqlite.prepare(`
      INSERT INTO company_field_facts (id, company_id, field_name, field_value, source_id, confidence, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        field_value = excluded.field_value,
        confidence = excluded.confidence,
        fetched_at = excluded.fetched_at
    `).run(id, companyId, fieldName, fieldValue, `seed-src-${companyId}-0`, payload.dataConfidence, new Date().toISOString());
  }
}

function ensureJobSignals(sqlite: BetterSqliteDatabase, companyId: string, payload: CompanyPayload): void {
  for (const [index, role] of payload.careerRoles.entries()) {
    const id = `seed-job-${companyId}-${index}`;
    sqlite.prepare(`
      INSERT INTO company_job_signals (id, company_id, role_title, role_category, location, source_url, fetched_at, status, keywords_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        role_title = excluded.role_title,
        role_category = excluded.role_category,
        location = excluded.location,
        fetched_at = excluded.fetched_at,
        keywords_json = excluded.keywords_json
    `).run(
      id,
      companyId,
      role,
      payload.companyType,
      payload.city || payload.country,
      payload.website || null,
      new Date().toISOString(),
      "unknown",
      JSON.stringify(payload.technologyKeywords.slice(0, 10))
    );
  }
}

function rawUpsertCompany(sqlite: BetterSqliteDatabase, seed: RawCompanySeed, payload: CompanyPayload): ExistingCompany {
  const existing = sqlite.prepare(
    "SELECT id, name FROM companies WHERE name = ? OR legal_name = ?"
  ).get(payload.name, payload.legalName) as ExistingCompany | undefined;
  const id = existing?.id || `seed-co-${payload.legalName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  const now = new Date().toISOString();
  sqlite.prepare(`
    INSERT INTO companies (
      id, name, legal_name, aliases_json, country, city, website, company_type, status,
      founded_year, employee_count, employee_count_range, stock_ticker, exchange, description,
      product_lines_json, domains_json, technology_keywords_json, application_markets_json,
      career_roles_json, hiring_signals_json, data_confidence, last_enriched_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      legal_name = excluded.legal_name,
      aliases_json = excluded.aliases_json,
      country = excluded.country,
      city = excluded.city,
      website = excluded.website,
      company_type = excluded.company_type,
      status = excluded.status,
      founded_year = excluded.founded_year,
      employee_count = excluded.employee_count,
      employee_count_range = excluded.employee_count_range,
      stock_ticker = excluded.stock_ticker,
      exchange = excluded.exchange,
      description = excluded.description,
      product_lines_json = excluded.product_lines_json,
      domains_json = excluded.domains_json,
      technology_keywords_json = excluded.technology_keywords_json,
      application_markets_json = excluded.application_markets_json,
      career_roles_json = excluded.career_roles_json,
      hiring_signals_json = excluded.hiring_signals_json,
      data_confidence = excluded.data_confidence,
      last_enriched_at = excluded.last_enriched_at,
      updated_at = excluded.updated_at
  `).run(
    id,
    payload.name,
    payload.legalName,
    JSON.stringify(payload.aliases),
    payload.country,
    payload.city || null,
    payload.website || null,
    payload.companyType,
    payload.status,
    payload.foundedYear || null,
    payload.employeeCount || null,
    payload.employeeCountRange,
    payload.stockTicker || null,
    payload.exchange || null,
    payload.description,
    JSON.stringify(payload.productLines),
    JSON.stringify(payload.domains),
    JSON.stringify(payload.technologyKeywords),
    JSON.stringify(payload.applicationMarkets),
    JSON.stringify(payload.careerRoles),
    JSON.stringify(payload.hiringSignals),
    payload.dataConfidence,
    now,
    now
  );

  sqlite.prepare("DELETE FROM company_aliases WHERE company_id = ? AND source = 'seed'").run(id);
  for (const [index, alias] of payload.aliases.entries()) {
    sqlite.prepare(`
      INSERT INTO company_aliases (id, alias, company_id, canonical_name, source, confidence)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`seed-alias-${id}-${index}`, alias, id, payload.name, "seed", 95);
  }

  ensureSeedSource(sqlite, id, seed, payload);
  ensureFieldFacts(sqlite, id, seed, payload);
  ensureJobSignals(sqlite, id, payload);
  return { id, name: payload.name };
}

async function loadCompanyService(): Promise<CompanyServiceLike | null> {
  try {
    const module = await import("../services/company.service.js");
    return module.companyService as CompanyServiceLike;
  } catch (err) {
    console.warn(`companyService unavailable, falling back to raw SQL: ${(err as Error).message}`);
    return null;
  }
}

function findExisting(sqlite: BetterSqliteDatabase, name: string): ExistingCompany | undefined {
  return sqlite.prepare("SELECT id, name FROM companies WHERE name = ?").get(name) as ExistingCompany | undefined;
}

async function main(): Promise<void> {
  const sqlite = new Database(dbPath);
  ensureCompanyTables(sqlite);
  sqlite.close();

  const service = await loadCompanyService();
  const verifyDb = new Database(dbPath);
  ensureCompanyTables(verifyDb);

  let created = 0;
  let updated = 0;
  let rawFallback = 0;

  for (const seed of companySeedData) {
    const payload = toPayload(seed);
    const existing = findExisting(verifyDb, payload.name);
    try {
      if (service) {
        if (existing) {
          service.updateCompany(existing.id, payload);
          ensureSeedSource(verifyDb, existing.id, seed, payload);
          ensureFieldFacts(verifyDb, existing.id, seed, payload);
          ensureJobSignals(verifyDb, existing.id, payload);
          updated += 1;
        } else {
          const row = service.createCompany(payload) as { id?: string } | null;
          const id = row?.id || findExisting(verifyDb, payload.name)?.id;
          if (id) {
            ensureSeedSource(verifyDb, id, seed, payload);
            ensureFieldFacts(verifyDb, id, seed, payload);
            ensureJobSignals(verifyDb, id, payload);
          }
          created += 1;
        }
      } else {
        const row = rawUpsertCompany(verifyDb, seed, payload);
        existing ? updated += 1 : created += 1;
        rawFallback += 1;
        ensureSeedSource(verifyDb, row.id, seed, payload);
      }
    } catch (err) {
      console.warn(`Service upsert failed for ${payload.name}, using raw SQL: ${(err as Error).message}`);
      rawUpsertCompany(verifyDb, seed, payload);
      existing ? updated += 1 : created += 1;
      rawFallback += 1;
    }
  }

  const count = verifyDb.prepare("SELECT COUNT(*) as n FROM companies").get() as { n: number };
  const byType = verifyDb
    .prepare("SELECT company_type as type, COUNT(*) as n FROM companies GROUP BY company_type ORDER BY n DESC")
    .all() as Array<{ type: string; n: number }>;
  verifyDb.close();

  console.log(`Seeded companies into ${dbPath}`);
  console.log(`Created ${created}, updated ${updated}, raw fallback ${rawFallback}. Total companies: ${count.n}.`);
  console.table(byType);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
