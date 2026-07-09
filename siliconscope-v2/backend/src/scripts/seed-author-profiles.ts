import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appSqlite } from "../db/app-db.js";
import { authorIdentityService } from "../services/author-identity.service.js";
import { snapshotService } from "../services/snapshot.service.js";

type AuthorProfileSeed = {
  id?: string;
  name?: string;
  displayName?: string;
  normalizedName?: string;
  photoUrl?: string;
  photoLocalPath?: string;
  homepageUrl?: string;
  affiliation?: string;
  title?: string;
  sourceUrl?: string;
  sourceType?: string;
  licenseNote?: string;
  verificationStatus?: string;
  notes?: string;
};

function clean(value: unknown): string | null {
  const text = String(value || "").trim();
  return text || null;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "author";
}

function readPath() {
  const explicit = process.argv[2];
  if (explicit) return path.resolve(process.cwd(), explicit);
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../data/author-profiles.json");
}

async function main() {
  const filePath = readPath();
  const raw = await fs.readFile(filePath, "utf8");
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data)) throw new Error("Author profile seed file must be a JSON array.");

  const upsert = appSqlite.prepare(`
    INSERT INTO author_profiles (
      id,
      display_name,
      normalized_name,
      photo_url,
      photo_local_path,
      homepage_url,
      affiliation,
      title,
      source_url,
      source_type,
      license_note,
      verification_status,
      notes,
      updated_at
    )
    VALUES (
      @id,
      @displayName,
      @normalizedName,
      @photoUrl,
      @photoLocalPath,
      @homepageUrl,
      @affiliation,
      @title,
      @sourceUrl,
      @sourceType,
      @licenseNote,
      @verificationStatus,
      @notes,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      normalized_name = excluded.normalized_name,
      photo_url = excluded.photo_url,
      photo_local_path = excluded.photo_local_path,
      homepage_url = excluded.homepage_url,
      affiliation = excluded.affiliation,
      title = excluded.title,
      source_url = excluded.source_url,
      source_type = excluded.source_type,
      license_note = excluded.license_note,
      verification_status = excluded.verification_status,
      notes = excluded.notes,
      updated_at = CURRENT_TIMESTAMP
  `);

  let written = 0;
  const skipped: string[] = [];
  const tx = appSqlite.transaction((rows: AuthorProfileSeed[]) => {
    for (const row of rows) {
      const displayName = clean(row.displayName) || clean(row.name);
      const identity = authorIdentityService.canonicalize(displayName || clean(row.normalizedName) || "");
      const normalizedName = clean(row.normalizedName) || identity.normalizedKey;
      if (!displayName || !normalizedName) {
        skipped.push(JSON.stringify(row));
        continue;
      }

      upsert.run({
        id: clean(row.id) || `author:${slug(normalizedName)}`,
        displayName,
        normalizedName,
        photoUrl: clean(row.photoUrl),
        photoLocalPath: clean(row.photoLocalPath),
        homepageUrl: clean(row.homepageUrl),
        affiliation: clean(row.affiliation),
        title: clean(row.title),
        sourceUrl: clean(row.sourceUrl),
        sourceType: clean(row.sourceType) || "manual",
        licenseNote: clean(row.licenseNote),
        verificationStatus: clean(row.verificationStatus) || "pending",
        notes: clean(row.notes),
      });
      written += 1;
    }
  });

  tx(data as AuthorProfileSeed[]);

  snapshotService.invalidateSnapshot("profiles:professors:top80");
  snapshotService.invalidateSnapshotsByPrefix("profile:author:");
  snapshotService.invalidateSnapshotsByPrefix("mentor:author:");
  snapshotService.invalidateSnapshotsByPrefix("mentor:institution:");

  console.log(JSON.stringify({ ok: true, filePath, written, skipped: skipped.length }, null, 2));
  if (skipped.length) {
    console.warn(`Skipped rows without displayName/normalizedName: ${skipped.length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
