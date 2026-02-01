import { useEffect, useState, useCallback } from 'react';
import type { TreeData, TreeNode, Plan } from '@arbor-plan/core';

// Partial plan info for WebSocket updates
type PartialPlan = Pick<Plan, 'id' | 'name' | 'path'>;

// Helper function to add a plan to a specific node in the tree
function addPlanToNode(
  node: TreeNode,
  targetPath: string,
  plan: PartialPlan
): TreeNode {
  // Check if this node matches the target path
  if (node.path === targetPath) {
    // Create a minimal Plan object with required fields
    const fullPlan: Plan = {
      ...plan,
      content: '',
      linked_at: new Date().toISOString(),
    };
    return {
      ...node,
      plans: [...(node.plans || []), fullPlan],
    };
  }

  // Recursively search in children
  if (node.children) {
    const newChildren = node.children.map((child) =>
      addPlanToNode(child, targetPath, plan)
    );
    // Only return new object if children actually changed
    if (newChildren.some((child, i) => child !== node.children![i])) {
      return { ...node, children: newChildren };
    }
  }

  return node;
}

interface TreeUpdateMessage {
  type: 'tree-update';
  data: TreeData;
}

interface PlanLinkedMessage {
  type: 'plan-linked';
  data: {
    planId: string;
    targetPath: string;
    linkedPlan?: { id: string; source: string; local: string; name: string };
  };
}

interface GenericMessage {
  type: 'plan-unlinked' | 'node-changed';
  data: TreeData;
}

type WebSocketMessage = TreeUpdateMessage | PlanLinkedMessage | GenericMessage;

export function useWebSocket(url: string) {
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const websocket = new WebSocket(url);
    setWs(websocket);

    websocket.onopen = () => {
      setConnected(true);
      setError(null);
      websocket.send(JSON.stringify({ type: 'get-tree' }));
    };

    websocket.onclose = () => {
      setConnected(false);
    };

    websocket.onerror = () => {
      setError(new Error('WebSocket connection failed'));
    };

    websocket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'tree-update':
            setTreeData(message.data);
            break;
          case 'plan-linked':
            // Optimized update: remove from unlinked and add to tree
            setTreeData((prevData) => {
              if (!prevData) return prevData;

              const { planId, targetPath, linkedPlan } = message.data;

              // Remove from unlinked list
              const newUnlinked = prevData.mappings.unlinked.filter(
                (p) => p.id !== planId
              );

              // Add to linked list if linkedPlan data is provided
              const newLinked = linkedPlan
                ? [
                    ...prevData.mappings.linked,
                    {
                      id: linkedPlan.id,
                      source: linkedPlan.source,
                      local: linkedPlan.local,
                      name: linkedPlan.name,
                      target_type: '',
                      target_path: targetPath,
                      linked_at: new Date().toISOString(),
                      source_exists: true,
                    },
                  ]
                : prevData.mappings.linked;

              // Add plan to the target node in the tree
              const newRoot = linkedPlan
                ? addPlanToNode(prevData.root, targetPath, {
                    id: linkedPlan.id,
                    name: linkedPlan.name,
                    path: linkedPlan.local,
                  })
                : prevData.root;

              return {
                ...prevData,
                root: newRoot,
                mappings: {
                  ...prevData.mappings,
                  unlinked: newUnlinked,
                  linked: newLinked,
                },
              };
            });
            break;
          case 'plan-unlinked':
          case 'node-changed':
            websocket.send(JSON.stringify({ type: 'get-tree' }));
            break;
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    return () => {
      websocket.close();
    };
  }, [url]);

  const refresh = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'get-tree' }));
    }
  }, [ws]);

  return { treeData, connected, error, refresh };
}
