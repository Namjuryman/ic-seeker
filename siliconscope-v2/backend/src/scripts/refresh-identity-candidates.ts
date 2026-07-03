import { appSqlite } from "../db/app-db.js";
import { ensurePaperIntelligenceTables } from "./paper-intelligence-schema.js";
import { buildAuthorCandidates, buildInstitutionCandidates, type PaperIdentityRow } from "../services/identity-candidate-utils.js";

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

function main() {
  ensurePaperIntelligenceTables(appSqlite);
  const limit = argNum("limit", 50000);
  const minPapers = argNum("min-papers", 3);
  const dryRun = hasFlag("dry-run");
  const rows = appSqlite.prepare(`
    SELECT id, title, authors, affiliations, venue, year
    FROM papers
    WHERE COALESCE(authors, '') != '' OR COALESCE(affiliations, '') != ''
    ORDER BY year DESC, id DESC
    LIMIT ?
  `).all(limit) as PaperIdentityRow[];

  const authorCandidates = buildAuthorCandidates(rows, minPapers);
  const institutionCandidates = buildInstitutionCandidates(rows, minPapers);
  const insertAuthor = appSqlite.prepare(`
    INSERT INTO author_identity_candidates (
      id, normalized_key, canonical_name, alias_json, external_ids_json,
      institution_history_json, coauthor_signature_json, paper_count, confidence,
      review_status, evidence_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, '{}', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      canonical_name = excluded.canonical_name,
      alias_json = excluded.alias_json,
      institution_history_json = excluded.institution_history_json,
      coauthor_signature_json = excluded.coauthor_signature_json,
      paper_count = excluded.paper_count,
      confidence = excluded.confidence,
      review_status = excluded.review_status,
      evidence_json = excluded.evidence_json,
      updated_at = CURRENT_TIMESTAMP
  `);
  const insertInstitution = appSqlite.prepare(`
    INSERT INTO institution_identity_candidates (
      id, normalized_key, canonical_name, aliases_json, paper_count, confidence,
      review_status, evidence_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      canonical_name = excluded.canonical_name,
      aliases_json = excluded.aliases_json,
      paper_count = excluded.paper_count,
      confidence = excluded.confidence,
      review_status = excluded.review_status,
      evidence_json = excluded.evidence_json,
      updated_at = CURRENT_TIMESTAMP
  `);

  const tx = appSqlite.transaction(() => {
    for (const c of authorCandidates) insertAuthor.run(c.id, c.normalizedKey, c.canonicalName, JSON.stringify(c.aliases), JSON.stringify(c.institutionHistory), JSON.stringify(c.coauthorSignature), c.paperCount, c.confidence, c.needsReview ? "pending" : "auto", JSON.stringify(c));
    for (const c of institutionCandidates) insertInstitution.run(c.id, c.normalizedKey, c.canonicalName, JSON.stringify(c.aliases), c.paperCount, c.confidence, c.needsReview ? "pending" : "auto", JSON.stringify(c));
  });
  if (!dryRun) tx();

  console.log(JSON.stringify({
    dryRun,
    scannedRows: rows.length,
    authorCandidates: authorCandidates.length,
    institutionCandidates: institutionCandidates.length,
    sampleAuthorCandidates: authorCandidates.slice(0, 5).map((item) => ({ id: item.id, canonicalName: item.canonicalName, confidence: item.confidence, needsReview: item.needsReview })),
    sampleInstitutionCandidates: institutionCandidates.slice(0, 5).map((item) => ({ id: item.id, canonicalName: item.canonicalName, confidence: item.confidence, needsReview: item.needsReview })),
  }, null, 2));
}

main();
