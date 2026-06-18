export function createVenueMatrixService({ openDb }) {
  function venueMatrix() {
    const db = openDb();
    try {
      // Get all venue-year counts and domain info
      const rows = db.prepare(`
        SELECT 
          venue, 
          venue_rank, 
          year, 
          domain, 
          COUNT(*) as count
        FROM papers 
        WHERE venue != '' AND venue IS NOT NULL AND COALESCE(venue_rank, '') != 'Hidden'
        GROUP BY venue, year, domain
        ORDER BY venue, year DESC, count DESC
      `).all();

      // Get domain stats per venue
      const domainRows = db.prepare(`
        SELECT venue, domain, COUNT(*) as count
        FROM papers
        WHERE venue != '' AND domain != '' AND COALESCE(venue_rank, '') != 'Hidden'
        GROUP BY venue, domain
        ORDER BY venue, count DESC
      `).all();

      const byVenue = new Map();
      const venueDomains = new Map();

      for (const row of domainRows) {
        const list = venueDomains.get(row.venue) || [];
        list.push({ domain: row.domain, count: row.count });
        venueDomains.set(row.venue, list);
      }

      for (const row of rows) {
        const key = row.venue;
        if (!byVenue.has(key)) {
          const doms = venueDomains.get(key) || [];
          byVenue.set(key, {
            name: row.venue,
            rank: row.venue_rank || '-',
            total: 0,
            primaryDomain: doms[0]?.domain || 'General IC',
            allDomains: doms.slice(0, 3).map(d => d.domain),
            yearCounts: {},
            earlier: 0
          });
        }
        const item = byVenue.get(key);
        item.total += row.count;
        const year = Number(row.year || 0);
        if (year >= 2019 && year <= 2026) {
          item.yearCounts[year] = (item.yearCounts[year] || 0) + row.count;
        } else if (year < 2019) {
          item.earlier += row.count;
        }
      }

      return [...byVenue.values()].sort((a, b) => {
        const rankScore = rank => {
          const scores = {
            'S+': 100, 'S': 95,
            'A+': 90, 'A': 85, 'A-': 80,
            'B+': 75, 'B': 70, 'B-': 65,
            'C+': 60, 'C': 55, 'C-': 50,
            'D': 40
          };
          return scores[rank] || 0;
        };
        const sa = rankScore(a.rank);
        const sb = rankScore(b.rank);
        if (sa !== sb) return sb - sa; // Higher rank first
        return b.total - a.total; // Then by total papers desc
      });
    } finally {
      db.close();
    }
  }

  return { venueMatrix };
}
