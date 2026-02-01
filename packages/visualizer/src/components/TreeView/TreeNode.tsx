import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeIcon } from './NodeIcon';
import { nodeColors } from '../../lib/colors';
import type { TreeNode as TreeNodeType } from '@arbor-plan/core';

interface TreeNodeData {
  treeNode: TreeNodeType;
  label: string;
}

function TreeNodeComponent({ data }: NodeProps<TreeNodeData>) {
  const { treeNode, label } = data;
  const type = treeNode.type;
  const status = (treeNode as any).status;
  const severity = (treeNode as any).severity;

  let colors = nodeColors[type as keyof typeof nodeColors];

  if (type === 'task' && status) {
    colors = nodeColors.task[status as keyof typeof nodeColors.task];
  } else if (type === 'bug' && severity) {
    colors = nodeColors.bug[severity as keyof typeof nodeColors.bug];
  }

  if (!colors) {
    colors = nodeColors.feature;
  }

  return (
    <div
      className="px-4 py-3 rounded-lg shadow-sm border-2 min-w-[180px] max-w-[200px]"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />

      <div className="flex items-center gap-2">
        <NodeIcon
          type={type}
          status={status}
          size={18}
          className="flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 truncate">
            {label}
          </div>
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

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400"
      />
    </div>
  );
}

export const TreeNode = memo(TreeNodeComponent);
