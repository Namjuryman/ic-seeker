import { topicTaxonomyService } from "../services/topic-taxonomy.service.js";

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const confidenceArg = process.argv.find((arg) => arg.startsWith("--min-confidence="));
const noReset = process.argv.includes("--no-reset");

const result = topicTaxonomyService.refreshPaperTopicEdges({
  limit: limitArg ? Number(limitArg.split("=")[1]) : undefined,
  minConfidence: confidenceArg ? Number(confidenceArg.split("=")[1]) : undefined,
  reset: !noReset,
});

console.log(JSON.stringify({ ok: true, ...result }, null, 2));
