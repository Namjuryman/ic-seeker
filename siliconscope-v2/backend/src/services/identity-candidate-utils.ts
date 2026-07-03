export type PaperIdentityRow = {
  id: number;
  title: string;
  authors: string;
  affiliations: string;
  venue?: string;
  year?: number;
};

export type AuthorCandidate = {
  id: string;
  normalizedKey: string;
  canonicalName: string;
  aliases: string[];
  institutionHistory: string[];
  coauthorSignature: string[];
  paperCount: number;
  confidence: number;
  needsReview: boolean;
};

export type InstitutionCandidate = {
  id: string;
  normalizedKey: string;
  canonicalName: string;
  aliases: string[];
  paperCount: number;
  confidence: number;
  needsReview: boolean;
};

function normalize(value: string): string {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\b(univ)\b/g, "university")
    .replace(/\b(inst)\b/g, "institute")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeAuthorKey(value: string): string {
  return normalize(value.replace(/,/g, " "));
}

export function normalizeInstitutionKey(value: string): string {
  return normalize(value)
    .replace(/\b(department|dept|school|college|faculty|laboratory|lab|center|centre|of|for)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitList(value: string): string[] {
  return String(value || "").split(";").map((item) => item.trim()).filter(Boolean);
}

function titleCase(value: string): string {
  const upper = new Set(["MIT", "UC", "UCLA", "USC", "NUS", "NTU", "HKUST", "CUHK", "IEEE", "TSMC", "IBM"]);
  return value.split(/\s+/).map((word) => {
    const raw = word.replace(/,/g, "");
    if (upper.has(raw.toUpperCase())) return raw.toUpperCase();
    if (raw.toLowerCase() === "imec") return "imec";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }).join(" ");
}

function slug(value: string): string {
  return value.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160) || "unknown";
}

export function buildAuthorCandidates(rows: PaperIdentityRow[], minPapers = 3): AuthorCandidate[] {
  const map = new Map<string, { aliases: Set<string>; institutions: Set<string>; coauthors: Set<string>; papers: Set<number> }>();
  for (const row of rows) {
    const authors = splitList(row.authors);
    const institutions = splitList(row.affiliations).slice(0, 8);
    for (const author of authors) {
      const key = normalizeAuthorKey(author);
      if (!key) continue;
      if (!map.has(key)) map.set(key, { aliases: new Set(), institutions: new Set(), coauthors: new Set(), papers: new Set() });
      const entry = map.get(key)!;
      entry.aliases.add(author);
      institutions.forEach((inst) => entry.institutions.add(inst));
      authors.filter((other) => normalizeAuthorKey(other) !== key).slice(0, 12).forEach((other) => entry.coauthors.add(other));
      entry.papers.add(row.id);
    }
  }
  return [...map.entries()]
    .filter(([, entry]) => entry.papers.size >= minPapers || entry.aliases.size > 1)
    .map(([key, entry]) => {
      const paperCount = entry.papers.size;
      const aliasCount = entry.aliases.size;
      const instCount = entry.institutions.size;
      const confidence = Math.min(95, 35 + paperCount * 5 + Math.min(instCount, 8) * 3 - (aliasCount > 2 ? 8 : 0));
      return {
        id: `author-${slug(key)}`,
        normalizedKey: key,
        canonicalName: titleCase([...entry.aliases].sort((a, b) => b.length - a.length)[0] || key),
        aliases: [...entry.aliases].slice(0, 20),
        institutionHistory: [...entry.institutions].slice(0, 20),
        coauthorSignature: [...entry.coauthors].slice(0, 30),
        paperCount,
        confidence,
        needsReview: aliasCount > 1 || instCount >= 4 || confidence < 65,
      };
    })
    .sort((a, b) => Number(b.needsReview) - Number(a.needsReview) || b.paperCount - a.paperCount)
    .slice(0, 1000);
}

export function buildInstitutionCandidates(rows: PaperIdentityRow[], minPapers = 3): InstitutionCandidate[] {
  const map = new Map<string, { aliases: Set<string>; papers: Set<number> }>();
  for (const row of rows) {
    for (const affiliation of splitList(row.affiliations)) {
      const key = normalizeInstitutionKey(affiliation);
      if (!key) continue;
      if (!map.has(key)) map.set(key, { aliases: new Set(), papers: new Set() });
      const entry = map.get(key)!;
      entry.aliases.add(affiliation);
      entry.papers.add(row.id);
    }
  }
  return [...map.entries()]
    .filter(([, entry]) => entry.papers.size >= minPapers || entry.aliases.size > 1)
    .map(([key, entry]) => {
      const aliasCount = entry.aliases.size;
      const paperCount = entry.papers.size;
      const confidence = Math.min(95, 40 + paperCount * 4 - (aliasCount > 3 ? 10 : 0));
      return {
        id: `institution-${slug(key)}`,
        normalizedKey: key,
        canonicalName: titleCase([...entry.aliases].sort((a, b) => b.length - a.length)[0] || key),
        aliases: [...entry.aliases].slice(0, 30),
        paperCount,
        confidence,
        needsReview: aliasCount > 1 || confidence < 65,
      };
    })
    .sort((a, b) => Number(b.needsReview) - Number(a.needsReview) || b.paperCount - a.paperCount)
    .slice(0, 1000);
}
