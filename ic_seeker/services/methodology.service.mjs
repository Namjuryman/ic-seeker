export function methodology() {
  return {
    scoring: {
      formula: 'quality_score = venue_base + venue_policy_domain_boost + citation_boost + recency_boost',
      citationBoost: 'min(cited_by_count, 300) / 25',
      recencyBoost: `(publication_year - ${2016}) * 0.35, floored at 0`,
      venueBase: {
        ISSCC: 100,
        JSSC: 100,
        'VLSI Symposium': 92,
        CICC: 86,
        IEDM: 84,
        ASSCC: 78,
        ESSCIRC: 76,
        DAC: 74,
        ICCAD: 74,
        TCAD: 70,
        DATE: 66,
        'TCAS-I': 64,
        TVLSI: 62,
        'TCAS-II': 60,
        ISCAS: 54,
        // IC-adjacent journals are intentionally conservative so materials/devices
        // venues do not dominate IC institution or mentor rankings.
        'Nature Electron.': 115,
        'Nat. Electronics': 115,
        'Nature': 125,
        'Nat. Commun.': 0,
        'IEEE T-MTT': 78,
        'IEEE TED': 50,
        'IEEE EDL': 0,
        'IEEE Sensors J.': 40,
        'Adv. Mater.': 38,
        'Appl. Phys. Lett.': 34,
        'Solid-State Electron.': 36,
        'IEEE JMEMS': 42,
        'IEEE T-Nano': 34,
        'Microelectron. J.': 32
      }
    },
    classification: [
      'Each paper is scored against IC-domain keyword dictionaries using title, abstract, source name, and OpenAlex concepts.',
      'The domain with the most keyword hits wins; if no domain wins but IC terms are present, it falls back to General IC.',
      'Broad IC-adjacent journals are visible as metadata but heavily downweighted; Nature Communications and IEEE EDL are currently hidden from default ranking/search surfaces until stricter validation is added.',
      'This is intentionally transparent and editable. It is not a learned model yet.'
    ],
    coverage: [
      'The builder now uses venue-year OpenAlex search for every configured year, then backfills from resolved OpenAlex sources.',
      'Conference coverage can still depend on how OpenAlex indexes a specific proceedings year.',
      'Publisher PDFs are not mass-downloaded; local PDFs can be attached through the pdf_inbox workflow.'
    ],
    professorScoring: {
      formula: 'author_score = score_sum + 5 * s_plus_count + 2 * s_count + citation_count / 50',
      caveat: 'Current author identity is name-based. ORCID/institution disambiguation should be added before using it seriously.'
    }
  };
}
