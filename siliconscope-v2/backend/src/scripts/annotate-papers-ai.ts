import { paperAiEnrichmentService, type PaperAiMode } from "../services/paper-ai-enrichment.service.js";

const args = new Map<string, string | boolean>();

for (const raw of process.argv.slice(2)) {
  if (!raw.startsWith("--")) continue;
  const [key, value] = raw.slice(2).split("=", 2);
  args.set(key, value ?? true);
}

function numberArg(key: string, fallback: number) {
  const value = args.get(key);
  if (value === undefined || value === true) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringArg(key: string, fallback: string) {
  const value = args.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

const mode = stringArg("mode", "missing") as PaperAiMode;
if (!["missing", "stale", "weak", "all"].includes(mode)) {
  throw new Error(`Unsupported --mode=${mode}. Use missing, stale, weak, or all.`);
}

const result = paperAiEnrichmentService.runBatch({
  mode,
  limit: numberArg("limit", 200),
  provider: stringArg("provider", "rule-local"),
  model: stringArg("model", "heuristic-v1"),
  dryRun: args.has("dry-run"),
  writeTopicEdges: !args.has("no-topic-edges"),
  minTopicConfidence: numberArg("min-topic-confidence", 55),
});

console.log(JSON.stringify(result, null, 2));
