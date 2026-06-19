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

export function inferDomain(text) {
  const hay = String(text || '').toLowerCase();
  for (const [domain, keys] of domainRules) {
    if (keys.some(key => hay.includes(key))) return domain;
  }
  return 'General IC';
}

export function venueRank(venue) {
  return venueRanks.get(venue) || 'User';
}

export function baseScore(venue, year, citations = 0) {
  const base = methodology().scoring.venueBase[venue] || 50;
  const citationBoost = Math.min(Number(citations || 0), 300) / 25;
  const recencyBoost = Math.max(0, Number(year || 2016) - 2016) * 0.35;
  return Math.round((base + citationBoost + recencyBoost) * 10) / 10;
}

export function classifyPaper(input = {}) {
  const title = String(input.title || '');
  const abstract = String(input.abstract || '');
  const venue = String(input.venue || input.publication_title || '');
  const year = Number(input.year || new Date().getFullYear());
  const citations = Number(input.citation_count || input.citations || 0);
  const domain = String(input.domain || inferDomain(`${title} ${abstract} ${venue}`));
  return {
    domain,
    venueRank: venueRank(venue),
    qualityScore: baseScore(venue, year, citations)
  };
}
