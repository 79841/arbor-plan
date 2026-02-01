import type { Node, Edge } from '@xyflow/react';
import type { TreeNode } from '@arbor-plan/core';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;
const HORIZONTAL_SPACING = 80;
const VERTICAL_SPACING = 100;

interface LayoutNode extends Node {
  data: {
    treeNode: TreeNode;
    label: string;
  };
}

export function treeToFlow(
  root: TreeNode | null
): { nodes: LayoutNode[]; edges: Edge[] } {
  if (!root) {
    return { nodes: [], edges: [] };
  }

  const nodes: LayoutNode[] = [];
  const edges: Edge[] = [];

  function calculateSubtreeWidth(node: TreeNode): number {
    const children = getAllChildren(node);
    if (children.length === 0) {
      return NODE_WIDTH;
    }

    const childrenWidth = children.reduce(
      (sum, child) => sum + calculateSubtreeWidth(child) + HORIZONTAL_SPACING,
      -HORIZONTAL_SPACING
    );

    return Math.max(NODE_WIDTH, childrenWidth);
  }

  function getAllChildren(node: TreeNode): TreeNode[] {
    const children: TreeNode[] = [];

    if (node.children) {
      children.push(...node.children);
    }

    // Add plans, tasks, bugs, docs as leaf nodes
    if (node.plans) {
      children.push(
        ...node.plans.map((p) => ({
          type: 'plan' as const,
          id: p.id,
          name: p.name,
          path: p.path,
        }))
      );
    }

    if (node.tasks) {
      children.push(
        ...node.tasks.map((t) => ({
          type: 'task' as const,
          id: t.id,
          name: t.name,
          path: '',
          status: t.status,
        }))
      );
    }

    if (node.bugs) {
      children.push(
        ...node.bugs.map((b) => ({
          type: 'bug' as const,
          id: b.id,
          name: b.name,
          path: '',
          severity: b.severity,
        }))
      );
    }

    if (node.docs) {
      children.push(
        ...node.docs.map((d) => ({
          type: 'doc' as const,
          id: d.id,
          name: d.name,
          path: '',
        }))
      );
    }

    return children;
  }

  function traverse(
    node: TreeNode,
    x: number,
    y: number,
    parentId: string | null
  ): void {
    const nodeId = node.id || `${node.type}-${node.path}`;

    nodes.push({
      id: nodeId,
      type: 'treeNode',
      position: { x, y },
      data: {
        treeNode: node,
        label: node.name,
      },
    });

    if (parentId) {
      edges.push({
        id: `${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        type: 'smoothstep',
      });
    }

    const children = getAllChildren(node);
    if (children.length === 0) return;

    const childrenWidths = children.map((child) => calculateSubtreeWidth(child));
    const totalWidth = childrenWidths.reduce(
      (sum, w) => sum + w + HORIZONTAL_SPACING,
      -HORIZONTAL_SPACING
    );

    let currentX = x - totalWidth / 2 + NODE_WIDTH / 2;
    const childY = y + NODE_HEIGHT + VERTICAL_SPACING;

    children.forEach((child, index) => {
      const childWidth = childrenWidths[index]!;
      const childX = currentX + childWidth / 2 - NODE_WIDTH / 2;
      traverse(child, childX, childY, nodeId);
      currentX += childWidth + HORIZONTAL_SPACING;
    });
  }

  traverse(root, 0, 0, null);

  return { nodes, edges };
}
