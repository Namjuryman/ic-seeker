import { sql } from "drizzle-orm";
import { db, sqlite } from "../db/connection.js";
import { companies, companyAliases, companySources, companyFieldFacts } from "../db/schema.js";
import { searchService } from "./search.service.js";
import { learningRoadmaps } from "../data/learning-catalog.js";

const ORDER_BY_COLUMNS: Record<string, string> = {
  name: "name",
  dataConfidence: "data_confidence",
  lastEnrichedAt: "last_enriched_at",
  createdAt: "created_at",
};

function safeOrderBy(value: unknown): string {
  const s = String(value || "name").trim();
  return ORDER_BY_COLUMNS[s] || "name";
}

function safeLimit(value: unknown): number {
  const n = Number(value || 50);
  return Math.max(1, Math.min(200, Number.isFinite(n) ? n : 50));
}

function safeOffset(value: unknown): number {
  const n = Number(value || 0);
  return Math.max(0, Number.isFinite(n) ? n : 0);
}

function generateId(): string {
  return `co-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseJson(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function toJson(value: string[] | null): string | null {
  if (!value || !value.length) return null;
  return JSON.stringify(value);
}

function enrichCompany(row: Record<string, any>): Record<string, any> {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legal_name ?? row.legalName,
    aliases: parseJson(row.aliases_json ?? row.aliasesJson),
    country: row.country,
    city: row.city,
    website: row.website,
    companyType: row.company_type ?? row.companyType,
    status: row.status,
    foundedYear: row.founded_year ?? row.foundedYear,
    registeredCapital: row.registered_capital ?? row.registeredCapital,
    employeeCount: row.employee_count ?? row.employeeCount,
    employeeCountRange: row.employee_count_range ?? row.employeeCountRange,
    stockTicker: row.stock_ticker ?? row.stockTicker,
    exchange: row.exchange,
    description: row.description,
    productLines: parseJson(row.product_lines_json ?? row.productLinesJson),
    domains: parseJson(row.domains_json ?? row.domainsJson),
    technologyKeywords: parseJson(row.technology_keywords_json ?? row.technologyKeywordsJson),
    applicationMarkets: parseJson(row.application_markets_json ?? row.applicationMarketsJson),
    careerRoles: parseJson(row.career_roles_json ?? row.careerRolesJson),
    hiringSignals: parseJson(row.hiring_signals_json ?? row.hiringSignalsJson),
    dataConfidence: row.data_confidence ?? row.dataConfidence,
    lastEnrichedAt: row.last_enriched_at ?? row.lastEnrichedAt,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

export const companyService = {
  listCompanies(params: Record<string, string | undefined> = {}) {
    const limit = safeLimit(params.limit);
    const offset = safeOffset(params.offset);
    const orderBy = safeOrderBy(params.orderBy);
    const direction = params.direction === "desc" ? "DESC" : "ASC";

    const conditions: string[] = [];
    const args: any[] = [];

    if (params.q) {
      conditions.push("(name LIKE ? OR legal_name LIKE ? OR aliases_json LIKE ?)");
      const like = `%${params.q}%`;
      args.push(like, like, like);
    }
    if (params.country) {
      conditions.push("country = ?");
      args.push(params.country);
    }
    if (params.city) {
      conditions.push("city LIKE ?");
      args.push(`%${params.city}%`);
    }
    if (params.companyType) {
      conditions.push("company_type = ?");
      args.push(params.companyType);
    }
    if (params.domain) {
      conditions.push("domains_json LIKE ?");
      args.push(`%${params.domain}%`);
    }
    if (params.employeeRange) {
      conditions.push("employee_count_range = ?");
      args.push(params.employeeRange);
    }
    if (params.dataConfidenceMin) {
      const min = Number(params.dataConfidenceMin);
      if (Number.isFinite(min)) {
        conditions.push("data_confidence >= ?");
        args.push(min);
      }
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = sqlite
      .prepare(`SELECT * FROM companies ${whereClause} ORDER BY ${orderBy} COLLATE NOCASE ${direction} LIMIT ? OFFSET ?`)
      .all(...args, limit, offset) as Record<string, any>[];

    const countRow = sqlite
      .prepare(`SELECT COUNT(*) as n FROM companies ${whereClause}`)
      .get(...args) as { n: number } | undefined;

    return {
      rows: rows.map(enrichCompany),
      total: countRow?.n ?? 0,
      limit,
      offset,
    };
  },

  getCompany(id: string): Record<string, any> | null {
    const row = sqlite.prepare("SELECT * FROM companies WHERE id = ?").get(id) as Record<string, any> | undefined;
    if (!row) return null;

    const sources = sqlite
      .prepare("SELECT * FROM company_sources WHERE company_id = ? ORDER BY fetched_at DESC")
      .all(id) as Record<string, any>[];

    const fieldFacts = sqlite
      .prepare("SELECT * FROM company_field_facts WHERE company_id = ? ORDER BY field_name")
      .all(id) as Record<string, any>[];

    const aliases = sqlite
      .prepare("SELECT alias FROM company_aliases WHERE company_id = ?")
      .all(id) as Array<{ alias: string }>;

    return {
      ...enrichCompany(row),
      sources: sources.map((s) => ({
        id: s.id,
        sourceType: s.source_type,
        sourceName: s.source_name,
        sourceUrl: s.source_url,
        fetchedAt: s.fetched_at,
        confidence: s.confidence,
        notes: s.notes,
      })),
      fieldFacts: fieldFacts.map((f) => ({
        id: f.id,
        fieldName: f.field_name,
        fieldValue: f.field_value,
        confidence: f.confidence,
        fetchedAt: f.fetched_at,
      })),
      aliases: aliases.map((a) => a.alias),
    } as Record<string, any>;
  },

  createCompany(body: Record<string, unknown>) {
    const id = generateId();
    const name = String(body.name || "").trim();
    if (!name) throw new Error("Company name is required");

    const cleanText = (v: unknown) => (v ? String(v).trim() : null);
    const cleanNumber = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const aliases = Array.isArray(body.aliases) ? body.aliases.map(String) : [];

    sqlite.prepare(`
      INSERT INTO companies (
        id, name, legal_name, aliases_json, country, city, website, company_type,
        status, founded_year, registered_capital, employee_count, employee_count_range,
        stock_ticker, exchange, description, product_lines_json, domains_json,
        technology_keywords_json, application_markets_json, career_roles_json, hiring_signals_json,
        data_confidence, last_enriched_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).run(
      id,
      name,
      cleanText(body.legalName),
      toJson(aliases),
      cleanText(body.country),
      cleanText(body.city),
      cleanText(body.website),
      cleanText(body.companyType),
      cleanText(body.status) || "active",
      cleanNumber(body.foundedYear),
      cleanText(body.registeredCapital),
      cleanText(body.employeeCount),
      cleanText(body.employeeCountRange),
      cleanText(body.stockTicker),
      cleanText(body.exchange),
      cleanText(body.description),
      toJson(Array.isArray(body.productLines) ? body.productLines.map(String) : []),
      toJson(Array.isArray(body.domains) ? body.domains.map(String) : []),
      toJson(Array.isArray(body.technologyKeywords) ? body.technologyKeywords.map(String) : []),
      toJson(Array.isArray(body.applicationMarkets) ? body.applicationMarkets.map(String) : []),
      toJson(Array.isArray(body.careerRoles) ? body.careerRoles.map(String) : []),
      toJson(Array.isArray(body.hiringSignals) ? body.hiringSignals.map(String) : []),
      cleanNumber(body.dataConfidence) ?? 0,
      new Date().toISOString()
    );

    // Insert aliases
    for (const alias of aliases) {
      const clean = alias.trim();
      if (clean) {
        sqlite.prepare(
          "INSERT INTO company_aliases (id, alias, company_id, canonical_name, source, confidence) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(generateId(), clean, id, name, "manual", 100);
      }
    }

    // Insert source record
    sqlite.prepare(`
      INSERT INTO company_sources (id, company_id, source_type, source_name, source_url, fetched_at, confidence, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      generateId(),
      id,
      "manual",
      "Admin manual entry",
      cleanText(body.website),
      new Date().toISOString(),
      cleanNumber(body.dataConfidence) ?? 50,
      cleanText(body.description)
    );

    return this.getCompany(id);
  },

  updateCompany(id: string, body: Record<string, unknown>) {
    const existing = sqlite.prepare("SELECT id FROM companies WHERE id = ?").get(id) as { id: string } | undefined;
    if (!existing) throw new Error("Company not found");

    const cleanText = (v: unknown) => (v !== undefined ? String(v || "").trim() || null : undefined);
    const cleanNumber = (v: unknown) => {
      if (v === undefined) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const setters: string[] = [];
    const values: any[] = [];

    const add = (col: string, val: any) => {
      if (val !== undefined) {
        setters.push(`${col} = ?`);
        values.push(val);
      }
    };

    add("name", cleanText(body.name));
    add("legal_name", cleanText(body.legalName));
    add("country", cleanText(body.country));
    add("city", cleanText(body.city));
    add("website", cleanText(body.website));
    add("company_type", cleanText(body.companyType));
    add("status", cleanText(body.status));
    add("founded_year", cleanNumber(body.foundedYear));
    add("registered_capital", cleanText(body.registeredCapital));
    add("employee_count", cleanText(body.employeeCount));
    add("employee_count_range", cleanText(body.employeeCountRange));
    add("stock_ticker", cleanText(body.stockTicker));
    add("exchange", cleanText(body.exchange));
    add("description", cleanText(body.description));
    add("data_confidence", cleanNumber(body.dataConfidence));
    add("last_enriched_at", new Date().toISOString());

    if (Array.isArray(body.aliases)) {
      add("aliases_json", toJson(body.aliases.map(String)));
    }
    if (Array.isArray(body.productLines)) {
      add("product_lines_json", toJson(body.productLines.map(String)));
    }
    if (Array.isArray(body.domains)) {
      add("domains_json", toJson(body.domains.map(String)));
    }
    if (Array.isArray(body.technologyKeywords)) {
      add("technology_keywords_json", toJson(body.technologyKeywords.map(String)));
    }
    if (Array.isArray(body.applicationMarkets)) {
      add("application_markets_json", toJson(body.applicationMarkets.map(String)));
    }
    if (Array.isArray(body.careerRoles)) {
      add("career_roles_json", toJson(body.careerRoles.map(String)));
    }
    if (Array.isArray(body.hiringSignals)) {
      add("hiring_signals_json", toJson(body.hiringSignals.map(String)));
    }

    if (setters.length) {
      sqlite.prepare(`UPDATE companies SET ${setters.join(", ")} WHERE id = ?`).run(...values, id);
    }

    // Update aliases if provided
    if (Array.isArray(body.aliases)) {
      sqlite.prepare("DELETE FROM company_aliases WHERE company_id = ?").run(id);
      const name = String(body.name || "").trim();
      for (const alias of body.aliases.map(String)) {
        const clean = alias.trim();
        if (clean) {
          sqlite.prepare(
            "INSERT INTO company_aliases (id, alias, company_id, canonical_name, source, confidence) VALUES (?, ?, ?, ?, ?, ?)"
          ).run(generateId(), clean, id, name || clean, "manual", 100);
        }
      }
    }

    return this.getCompany(id);
  },

  deleteCompany(id: string) {
    const existing = sqlite.prepare("SELECT id FROM companies WHERE id = ?").get(id) as { id: string } | undefined;
    if (!existing) throw new Error("Company not found");

    sqlite.prepare("DELETE FROM company_sources WHERE company_id = ?").run(id);
    sqlite.prepare("DELETE FROM company_aliases WHERE company_id = ?").run(id);
    sqlite.prepare("DELETE FROM company_field_facts WHERE company_id = ?").run(id);
    sqlite.prepare("DELETE FROM company_job_signals WHERE company_id = ?").run(id);
    sqlite.prepare("DELETE FROM companies WHERE id = ?").run(id);

    return { id, deleted: true };
  },

  compareCompanies(ids: string[]) {
    const unique = [...new Set(ids)].slice(0, 4);
    const rows = unique
      .map((id) => this.getCompany(id))
      .filter(Boolean) as Record<string, any>[];

    if (rows.length < 2) {
      throw new Error("At least 2 valid companies are required for comparison");
    }

    const domains = new Set<string>();
    const companyTypes = new Set<string>();
    const countries = new Set<string>();
    const productLines = new Set<string>();

    for (const row of rows) {
      if (row.domains) row.domains.forEach((d: string) => domains.add(d));
      if (row.companyType) companyTypes.add(row.companyType);
      if (row.country) countries.add(row.country);
      if (row.productLines) row.productLines.forEach((p: string) => productLines.add(p));
    }

    return {
      companies: rows,
      sharedDomains: [...domains],
      sharedCompanyTypes: [...companyTypes],
      sharedCountries: [...countries],
      sharedProductLines: [...productLines],
      fitMatching: this.computeFitMatching(rows),
      caveat: "This comparison is based on public metadata and may be incomplete. It is not an investment recommendation or a final employer ranking.",
    };
  },

  computeFitMatching(rows: Record<string, any>[]) {
    const fits: Record<string, string[]> = {};
    const domainMap: Record<string, string[]> = {
      "PMIC / Power Management": ["PMIC", "Power Management", "LDO", "DC-DC", "Power Semiconductor"],
      "ADC / DAC / Data Converters": ["ADC", "DAC", "Data Converter"],
      "PLL / Clocking": ["PLL", "Clocking", "SerDes"],
      "RF / mmWave": ["RF", "mmWave", "Wireless"],
      "Wireline / SerDes": ["SerDes", "Wireline", "High-speed"],
      "Memory / SRAM / MRAM / RRAM / CIM": ["Memory", "SRAM", "MRAM", "RRAM", "CIM", "PIM"],
      "EDA / CAD": ["EDA", "CAD", "Design Automation"],
      "Digital / SoC / AI Accelerator": ["Digital", "SoC", "AI Accelerator", "NPU"],
      "Power Devices / GaN / SiC": ["GaN", "SiC", "Power Device"],
      "Sensors / MEMS": ["Sensor", "MEMS"],
      "Packaging / Chiplet / 3D IC": ["Packaging", "Chiplet", "3D IC"],
      "Manufacturing / Process": ["Manufacturing", "Process", "Foundry"],
      "Equipment / Materials": ["Equipment", "Materials"],
    };

    for (const [domain, keywords] of Object.entries(domainMap)) {
      const matches: Record<string, any>[] = [];
      for (const row of rows) {
        const text = [
          row.description || "",
          ...(row.domains || []),
          ...(row.technologyKeywords || []),
          ...(row.productLines || []),
          row.companyType || "",
        ].join(" ").toLowerCase();
        if (keywords.some((k) => text.includes(k.toLowerCase()))) {
          matches.push(row);
        }
      }
      if (matches.length > 0) {
        fits[domain] = matches.map((m) => m.name);
      }
    }

    return fits;
  },

  getRelatedPapers(companyId: string, limit = 20) {
    const company = this.getCompany(companyId);
    if (!company) return null;

    const names = [company.name, ...(company.aliases || [])].filter(Boolean);
    if (!names.length) return { rows: [], total: 0 };

    // Build an OR query for affiliation matching
    const q = names.map((n) => `"${n}"`).join(" OR ");
    return searchService.search({ q, scope: "all", limit: String(limit), sort: "relevance" }, 0);
  },

  getRelatedRoadmaps(companyId: string) {
    const company = this.getCompany(companyId);
    if (!company) return null;

    const companyDomains: string[] = ((company.domains || []) as string[]).map((d: string) => d.toLowerCase());
    const companyTypes: string[] = [
      (company.companyType || "").toLowerCase(),
      ...((company.technologyKeywords || []) as string[]).map((k: string) => k.toLowerCase()),
    ];

    const typeToDomains: Record<string, string[]> = {
      
      "fabless ic design": ["Analog & Mixed-Signal", "RF/mmWave & Wireline", "Digital IC & Architecture", "Memory & Compute-in-Memory"],
      "idm": ["Device & Manufacturing", "Analog & Mixed-Signal", "Memory & Compute-in-Memory"],
      "foundry": ["Device & Manufacturing", "EDA, CAD & Verification"],
      "eda": ["EDA, CAD & Verification"],
      "memory": ["Memory & Compute-in-Memory"],
      "power semiconductor": ["Power Management"],
      "analog / mixed-signal": ["Analog & Mixed-Signal"],
      "rf / wireless": ["RF/mmWave & Wireline"],
      "automotive ic": ["Analog & Mixed-Signal", "Power Management"],
      "ai accelerator / soc": ["Digital IC & Architecture", "Memory & Compute-in-Memory"],
      "sensor / mems": ["Analog & Mixed-Signal", "Biomedical & Sensor Interfaces"],
      "packaging / chiplet": ["Packaging & Integration"],
      "equipment": ["Device & Manufacturing"],
      "materials": ["Device & Manufacturing"],
    };

    const matchedRoadmaps = [];
    for (const roadmap of learningRoadmaps) {
      const roadmapDomains = new Set(roadmap.relatedTopics.map((t) => t.toLowerCase()));
      const roadmapQueries = [
        roadmap.paperQuery || "",
        roadmap.title || "",
        roadmap.domain || "",
        ...(roadmap.relatedSearchQueries || []),
      ].join(" ").toLowerCase();

      let score = 0;
      for (const cd of companyDomains) {
        if (roadmapQueries.includes(cd)) score += 2;
        for (const rd of roadmapDomains) {
          if (rd.includes(cd) || cd.includes(rd)) score += 3;
        }
      }

      for (const [type, domains] of Object.entries(typeToDomains)) {
        if (companyTypes.includes(type)) {
          for (const d of domains) {
            if (roadmap.relatedTopics.some((t) => t.toLowerCase().includes(d.toLowerCase()))) {
              score += 2;
            }
          }
        }
      }

      if (score > 0) {
        matchedRoadmaps.push({
          slug: roadmap.slug,
          title: roadmap.title,
          domain: roadmap.domain,
          level: roadmap.level,
          score,
        });
      }
    }

    return matchedRoadmaps
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  },

  getCompanyTypes() {
    return [
      "Fabless IC Design",
      "IDM",
      "Foundry",
      "EDA",
      "Semiconductor IP",
      "OSAT / Packaging",
      "Equipment",
      "Materials",
      "Memory",
      "Power Semiconductor",
      "Analog / Mixed-Signal",
      "RF / Wireless",
      "Automotive IC",
      "AI Accelerator / SoC",
      "Sensor / MEMS",
      "System / OEM",
      "Distributor / Supply Chain",
      "Research Lab / Industrial Lab",
    ];
  },

  getDomains() {
    return [
      "PMIC / Power Management",
      "ADC / DAC / Data Converters",
      "PLL / Clocking",
      "RF / mmWave",
      "Wireline / SerDes",
      "Memory / SRAM / MRAM / RRAM / CIM",
      "EDA / CAD",
      "Digital / SoC / AI Accelerator",
      "Power Devices / GaN / SiC",
      "Sensors / MEMS",
      "Packaging / Chiplet / 3D IC",
      "Manufacturing / Process",
      "Equipment / Materials",
    ];
  },
};
