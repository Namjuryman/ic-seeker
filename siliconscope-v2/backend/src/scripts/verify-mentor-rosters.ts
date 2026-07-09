import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appSqlite } from "../db/app-db.js";
import { authorIdentityService } from "../services/author-identity.service.js";
import { institutionIdentityService } from "../services/institution-identity.service.js";
import { mentorService } from "../services/mentor.service.js";
import { snapshotService } from "../services/snapshot.service.js";

type RosterSourceSeed = {
  institutionName: string;
  sourceUrl: string;
  sourceKind?: string;
  parserHint?: string;
  enabled?: boolean;
};

type SourceRow = {
  id: string;
  institutionName: string;
  normalizedInstitution: string;
  sourceUrl: string;
  sourceKind: string;
  parserHint: string | null;
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "source";
}

function sourceId(institutionName: string, sourceUrl: string) {
  return `roster:${slug(institutionIdentityService.canonicalize(institutionName).normalizedKey)}:${slug(sourceUrl).slice(0, 90)}`;
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, " ");
}

function htmlToText(html: string) {
  return decodeEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nameVariants(name: string) {
  const identity = authorIdentityService.canonicalize(name);
  const values = new Set([name, identity.canonicalName]);
  for (const variant of authorIdentityService.variantsFor(name)) values.add(variant);
  for (const source of [...values]) {
    const tokens = source
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (tokens.length >= 3) {
      const family = tokens[tokens.length - 1];
      const initials = tokens.slice(0, -1).map((token) => token[0]?.toUpperCase()).filter(Boolean);
      if (initials.length >= 2) {
        values.add(`${initials.slice(0, 2).join(" ")} ${family}`);
        values.add(`${initials.slice(0, 2).map((item) => `${item}.`).join(" ")} ${family}`);
      }
      values.add(`${initials.join(" ")} ${family}`);
      values.add(`${initials.map((item) => `${item}.`).join(" ")} ${family}`);
    }
    if (tokens.length >= 2) {
      const family = tokens[tokens.length - 1];
      const given = tokens.slice(0, -1).join(" ");
      values.add(`${family} ${given}`);
      values.add(`${family}, ${given}`);
    }
  }
  return [...values].map(clean).filter(Boolean);
}

function hasName(text: string, name: string) {
  return nameVariants(name).some((variant) => {
    const parts = variant.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return false;
    const pattern = parts.map(escapeRegex).join("[\\s.\\-]+");
    return new RegExp(`(^|[^\\p{L}\\p{N}])${pattern}([^\\p{L}\\p{N}]|$)`, "iu").test(text);
  });
}

function evidenceFor(text: string, name: string) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const variants = nameVariants(name).map((variant) => variant.toLowerCase());
  const index = lines.findIndex((line) => variants.some((variant) => line.toLowerCase().includes(variant)));
  if (index < 0) return "";
  return lines.slice(Math.max(0, index - 2), index + 8).join(" | ").slice(0, 700);
}

function titleFor(evidence: string) {
  const positionMatch = evidence.match(/\bPosition\s*[:：]?\s*(?:\|\s*)?(Distinguished Professor|Chair Professor|Adjunct Professor|Associate Teaching Professor|Nanyang Assistant Professor|Research Assistant Professor|Assistant Professor|Associate Professor|Emeritus Professor|Professor of the Practice|Professor|Senior Instructor|Lecturer|Research Scientist)\b/i);
  if (positionMatch?.[1]) return positionMatch[1];
  const match = evidence.match(/\b(Distinguished Professor|Chair Professor|Adjunct Professor|Associate Teaching Professor|Nanyang Assistant Professor|Research Assistant Professor|Assistant Professor|Associate Professor|Emeritus Professor|Professor of the Practice|Professor|Senior Instructor|Lecturer|Research Scientist)\b/i);
  return match?.[1] || "";
}

function ensureTables() {
  appSqlite.exec(`
    CREATE TABLE IF NOT EXISTS institution_roster_sources (
      id TEXT PRIMARY KEY,
      institution_name TEXT NOT NULL,
      normalized_institution TEXT NOT NULL,
      source_url TEXT NOT NULL,
      source_kind TEXT NOT NULL DEFAULT 'official-faculty-page',
      parser_hint TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_status TEXT,
      last_fetched_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_institution_roster_sources_url
      ON institution_roster_sources(source_url);
    CREATE INDEX IF NOT EXISTS idx_institution_roster_sources_institution
      ON institution_roster_sources(normalized_institution, enabled);

    CREATE TABLE IF NOT EXISTS mentor_roster_verifications (
      id TEXT PRIMARY KEY,
      institution_name TEXT NOT NULL,
      normalized_institution TEXT NOT NULL,
      author_name TEXT NOT NULL,
      normalized_author TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unverified',
      role_title TEXT,
      evidence_url TEXT,
      evidence_text TEXT,
      source_id TEXT,
      source_kind TEXT NOT NULL DEFAULT 'official-faculty-page',
      confidence INTEGER NOT NULL DEFAULT 0,
      verified_at TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_mentor_roster_verifications_author_institution
      ON mentor_roster_verifications(normalized_institution, normalized_author);
    CREATE INDEX IF NOT EXISTS idx_mentor_roster_verifications_status
      ON mentor_roster_verifications(normalized_institution, status);
  `);
}

async function seedSources(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  const rows = JSON.parse(raw) as RosterSourceSeed[];
  if (!Array.isArray(rows)) throw new Error("Roster source seed file must be a JSON array.");

  const upsert = appSqlite.prepare(`
    INSERT INTO institution_roster_sources (
      id, institution_name, normalized_institution, source_url, source_kind, parser_hint, enabled, updated_at
    )
    VALUES (@id, @institutionName, @normalizedInstitution, @sourceUrl, @sourceKind, @parserHint, @enabled, CURRENT_TIMESTAMP)
    ON CONFLICT(source_url) DO UPDATE SET
      id = excluded.id,
      institution_name = excluded.institution_name,
      normalized_institution = excluded.normalized_institution,
      source_kind = excluded.source_kind,
      parser_hint = excluded.parser_hint,
      enabled = excluded.enabled,
      updated_at = CURRENT_TIMESTAMP
  `);

  const tx = appSqlite.transaction((items: RosterSourceSeed[]) => {
    const activeSourceUrls = new Set<string>();
    for (const item of items) {
      const institutionName = clean(item.institutionName);
      const sourceUrl = clean(item.sourceUrl);
      if (!institutionName || !sourceUrl) continue;
      const id = sourceId(institutionName, sourceUrl);
      const normalizedInstitution = institutionIdentityService.canonicalize(institutionName).normalizedKey;
      const existingSource = appSqlite.prepare(`
        SELECT id, normalized_institution AS normalizedInstitution
        FROM institution_roster_sources
        WHERE source_url = ?
      `).get(sourceUrl) as { id: string; normalizedInstitution: string } | undefined;
      activeSourceUrls.add(sourceUrl);
      upsert.run({
        id,
        institutionName,
        normalizedInstitution,
        sourceUrl,
        sourceKind: clean(item.sourceKind) || "official-faculty-page",
        parserHint: clean(item.parserHint) || null,
        enabled: item.enabled === false ? 0 : 1,
      });
      if (existingSource && (existingSource.id !== id || existingSource.normalizedInstitution !== normalizedInstitution)) {
        appSqlite.prepare(`
          UPDATE OR IGNORE mentor_roster_verifications
          SET institution_name = ?,
              normalized_institution = ?,
              source_id = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE source_id = ? OR normalized_institution = ?
        `).run(institutionName, normalizedInstitution, id, existingSource.id, existingSource.normalizedInstitution);
      }
    }
    if (activeSourceUrls.size) {
      const placeholders = [...activeSourceUrls].map(() => "?").join(",");
      appSqlite.prepare(`
        UPDATE institution_roster_sources
        SET enabled = 0, updated_at = CURRENT_TIMESTAMP
        WHERE source_url NOT IN (${placeholders})
      `).run(...activeSourceUrls);
    }
  });
  tx(rows);
  return rows.length;
}

function sourceRows(institution?: string): SourceRow[] {
  const normalized = institution ? institutionIdentityService.canonicalize(institution).normalizedKey : "";
  const sql = normalized
    ? `SELECT id, institution_name AS institutionName, normalized_institution AS normalizedInstitution, source_url AS sourceUrl, source_kind AS sourceKind, parser_hint AS parserHint FROM institution_roster_sources WHERE enabled = 1 AND normalized_institution = ?`
    : `SELECT id, institution_name AS institutionName, normalized_institution AS normalizedInstitution, source_url AS sourceUrl, source_kind AS sourceKind, parser_hint AS parserHint FROM institution_roster_sources WHERE enabled = 1`;
  return normalized ? appSqlite.prepare(sql).all(normalized) as SourceRow[] : appSqlite.prepare(sql).all() as SourceRow[];
}

async function fetchText(url: string) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; SiliconScope mentor roster verifier; +local research database)",
      "accept": "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function nextPageUrl(html: string, baseUrl: string) {
  const match = html.match(/<link[^>]+rel=["']next["'][^>]+href=["']([^"']+)["']/i);
  if (!match?.[1]) return "";
  return new URL(decodeEntities(match[1]), baseUrl).toString();
}

async function fetchRosterPages(startUrl: string) {
  const seen = new Set<string>();
  let current = startUrl;
  const pages: Array<{ url: string; text: string }> = [];
  for (let index = 0; current && !seen.has(current) && index < 8; index += 1) {
    seen.add(current);
    const html = await fetchText(current);
    const text = htmlToText(html);
    if (text.length < 80 && /\$_ts|_+\$\d|\bZwK9ddSpb9LK\b/i.test(html)) {
      throw new Error("blocked by site challenge page");
    }
    pages.push({ url: current, text });
    current = nextPageUrl(html, current);
    if (current) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return {
    pageCount: pages.length,
    text: pages.map((page) => `SOURCE_PAGE ${page.url}\n${page.text}`).join("\n\n"),
    pages,
  };
}

function plausiblePersonName(value: string) {
  const line = clean(value)
    .replace(/^PERSONAL PAGE\s*>?$/i, "")
    .replace(/\b(TEL|MAIL|Email|E-mail|Research Direction|Research Area|Office|Phone)\b[\s\S]*$/i, "")
    .replace(/^(Director|Deputy Director|Associate Chair|Chair)\s+/i, "")
    .replace(/^(Prof\.?|Professor|Assoc\.?\s*Prof\.?|Associate Professor|Assistant Professor|Asst\.?\s*Prof\.?|Dr\.?)\s+/i, "")
    .replace(/^[\p{Script=Han}\s]+/gu, "")
    .replace(/\s+(Professor|Associate Professor|Assistant Professor|Chair Professor|Distinguished Professor|Lecturer|Research Scientist)\b.*$/i, "")
    .replace(/\s*[|｜].*$/u, "")
    .replace(/^(Name|Faculty)\s*[:：]\s*/i, "")
    .trim();
  const comma = line.match(/^([A-Z][A-Za-z.'-]+),\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,4})/);
  const match = comma
    ? null
    : line.match(/([A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*){1,5})/);
  const name = clean(comma ? `${comma[2]} ${comma[1]}` : match?.[1] || line);
  if (!name || name.length > 80) return "";
  if (!isProbablyPersonName(name)) return "";
  return name;
}

function isProbablyPersonName(value: string) {
  const name = clean(value);
  if (!name || name.length > 80) return false;
  if (/:$/.test(name)) return false;
  if (/^(Title|Position|Appointments|Email|Phone|Room Number|Your browser|Faculty|People|Home|Staff|Chair|Assistant|Associate|Full|Research|Director|Text Area|Related Courses|Institute Of Microelectronics|School Professor|Associate Vice Provost|MediaTek Endowed Professorship)$/i.test(name)) return false;
  if (/\b(Appointments|Endowed Professorship|Vice Provost)\b/i.test(name)) return false;
  if (!/[A-Za-z]/.test(name)) return false;
  const tokens = name
    .replace(/[()]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/[^A-Za-z.'-]/g, ""))
    .filter(Boolean);
  if (tokens.length < 2 || tokens.length > 7) return false;
  const badTokens = new Set([
    "appointments",
    "assistant",
    "associate",
    "chair",
    "deputy",
    "director",
    "electronic",
    "engineering",
    "eng",
    "faculty",
    "founding",
    "full",
    "institute",
    "courses",
    "laboratory",
    "microelectronics",
    "professor",
    "research",
    "school",
    "staff",
    "systems",
  ]);
  if (tokens.some((token) => badTokens.has(token.toLowerCase()))) return false;
  if (/\b(he|she|his|her|received|degree|currently|presently)\b/i.test(name)) return false;
  return true;
}

function roleLine(value: string) {
  const line = clean(value);
  const role = titleFor(line);
  if (!role) return "";
  if (line.length > 90 && !/\b(Position|Title|Appointments?)\b/i.test(line)) return "";
  return role;
}

function samePersonName(a: string, b: string) {
  const left = authorIdentityService.canonicalize(a).normalizedKey;
  const right = authorIdentityService.canonicalize(b).normalizedKey;
  return Boolean(left && right && left === right) || hasName(a, b) || hasName(b, a);
}

function extractRosterEntries(page: { url: string; text: string }) {
  const lines = page.text.split("\n").map((line) => line.trim()).filter(Boolean);
  const entries = new Map<string, { name: string; roleTitle: string; evidenceUrl: string; evidenceText: string }>();

  for (let index = 0; index < lines.length; index += 1) {
    const name = plausiblePersonName(lines[index]);
    if (!name) continue;
    const around = lines.slice(Math.max(0, index - 6), index + 7).join(" | ");
    const hasContactOrResearch = /\b(TEL|MAIL|Email|E-mail|Research Direction|Research Area)\b/i.test(lines[index]);
    const shortNameUnderRosterHeading = lines[index].length <= 90
      && /\b(FACULTIES|Faculty Members|Academic Staff|Professor)\b/i.test(lines.slice(Math.max(0, index - 10), index).join(" | "));
    if (!hasContactOrResearch && !shortNameUnderRosterHeading) continue;
    const normalizedAuthor = authorIdentityService.canonicalize(name).normalizedKey;
    if (!normalizedAuthor || entries.has(normalizedAuthor)) continue;
    entries.set(normalizedAuthor, {
      name,
      roleTitle: titleFor(around),
      evidenceUrl: page.url,
      evidenceText: around.slice(0, 700),
    });
  }

  for (let index = 0; index < lines.length; index += 1) {
    const inline = lines[index].match(/Name\s*[:：]\s*(.*?)\s+Title\s*[:：]\s*([^|]+)$/i);
    if (inline) {
      const name = plausiblePersonName(inline[1]);
      const roleTitle = titleFor(lines.slice(index, index + 8).join(" | ")) || titleFor(inline[2]);
      const normalizedAuthor = authorIdentityService.canonicalize(name).normalizedKey;
      if (name && normalizedAuthor) {
        entries.set(normalizedAuthor, {
          name,
          roleTitle,
          evidenceUrl: page.url,
          evidenceText: lines.slice(Math.max(0, index - 3), index + 6).join(" | ").slice(0, 700),
        });
      }
    }

    if (!/^Title:?$/i.test(lines[index])) continue;
    let name = "";
    for (let back = index - 1; back >= Math.max(0, index - 6); back -= 1) {
      name = plausiblePersonName(lines[back]);
      if (name) break;
    }
    if (!name) continue;
    const roleTitle = titleFor(lines.slice(index, index + 8).join(" | ")) || clean(lines[index + 1] || "");
    const evidenceText = lines.slice(Math.max(0, index - 4), index + 10).join(" | ").slice(0, 700);
    const normalizedAuthor = authorIdentityService.canonicalize(name).normalizedKey;
    if (!normalizedAuthor) continue;
    entries.set(normalizedAuthor, { name, roleTitle, evidenceUrl: page.url, evidenceText });
  }

  for (let index = 0; index < lines.length; index += 1) {
    const roleTitle = roleLine(lines[index]);
    if (!roleTitle) continue;
    let name = "";
    for (let back = index - 1; back >= Math.max(0, index - 5); back -= 1) {
      name = plausiblePersonName(lines[back]);
      if (name) break;
    }
    if (!name) {
      const sameLine = lines[index].match(/^(.{3,70}?)\s+(Distinguished Professor|Chair Professor|Adjunct Professor|Associate Teaching Professor|Nanyang Assistant Professor|Research Assistant Professor|Assistant Professor|Associate Professor|Emeritus Professor|Professor|Lecturer)\b/i);
      name = plausiblePersonName(sameLine?.[1] || "");
    }
    const normalizedAuthor = authorIdentityService.canonicalize(name).normalizedKey;
    if (!name || !normalizedAuthor) continue;
    if (!entries.has(normalizedAuthor)) {
      entries.set(normalizedAuthor, {
        name,
          roleTitle: titleFor(lines.slice(Math.max(0, index - 4), index + 8).join(" | ")) || roleTitle,
        evidenceUrl: page.url,
        evidenceText: lines.slice(Math.max(0, index - 4), index + 8).join(" | ").slice(0, 700),
      });
    }
  }

  return [...entries.values()];
}

function candidateRows(institutionName: string) {
  const detail = mentorService.getMentorsByInstitution(institutionName, { live: "1", ignoreRoster: "1", candidateScope: "broad" });
  return detail.mentors.map((mentor: any) => ({
    name: String(mentor.name || ""),
    normalizedAuthor: authorIdentityService.canonicalize(String(mentor.name || "")).normalizedKey,
    papers: Number(mentor.papers || 0),
    seniorAuthorPapers: Number(mentor.seniorAuthorPapers || 0),
    recentSeniorAuthorPapers: Number(mentor.recentSeniorAuthorPapers || 0),
  })).filter((row) => row.name && row.normalizedAuthor && isProbablyPersonName(row.name));
}

function writeVerification(input: {
  institutionName: string;
  normalizedInstitution: string;
  authorName: string;
  normalizedAuthor: string;
  status: string;
  roleTitle?: string;
  evidenceUrl?: string;
  evidenceText?: string;
  sourceId?: string;
  sourceKind?: string;
  confidence?: number;
}) {
  appSqlite.prepare(`
    INSERT INTO mentor_roster_verifications (
      id,
      institution_name,
      normalized_institution,
      author_name,
      normalized_author,
      status,
      role_title,
      evidence_url,
      evidence_text,
      source_id,
      source_kind,
      confidence,
      verified_at,
      updated_at
    )
    VALUES (
      @id,
      @institutionName,
      @normalizedInstitution,
      @authorName,
      @normalizedAuthor,
      @status,
      @roleTitle,
      @evidenceUrl,
      @evidenceText,
      @sourceId,
      @sourceKind,
      @confidence,
      CASE WHEN @status = 'verified_current' THEN CURRENT_TIMESTAMP ELSE NULL END,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(normalized_institution, normalized_author) DO UPDATE SET
      author_name = excluded.author_name,
      status = CASE
        WHEN mentor_roster_verifications.status = 'verified_current' AND excluded.status != 'verified_current'
          THEN mentor_roster_verifications.status
        ELSE excluded.status
      END,
      role_title = CASE
        WHEN mentor_roster_verifications.status = 'verified_current' AND excluded.status != 'verified_current'
          THEN mentor_roster_verifications.role_title
        ELSE excluded.role_title
      END,
      evidence_url = CASE
        WHEN mentor_roster_verifications.status = 'verified_current' AND excluded.status != 'verified_current'
          THEN mentor_roster_verifications.evidence_url
        ELSE excluded.evidence_url
      END,
      evidence_text = CASE
        WHEN mentor_roster_verifications.status = 'verified_current' AND excluded.status != 'verified_current'
          THEN mentor_roster_verifications.evidence_text
        ELSE excluded.evidence_text
      END,
      source_id = CASE
        WHEN mentor_roster_verifications.status = 'verified_current' AND excluded.status != 'verified_current'
          THEN mentor_roster_verifications.source_id
        ELSE excluded.source_id
      END,
      source_kind = CASE
        WHEN mentor_roster_verifications.status = 'verified_current' AND excluded.status != 'verified_current'
          THEN mentor_roster_verifications.source_kind
        ELSE excluded.source_kind
      END,
      confidence = CASE
        WHEN mentor_roster_verifications.status = 'verified_current' AND excluded.status != 'verified_current'
          THEN mentor_roster_verifications.confidence
        ELSE excluded.confidence
      END,
      verified_at = CASE
        WHEN mentor_roster_verifications.status = 'verified_current' AND excluded.status != 'verified_current'
          THEN mentor_roster_verifications.verified_at
        ELSE excluded.verified_at
      END,
      updated_at = CURRENT_TIMESTAMP
  `).run({
    id: `mentor-roster:${input.normalizedInstitution}:${input.normalizedAuthor}`,
    institutionName: input.institutionName,
    normalizedInstitution: input.normalizedInstitution,
    authorName: input.authorName,
    normalizedAuthor: input.normalizedAuthor,
    status: input.status,
    roleTitle: input.roleTitle || null,
    evidenceUrl: input.evidenceUrl || null,
    evidenceText: input.evidenceText || null,
    sourceId: input.sourceId || null,
    sourceKind: input.sourceKind || "official-faculty-page",
    confidence: input.confidence ?? 0,
  });
}

async function verifySource(source: SourceRow) {
  try {
    const roster = await fetchRosterPages(source.sourceUrl);
    const text = roster.text;
    const candidates = candidateRows(source.institutionName);
    const rosterEntries = roster.pages.flatMap((page) => extractRosterEntries(page));
    const allowRosterOnly = !/candidate-only/i.test(source.parserHint || "")
      && /\b(ic|integrated|microelectronics|circuits?)\b/i.test(`${source.sourceKind} ${source.parserHint || ""} ${source.sourceUrl}`);
    const matchedRosterKeys = new Set<string>();
    let verified = 0;
    let notFound = 0;

    const tx = appSqlite.transaction((rows: typeof candidates) => {
      appSqlite.prepare(`DELETE FROM mentor_roster_verifications WHERE source_id = ?`).run(source.id);

      for (const candidate of rows) {
        const rosterEntry = rosterEntries.find((entry) => samePersonName(entry.name, candidate.name));
        if (rosterEntry) matchedRosterKeys.add(authorIdentityService.canonicalize(rosterEntry.name).normalizedKey);
        if (rosterEntry || hasName(text, candidate.name)) {
          const evidence = evidenceFor(text, candidate.name);
          writeVerification({
            institutionName: source.institutionName,
            normalizedInstitution: source.normalizedInstitution,
            authorName: candidate.name,
            normalizedAuthor: candidate.normalizedAuthor,
            status: "verified_current",
            roleTitle: rosterEntry?.roleTitle || titleFor(evidence),
            evidenceUrl: rosterEntry?.evidenceUrl || source.sourceUrl,
            evidenceText: rosterEntry?.evidenceText || evidence,
            sourceId: source.id,
            sourceKind: source.sourceKind,
            confidence: 95,
          });
          verified += 1;
        } else {
          writeVerification({
            institutionName: source.institutionName,
            normalizedInstitution: source.normalizedInstitution,
            authorName: candidate.name,
            normalizedAuthor: candidate.normalizedAuthor,
            status: "not_found_in_official_roster",
            evidenceUrl: source.sourceUrl,
            sourceId: source.id,
            sourceKind: source.sourceKind,
            confidence: 20,
          });
          notFound += 1;
        }
      }

      if (allowRosterOnly) {
        for (const entry of rosterEntries) {
          const normalizedAuthor = authorIdentityService.canonicalize(entry.name).normalizedKey;
          if (!normalizedAuthor || matchedRosterKeys.has(normalizedAuthor)) continue;
          if (rows.some((candidate) => samePersonName(candidate.name, entry.name))) continue;
          writeVerification({
            institutionName: source.institutionName,
            normalizedInstitution: source.normalizedInstitution,
            authorName: entry.name,
            normalizedAuthor,
            status: "verified_current",
            roleTitle: entry.roleTitle,
            evidenceUrl: entry.evidenceUrl,
            evidenceText: entry.evidenceText,
            sourceId: source.id,
            sourceKind: source.sourceKind,
            confidence: 98,
          });
        }
      }

      const verifiedForSource = appSqlite.prepare(`
        SELECT COUNT(*) AS count
        FROM mentor_roster_verifications
        WHERE source_id = ? AND status = 'verified_current'
      `).get(source.id) as { count: number };
      const sourceIsSmallCuratedList = allowRosterOnly && rosterEntries.length > 0 && rosterEntries.length <= 80;
      const sourceIsSparse = !sourceIsSmallCuratedList && Number(verifiedForSource?.count || 0) < 5;
      if (sourceIsSparse) {
        appSqlite.prepare(`
          UPDATE mentor_roster_verifications
          SET status = 'verified_on_partial_official_page',
              confidence = MIN(confidence, 70),
              updated_at = CURRENT_TIMESTAMP
          WHERE source_id = ? AND status = 'verified_current'
        `).run(source.id);
      }
    });
    tx(candidates);

    appSqlite.prepare(`
      UPDATE institution_roster_sources
      SET last_status = 'success', last_fetched_at = CURRENT_TIMESTAMP, last_error = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(source.id);

    return { sourceUrl: source.sourceUrl, institutionName: source.institutionName, pages: roster.pageCount, rosterEntries: rosterEntries.length, candidates: candidates.length, verified, notFound };
  } catch (err) {
    appSqlite.prepare(`
      UPDATE institution_roster_sources
      SET last_status = 'error', last_fetched_at = CURRENT_TIMESTAMP, last_error = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run((err as Error).message, source.id);
    return { sourceUrl: source.sourceUrl, institutionName: source.institutionName, error: (err as Error).message };
  }
}

function argValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

async function main() {
  ensureTables();
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sourceFile = path.resolve(process.cwd(), argValue("--sources") || path.resolve(here, "../data/mentor-roster-sources.json"));
  const seeded = await seedSources(sourceFile);
  const institution = argValue("--institution");
  const sources = sourceRows(institution);
  const results = [];
  for (const source of sources) {
    results.push(await verifySource(source));
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  snapshotService.invalidateSnapshot("mentor:institutions");
  snapshotService.invalidateSnapshotsByPrefix("mentor:institution:");
  snapshotService.invalidateSnapshotsByPrefix("mentor:author:");

  console.log(JSON.stringify({ ok: true, seeded, sources: sources.length, results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
