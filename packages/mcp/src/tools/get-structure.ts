import { TreeParser, type TreeData, type TreeNode } from '@arbor-plan/core';

export interface GetStructureInput {
  path?: string;
  depth?: number;
}

export interface GetStructureResult {
  tree: TreeNode;
}

export async function getStructure(
  arborRoot: string,
  input: GetStructureInput
): Promise<GetStructureResult> {
  const parser = new TreeParser(arborRoot);
  const treeData: TreeData = await parser.parse();

  let resultTree = treeData.root;

  // Filter by path if specified
  if (input.path) {
    const foundNode = findNodeByPath(resultTree, input.path);
    if (foundNode) {
      resultTree = foundNode;
    }
  }

  // Limit depth if specified
  if (input.depth !== undefined) {
    resultTree = limitDepth(resultTree, input.depth);
  }

  return { tree: resultTree };
}

function findNodeByPath(node: TreeNode, targetPath: string): TreeNode | null {
  if (node.path === targetPath) {
    return node;
  }

  if (node.children) {
    for (const child of node.children) {
      const found = findNodeByPath(child, targetPath);
      if (found) return found;
    }
  }

  return null;
}

function limitDepth(node: TreeNode, maxDepth: number, currentDepth = 0): TreeNode {
  if (currentDepth >= maxDepth) {
    return {
      ...node,
      children: undefined,
      plans: undefined,
      tasks: undefined,
      bugs: undefined,
      docs: undefined,
    };
  }

  return {
    ...node,
    children: node.children?.map((child) =>
      limitDepth(child, maxDepth, currentDepth + 1)
    ),
  };
}
