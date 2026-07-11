import { appSqlite } from "../db/app-db.js";
import { ensurePaperIntelligenceTables } from "./paper-intelligence-schema.js";
import { institutionIdentityService } from "../services/institution-identity.service.js";

type PaperRow = {
  id: number;
  affiliations: string;
};

type Candidate = {
  normalizedKey: string;
  canonicalName: string;
  aliases: Map<string, number>;
  papers: Set<number>;
  identitySource: string;
};

type GeoMatch = {
  canonicalName: string;
  countryCode: string;
  countryName: string;
  city: string;
  latitude?: number;
  longitude?: number;
  source: string;
  confidence: number;
  evidence: Record<string, unknown>;
};

type RorRecord = {
  id?: string;
  names?: Array<{ value?: string; types?: string[] }>;
  locations?: Array<{
    geonames_details?: {
      country_code?: string;
      country_name?: string;
      name?: string;
      lat?: number;
      lng?: number;
    };
  }>;
  types?: string[];
  status?: string;
};

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

function argNum(name: string, fallback: number) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!found) return fallback;
  const n = Number(found.slice(prefix.length));
  return Number.isFinite(n) ? n : fallback;
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

function argValue(name: string, fallback = "") {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function splitList(value: string): string[] {
  return String(value || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slug(value: string): string {
  return value.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160) || "unknown";
}

function countryName(code: string) {
  return countryNames.of(code.toUpperCase()) || code.toUpperCase();
}

function tokenSet(value: string) {
  return new Set(
    institutionIdentityService
      .normalizeKey(value)
      .split(/\s+/)
      .filter((token) => token.length > 1 && !["the", "and", "of", "for", "at"].includes(token)),
  );
}

function similarity(a: string, b: string) {
  const aa = tokenSet(a);
  const bb = tokenSet(b);
  if (!aa.size || !bb.size) return 0;
  let overlap = 0;
  for (const token of aa) if (bb.has(token)) overlap++;
  return overlap / Math.max(aa.size, bb.size);
}

function displayName(record: RorRecord) {
  const names = record.names || [];
  return (
    names.find((name) => name.types?.includes("ror_display"))?.value ||
    names.find((name) => name.types?.includes("label"))?.value ||
    names[0]?.value ||
    ""
  );
}

function localOverride(candidate: Candidate): GeoMatch | undefined {
  const aliasText = [...candidate.aliases.keys()].join(" ");
  const combined = institutionIdentityService.normalizeKey(`${candidate.canonicalName} ${aliasText}`);
  const exact = institutionIdentityService.normalizeKey(candidate.canonicalName);

  const make = (
    canonicalName: string,
    countryCode: string,
    city: string,
    confidence = 96,
  ): GeoMatch => ({
    canonicalName,
    countryCode,
    countryName: countryName(countryCode),
    city,
    source: "local-main-campus-rule",
    confidence,
    evidence: { rule: canonicalName },
  });

  // Keep CUHK Shenzhen separate from CUHK before applying any Hong Kong parent rule.
  if (/\b(chinese university hong kong shenzhen|cuhk shenzhen|cuhk sz)\b/.test(combined)) {
    return make("The Chinese University of Hong Kong, Shenzhen", "CN", "Shenzhen", 98);
  }
  if (/\b(chinese university hong kong|cuhk)\b/.test(combined)) {
    return make("The Chinese University of Hong Kong", "HK", "Hong Kong", 98);
  }

  const rules: Array<{ pattern: RegExp; canonicalName: string; countryCode: string; city: string }> = [
    { pattern: /\b(university electronic science technology china|electronic science technology china|uestc)\b/, canonicalName: "University of Electronic Science and Technology of China", countryCode: "CN", city: "Chengdu" },
    { pattern: /\b(tsinghua university|tsinghua)\b/, canonicalName: "Tsinghua University", countryCode: "CN", city: "Beijing" },
    { pattern: /\b(peking university|pku)\b/, canonicalName: "Peking University", countryCode: "CN", city: "Beijing" },
    { pattern: /\b(fudan university|fudan)\b/, canonicalName: "Fudan University", countryCode: "CN", city: "Shanghai" },
    { pattern: /\b(shanghai jiao tong university|sjtu)\b/, canonicalName: "Shanghai Jiao Tong University", countryCode: "CN", city: "Shanghai" },
    { pattern: /\b(zhejiang university|zju)\b/, canonicalName: "Zhejiang University", countryCode: "CN", city: "Hangzhou" },
    { pattern: /\b(xi an jiaotong university|xian jiaotong university)\b/, canonicalName: "Xi'an Jiaotong University", countryCode: "CN", city: "Xi'an" },
    { pattern: /\b(harbin institute technology|harbin technology)\b/, canonicalName: "Harbin Institute of Technology", countryCode: "CN", city: "Harbin" },
    { pattern: /\b(beijing institute technology|beijing technology)\b/, canonicalName: "Beijing Institute of Technology", countryCode: "CN", city: "Beijing" },
    { pattern: /\b(southeast university|seu)\b/, canonicalName: "Southeast University", countryCode: "CN", city: "Nanjing" },
    { pattern: /\b(xidian university|xdu)\b/, canonicalName: "Xidian University", countryCode: "CN", city: "Xi'an" },
    { pattern: /\b(southern university science technology|sustech)\b/, canonicalName: "Southern University of Science and Technology", countryCode: "CN", city: "Shenzhen" },
    { pattern: /\b(hong kong university science technology|hkust)\b/, canonicalName: "The Hong Kong University of Science and Technology", countryCode: "HK", city: "Hong Kong" },
    { pattern: /\b(national university singapore|nus)\b/, canonicalName: "National University of Singapore", countryCode: "SG", city: "Singapore" },
    { pattern: /\b(nanyang technological university|ntu singapore)\b/, canonicalName: "Nanyang Technological University", countryCode: "SG", city: "Singapore" },
    { pattern: /\b(taiwan semiconductor manufacturing|tsmc)\b/, canonicalName: "Taiwan Semiconductor Manufacturing Company", countryCode: "TW", city: "Hsinchu" },
    { pattern: /\b(imec|interuniversity microelectronics centre)\b/, canonicalName: "imec", countryCode: "BE", city: "Leuven" },
  ];

  for (const rule of rules) {
    if (rule.pattern.test(combined) || rule.pattern.test(exact)) {
      return make(rule.canonicalName, rule.countryCode, rule.city);
    }
  }
  return undefined;
}

async function fetchRor(name: string): Promise<RorRecord[]> {
  const url = `https://api.ror.org/v2/organizations?query=${encodeURIComponent(name)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "SiliconScope institution geo enrichment (local research tool)",
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`ROR ${response.status}`);
  const payload = (await response.json()) as { items?: RorRecord[] };
  return payload.items || [];
}

async function rorMatch(candidate: Candidate): Promise<GeoMatch | undefined> {
  const aliases = [...candidate.aliases.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([alias]) => alias);
  const query = candidate.canonicalName || aliases[0] || candidate.normalizedKey;
  const records = await fetchRor(query);
  const scored = records
    .map((record) => {
      const name = displayName(record);
      const score = Math.max(similarity(query, name), similarity(aliases[0] || query, name));
      const location = record.locations?.[0]?.geonames_details;
      return { record, name, score, location };
    })
    .filter(({ name, score, location }) => name && score >= 0.58 && location?.country_code && location?.country_name && location?.name)
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best?.location) return undefined;
  return {
    canonicalName: best.name,
    countryCode: best.location.country_code!,
    countryName: best.location.country_name!,
    city: best.location.name!,
    latitude: best.location.lat,
    longitude: best.location.lng,
    source: "ror-query-v2",
    confidence: Math.min(94, Math.round(62 + best.score * 32)),
    evidence: {
      rorId: best.record.id,
      matchedName: best.name,
      score: Number(best.score.toFixed(3)),
      query,
      types: best.record.types || [],
    },
  };
}

function buildCandidates(limitRows: number, minPapers: number): Candidate[] {
  const rows = appSqlite
    .prepare(`
      SELECT id, affiliations
      FROM papers
      WHERE COALESCE(affiliations, '') != ''
      ORDER BY year DESC, id DESC
      ${limitRows > 0 ? "LIMIT ?" : ""}
    `)
    .all(...(limitRows > 0 ? [limitRows] : [])) as PaperRow[];

  const candidates = new Map<string, Candidate>();
  for (const row of rows) {
    for (const raw of splitList(row.affiliations)) {
      const identity = institutionIdentityService.canonicalize(raw);
      if (!identity.normalizedKey || !identity.canonicalName) continue;
      const existing = candidates.get(identity.normalizedKey) || {
        normalizedKey: identity.normalizedKey,
        canonicalName: identity.canonicalName,
        aliases: new Map<string, number>(),
        papers: new Set<number>(),
        identitySource: identity.source,
      };
      existing.aliases.set(raw, (existing.aliases.get(raw) || 0) + 1);
      existing.papers.add(row.id);
      candidates.set(identity.normalizedKey, existing);
    }
  }

  return [...candidates.values()]
    .filter((candidate) => candidate.papers.size >= minPapers || candidate.aliases.size > 1)
    .sort((a, b) => b.papers.size - a.papers.size || b.aliases.size - a.aliases.size);
}

function existingGeoKeys() {
  const rows = appSqlite
    .prepare("SELECT alias FROM institution_aliases WHERE COALESCE(country_code, '') != '' AND COALESCE(city, '') != ''")
    .all() as Array<{ alias: string }>;
  return new Set(rows.map((row) => row.alias));
}

function writeMatch(candidate: Candidate, match: GeoMatch) {
  const aliasStmt = appSqlite.prepare(`
    INSERT INTO institution_aliases (
      alias, canonical_name, country_code, country_name, city, source, confidence, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(alias) DO UPDATE SET
      canonical_name = excluded.canonical_name,
      country_code = excluded.country_code,
      country_name = excluded.country_name,
      city = excluded.city,
      source = excluded.source,
      confidence = excluded.confidence,
      updated_at = CURRENT_TIMESTAMP
  `);
  const geoStmt = appSqlite.prepare(`
    INSERT INTO institution_geo_points (
      normalized_key, canonical_name, country_code, country_name, city,
      latitude, longitude, geocode_source, confidence, evidence_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(normalized_key) DO UPDATE SET
      canonical_name = excluded.canonical_name,
      country_code = excluded.country_code,
      country_name = excluded.country_name,
      city = excluded.city,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      geocode_source = excluded.geocode_source,
      confidence = excluded.confidence,
      evidence_json = excluded.evidence_json,
      updated_at = CURRENT_TIMESTAMP
  `);
  const candidateStmt = appSqlite.prepare(`
    INSERT INTO institution_identity_candidates (
      id, normalized_key, canonical_name, aliases_json, country_code, country_name, city,
      paper_count, confidence, review_status, evidence_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      canonical_name = excluded.canonical_name,
      aliases_json = excluded.aliases_json,
      country_code = excluded.country_code,
      country_name = excluded.country_name,
      city = excluded.city,
      paper_count = excluded.paper_count,
      confidence = excluded.confidence,
      review_status = excluded.review_status,
      evidence_json = excluded.evidence_json,
      updated_at = CURRENT_TIMESTAMP
  `);

  const aliases = [
    candidate.normalizedKey,
    institutionIdentityService.normalizeKey(candidate.canonicalName),
    institutionIdentityService.normalizeKey(match.canonicalName),
    ...[...candidate.aliases.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([alias]) => institutionIdentityService.normalizeKey(alias)),
  ].filter(Boolean);
  const uniqueAliases = [...new Set(aliases)];
  const evidence = JSON.stringify({
    ...match.evidence,
    aliases: [...candidate.aliases.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12),
    paperCount: candidate.papers.size,
    identitySource: candidate.identitySource,
  });

  const tx = appSqlite.transaction(() => {
    for (const alias of uniqueAliases) {
      aliasStmt.run(alias, match.canonicalName, match.countryCode, match.countryName, match.city, match.source, match.confidence);
    }
    geoStmt.run(
      institutionIdentityService.normalizeKey(match.canonicalName),
      match.canonicalName,
      match.countryCode,
      match.countryName,
      match.city,
      match.latitude ?? null,
      match.longitude ?? null,
      match.source,
      match.confidence,
      evidence,
    );
    candidateStmt.run(
      `institution-${slug(candidate.normalizedKey)}`,
      candidate.normalizedKey,
      match.canonicalName,
      JSON.stringify([...candidate.aliases.keys()].slice(0, 30)),
      match.countryCode,
      match.countryName,
      match.city,
      candidate.papers.size,
      match.confidence,
      match.confidence >= 82 ? "auto" : "pending",
      evidence,
    );
  });
  tx();
}

async function main() {
  ensurePaperIntelligenceTables(appSqlite);
  const rowLimit = argNum("paper-limit", 0);
  const candidateLimit = argNum("limit", 0);
  const minPapers = argNum("min-papers", 2);
  const sleepMs = argNum("sleep-ms", 120);
  const dryRun = hasFlag("dry-run");
  const onlyMissing = !hasFlag("include-existing");
  const source = argValue("source", "both");

  const candidates = buildCandidates(rowLimit, minPapers);
  const existing = existingGeoKeys();
  const selected = candidates
    .filter((candidate) => !onlyMissing || !existing.has(candidate.normalizedKey))
    .slice(0, candidateLimit > 0 ? candidateLimit : undefined);

  let localMapped = 0;
  let rorMapped = 0;
  let skipped = 0;
  const failures: Array<{ name: string; error: string }> = [];
  const samples: Array<{ name: string; city?: string; source?: string; confidence?: number }> = [];

  for (const [index, candidate] of selected.entries()) {
    let match: GeoMatch | undefined;
    if (source === "both" || source === "local") {
      match = localOverride(candidate);
      if (match) localMapped++;
    }
    if (!match && (source === "both" || source === "ror")) {
      try {
        match = await rorMatch(candidate);
        if (match) rorMapped++;
      } catch (error) {
        failures.push({ name: candidate.canonicalName, error: error instanceof Error ? error.message : String(error) });
      }
      if (sleepMs > 0) await new Promise((resolve) => setTimeout(resolve, sleepMs));
    }
    if (!match) {
      skipped++;
      continue;
    }
    if (!dryRun) writeMatch(candidate, match);
    if (samples.length < 12) samples.push({ name: match.canonicalName, city: match.city, source: match.source, confidence: match.confidence });
    if ((index + 1) % 100 === 0) {
      console.log(JSON.stringify({ progress: index + 1, selected: selected.length, localMapped, rorMapped, skipped }));
    }
  }

  console.log(JSON.stringify({
    dryRun,
    source,
    paperRows: rowLimit || "all",
    totalCandidates: candidates.length,
    selectedCandidates: selected.length,
    localMapped,
    rorMapped,
    skipped,
    failures: failures.slice(0, 10),
    samples,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
