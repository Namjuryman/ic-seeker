import { methodology } from './methodology.service.mjs';

const venueRanks = new Map([
  ['ISSCC', 'S+'], ['JSSC', 'S+'], ['VLSI Symposium', 'S'], ['CICC', 'S'],
  ['IEDM', 'S'], ['ASSCC', 'A'], ['ESSCIRC', 'A'], ['DAC', 'A'],
  ['ICCAD', 'A'], ['TCAD', 'A'], ['DATE', 'A'], ['TCAS-I', 'A'],
  ['TCAS-II', 'A'], ['TVLSI', 'A'], ['ISCAS', 'B'],
  ['Nature Electron.', 'SS+'], ['Nat. Electronics', 'SS+'], ['Nature', 'SSS'], ['Nat. Commun.', 'Hidden'],
  ['IEEE T-MTT', 'A+'], ['IEEE TED', 'B+'], ['IEEE EDL', 'Hidden'],
  ['IEEE Sensors J.', 'B-'], ['Adv. Mater.', 'Hidden'], ['Appl. Phys. Lett.', 'Hidden'],
  ['Solid-State Electron.', 'C+'], ['IEEE JMEMS', 'B-'], ['IEEE T-Nano', 'C+'],
  ['Microelectron. J.', 'C']
]);

const domainRules = [
  ['Power Management', [
    'dc-dc', 'dcdc', 'buck', 'boost', 'ldo', 'pmic', 'switched-capacitor',
    'charge pump', 'dual-path hybrid', 'continuous-current-input', 'regulator',
    'power management'
  ]],
  ['Data Converters', ['adc', 'dac', 'converter', 'sar', 'pipeline', 'delta-sigma', 'delta sigma']],
  ['Clocking & Frequency Generation', ['pll', 'oscillator', 'clock', 'jitter', 'synthesizer']],
  ['RF/mmWave & Wireline', ['rf', 'wireless', 'mixer', 'lna', 'pa', 'transceiver', 'mmwave', 'millimeter-wave', 'serdes', 'wireline', 'cdr', 'equalizer']],
  ['Memory & Compute-in-Memory', ['sram', 'dram', 'memory', 'compute-in-memory', 'in-memory', 'accelerator']],
  ['EDA, CAD & Verification', ['placement', 'routing', 'verification', 'fpga', 'eda', 'cad']],
  ['Digital IC & Architecture', ['processor', 'digital', 'architecture', 'risc-v', 'noc']],
  ['Devices, Process & 3D Integration', ['finfet', 'process', 'device', '3d integration', 'packaging']]
];

export function countDomainHits(text, words, domain = '') {
  const hay = String(text || '').toLowerCase();
  let hits = 0;
  for (const word of words) {
    if (!hay.includes(word)) continue;
    if (domain === 'Power Management' && /dc-dc|dcdc|buck|boost|pmic|ldo|switched-capacitor|charge pump|voltage regulator|dual-path hybrid|continuous-current-input|power converter/.test(word)) hits += 3;
    else hits += 1;
  }
  if (domain === 'Power Management' && /\bdc\s*-?\s*dc\b/.test(hay)) hits += 3;
  return hits;
}

export function classifyText(text) {
  const hay = String(text || '').toLowerCase();
  const scores = domainRules.map(([domain, words]) => ({ domain, hits: countDomainHits(hay, words, domain) }));
  scores.sort((a, b) => b.hits - a.hits || String(a.domain).localeCompare(String(b.domain)));
  return scores[0]?.hits ? scores[0] : { domain: 'General IC', hits: countDomainHits(hay, ['integrated circuit', 'chip', 'cmos', 'asic', 'soc', 'vlsi', 'circuit', 'semiconductor']) };
}

export function inferDomain(text) {
  return classifyText(text).domain;
}

export function venueRank(venue) {
  return venueRanks.get(venue) || 'User';
}

export function baseScore(venue, year, citations = 0) {
  return scorePaper({ venue, year, citations, domainHits: 0 });
}

export function scorePaper({ venue, year, citations = 0, domainHits = 0 } = {}) {
  const base = methodology().scoring.venueBase[venue] || 50;
  const citationBoost = Math.min(Number(citations || 0), 300) / 25;
  const recencyBoost = Math.max(0, Number(year || 2016) - 2016) * 0.35;
  const domainBoost = Math.min(Number(domainHits || 0), 8) * 10;
  return Math.round((base + domainBoost + citationBoost + recencyBoost) * 10) / 10;
}

export function classifyPaper(input = {}) {
  const title = String(input.title || '');
  const abstract = String(input.abstract || '');
  const venue = String(input.venue || input.publication_title || '');
  const year = Number(input.year || new Date().getFullYear());
  const citations = Number(input.citation_count || input.citations || 0);
  const inferred = classifyText(`${title} ${abstract} ${venue}`);
  const domain = String(input.domain || inferred.domain);
  const domainHits = input.domain ? Number(input.domain_hits || input.domainHits || 0) : inferred.hits;
  return {
    domain,
    domainHits,
    venueRank: venueRank(venue),
    qualityScore: scorePaper({ venue, year, citations, domainHits })
  };
}
