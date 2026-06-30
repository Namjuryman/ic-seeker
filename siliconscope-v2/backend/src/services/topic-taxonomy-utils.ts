export type TopicTreeInputNode = {
  id: string;
  parentId?: string;
  [key: string]: unknown;
};

export type TopicTreeNode<T extends TopicTreeInputNode> = T & { children: TopicTreeNode<T>[] };

export function buildTopicTree<T extends TopicTreeInputNode>(nodes: T[]): TopicTreeNode<T>[] {
  const byParent = new Map<string, T[]>();
  for (const node of nodes) {
    const key = node.parentId || "root";
    byParent.set(key, [...(byParent.get(key) || []), node]);
  }
  const attach = (node: T): TopicTreeNode<T> => ({
    ...node,
    children: (byParent.get(node.id) || []).map(attach),
  });
  return (byParent.get("root") || []).map(attach);
}
