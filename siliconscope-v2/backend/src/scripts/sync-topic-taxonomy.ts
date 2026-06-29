import { topicTaxonomyService } from "../services/topic-taxonomy.service.js";

const result = topicTaxonomyService.syncSeedToDatabase();
console.log(JSON.stringify({ ok: true, ...result }, null, 2));
