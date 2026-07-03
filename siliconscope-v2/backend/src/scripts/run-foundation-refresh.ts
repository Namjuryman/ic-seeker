import { sqlite } from "../db/connection.js";
import { dailyCircuitService } from "../services/daily-circuit.service.js";
import { paperDedupeService } from "../services/paper-dedupe.service.js";
import { dataQualityService } from "../services/data-quality.service.js";
import { searchIndexService } from "../services/search-index.service.js";
import { featureCompletionService } from "../services/feature-completion.service.js";
import { topicTaxonomyService } from "../services/topic-taxonomy.service.js";

function flag(name: string) {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const dryRun = flag("dry-run");
  const searchOnly = flag("search-only");
  const qualityOnly = flag("quality-only");
  const result: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    dryRun,
    mode: searchOnly ? "search-only" : qualityOnly ? "quality-only" : "full",
  };

  if (searchOnly) {
    result.searchIndex = dryRun ? { skipped: true } : await searchIndexService.rebuild("all");
    result.completion = featureCompletionService.report();
    console.log(JSON.stringify(result, null, 2));
    sqlite.close();
    return;
  }

  if (qualityOnly) {
    result.dedupe = paperDedupeService.scan({ limit: 200, persist: !dryRun });
    result.dataQuality = dryRun
      ? dataQualityService.getReport({ scanLimit: 1000, sampleLimit: 10 })
      : dataQualityService.syncFindings({ scanLimit: 12000, sampleLimit: 50 });
    result.completion = featureCompletionService.report();
    console.log(JSON.stringify(result, null, 2));
    sqlite.close();
    return;
  }

  result.dailyCircuit = dryRun ? { skipped: true } : dailyCircuitService.syncSeed();
  result.topicTaxonomy = dryRun ? { skipped: true } : topicTaxonomyService.syncSeedToDatabase();
  result.dedupe = paperDedupeService.scan({ limit: 200, persist: !dryRun });
  result.searchIndex = dryRun ? { skipped: true } : await searchIndexService.rebuild("all");
  result.dataQuality = dryRun
    ? dataQualityService.getReport({ scanLimit: 1000, sampleLimit: 10 })
    : dataQualityService.syncFindings({ scanLimit: 12000, sampleLimit: 50 });
  result.completion = featureCompletionService.report();

  console.log(JSON.stringify(result, null, 2));
  sqlite.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
