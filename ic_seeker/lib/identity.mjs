const institutionPattern = /\b(university|institute|academy|laborator(?:y|ies)|labs?|center|centre|school|college|department|faculty|hospital|corporation|company|technologies|technology|ltd|inc|research center|engineering research|state key|national engineering)\b/i;
const brokenAffiliationTailPattern = /[)]$/;
const parentInstitutionPattern = /\b(university|academy|corporation|company|technologies|technology|college|kaist|imec|tsmc|intel|samsung|texas instruments|analog devices)\b/i;
const subunitInstitutionPattern = /\b(institute|school|department|faculty|laborator(?:y|ies)|labs?|center|centre|national engineering research center|state key)\b/i;
const authorAliasCache = new WeakMap();

export function splitList(value) {
  return String(value || '').split(';').map(item => item.trim()).filter(Boolean);
}

export function cleanAuthorName(value) {
  let name = String(value || '').trim().replace(/\s+/g, ' ');
  if (!name) return '';
  if (brokenAffiliationTailPattern.test(name) && !name.includes('(')) return '';
  name = name.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  if (!name) return '';
  if (institutionPattern.test(name)) return '';
  if (name.length > 80) return '';
  if (!/[A-Za-zÀ-ž\u4e00-\u9fff]/.test(name)) return '';
  return name;
}

export function splitAuthors(value) {
  const seen = new Set();
  const authors = [];
  for (const raw of splitList(value)) {
    const name = cleanAuthorName(raw);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    authors.push(name);
  }
  return authors;
}

function normalizeAuthorToken(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/[^A-Za-z\u4e00-\u9fff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function authorSignature(name) {
  const normalized = normalizeAuthorToken(name);
  const parts = normalized.split(' ').filter(Boolean);
  if (parts.length < 2) return '';
  const surname = parts.at(-1);
  const initials = parts.slice(0, -1).map(part => part[0]).join('');
  return `${initials} ${surname}`;
}

function firstLastSignature(name) {
  const parts = normalizeAuthorToken(name).split(' ').filter(Boolean);
  if (parts.length < 2 || parts[0].length <= 1) return '';
  return `${parts[0]} ${parts.at(-1)}`;
}

function authorCompleteness(name) {
  const parts = normalizeAuthorToken(name).split(' ').filter(Boolean);
  return parts.reduce((score, part, index) => {
    if (index === parts.length - 1) return score + Math.min(8, part.length);
    return score + (part.length > 1 ? 4 : 1);
  }, 0);
}

function compatibleAlias(shortName, fullName) {
  const shortParts = normalizeAuthorToken(shortName).split(' ').filter(Boolean);
  const fullParts = normalizeAuthorToken(fullName).split(' ').filter(Boolean);
  if (shortParts.length < 2 || fullParts.length < 2) return false;
  if (shortParts.at(-1) !== fullParts.at(-1)) return false;
  if (authorSignature(shortName) !== authorSignature(fullName)) return false;
  for (let i = 0; i < shortParts.length - 1; i += 1) {
    const short = shortParts[i];
    const full = fullParts[i] || '';
    if (short.length > 1 && full !== short) return false;
  }
  return true;
}

export function createAuthorAliasResolver(rows = []) {
  const names = new Map();
  for (const row of rows) {
    for (const name of splitAuthors(row?.authors)) names.set(name, (names.get(name) || 0) + 1);
  }
  const bySignature = new Map();
  for (const [name, count] of names.entries()) {
    const signature = authorSignature(name);
    if (!signature) continue;
    const candidates = bySignature.get(signature) || [];
    candidates.push({ name, count, score: authorCompleteness(name) });
    bySignature.set(signature, candidates);
  }
  const aliases = new Map();
  for (const candidates of bySignature.values()) {
    candidates.sort((a, b) => b.count - a.count || b.score - a.score || a.name.localeCompare(b.name));
    for (const candidate of candidates) {
      const canonical = candidates.find(item => compatibleAlias(candidate.name, item.name)) || candidate;
      aliases.set(normalizeAuthorToken(candidate.name), canonical.name);
    }
  }
  const byFirstLast = new Map();
  for (const [name, count] of names.entries()) {
    const signature = firstLastSignature(name);
    if (!signature) continue;
    const candidates = byFirstLast.get(signature) || [];
    candidates.push({ name, count, score: authorCompleteness(name) });
    byFirstLast.set(signature, candidates);
  }
  for (const candidates of byFirstLast.values()) {
    candidates.sort((a, b) => b.count - a.count || b.score - a.score || a.name.localeCompare(b.name));
    const canonical = candidates[0];
    for (const candidate of candidates) aliases.set(normalizeAuthorToken(candidate.name), canonical.name);
  }
  return name => aliases.get(normalizeAuthorToken(name)) || name;
}

export function authorAliasResolverForRows(rows = []) {
  if (!Array.isArray(rows)) return name => name;
  if (!authorAliasCache.has(rows)) authorAliasCache.set(rows, createAuthorAliasResolver(rows));
  return authorAliasCache.get(rows);
}

export function authorAffiliationPairs(row) {
  const text = String(row?.authors || '');
  const pairs = [];
  const authorWithAffiliations = /([^;()]+?)\s*\(([^)]*)\)/g;
  let match;
  while ((match = authorWithAffiliations.exec(text))) {
    const name = cleanAuthorName(match[1]);
    if (!name) continue;
    pairs.push({ name, affiliations: splitList(match[2]) });
  }
  if (pairs.length) return pairs;
  const affiliations = splitList(row?.affiliations);
  return splitAuthors(row?.authors).map(name => ({ name, affiliations }));
}

export function canonicalAuthorAffiliationPairs(row, resolveAuthor = name => name) {
  return authorAffiliationPairs(row).map(pair => ({ ...pair, name: resolveAuthor(pair.name) }));
}

export function authorsForInstitution(row, institutionName, resolveAuthor = name => name) {
  const target = String(institutionName || '').trim().toLowerCase();
  if (!target) return splitAuthors(row?.authors).map(resolveAuthor);
  return canonicalAuthorAffiliationPairs(row, resolveAuthor)
    .filter(pair => pair.affiliations.some(institution => institution.trim().toLowerCase() === target))
    .map(pair => pair.name);
}

export function isLikelySubunitInstitution(value) {
  const name = String(value || '').trim();
  if (!name) return false;
  return subunitInstitutionPattern.test(name) && !parentInstitutionPattern.test(name);
}

export function parentInstitutionsForRow(row, subunitName) {
  const target = String(subunitName || '').trim().toLowerCase();
  return splitList(row?.affiliations)
    .filter(name => name.toLowerCase() !== target)
    .filter(name => !isLikelySubunitInstitution(name));
}
