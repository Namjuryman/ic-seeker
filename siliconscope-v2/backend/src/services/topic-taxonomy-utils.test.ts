import { describe, expect, it } from "vitest";
import { buildTopicTree } from "./topic-taxonomy-utils.js";
import { topicNodes } from "../data/topic-taxonomy.js";

describe("topic taxonomy tree", () => {
  it("builds a nested tree with roots and children", () => {
    const tree = buildTopicTree([
      { id: "analog", label: "Analog" },
      { id: "pmic", parentId: "analog", label: "PMIC" },
      { id: "ldo", parentId: "pmic", label: "LDO" },
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].children[0].children[0].id).toBe("ldo");
  });

  it("can build a tree from the shipped taxonomy seeds", () => {
    const tree = buildTopicTree(topicNodes);
    expect(tree.length).toBeGreaterThan(0);
    expect(tree.some((node) => node.children.length > 0)).toBe(true);
  });
});
