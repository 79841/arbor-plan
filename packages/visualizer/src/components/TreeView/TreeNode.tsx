import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeIcon } from './NodeIcon';
import { nodeColors } from '../../lib/colors';
import { isValidDropTarget, getTargetTypeFromNodeType } from '../../lib/drop-validation';
import { useDragDrop } from '../../contexts/DragDropContext';
import type { TreeNode as TreeNodeType } from '@arbor-plan/core';
import type { DragPlanItem, LinkPlanResponse } from '../../types/drag-drop';

interface TreeNodeData {
  treeNode: TreeNodeType;
  label: string;
}

function TreeNodeComponent({ data }: NodeProps<TreeNodeData>) {
  const { treeNode, label } = data;
  const type = treeNode.type;
  const status = (treeNode as any).status;
  const severity = (treeNode as any).severity;

  const { isDragging } = useDragDrop();
  const [isHovering, setIsHovering] = useState(false);
  const [dropFeedback, setDropFeedback] = useState<'none' | 'valid' | 'invalid'>('none');
  const [isLinking, setIsLinking] = useState(false);

  const isValid = isValidDropTarget(type);

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

  // Determine colors with drag feedback
  let colors = nodeColors[type as keyof typeof nodeColors];

  if (type === 'task' && status) {
    colors = nodeColors.task[status as keyof typeof nodeColors.task];
  } else if (type === 'bug' && severity) {
    colors = nodeColors.bug[severity as keyof typeof nodeColors.bug];
  }

  if (!colors) {
    colors = nodeColors.feature;
  }

  // Override border color based on drop feedback
  let borderColor = colors.border;
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
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        px-4 py-3 rounded-lg shadow-sm min-w-[180px] max-w-[200px]
        transition-all duration-150
        ${isLinking ? 'animate-pulse' : ''}
      `}
      style={{
        backgroundColor: colors.bg,
        borderColor,
        borderWidth,
        borderStyle: 'solid',
        boxShadow,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />

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

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
}

export const TreeNode = memo(TreeNodeComponent);
