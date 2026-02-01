import { FileQuestion } from 'lucide-react';

interface UnlinkedPlan {
  id: string;
  source: string;
  preview: string;
}

interface UnlinkedListProps {
  unlinked: UnlinkedPlan[];
  onLink: () => void;
}

export function UnlinkedList({ unlinked, onLink }: UnlinkedListProps) {
  if (unlinked.length === 0) {
    return null;
  }

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
            className="bg-yellow-50 border border-yellow-200 rounded p-3"
          >
            <div className="text-sm font-medium text-gray-700 truncate">
              {plan.source.split('/').pop()}
            </div>
            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
              {plan.preview}
            </div>
            <button
              onClick={onLink}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800"
            >
              Link to feature...
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
