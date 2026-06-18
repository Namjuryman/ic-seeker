function splitList(value) {
  return String(value || '').split(';').map(item => item.trim()).filter(Boolean);
}

function recentCutoff(params) {
  const years = Number(params?.get?.('recentYears') || 0);
  if (!Number.isFinite(years) || years <= 0) return null;
  return new Date().getFullYear() - years + 1;
}

function scoreAuthor(item) {
  return Math.round((item.scoreSum + item.sPlus * 5 + item.s * 2 + item.citations / 50) * 10) / 10;
}

function isEliteRank(rank) {
  return ['SSS', 'SS+', 'S+'].includes(String(rank || ''));
}

function normalizeInstitutionName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(univ|univ\.)\b/g, 'university')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadQsRows(db) {
  return db.prepare('SELECT name, aliases, qs_world_rank, qs_region_rank, region FROM qs_rankings').all()
    .map(row => ({
      ...row,
      names: [row.name, ...String(row.aliases || '').split(',')]
        .map(normalizeInstitutionName)
        .filter(Boolean)
    }));
}

function isSafeQsMatch(target, candidate) {
  if (!target || !candidate) return false;
  if (target === candidate) return true;

  const targetTokens = new Set(target.split(' '));
  const candidateTokens = candidate.split(' ');
  const hasInstitutionWord = ['university', 'institute', 'college', 'academy', 'school', 'laboratory', 'labs', 'centre', 'center'].some(token => targetTokens.has(token));

  if (candidate.length <= 5) return false;
  if (candidateTokens.length === 1 && !hasInstitutionWord) return false;

  const paddedTarget = ` ${target} `;
  const paddedCandidate = ` ${candidate} `;
  return paddedTarget.includes(paddedCandidate) || (candidate.length >= 10 && paddedCandidate.includes(paddedTarget));
}

function findQsRank(qsRows, institutionName) {
  const target = normalizeInstitutionName(institutionName);
  for (const row of qsRows) {
    if (row.names.some(name => isSafeQsMatch(target, name))) {
      return {
        qs_world_rank: row.qs_world_rank,
        qs_region_rank: row.qs_region_rank,
        region: row.region,
        name: row.name
      };
    }
  }
  return null;
}

function buildAuthorInstitutionIndex(rows) {
  const index = new Map();
  for (const row of rows) {
    const institutions = splitList(row.affiliations);
    if (!institutions.length) continue;
    for (const author of splitList(row.authors)) {
      const authorName = author.trim();
      if (!authorName) continue;
      const item = index.get(authorName) || { total: 0, institutions: new Map() };
      item.total += 1;
      for (const institution of institutions) {
        item.institutions.set(institution, (item.institutions.get(institution) || 0) + 1);
      }
      index.set(authorName, item);
    }
  }
  return index;
}

function inferAuthorInstitution(authorIndex, authorName, institutionName) {
  const item = authorIndex.get(authorName);
  if (!item) return { primaryInstitution: '', institutionPapers: 0, totalPapers: 0, share: 0, isLikelyMember: false };

  const target = String(institutionName || '').trim().toLowerCase();
  const entries = [...item.institutions.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const primaryInstitution = entries[0]?.[0] || '';
  const institutionPapers = entries.find(([name]) => name.toLowerCase() === target)?.[1] || 0;
  const totalPapers = Math.max(1, item.total);
  const share = institutionPapers / totalPapers;
  const primaryCount = entries[0]?.[1] || 0;

  return {
    primaryInstitution,
    institutionPapers,
    totalPapers,
    share,
    isLikelyMember: institutionPapers > 0 && primaryInstitution.toLowerCase() === target
  };
}

function inferMentorCandidate(summary) {
  const years = [...(summary.years || new Map()).keys()].filter(year => Number(year) > 0);
  const firstYear = years.length ? Math.min(...years) : null;
  const lastYear = years.length ? Math.max(...years) : null;
  const careerSpan = firstYear && lastYear ? lastYear - firstYear + 1 : 0;
  const authorScore = scoreAuthor(summary);
  const likelyMentor = (
    summary.papers >= 5 ||
    summary.sPlus >= 3 ||
    authorScore >= 550 ||
    (careerSpan >= 4 && summary.papers >= 3)
  );
  const stage = likelyMentor
    ? (summary.papers >= 20 || authorScore >= 2500 ? 'senior-or-leading-faculty' : 'faculty-candidate')
    : 'likely-student-or-collaborator';
  return { likelyMentor, stage, firstYear, lastYear, careerSpan, authorScore };
}

export function createMentorService({ openDb }) {
  function institutionsWithMentors(params = new URLSearchParams()) {
    const cutoff = recentCutoff(params);
    const db = openDb();
    try {
      const qsRows = loadQsRows(db);
      const rows = db.prepare(`
        SELECT affiliations, authors, venue_rank, quality_score, citation_count, year
        FROM papers
        WHERE affiliations != '' AND COALESCE(venue_rank, '') != 'Hidden'
          ${cutoff ? 'AND year >= ?' : ''}
      `).all(...(cutoff ? [cutoff] : []));
      const authorIndex = buildAuthorInstitutionIndex(rows);
      const authorStats = new Map();
      for (const row of rows) {
        for (const author of splitList(row.authors)) {
          const authorName = author.trim();
          if (!authorName) continue;
          const item = authorStats.get(authorName) || { papers: 0, scoreSum: 0, citations: 0, sPlus: 0, s: 0, years: new Map() };
          item.papers += 1;
          item.scoreSum += Number(row.quality_score || 0);
          item.citations += Number(row.citation_count || 0);
          item.years.set(Number(row.year || 0), (item.years.get(Number(row.year || 0)) || 0) + 1);
          if (isEliteRank(row.venue_rank)) item.sPlus += 1;
          else if (row.venue_rank === 'S') item.s += 1;
          authorStats.set(authorName, item);
        }
      }
      const byInstitution = new Map();
      for (const row of rows) {
        for (const name of splitList(row.affiliations)) {
          const item = byInstitution.get(name) || { name, papers: 0, scoreSum: 0, citations: 0, sPlus: 0, s: 0, a: 0, authors: new Set() };
          item.papers += 1;
          item.scoreSum += Number(row.quality_score || 0);
          item.citations += Number(row.citation_count || 0);
          for (const a of splitList(row.authors)) item.authors.add(a);
          if (isEliteRank(row.venue_rank)) item.sPlus += 1;
          else if (row.venue_rank === 'S') item.s += 1;
          else if (String(row.venue_rank || '').startsWith('A')) item.a += 1;
          byInstitution.set(name, item);
        }
      }
      const result = [...byInstitution.values()]
        .map(item => ({
          name: item.name,
          papers: item.papers,
          authorCount: item.authors.size,
          mentorCount: [...item.authors].filter(authorName => {
            const affiliation = inferAuthorInstitution(authorIndex, authorName, item.name);
            const role = inferMentorCandidate(authorStats.get(authorName) || { papers: 0, scoreSum: 0, citations: 0, sPlus: 0, s: 0, years: new Map() });
            return affiliation.isLikelyMember && role.likelyMentor;
          }).length,
          institutionScore: scoreAuthor({ scoreSum: item.scoreSum, sPlus: item.sPlus, s: item.s, citations: item.citations }),
          avgScore: Math.round((item.scoreSum / Math.max(1, item.papers)) * 10) / 10,
          citations: item.citations,
          sPlus: item.sPlus,
          s: item.s,
          a: item.a,
          qs: findQsRank(qsRows, item.name)
        }))
        .filter(item => item.papers >= 2)
        .sort((a, b) => {
          return b.institutionScore - a.institutionScore || b.sPlus - a.sPlus || b.papers - a.papers;
        });
      return result;
    } finally {
      db.close();
    }
  }

  function mentorsByInstitution(name, params = new URLSearchParams()) {
    const target = String(name || '').trim().toLowerCase();
    const cutoff = recentCutoff(params);
    const db = openDb();
    try {
      const qsRows = loadQsRows(db);
      const allRows = db.prepare(`
        SELECT *
        FROM papers
        WHERE affiliations != '' AND COALESCE(venue_rank, '') != 'Hidden'
          ${cutoff ? 'AND year >= ?' : ''}
      `).all(...(cutoff ? [cutoff] : []));
      const authorIndex = buildAuthorInstitutionIndex(allRows);
      const rows = allRows
        .filter(row => splitList(row.affiliations).some(inst => inst.toLowerCase() === target));
      const byAuthor = new Map();
      const domains = new Map();
      const currentYear = new Date().getFullYear();
      for (const row of rows) {
        for (const rawName of splitList(row.authors)) {
          const authorName = rawName.trim();
          if (!authorName) continue;
          const affiliation = inferAuthorInstitution(authorIndex, authorName, name);
          if (!affiliation.isLikelyMember) continue;
          const item = byAuthor.get(authorName) || {
            name: authorName,
            primaryInstitution: affiliation.primaryInstitution,
            institutionPapers: affiliation.institutionPapers,
            institutionShare: affiliation.share,
            papers: 0,
            scoreSum: 0,
            citations: 0,
            sPlus: 0,
            s: 0,
            a: 0,
            domains: new Map(),
            years: new Map()
          };
          item.papers += 1;
          item.institutionPapers = Math.max(item.institutionPapers || 0, affiliation.institutionPapers);
          item.institutionShare = Math.max(item.institutionShare || 0, affiliation.share);
          item.scoreSum += Number(row.quality_score || 0);
          item.citations += Number(row.citation_count || 0);
          item.domains.set(String(row.domain || 'General IC'), (item.domains.get(String(row.domain || 'General IC')) || 0) + 1);
          item.years.set(Number(row.year || 0), (item.years.get(Number(row.year || 0)) || 0) + 1);
          if (isEliteRank(row.venue_rank)) item.sPlus += 1;
          else if (row.venue_rank === 'S') item.s += 1;
          else if (String(row.venue_rank || '').startsWith('A')) item.a += 1;
          byAuthor.set(authorName, item);
        }
        const d = String(row.domain || 'General IC');
        domains.set(d, (domains.get(d) || 0) + 1);
      }
      const mentors = [...byAuthor.values()]
        .map(item => {
          const recentCount = [...item.years.entries()]
            .filter(([year]) => year >= currentYear - 4)
            .reduce((sum, [, count]) => sum + count, 0);
          const previousCount = [...item.years.entries()]
            .filter(([year]) => year >= currentYear - 9 && year < currentYear - 4)
            .reduce((sum, [, count]) => sum + count, 0);
          const trendRatio = previousCount ? recentCount / previousCount : (recentCount ? 2 : 0);
          const role = inferMentorCandidate(item);
          return {
            name: item.name,
            primaryInstitution: item.primaryInstitution,
            institutionPapers: item.institutionPapers,
            institutionShare: Math.round(item.institutionShare * 100) / 100,
            papers: item.papers,
            scoreSum: item.scoreSum,
            citations: item.citations,
            sPlus: item.sPlus,
            s: item.s,
            a: item.a,
            avgScore: Math.round((item.scoreSum / Math.max(1, item.papers)) * 10) / 10,
            authorScore: scoreAuthor(item),
            topDomains: [...item.domains.entries()]
              .map(([key, count]) => ({ key, count }))
              .sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)))
              .slice(0, 3),
            yearlyActivity: [...item.years.entries()]
              .filter(([year]) => year > 0)
              .map(([year, count]) => ({ year, count }))
              .sort((a, b) => a.year - b.year),
            recentPapers: recentCount,
            trend: trendRatio >= 1.25 ? 'rising' : trendRatio <= 0.75 ? 'cooling' : 'stable',
            roleStage: role.stage,
            likelyMentor: role.likelyMentor,
            firstYear: role.firstYear,
            lastYear: role.lastYear,
            careerSpan: role.careerSpan
          };
        })
        .filter(item => item.likelyMentor)
        .sort((a, b) => b.authorScore - a.authorScore || b.papers - a.papers);
      const qs = findQsRank(qsRows, name);
      return {
        institution: name,
        recentYears: cutoff ? Number(params.get('recentYears')) : null,
        cutoffYear: cutoff,
        qs,
        mentors: mentors.slice(0, 100),
        mentorCandidateCount: mentors.length,
        excludedLikelyStudentCount: [...byAuthor.values()].length - mentors.length,
        domains: [...domains.entries()].map(([k, v]) => ({ key: k, count: v })).sort((a, b) => b.count - a.count)
      };
    } finally {
      db.close();
    }
  }

  function mentorProfile(name, params = new URLSearchParams()) {
    const target = String(name || '').trim().toLowerCase();
    const cutoff = recentCutoff(params);
    const db = openDb();
    try {
      const qsRows = loadQsRows(db);
      const rows = db.prepare(`
        SELECT *
        FROM papers
        WHERE authors LIKE ? AND COALESCE(venue_rank, '') != 'Hidden'
          ${cutoff ? 'AND year >= ?' : ''}
      `).all(...(cutoff ? [`%${name}%`, cutoff] : [`%${name}%`]))
        .filter(row => splitList(row.authors).some(author => author.toLowerCase() === target));
      const summary = summarizeMentorRows(rows);
      const coauthors = new Map();
      const institutions = new Map();
      for (const row of rows) {
        for (const author of splitList(row.authors)) {
          if (author.toLowerCase() !== target) coauthors.set(author, (coauthors.get(author) || 0) + 1);
        }
        for (const institution of splitList(row.affiliations)) institutions.set(institution, (institutions.get(institution) || 0) + 1);
      }
      const primaryInstitution = [...institutions.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      const authorScore = scoreAuthor({ scoreSum: summary.scoreSum, sPlus: summary.ranks.sPlus, s: summary.ranks.s, citations: summary.citations });
      return {
        name,
        recentYears: cutoff ? Number(params.get('recentYears')) : null,
        cutoffYear: cutoff,
        paperCount: summary.papers,
        authorScore,
        ...summary,
        coauthors: [...coauthors.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, 40),
        institutions: [...institutions.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, 20),
        primaryInstitution,
        qs: findQsRank(qsRows, primaryInstitution),
        external: {
          googleScholar: `https://scholar.google.com/scholar?q=${encodeURIComponent(name)}`,
          webSearch: `https://www.google.com/search?q=${encodeURIComponent(`${name} professor integrated circuits`)}`
        },
        papers: paperListForMentor(rows)
      };
    } finally {
      db.close();
    }
  }

  return { institutionsWithMentors, mentorsByInstitution, mentorProfile };
}

function summarizeMentorRows(rows) {
  const years = new Map();
  const venues = new Map();
  const domains = new Map();
  const ranks = { sPlus: 0, s: 0, a: 0, other: 0 };
  let scoreSum = 0;
  let citations = 0;
  for (const row of rows) {
    years.set(row.year, (years.get(row.year) || 0) + 1);
    venues.set(row.venue, (venues.get(row.venue) || 0) + 1);
    domains.set(row.domain, (domains.get(row.domain) || 0) + 1);
    scoreSum += Number(row.quality_score || 0);
    citations += Number(row.citation_count || 0);
    if (isEliteRank(row.venue_rank)) ranks.sPlus += 1;
    else if (row.venue_rank === 'S') ranks.s += 1;
    else if (String(row.venue_rank || '').startsWith('A')) ranks.a += 1;
    else ranks.other += 1;
  }
  const sortedEntries = map => [...map.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)));
  return {
    papers: rows.length,
    scoreSum: Math.round(scoreSum * 10) / 10,
    avgScore: Math.round((scoreSum / Math.max(1, rows.length)) * 10) / 10,
    citations,
    ranks,
    byYear: sortedEntries(years).sort((a, b) => Number(a.key) - Number(b.key)),
    byVenue: sortedEntries(venues),
    byDomain: sortedEntries(domains)
  };
}

function paperListForMentor(rows) {
  return rows
    .sort((a, b) => Number(b.year) - Number(a.year) || Number(b.quality_score) - Number(a.quality_score))
    .slice(0, 250)
    .map(row => ({
      id: row.id,
      title: row.title,
      authors: row.authors,
      affiliations: row.affiliations,
      year: row.year,
      venue: row.venue,
      rank: row.venue_rank,
      field: row.domain,
      score: row.quality_score,
      doi: row.doi,
      citations: row.citation_count
    }));
}
