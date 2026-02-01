import { FileQuestion, GripVertical } from 'lucide-react';
import { useDragDrop } from '../../contexts/DragDropContext';
import type { DragPlanItem } from '../../types/drag-drop';

interface UnlinkedPlan {
  id: string;
  source: string;
  preview: string;
}

interface UnlinkedListProps {
  unlinked: UnlinkedPlan[];
  onLink: () => void;
}

export function UnlinkedList({ unlinked }: UnlinkedListProps) {
  const { isDragging, startDrag, endDrag } = useDragDrop();

  if (unlinked.length === 0) {
    return null;
  }

  const handleDragStart = (e: React.DragEvent, plan: UnlinkedPlan) => {
    const dragItem: DragPlanItem = {
      type: 'unlinked-plan',
      planId: plan.id,
      source: plan.source,
      preview: plan.preview,
    };

    // Set drag data
    e.dataTransfer.setData('application/json', JSON.stringify(dragItem));
    e.dataTransfer.effectAllowed = 'link';

    // Update context state
    startDrag(dragItem);
  };

  const handleDragEnd = () => {
    endDrag();
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-gray-500 uppercase flex items-center gap-2">
        <FileQuestion size={14} />
        Unlinked Plans ({unlinked.length})
      </h3>
      <div className="space-y-2">
        {unlinked.map((plan) => (
          <div
            key={plan.id}
            draggable
            onDragStart={(e) => handleDragStart(e, plan)}
            onDragEnd={handleDragEnd}
            className={`
              bg-yellow-50 border border-yellow-200 rounded p-3
              cursor-grab active:cursor-grabbing
              hover:border-yellow-300 hover:shadow-sm
              transition-all duration-150
              ${isDragging ? 'opacity-50' : ''}
            `}
          >
            <div className="flex items-start gap-2">
              <GripVertical
                size={16}
                className="flex-shrink-0 text-gray-400 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-700 truncate">
                  {plan.source.split('/').pop()}
                </div>
                <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {plan.preview}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-2 text-center">
              Drag to a feature node to link
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
