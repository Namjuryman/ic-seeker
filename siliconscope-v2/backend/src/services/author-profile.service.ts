import { promises as fs } from "node:fs";
import path from "node:path";
import { eq, inArray } from "drizzle-orm";
import { appDb } from "../db/app-db.js";
import { authorProfiles } from "../db/schema.js";
import { appConfig } from "../config.js";
import { authorIdentityService } from "./author-identity.service.js";

export type AuthorProfileMetadata = {
  id: string;
  displayName: string;
  normalizedName: string;
  photoUrl: string | null;
  photoLocalPath: string | null;
  homepageUrl: string | null;
  affiliation: string | null;
  title: string | null;
  sourceUrl: string | null;
  sourceType: string;
  licenseNote: string | null;
  verificationStatus: string;
  notes: string | null;
  updatedAt: string | null;
};

type AuthorProfileRow = typeof authorProfiles.$inferSelect;

const LOCAL_PHOTO_ROOT = path.resolve(path.dirname(appConfig.dbPath), "author_photos");
const PHOTO_MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function clean(value: string | null | undefined): string | null {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

function serialize(row: AuthorProfileRow): AuthorProfileMetadata {
  const localPhotoPath = clean(row.photoLocalPath);
  return {
    id: row.id,
    displayName: row.displayName,
    normalizedName: row.normalizedName,
    photoUrl: clean(row.photoUrl) || (localPhotoPath ? `/api/author-profiles/${encodeURIComponent(row.id)}/photo` : null),
    photoLocalPath: localPhotoPath,
    homepageUrl: clean(row.homepageUrl),
    affiliation: clean(row.affiliation),
    title: clean(row.title),
    sourceUrl: clean(row.sourceUrl),
    sourceType: row.sourceType || "manual",
    licenseNote: clean(row.licenseNote),
    verificationStatus: row.verificationStatus || "pending",
    notes: clean(row.notes),
    updatedAt: row.updatedAt || null,
  };
}

function resolveLocalPhotoPath(row: AuthorProfileRow): { filePath: string; contentType: string } | null {
  const relativePath = clean(row.photoLocalPath);
  if (!relativePath || path.isAbsolute(relativePath)) return null;
  const filePath = path.resolve(LOCAL_PHOTO_ROOT, relativePath);
  const rootWithSeparator = `${LOCAL_PHOTO_ROOT}${path.sep}`;
  if (filePath !== LOCAL_PHOTO_ROOT && !filePath.startsWith(rootWithSeparator)) return null;
  const ext = path.extname(filePath).toLowerCase();
  const contentType = PHOTO_MIME_TYPES[ext];
  if (!contentType) return null;
  return { filePath, contentType };
}

function rank(row: AuthorProfileRow) {
  const status = String(row.verificationStatus || "").toLowerCase();
  const statusScore = status === "verified" ? 3 : status === "pending" ? 2 : status === "candidate" ? 1 : 0;
  const photoScore = clean(row.photoUrl) ? 2 : clean(row.photoLocalPath) ? 1 : 0;
  return statusScore * 10 + photoScore;
}

function bestProfile(rows: AuthorProfileRow[]): AuthorProfileMetadata | null {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => rank(b) - rank(a) || String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  return serialize(sorted[0]);
}

export const authorProfileService = {
  getByName(name: string): AuthorProfileMetadata | null {
    const normalizedName = authorIdentityService.canonicalize(name).normalizedKey;
    if (!normalizedName) return null;
    const rows = appDb.select().from(authorProfiles).where(inArray(authorProfiles.normalizedName, [normalizedName])).all();
    return bestProfile(rows);
  },

  getMapByNormalizedNames(normalizedNames: string[]): Map<string, AuthorProfileMetadata> {
    const keys = [...new Set(normalizedNames.map((key) => clean(key)).filter((key): key is string => Boolean(key)))];
    const result = new Map<string, AuthorProfileMetadata>();
    if (!keys.length) return result;

    const rows = appDb.select().from(authorProfiles).where(inArray(authorProfiles.normalizedName, keys)).all();
    const grouped = new Map<string, AuthorProfileRow[]>();
    for (const row of rows) {
      const key = clean(row.normalizedName);
      if (!key) continue;
      grouped.set(key, [...(grouped.get(key) || []), row]);
    }

    for (const [key, group] of grouped.entries()) {
      const profile = bestProfile(group);
      if (profile) result.set(key, profile);
    }
    return result;
  },

  async readLocalPhoto(id: string): Promise<{ bytes: Buffer; contentType: string } | null> {
    const row = appDb.select().from(authorProfiles).where(eq(authorProfiles.id, id)).get();
    if (!row) return null;
    const resolved = resolveLocalPhotoPath(row);
    if (!resolved) return null;
    const bytes = await fs.readFile(resolved.filePath);
    return { bytes, contentType: resolved.contentType };
  },
};
