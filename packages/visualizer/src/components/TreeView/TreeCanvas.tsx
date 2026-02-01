import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TreeNode } from './TreeNode';
import { treeToFlow } from '../../lib/tree-layout';
import { useConnections } from '../../hooks/useConnections';
import { useViewMode } from '../../contexts/ViewModeContext';
import type { TreeData, TreeNode as TreeNodeType, TaskStatus } from '@arbor-plan/core';

const nodeTypes = {
  treeNode: TreeNode,
} as const;

interface TreeCanvasProps {
  treeData: TreeData | null;
  statusFilter: TaskStatus | null;
  onNodeSelect: (node: TreeNodeType) => void;
}

export function TreeCanvas({
  treeData,
  statusFilter,
  onNodeSelect,
}: TreeCanvasProps) {
  const { connections, refresh: refreshConnections } = useConnections();
  const { mode, pendingConnection, cancelConnection } = useViewMode();

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!treeData) {
      return { nodes: [], edges: [] };
    }
    return treeToFlow(treeData.root, { connections });
  }, [treeData, connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when treeData changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Refresh connections when a connection is made (via TreeNode)
  useEffect(() => {
    // Listen for custom event from TreeNode when connection is made
    const handleConnectionMade = () => {
      refreshConnections();
    };

    window.addEventListener('arbor-connection-made', handleConnectionMade);
    return () => {
      window.removeEventListener('arbor-connection-made', handleConnectionMade);
    };
  }, [refreshConnections]);

  // Handle ESC key to cancel pending connection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingConnection) {
        cancelConnection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pendingConnection, cancelConnection]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const treeNode = (node.data as any).treeNode as TreeNodeType;
      onNodeSelect(treeNode);
    },
    [onNodeSelect]
  );

  const filteredNodes = useMemo(() => {
    if (!statusFilter) return nodes;

    return nodes.map((node) => {
      const treeNode = (node.data as any).treeNode as TreeNodeType;
      if (treeNode.type === 'task') {
        const taskStatus = (treeNode as any).status;
        if (taskStatus !== statusFilter) {
          return {
            ...node,
            style: {
              ...node.style,
              opacity: 0.3,
            },
          };
        }
      }
      return node;
    });
  }, [nodes, statusFilter]);

  if (!treeData) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg">No data available</p>
          <p className="text-sm mt-2">
            Initialize Arbor with <code>arbor_init</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={filteredNodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2}
    >
      <Controls />
      <Background />
    </ReactFlow>
  );
}
