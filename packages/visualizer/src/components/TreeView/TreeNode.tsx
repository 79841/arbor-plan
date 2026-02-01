import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Link } from 'lucide-react';
import { NodeIcon } from './NodeIcon';
import { nodeColors } from '../../lib/colors';
import { isValidDropTarget, getTargetTypeFromNodeType } from '../../lib/drop-validation';
import { useDragDrop } from '../../contexts/DragDropContext';
import { useViewMode } from '../../contexts/ViewModeContext';
import type { TreeNode as TreeNodeType } from '@arbor-plan/core';
import type { DragPlanItem, LinkPlanResponse } from '../../types/drag-drop';

interface TreeNodeData extends Record<string, unknown> {
  treeNode: TreeNodeType;
  label: string;
}

type TreeNodeProps = NodeProps<Node<TreeNodeData>>;

function TreeNodeComponent({ data, id }: TreeNodeProps) {
  const { treeNode, label } = data as TreeNodeData;
  const type = treeNode.type;
  const status = (treeNode as any).status;
  const severity = (treeNode as any).severity;

  const { isDragging } = useDragDrop();
  const { mode, pendingConnection, startConnection, cancelConnection } = useViewMode();
  const [isHovering, setIsHovering] = useState(false);
  const [dropFeedback, setDropFeedback] = useState<'none' | 'valid' | 'invalid'>('none');
  const [isLinking, setIsLinking] = useState(false);
  const [isNodeHovered, setIsNodeHovered] = useState(false);

  const isEditMode = mode === 'edit';
  const isValid = isValidDropTarget(type);
  const isConnectionSource = pendingConnection?.sourceNodeId === id;
  const canBeConnectionTarget = pendingConnection !== null && pendingConnection.sourceNodeId !== id;

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      if (!isDragging) return;

      if (isValid) {
        e.dataTransfer.dropEffect = 'link';
        setDropFeedback('valid');
      } else {
        e.dataTransfer.dropEffect = 'none';
        setDropFeedback('invalid');
      }

      setIsHovering(true);
    },
    [isDragging, isValid]
  );

  const handleDragLeave = useCallback(() => {
    setIsHovering(false);
    setDropFeedback('none');
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsHovering(false);
      setDropFeedback('none');

      if (!isValid) return;

      try {
        const dataStr = e.dataTransfer.getData('application/json');
        const dragItem: DragPlanItem = JSON.parse(dataStr);

        if (dragItem.type !== 'unlinked-plan') return;

        const targetType = getTargetTypeFromNodeType(type);
        if (!targetType) return;

        setIsLinking(true);

        const response = await fetch('/api/link-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: dragItem.planId,
            targetType,
            targetPath: treeNode.path,
          }),
        });

        const result: LinkPlanResponse = await response.json();

        if (!result.success) {
          console.error('Failed to link plan:', result.error);
        }
      } catch (err) {
        console.error('Drop handling error:', err);
      } finally {
        setIsLinking(false);
      }
    },
    [isValid, type, treeNode.path]
  );

  // Handle starting a connection in edit mode
  const handleStartConnection = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isEditMode) return;

      if (pendingConnection) {
        // Cancel existing connection
        cancelConnection();
      } else {
        // Start new connection from this node
        startConnection({
          sourceNodeId: id,
          sourceNodeType: type,
          sourceNodePath: treeNode.path,
        });
      }
    },
    [isEditMode, pendingConnection, cancelConnection, startConnection, id, type, treeNode.path]
  );

  // Handle completing a connection (clicking on target node)
  const handleCompleteConnection = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isEditMode || !pendingConnection || pendingConnection.sourceNodeId === id) return;

      setIsLinking(true);

      try {
        const response = await fetch('/api/connect-nodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId: pendingConnection.sourceNodeId,
            sourcePath: pendingConnection.sourceNodePath,
            targetId: id,
            targetPath: treeNode.path,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          console.error('Failed to connect nodes:', result.error);
        } else {
          // Dispatch event to refresh connections
          window.dispatchEvent(new CustomEvent('arbor-connection-made'));
        }
      } catch (err) {
        console.error('Connection error:', err);
      } finally {
        setIsLinking(false);
        cancelConnection();
      }
    },
    [isEditMode, pendingConnection, id, treeNode.path, cancelConnection]
  );

  const handleMouseEnter = useCallback(() => {
    setIsNodeHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsNodeHovered(false);
  }, []);

  // Determine colors with drag feedback
  let nodeColor: { bg: string; border: string };

  if (type === 'task' && status) {
    nodeColor = nodeColors.task[status as keyof typeof nodeColors.task] || nodeColors.feature;
  } else if (type === 'bug' && severity) {
    nodeColor = nodeColors.bug[severity as keyof typeof nodeColors.bug] || nodeColors.feature;
  } else {
    const baseColor = nodeColors[type as keyof typeof nodeColors];
    nodeColor = baseColor && 'bg' in baseColor ? baseColor : nodeColors.feature;
  }

  // Override border color based on drop feedback and edit mode state
  let borderColor = nodeColor.border;
  let borderWidth = '2px';
  let boxShadow = 'none';

  if (isDragging && isHovering) {
    if (dropFeedback === 'valid') {
      borderColor = '#22c55e'; // green-500
      borderWidth = '3px';
      boxShadow = '0 0 0 4px rgba(34, 197, 94, 0.2)';
    } else if (dropFeedback === 'invalid') {
      borderColor = '#ef4444'; // red-500
      borderWidth = '3px';
      boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.2)';
    }
  } else if (isDragging && isValid) {
    // Subtle highlight for valid targets during drag
    borderColor = '#3b82f6'; // blue-500
    boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1)';
  } else if (isEditMode) {
    // Edit mode styling
    if (isConnectionSource) {
      // This node is the source of the pending connection
      borderColor = '#8b5cf6'; // violet-500
      borderWidth = '3px';
      boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.3)';
    } else if (canBeConnectionTarget && isNodeHovered) {
      // This node can be a target and is being hovered
      borderColor = '#22c55e'; // green-500
      borderWidth = '3px';
      boxShadow = '0 0 0 4px rgba(34, 197, 94, 0.2)';
    } else if (isNodeHovered) {
      // Just hovering in edit mode (can start connection)
      borderColor = '#f59e0b'; // amber-500
      borderWidth = '2px';
      boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.2)';
    }
  }

  // Show connection button in edit mode when hovering
  const showConnectionButton = isEditMode && isNodeHovered && !pendingConnection;
  const showTargetIndicator = isEditMode && canBeConnectionTarget && isNodeHovered;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={canBeConnectionTarget ? handleCompleteConnection : undefined}
      className={`
        px-4 py-3 rounded-lg shadow-sm min-w-[180px] max-w-[200px]
        transition-all duration-150 relative
        ${isLinking ? 'animate-pulse' : ''}
        ${isEditMode ? 'cursor-pointer' : ''}
        ${canBeConnectionTarget ? 'cursor-crosshair' : ''}
      `}
      style={{
        backgroundColor: nodeColor.bg,
        borderColor,
        borderWidth,
        borderStyle: 'solid',
        boxShadow,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={`!bg-gray-400 ${isEditMode && canBeConnectionTarget ? '!bg-green-500 !w-3 !h-3' : ''}`}
      />

      <div className="flex items-center gap-2">
        <NodeIcon type={type} status={status} size={18} className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 truncate">{label}</div>
          <div className="text-xs text-gray-500 capitalize">{type}</div>
        </div>
      </div>

      {status && type !== 'task' && (
        <div className="mt-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              status === 'completed'
                ? 'bg-green-100 text-green-700'
                : status === 'in_progress'
                  ? 'bg-blue-100 text-blue-700'
                  : status === 'on_hold'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
            }`}
          >
            {status.replace('_', ' ')}
          </span>
        </div>
      )}

      {/* Connection button - appears on hover in edit mode */}
      {showConnectionButton && (
        <button
          onClick={handleStartConnection}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2
            bg-amber-500 hover:bg-amber-600 text-white rounded-full p-1.5
            shadow-lg transition-all duration-150 z-10"
          title="Create connection from this node"
        >
          <Link size={14} />
        </button>
      )}

      {/* Target indicator - appears when this can be a connection target */}
      {showTargetIndicator && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2
          bg-green-500 text-white text-xs px-2 py-0.5 rounded-full
          shadow-lg z-10">
          Click to connect
        </div>
      )}

      {/* Source indicator - when this node is the connection source */}
      {isConnectionSource && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2
          bg-violet-500 text-white text-xs px-2 py-0.5 rounded-full
          shadow-lg z-10 whitespace-nowrap">
          Select target node
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className={`!bg-gray-400 ${isEditMode && isNodeHovered ? '!bg-amber-500 !w-3 !h-3' : ''}`}
      />
    </div>
  );
}

export const TreeNode = memo(TreeNodeComponent);
