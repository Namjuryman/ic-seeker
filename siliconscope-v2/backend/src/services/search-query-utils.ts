const semanticAliases = new Map<string, string[]>([
  ["adc", ["analog to digital", "a/d", "converter", "sar", "pipeline", "delta sigma"]],
  ["dac", ["digital to analog", "d/a", "converter", "current steering"]],
  ["pll", ["phase locked loop", "clock generator", "jitter", "frequency synthesizer"]],
  ["ldo", ["low dropout", "regulator", "power management"]],
  ["dcdc", ["buck", "boost", "switched capacitor", "charge pump", "pmic"]],
  ["dc-dc", ["dcdc", "buck", "boost", "switched capacitor", "charge pump", "pmic"]],
  ["dc/dc", ["dcdc", "buck", "boost", "switched capacitor", "charge pump", "pmic"]],
  ["pmic", ["power management", "dc-dc", "dcdc", "ldo", "buck", "boost"]],
  ["bandgap", ["voltage reference", "reference circuit", "temperature coefficient"]],
  ["serdes", ["wireline", "transceiver", "equalizer", "cdr"]],
  ["rf", ["radio frequency", "mixer", "pa", "lna", "oscillator"]],
  ["memory", ["sram", "dram", "nonvolatile", "compute in memory"]],
  ["ai", ["accelerator", "neural network", "machine learning", "inference"]],
  ["模数转换器", ["adc", "analog to digital", "sar", "pipeline"]],
  ["数模转换器", ["dac", "digital to analog"]],
  ["锁相环", ["pll", "phase locked loop", "frequency synthesizer"]],
  ["电源管理", ["power management", "ldo", "buck", "boost", "pmic"]],
  ["射频", ["rf", "radio frequency", "lna", "mixer"]],
  ["存储器", ["memory", "sram", "dram"]],
  ["芯片", ["integrated circuit", "ic", "chip"]],
  ["模拟", ["analog", "mixed signal"]],
]);

function compactKey(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export function semanticText(input: string): string {
  const q = String(input || "").trim();
  if (!q) return "";
  const lower = q.toLowerCase();
  const compact = compactKey(lower);
  const extra: string[] = [];
  for (const [key, values] of semanticAliases) {
    const keyLower = key.toLowerCase();
    const keyCompact = compactKey(keyLower);
    if (lower.includes(keyLower) || (keyCompact && compact.includes(keyCompact))) {
      extra.push(...values);
    }
  }
  return [...new Set([q, ...extra])].join(" ");
}

export function searchAliasSuggestions(input: string) {
  const q = String(input || "").trim();
  if (!q) return [];
  const lower = q.toLowerCase();
  const compact = compactKey(lower);
  const scored: Array<{ label: string; query: string; aliases: string[]; score: number }> = [];

  for (const [key, values] of semanticAliases) {
    const keyLower = key.toLowerCase();
    const keyCompact = compactKey(keyLower);
    const aliasHit = values.some((value) => value.toLowerCase().includes(lower) || compactKey(value).includes(compact));
    const directHit = keyLower.includes(lower) || (keyCompact && keyCompact.includes(compact));
    const reverseHit = lower.includes(keyLower) || (keyCompact && compact.includes(keyCompact));
    if (!directHit && !reverseHit && !aliasHit) continue;

    scored.push({
      label: key,
      query: key,
      aliases: values.slice(0, 5),
      score: reverseHit ? 3 : directHit ? 2 : 1,
    });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, 6)
    .map(({ label, query, aliases }) => ({ label, query, aliases }));
}

export function ftsQuery(input: string, operator: "AND" | "OR" = "AND"): string {
  const terms = String(input || "")
    .normalize("NFKC")
    .toLowerCase()
    .match(/[\p{L}\p{N}_]+/gu);
  if (!terms) return "";
  const cleanTerms = [...new Set(terms)]
    .filter((term) => term.length > 1 || /^[a-z]$/i.test(term) === false)
    .slice(0, 12);
  return cleanTerms.map((term) => `${term.replace(/"/g, "")}*`).join(` ${operator} `);
}
