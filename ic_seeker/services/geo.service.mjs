const countryPatterns = [
  {
    code: 'US',
    name: 'United States',
    region: 'North America',
    x: 24,
    y: 42,
    patterns: ['united states', 'usa', 'u.s.a', 'california', 'stanford', 'mit', 'massachusetts institute', 'berkeley', 'ucla', 'uc san', 'university of california', 'caltech', 'princeton', 'cornell', 'columbia university', 'georgia tech', 'university of texas', 'texas instruments', 'intel labs', 'analog devices']
  },
  {
    code: 'CA',
    name: 'Canada',
    region: 'North America',
    x: 21,
    y: 26,
    patterns: ['canada', 'toronto', 'waterloo', 'british columbia', 'ubc', 'mcgill', 'montreal']
  },
  {
    code: 'CN',
    name: 'China',
    region: 'East Asia',
    x: 72,
    y: 45,
    patterns: ['china', 'tsinghua', 'peking university', 'fudan', 'shanghai jiao tong', 'zhejiang university', 'ustc', 'university of science and technology of china', 'chinese academy', 'southeast university', 'xidian', 'tianjin university', 'beihang', 'harbin institute', 'nanjing university']
  },
  {
    code: 'HK',
    name: 'Hong Kong',
    region: 'East Asia',
    x: 73,
    y: 51,
    patterns: ['hong kong', 'hkust', 'cuhk', 'city university of hong kong', 'university of hong kong', 'polyu']
  },
  {
    code: 'MO',
    name: 'Macau',
    region: 'East Asia',
    x: 72,
    y: 53,
    patterns: ['macau', 'macao', 'university of macau']
  },
  {
    code: 'TW',
    name: 'Taiwan',
    region: 'East Asia',
    x: 77,
    y: 51,
    patterns: ['taiwan', 'national taiwan', 'tsmc', 'mediatek', 'national tsing hua', 'national chiao tung', 'nycu']
  },
  {
    code: 'KR',
    name: 'South Korea',
    region: 'East Asia',
    x: 79,
    y: 42,
    patterns: ['korea', 'kaist', 'seoul national', 'postech', 'samsung', 'yonsei']
  },
  {
    code: 'JP',
    name: 'Japan',
    region: 'East Asia',
    x: 84,
    y: 44,
    patterns: ['japan', 'tokyo institute', 'university of tokyo', 'kyoto university', 'osaka university', 'tohoku university', 'sony', 'renesas']
  },
  {
    code: 'SG',
    name: 'Singapore',
    region: 'Southeast Asia',
    x: 70,
    y: 65,
    patterns: ['singapore', 'national university of singapore', 'nus', 'ntu singapore', 'nanyang technological', 'a*star']
  },
  {
    code: 'IN',
    name: 'India',
    region: 'South Asia',
    x: 62,
    y: 56,
    patterns: ['india', 'iit ', 'indian institute', 'iisc', 'bangalore']
  },
  {
    code: 'AU',
    name: 'Australia',
    region: 'Oceania',
    x: 82,
    y: 78,
    patterns: ['australia', 'melbourne', 'sydney', 'unsw', 'monash', 'anu']
  },
  {
    code: 'NL',
    name: 'Netherlands',
    region: 'Europe',
    x: 48,
    y: 34,
    patterns: ['netherlands', 'delft', 'eindhoven', 'university of twente']
  },
  {
    code: 'BE',
    name: 'Belgium',
    region: 'Europe',
    x: 47,
    y: 37,
    patterns: ['belgium', 'ku leuven', 'imec']
  },
  {
    code: 'CH',
    name: 'Switzerland',
    region: 'Europe',
    x: 49,
    y: 40,
    patterns: ['switzerland', 'eth zurich', 'epfl']
  },
  {
    code: 'DE',
    name: 'Germany',
    region: 'Europe',
    x: 50,
    y: 36,
    patterns: ['germany', 'tu munich', 'rwth', 'fraunhofer', 'karlsruhe']
  },
  {
    code: 'FR',
    name: 'France',
    region: 'Europe',
    x: 46,
    y: 40,
    patterns: ['france', 'cea-leti', 'leti', 'grenoble', 'sorbonne', 'telecom paris']
  },
  {
    code: 'UK',
    name: 'United Kingdom',
    region: 'Europe',
    x: 44,
    y: 33,
    patterns: ['united kingdom', 'u.k.', 'uk ', 'imperial college', 'cambridge', 'oxford', 'university college london']
  },
  {
    code: 'IT',
    name: 'Italy',
    region: 'Europe',
    x: 50,
    y: 43,
    patterns: ['italy', 'politecnico di milano', 'university of pavia', 'university of bologna']
  }
];

function splitList(value) {
  return String(value || '').split(';').map(item => item.trim()).filter(Boolean);
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countryForAffiliation(value) {
  const hay = ` ${normalize(value)} `;
  return countryPatterns.find(country => country.patterns.some(pattern => hay.includes(` ${normalize(pattern)} `) || hay.includes(normalize(pattern))));
}

function inferCountries(affiliations) {
  const countries = new Map();
  for (const item of splitList(affiliations)) {
    const country = countryForAffiliation(item);
    if (country) countries.set(country.code, country);
  }
  return [...countries.values()];
}

function rankIncrement(rank) {
  if (rank === 'S+') return 'sPlus';
  if (rank === 'S') return 's';
  if (String(rank || '').startsWith('A')) return 'a';
  return 'other';
}

function scoreEntity(item) {
  return Math.round((item.scoreSum + item.sPlus * 5 + item.s * 2 + item.citations / 50) * 10) / 10;
}

function sortedCounts(map, key = 'key') {
  return [...map.entries()]
    .map(([name, count]) => ({ [key]: name, count }))
    .sort((a, b) => b.count - a.count || String(a[key]).localeCompare(String(b[key])));
}

function ensureCountry(map, country) {
  if (!map.has(country.code)) {
    map.set(country.code, {
      code: country.code,
      name: country.name,
      region: country.region,
      x: country.x,
      y: country.y,
      papers: 0,
      scoreSum: 0,
      citations: 0,
      sPlus: 0,
      s: 0,
      a: 0,
      other: 0,
      recentPapers: 0,
      recentScoreSum: 0,
      institutions: new Map(),
      byYear: new Map(),
      byField: new Map()
    });
  }
  return map.get(country.code);
}

function addYear(map, year, score) {
  if (!year) return;
  const item = map.get(year) || { year, papers: 0, score: 0 };
  item.papers += 1;
  item.score += Number(score || 0);
  map.set(year, item);
}

function addRegion(map, region, year, score) {
  if (!region || !year) return;
  const key = `${region}::${year}`;
  const item = map.get(key) || { region, year, papers: 0, score: 0 };
  item.papers += 1;
  item.score += Number(score || 0);
  map.set(key, item);
}

function topicAlias(field) {
  const value = normalize(field);
  if (!value || value === 'all') return '';
  if (['pmic', 'dcdc', 'dc-dc', 'dc/dc', 'power'].some(item => value.includes(item))) return 'Power Management';
  return field;
}

function rowPreview(row) {
  return {
    id: row.id,
    title: row.title,
    authors: row.authors,
    year: row.year,
    venue: row.venue,
    rank: row.venue_rank,
    field: row.domain,
    score: row.quality_score,
    doi: row.doi
  };
}

export function createGeoService({ openDb }) {
  function geo(params) {
    const requestedField = topicAlias(params.get('field') || '');
    const recentCutoff = new Date().getFullYear() - 9;
    const db = openDb();
    try {
      const fields = db.prepare("SELECT DISTINCT domain FROM papers WHERE domain IS NOT NULL AND domain != '' ORDER BY domain").all().map(row => row.domain);
      const where = requestedField ? 'WHERE domain = ?' : '';
      const args = requestedField ? [requestedField] : [];
      const rows = db.prepare(`
        SELECT id, title, authors, affiliations, abstract, year, venue, venue_rank, domain, quality_score, citation_count, doi
        FROM papers
        ${where}
        ORDER BY year DESC, quality_score DESC
      `).all(...args);
      const byCountry = new Map();
      const byRegionYear = new Map();
      let skipped = 0;

      for (const row of rows) {
        const countries = inferCountries(row.affiliations);
        if (!countries.length) {
          skipped += 1;
          continue;
        }
        for (const country of countries) {
          const item = ensureCountry(byCountry, country);
          const score = Number(row.quality_score || 0);
          item.papers += 1;
          item.scoreSum += score;
          item.citations += Number(row.citation_count || 0);
          item[rankIncrement(row.venue_rank)] += 1;
          if (Number(row.year || 0) >= recentCutoff) {
            item.recentPapers += 1;
            item.recentScoreSum += score;
          }
          item.byField.set(row.domain || 'General IC', (item.byField.get(row.domain || 'General IC') || 0) + 1);
          addYear(item.byYear, Number(row.year || 0), score);
          addRegion(byRegionYear, country.region, Number(row.year || 0), score);
          for (const affiliation of splitList(row.affiliations)) {
            if (countryForAffiliation(affiliation)?.code === country.code) {
              item.institutions.set(affiliation, (item.institutions.get(affiliation) || 0) + 1);
            }
          }
        }
      }

      const countries = [...byCountry.values()]
        .map(item => {
          const topField = sortedCounts(item.byField)[0];
          return {
            code: item.code,
            name: item.name,
            region: item.region,
            x: item.x,
            y: item.y,
            papers: item.papers,
            score: scoreEntity(item),
            recentScore: Math.round((item.recentScoreSum + item.recentPapers * 1.5) * 10) / 10,
            avgScore: Math.round((item.scoreSum / Math.max(1, item.papers)) * 10) / 10,
            citations: item.citations,
            ranks: { sPlus: item.sPlus, s: item.s, a: item.a, other: item.other },
            topField: topField?.key || '-',
            topInstitutions: sortedCounts(item.institutions, 'name').slice(0, 8),
            byField: sortedCounts(item.byField).slice(0, 8),
            byYear: [...item.byYear.values()]
              .map(row => ({ ...row, score: Math.round(row.score * 10) / 10 }))
              .sort((a, b) => a.year - b.year)
          };
        })
        .sort((a, b) => b.score - a.score || b.papers - a.papers);

      return {
        field: requestedField,
        fields,
        skippedWithoutCountry: skipped,
        totalRows: rows.length,
        countries,
        regionTrends: [...byRegionYear.values()]
          .map(row => ({ ...row, score: Math.round(row.score * 10) / 10 }))
          .sort((a, b) => a.year - b.year || a.region.localeCompare(b.region)),
        topPapers: rows.slice(0, 80).map(rowPreview)
      };
    } finally {
      db.close();
    }
  }

  return { geo };
}
