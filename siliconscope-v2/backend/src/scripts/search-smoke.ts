import { performance } from "node:perf_hooks";
import { sqlite } from "../db/connection.js";
import { searchService } from "../services/search.service.js";

type SmokeCase = {
  name: string;
  params: Record<string, string>;
};

type SmokeResult = {
  name: string;
  ok: boolean;
  durationMs: number;
  serviceDurationMs: number | null;
  rows: number;
  total: number;
  engine: string;
  hasNextCursor: boolean;
  thresholdMs: number;
  params: Record<string, string>;
};

function argValue(name: string, fallback: string) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

const thresholdMs = Math.max(1, Number(argValue("threshold-ms", "300")));
const limit = Math.max(1, Math.min(100, Number(argValue("limit", "20"))));
const json = hasFlag("json");

const cases: SmokeCase[] = [
  {
    name: "FTS keyword: ldo",
    params: { q: "ldo", semantic: "1", sort: "relevance", limit: String(limit) },
  },
  {
    name: "FTS keyword: dcdc pmic",
    params: { q: "dcdc pmic", semantic: "1", sort: "relevance", limit: String(limit) },
  },
  {
    name: "Filtered score ranking: JSSC analog",
    params: { venue: "JSSC", field: "Analog & Mixed-Signal", yearFrom: "2000", yearTo: "2026", sort: "score", limit: String(limit) },
  },
  {
    name: "Recent S+ papers",
    params: { rank: "S+", yearFrom: "2022", yearTo: "2026", sort: "year", limit: String(limit) },
  },
  {
    name: "Citation floor",
    params: { minCitations: "100", sort: "citations", limit: String(limit) },
  },
];

function runCase(item: SmokeCase): SmokeResult {
  const startedAt = performance.now();
  const result = searchService.search(item.params, 0);
  const durationMs = Math.round((performance.now() - startedAt) * 10) / 10;
  const serviceDurationMs = typeof result.durationMs === "number" ? result.durationMs : null;
  return {
    name: item.name,
    ok: durationMs <= thresholdMs,
    durationMs,
    serviceDurationMs,
    rows: result.rows.length,
    total: result.total,
    engine: result.engine,
    hasNextCursor: Boolean(result.pagination?.nextCursor),
    thresholdMs,
    params: item.params,
  };
}

async function main() {
  const results = cases.map(runCase);
  const failed = results.filter((item) => !item.ok);

  if (json) {
    console.log(JSON.stringify({ thresholdMs, results, failed: failed.length }, null, 2));
  } else {
    console.log(`SiliconScope search smoke: threshold=${thresholdMs}ms limit=${limit}`);
    for (const item of results) {
      const marker = item.ok ? "OK" : "SLOW";
      const cursor = item.hasNextCursor ? "cursor" : "no-cursor";
      console.log(`${marker.padEnd(4)} ${String(item.durationMs).padStart(6)}ms | ${item.rows}/${item.total} | ${item.engine} | ${cursor} | ${item.name}`);
    }
  }

  sqlite.close();
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  try {
    sqlite.close();
  } catch {
    // Ignore shutdown errors after a failed smoke run.
  }
  process.exitCode = 1;
});
