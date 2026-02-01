import { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { TreeCanvas } from './components/TreeView/TreeCanvas';
import { DetailPanel } from './components/DetailPanel/DetailPanel';
import { StatusFilter } from './components/StatusFilter/StatusFilter';
import { UnlinkedList } from './components/UnlinkedPlans/UnlinkedList';
import { ModeToggle } from './components/ModeToggle';
import { DragDropProvider } from './contexts/DragDropContext';
import { ViewModeProvider } from './contexts/ViewModeContext';
import { useWebSocket } from './hooks/useWebSocket';
import { useSelectedNode } from './hooks/useSelectedNode';
import type { TreeNode, TaskStatus } from '@arbor-plan/core';

function App() {
  const wsUrl = `ws://${window.location.host}`;
  const { treeData, connected, refresh } = useWebSocket(wsUrl);
  const { selectedNode, setSelectedNode } = useSelectedNode();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null);

  return (
    <ViewModeProvider>
      <DragDropProvider>
        <div className="flex h-screen bg-gray-50">
          {/* Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h1 className="text-xl font-semibold text-gray-800">Arbor</h1>
              <div className="flex items-center mt-2 text-sm">
                <span
                  className={`w-2 h-2 rounded-full mr-2 ${
                    connected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-gray-500">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            <div className="p-4 border-b border-gray-200">
              <ModeToggle />
            </div>

          <div className="p-4 border-b border-gray-200">
            <StatusFilter
              value={statusFilter}
              onChange={setStatusFilter}
              counts={treeData?.root ? getTaskCounts(treeData.root) : undefined}
            />
          </div>

          <div className="flex-1 overflow-auto p-4">
            <UnlinkedList
              unlinked={treeData?.mappings.unlinked || []}
              onLink={refresh}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex">
          <div className="flex-1">
            <ReactFlowProvider>
              <TreeCanvas
                treeData={treeData}
                statusFilter={statusFilter}
                onNodeSelect={(node: TreeNode) => setSelectedNode(node)}
              />
            </ReactFlowProvider>
          </div>

          {/* Detail panel */}
          {selectedNode && (
            <div className="w-96 bg-white border-l border-gray-200 overflow-auto">
              <DetailPanel
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
              />
            </div>
          )}
        </div>
      </div>
    </DragDropProvider>
    </ViewModeProvider>
  );
}

function getTaskCounts(node: TreeNode): Record<TaskStatus, number> {
  const counts: Record<TaskStatus, number> = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    blocked: 0,
  };

  function traverse(n: TreeNode) {
    if (n.tasks) {
      for (const task of n.tasks) {
        const status = task.status as TaskStatus;
        if (status in counts) {
          counts[status]++;
        }
      }
    }
    if (n.children) {
      for (const child of n.children) {
        traverse(child);
      }
    }
  }

  traverse(node);
  return counts;
}

export default App;
