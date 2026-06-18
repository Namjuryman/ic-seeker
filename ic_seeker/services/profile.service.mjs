function findQsRank(db, institutionName) {
  const rows = db.prepare('SELECT name, aliases, qs_world_rank, qs_region_rank, region FROM qs_rankings').all();
  const target = String(institutionName || '').trim().toLowerCase();
  for (const r of rows) {
    const names = [r.name, ...r.aliases.split(',')].map(s => s.trim().toLowerCase());
    if (names.some(n => n === target || target.includes(n) || n.includes(target))) {
      return { qs_world_rank: r.qs_world_rank, qs_region_rank: r.qs_region_rank, region: r.region };
    }
  }
  return null;
}

function splitList(value) {
  return String(value || '').split(';').map(item => item.trim()).filter(Boolean);
}

function scoreAuthor(item) {
  return Math.round((item.scoreSum + item.sPlus * 5 + item.s * 2 + item.citations / 50) * 10) / 10;
}

function summarizePaperRows(rows) {
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
    if (row.venue_rank === 'S+') ranks.sPlus += 1;
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

function paperListForProfile(rows) {
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

export function createProfileService({ openDb }) {
  function professors(params) {
    const limit = Math.min(Number(params.get('limit') || 80), 300);
    const db = openDb();
    try {
      const rows = db.prepare("SELECT authors, venue_rank, quality_score, citation_count FROM papers WHERE authors != ''").all();
      const byAuthor = new Map();
      for (const row of rows) {
        for (const rawName of String(row.authors || '').split(';')) {
          const name = rawName.trim();
          if (!name) continue;
          const item = byAuthor.get(name) || { name, papers: 0, scoreSum: 0, citations: 0, sPlus: 0, s: 0, a: 0 };
          item.papers += 1;
          item.scoreSum += Number(row.quality_score || 0);
          item.citations += Number(row.citation_count || 0);
          if (row.venue_rank === 'S+') item.sPlus += 1;
          else if (row.venue_rank === 'S') item.s += 1;
          else if (String(row.venue_rank || '').startsWith('A')) item.a += 1;
          byAuthor.set(name, item);
        }
      }
      return [...byAuthor.values()]
        .map(item => ({
          ...item,
          avgScore: Math.round((item.scoreSum / Math.max(1, item.papers)) * 10) / 10,
          authorScore: scoreAuthor(item)
        }))
        .filter(item => item.papers >= Number(params.get('minPapers') || 2))
        .sort((a, b) => b.authorScore - a.authorScore || b.papers - a.papers)
        .slice(0, limit);
    } finally {
      db.close();
    }
  }

  function authorProfile(name) {
    const target = String(name || '').trim().toLowerCase();
    const db = openDb();
    try {
      const rows = db.prepare('SELECT * FROM papers WHERE authors LIKE ?').all(`%${name}%`)
        .filter(row => splitList(row.authors).some(author => author.toLowerCase() === target));
      const summary = summarizePaperRows(rows);
      const coauthors = new Map();
      const institutions = new Map();
      for (const row of rows) {
        for (const author of splitList(row.authors)) {
          if (author.toLowerCase() !== target) coauthors.set(author, (coauthors.get(author) || 0) + 1);
        }
        for (const institution of splitList(row.affiliations)) institutions.set(institution, (institutions.get(institution) || 0) + 1);
      }
      const primaryInstitution = [...institutions.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      const authorScore = scoreAuthor({
        scoreSum: summary.scoreSum,
        sPlus: summary.ranks.sPlus,
        s: summary.ranks.s,
        citations: summary.citations
      });
      return {
        name,
        paperCount: summary.papers,
        authorScore,
        ...summary,
        coauthors: [...coauthors.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, 40),
        institutions: [...institutions.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, 20),
        primaryInstitution,
        qs: findQsRank(db, primaryInstitution),
        external: {
          googleScholar: `https://scholar.google.com/scholar?q=${encodeURIComponent(name)}`,
          webSearch: `https://www.google.com/search?q=${encodeURIComponent(`${name} professor integrated circuits`)}`
        },
        papers: paperListForProfile(rows)
      };
    } finally {
      db.close();
    }
  }

  function institutions(params) {
    const limit = Math.min(Number(params.get('limit') || 80), 300);
    const minPapers = Number(params.get('minPapers') || 2);
    const db = openDb();
    try {
      const rows = db.prepare("SELECT affiliations, venue_rank, quality_score, citation_count FROM papers WHERE affiliations != ''").all();
      const byInstitution = new Map();
      for (const row of rows) {
        for (const name of splitList(row.affiliations)) {
          const item = byInstitution.get(name) || { name, papers: 0, scoreSum: 0, citations: 0, sPlus: 0, s: 0, a: 0 };
          item.papers += 1;
          item.scoreSum += Number(row.quality_score || 0);
          item.citations += Number(row.citation_count || 0);
          if (row.venue_rank === 'S+') item.sPlus += 1;
          else if (row.venue_rank === 'S') item.s += 1;
          else if (String(row.venue_rank || '').startsWith('A')) item.a += 1;
          byInstitution.set(name, item);
        }
      }
      return [...byInstitution.values()]
        .map(item => ({
          ...item,
          avgScore: Math.round((item.scoreSum / Math.max(1, item.papers)) * 10) / 10,
          institutionScore: scoreAuthor(item)
        }))
        .filter(item => item.papers >= minPapers)
        .sort((a, b) => b.institutionScore - a.institutionScore || b.papers - a.papers)
        .slice(0, limit);
    } finally {
      db.close();
    }
  }

  function institutionProfile(name) {
    const target = String(name || '').trim().toLowerCase();
    const db = openDb();
    try {
      const rows = db.prepare('SELECT * FROM papers WHERE affiliations LIKE ?').all(`%${name}%`)
        .filter(row => splitList(row.affiliations).some(institution => institution.toLowerCase() === target));
      const authors = new Map();
      for (const row of rows) {
        for (const author of splitList(row.authors)) authors.set(author, (authors.get(author) || 0) + 1);
      }
      const summary = summarizePaperRows(rows);
      return {
        name,
        paperCount: summary.papers,
        institutionScore: scoreAuthor({
          scoreSum: summary.scoreSum,
          sPlus: summary.ranks.sPlus,
          s: summary.ranks.s,
          citations: summary.citations
        }),
        ...summary,
        authors: [...authors.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, 50),
        papers: paperListForProfile(rows),
        qs: findQsRank(db, name)
      };
    } finally {
      db.close();
    }
  }

  return { authorProfile, institutionProfile, institutions, professors };
}
