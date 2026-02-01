import { useState, useCallback } from 'react';
import type { TreeNode } from '@arbor-plan/core';

export function useSelectedNode() {
  const [selectedNode, setSelectedNodeState] = useState<TreeNode | null>(null);

  const setSelectedNode = useCallback((node: TreeNode | null) => {
    setSelectedNodeState(node);
  }, []);

  return { selectedNode, setSelectedNode };
}
