import type { MergedPaper } from "./types.js";

const rankAliases: Array<[RegExp, string, number]> = [
  [/\bnature electronics\b|\bnat\.?\s*electronics\b/i, "SS+", 115],
  [/\bnature\b/i, "SSS", 125],
  [/\bisscc\b|solid-state circuits conference/i, "S+", 105],
  [/\bjssc\b|journal of solid-state circuits/i, "S+", 104],
  [/\bvlsi\b|symposium on vlsi/i, "S", 94],
  [/\bcicc\b|custom integrated circuits conference/i, "S", 88],
  [/\biedm\b|electron devices meeting/i, "S", 86],
  [/\basscc\b|asian solid-state circuits conference/i, "A", 78],
  [/\besscirc\b|european solid-state circuits conference/i, "A", 76],
  [/\bdac\b|design automation conference/i, "A", 74],
  [/\biccad\b/i, "A", 74],
  [/\btcad\b|computer-aided design of integrated circuits/i, "A", 70],
  [/\btcas-?i\b|transactions on circuits and systems i/i, "A", 66],
  [/\btcas-?ii\b|transactions on circuits and systems ii/i, "A", 62],
  [/\btvlsi\b|very large scale integration/i, "A", 62],
  [/\bt-?mtt\b|microwave theory and techniques/i, "A+", 78],
  [/\biscas\b/i, "B", 54],
  [/\bted\b|electron devices/i, "B+", 50],
];

const domainRules: Array<[string, string[]]> = [
  ["Power Management", ["dc-dc", "dcdc", "buck", "boost", "ldo", "regulator", "switched-capacitor", "power management", "pmic"]],
  ["Analog & Mixed-Signal", ["adc", "dac", "sar", "delta-sigma", "delta sigma", "pipeline adc", "bandgap", "comparator", "opamp", "sensor interface"]],
  ["Clocking & Frequency Generation", ["pll", "dll", "oscillator", "clock", "jitter", "synthesizer", "mdll", "adpll"]],
  ["RF/mmWave & Wireline", ["rf", "mmwave", "millimeter-wave", "lna", "mixer", "power amplifier", "transceiver", "serdes", "cdr", "equalizer", "wireline"]],
  ["Memory & Compute-in-Memory", ["sram", "dram", "mram", "rram", "reram", "memory", "compute-in-memory", "computing-in-memory", "cim"]],
  ["Digital IC & Architecture", ["processor", "accelerator", "neural network", "digital", "risc-v", "soc", "fpga", "architecture"]],
  ["EDA, CAD & Verification", ["eda", "placement", "routing", "verification", "synthesis", "timing analysis", "formal", "cad"]],
  ["Devices, Process & 3D Integration", ["finfet", "device", "process", "packaging", "3d integration", "interposer", "chiplet", "gan", "sic"]],
  ["Biomedical, Sensor & Imaging IC", ["biomedical", "neural", "implant", "imaging", "sensor", "ultrasound", "bio", "wearable"]],
];

export function normalizeDoi(raw?: string): string {
  return String(raw || "")
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:/i, "")
    .toLowerCase();
}

export function normalizeTitle(raw?: string): string {
  return String(raw || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function inferVenueRank(venue?: string): string {
  const text = String(venue || "");
  for (const [pattern, rank] of rankAliases) {
    if (pattern.test(text)) return rank;
  }
  return "Imported";
}

export function inferDomain(paper: Pick<MergedPaper, "title" | "abstract" | "venue" | "publicationTitle">): { domain: string; hits: number } {
  const haystack = `${paper.title || ""} ${paper.abstract || ""} ${paper.venue || ""} ${paper.publicationTitle || ""}`.toLowerCase();
  let best = { domain: "General IC", hits: 0 };
  for (const [domain, keywords] of domainRules) {
    const hits = keywords.reduce((count, keyword) => count + (haystack.includes(keyword) ? 1 : 0), 0);
    if (hits > best.hits) best = { domain, hits };
  }
  return best;
}

export function qualityScore(rank: string, year?: number, citationCount?: number): number {
  const baseByRank: Record<string, number> = {
    SSS: 125,
    "SS+": 115,
    "S+": 102,
    S: 88,
    "A+": 78,
    A: 68,
    B: 48,
    "B+": 54,
    Imported: 42,
  };
  const base = baseByRank[rank] ?? 42;
  const recency = Math.max(0, Number(year || 2015) - 2015) * 0.3;
  const citations = Math.min(400, Math.max(0, Number(citationCount || 0))) / 25;
  return Math.round((base + recency + citations) * 10) / 10;
}

export function semanticText(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 12000);
}

export function icRelevanceScore(paper: Pick<MergedPaper, "title" | "abstract" | "venue" | "publicationTitle" | "domain">): number {
  const haystack = `${paper.title || ""} ${paper.abstract || ""} ${paper.venue || ""} ${paper.publicationTitle || ""} ${paper.domain || ""}`.toLowerCase();
  const positive = [
    "integrated circuit", "solid-state", "cmos", "bcd", "finfet", "isscc", "jssc", "vlsi", "cicc", "asscc", "esscirc",
    "adc", "dac", "sar", "delta-sigma", "pll", "ldo", "dc-dc", "dcdc", "buck", "boost", "bandgap", "sram", "dram",
    "serdes", "mmwave", "millimeter-wave", "rf", "transceiver", "power amplifier", "lna", "compute-in-memory",
    "asic", "soc", "chiplet", "eda", "tcad", "iccad", "dac conference",
  ];
  const negative = [
    "sars-cov", "microbiology", "clinical", "medicine", "patient", "vaccine", "virus", "pathogenesis",
    "power grid", "microgrid", "photovoltaic", "wind turbine", "electric vehicle charging station",
  ];
  const positiveHits = positive.reduce((count, keyword) => count + (haystack.includes(keyword) ? 1 : 0), 0);
  const negativeHits = negative.reduce((count, keyword) => count + (haystack.includes(keyword) ? 1 : 0), 0);
  return positiveHits * 20 - negativeHits * 35;
}
