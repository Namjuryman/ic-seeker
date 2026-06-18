import { splitAuthors, splitList } from '../lib/identity.mjs';

function rankCounts(rows) {
  const ranks = { sPlus: 0, s: 0, a: 0, other: 0 };
  for (const row of rows) {
    if (isEliteRank(row.venue_rank)) ranks.sPlus += 1;
    else if (row.venue_rank === 'S') ranks.s += 1;
    else if (String(row.venue_rank || '').startsWith('A')) ranks.a += 1;
    else ranks.other += 1;
  }
  return ranks;
}

function isEliteRank(rank) {
  return ['SSS', 'SS+', 'S+'].includes(String(rank || ''));
}

function scoreEntity(item) {
  return Math.round((item.scoreSum + item.sPlus * 5 + item.s * 2 + item.citations / 50) * 10) / 10;
}

function sortedCounts(map, key = 'key') {
  return [...map.entries()]
    .map(([name, count]) => ({ [key]: name, count }))
    .sort((a, b) => b.count - a.count || String(a[key]).localeCompare(String(b[key])));
}

function paperPreview(row) {
  return {
    id: row.id,
    title: row.title,
    authors: row.authors,
    affiliations: row.affiliations,
    abstract: row.abstract,
    year: row.year,
    venue: row.venue,
    rank: row.venue_rank,
    field: row.domain,
    score: row.quality_score,
    doi: row.doi,
    citations: row.citation_count
  };
}

export function createTopicService({ openDb }) {
  function topics() {
    const db = openDb();
    try {
      const rows = db.prepare(`
        SELECT domain AS field, COUNT(*) AS papers, ROUND(AVG(quality_score), 1) AS avgScore,
               SUM(CASE WHEN venue_rank IN ('SSS', 'SS+', 'S+') THEN 1 ELSE 0 END) AS sPlus,
               SUM(CASE WHEN venue_rank = 'S' THEN 1 ELSE 0 END) AS s,
               SUM(CASE WHEN venue_rank LIKE 'A%' THEN 1 ELSE 0 END) AS a,
               MIN(year) AS firstYear, MAX(year) AS lastYear
        FROM papers
        WHERE COALESCE(venue_rank, '') != 'Hidden'
        GROUP BY domain
        ORDER BY papers DESC, avgScore DESC
      `).all();
      return rows.map(row => ({
        ...row,
        score: Math.round((Number(row.avgScore || 0) + Number(row.sPlus || 0) * 0.8 + Number(row.s || 0) * 0.35) * 10) / 10
      }));
    } finally {
      db.close();
    }
  }

  function topicDetail(field) {
    const target = String(field || '').trim();
    if (!target) throw new Error('Topic field is required');
    const db = openDb();
    try {
      const rows = db.prepare("SELECT * FROM papers WHERE domain = ? AND COALESCE(venue_rank, '') != 'Hidden' ORDER BY year DESC, quality_score DESC").all(target);
      const byYear = new Map();
      const byVenue = new Map();
      const authors = new Map();
      const institutions = new Map();
      let scoreSum = 0;
      let citations = 0;
      for (const row of rows) {
        byYear.set(row.year, (byYear.get(row.year) || 0) + 1);
        byVenue.set(row.venue, (byVenue.get(row.venue) || 0) + 1);
        scoreSum += Number(row.quality_score || 0);
        citations += Number(row.citation_count || 0);
        for (const name of splitAuthors(row.authors)) {
          const item = authors.get(name) || { name, papers: 0, scoreSum: 0, citations: 0, sPlus: 0, s: 0, a: 0 };
          item.papers += 1;
          item.scoreSum += Number(row.quality_score || 0);
          item.citations += Number(row.citation_count || 0);
          if (isEliteRank(row.venue_rank)) item.sPlus += 1;
          else if (row.venue_rank === 'S') item.s += 1;
          else if (String(row.venue_rank || '').startsWith('A')) item.a += 1;
          authors.set(name, item);
        }
        for (const name of splitList(row.affiliations)) {
          const item = institutions.get(name) || { name, papers: 0, scoreSum: 0, citations: 0, sPlus: 0, s: 0, a: 0 };
          item.papers += 1;
          item.scoreSum += Number(row.quality_score || 0);
          item.citations += Number(row.citation_count || 0);
          if (isEliteRank(row.venue_rank)) item.sPlus += 1;
          else if (row.venue_rank === 'S') item.s += 1;
          else if (String(row.venue_rank || '').startsWith('A')) item.a += 1;
          institutions.set(name, item);
        }
      }
      const years = [...byYear.entries()]
        .map(([year, count]) => ({ year: Number(year), count }))
        .sort((a, b) => a.year - b.year);
      const peakYear = [...years].sort((a, b) => b.count - a.count)[0] || null;
      const rankedAuthors = [...authors.values()]
        .map(item => ({ ...item, topicScore: scoreEntity(item) }))
        .sort((a, b) => b.topicScore - a.topicScore || b.papers - a.papers)
        .slice(0, 30);
      const rankedInstitutions = [...institutions.values()]
        .map(item => ({ ...item, topicScore: scoreEntity(item) }))
        .sort((a, b) => b.topicScore - a.topicScore || b.papers - a.papers)
        .slice(0, 30);
      return {
        field: target,
        papers: rows.length,
        avgScore: Math.round((scoreSum / Math.max(1, rows.length)) * 10) / 10,
        citations,
        ranks: rankCounts(rows),
        byYear: years,
        peakYear,
        byVenue: sortedCounts(byVenue).slice(0, 16),
        authors: rankedAuthors,
        institutions: rankedInstitutions,
        representativePapers: rows
          .slice()
          .sort((a, b) => Number(b.quality_score || 0) - Number(a.quality_score || 0) || Number(b.year || 0) - Number(a.year || 0))
          .slice(0, 60)
          .map(paperPreview),
        recentPapers: rows.slice(0, 40).map(paperPreview)
      };
    } finally {
      db.close();
    }
  }

  return { topicDetail, topics };
}
