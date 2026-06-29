import { learningContentService } from "../services/learning-content.service.js";

function main() {
  const result = learningContentService.syncSeedToDatabase(null);
  const overview = learningContentService.adminOverview();
  console.log(JSON.stringify({
    ok: true,
    sourceVersion: result.sourceVersion,
    seedItems: result.seedItems,
    changedRows: result.changedRows,
    summary: result.summary,
    quality: overview.quality,
  }, null, 2));
}

main();
