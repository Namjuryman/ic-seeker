const institutionPattern = /\b(university|institute|academy|laborator(?:y|ies)|labs?|center|centre|school|college|department|faculty|hospital|corporation|company|technologies|technology|ltd|inc|research center|engineering research|state key|national engineering)\b/i;
const brokenAffiliationTailPattern = /[)]$/;
const parentInstitutionPattern = /\b(university|academy|corporation|company|technologies|technology|college|kaist|imec|tsmc|intel|samsung|texas instruments|analog devices)\b/i;
const subunitInstitutionPattern = /\b(institute|school|department|faculty|laborator(?:y|ies)|labs?|center|centre|national engineering research center|state key)\b/i;

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

export function authorsForInstitution(row, institutionName) {
  const target = String(institutionName || '').trim().toLowerCase();
  if (!target) return splitAuthors(row?.authors);
  return authorAffiliationPairs(row)
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
