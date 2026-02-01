import { X } from 'lucide-react';
import { NodeIcon } from '../TreeView/NodeIcon';
import { MarkdownViewer } from './MarkdownViewer';
import type { TreeNode } from '@arbor-plan/core';

interface DetailPanelProps {
  node: TreeNode;
  onClose: () => void;
}

export function DetailPanel({ node, onClose }: DetailPanelProps) {
  const status = (node as any).status;
  const severity = (node as any).severity;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <NodeIcon type={node.type} status={status} size={24} />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{node.name}</h2>
            <p className="text-sm text-gray-500 capitalize">{node.type}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X size={20} className="text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Status / Severity badges */}
        <div className="flex gap-2 mb-4">
          {status && (
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : status === 'in_progress'
                  ? 'bg-blue-100 text-blue-700'
                  : status === 'blocked'
                  ? 'bg-red-100 text-red-700'
                  : status === 'on_hold'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {String(status).replace('_', ' ')}
            </span>
          )}
          {severity && (
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                severity === 'critical'
                  ? 'bg-red-100 text-red-700'
                  : severity === 'high'
                  ? 'bg-orange-100 text-orange-700'
                  : severity === 'medium'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {severity}
            </span>
          )}
        </div>

        {/* Path */}
        {node.path && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">
              Path
            </h3>
            <p className="text-sm text-gray-700 font-mono bg-gray-50 px-2 py-1 rounded">
              {node.path}
            </p>
          </div>
        )}

        {/* Plans */}
        {node.plans && node.plans.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
              Plans ({node.plans.length})
            </h3>
            <ul className="space-y-2">
              {node.plans.map((plan) => (
                <li
                  key={plan.id}
                  className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded"
                >
                  <div className="font-medium">{plan.name}</div>
                  {plan.content && (
                    <div className="mt-2 text-gray-600">
                      <MarkdownViewer content={plan.content.slice(0, 200) + '...'} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tasks */}
        {node.tasks && node.tasks.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
              Tasks ({node.tasks.length})
            </h3>
            <ul className="space-y-2">
              {node.tasks.map((task) => (
                <li
                  key={task.id}
                  className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded flex items-center justify-between"
                >
                  <span>{task.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      task.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : task.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700'
                        : task.status === 'blocked'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Bugs */}
        {node.bugs && node.bugs.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
              Bugs ({node.bugs.length})
            </h3>
            <ul className="space-y-2">
              {node.bugs.map((bug) => (
                <li
                  key={bug.id}
                  className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded flex items-center justify-between"
                >
                  <span>{bug.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      bug.severity === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : bug.severity === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : bug.severity === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {bug.severity}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Children */}
        {node.children && node.children.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
              Children ({node.children.length})
            </h3>
            <ul className="space-y-1">
              {node.children.map((child) => (
                <li
                  key={child.id}
                  className="text-sm text-gray-700 flex items-center gap-2"
                >
                  <NodeIcon type={child.type} size={14} />
                  <span>{child.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
