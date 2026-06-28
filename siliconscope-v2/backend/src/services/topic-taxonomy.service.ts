import { topicNodes } from "../data/topic-taxonomy.js";

export const topicTaxonomyService = {
  list() {
    const byParent = new Map<string, typeof topicNodes>();
    for (const node of topicNodes) {
      const key = node.parentId || "root";
      byParent.set(key, [...(byParent.get(key) || []), node]);
    }
    return {
      version: "taxonomy-v1",
      generatedAt: new Date().toISOString(),
      nodes: topicNodes,
      tree: (byParent.get("root") || []).map((node) => ({
        ...node,
        children: byParent.get(node.id) || [],
      })),
      caveat: "This taxonomy is a curated IC hierarchy for search, reports, and future paper_topic_edges. Paper-level labels still require confidence scoring and manual correction.",
    };
  },
};
