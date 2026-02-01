import { Circle, CircleDot, CheckCircle2, XCircle } from 'lucide-react';
import type { TaskStatus } from '@arbor-plan/core';

interface StatusFilterProps {
  value: TaskStatus | null;
  onChange: (status: TaskStatus | null) => void;
  counts?: Record<TaskStatus, number>;
}

const statuses: { value: TaskStatus; label: string; Icon: typeof Circle }[] = [
  { value: 'pending', label: 'Pending', Icon: Circle },
  { value: 'in_progress', label: 'In Progress', Icon: CircleDot },
  { value: 'completed', label: 'Completed', Icon: CheckCircle2 },
  { value: 'blocked', label: 'Blocked', Icon: XCircle },
];

export function StatusFilter({ value, onChange, counts }: StatusFilterProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-gray-500 uppercase">
        Filter by Status
      </h3>
      <div className="space-y-1">
        <button
          onClick={() => onChange(null)}
          className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between transition-colors ${
            value === null
              ? 'bg-blue-50 text-blue-700'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          <span>All</span>
          {counts && (
            <span className="text-xs text-gray-400">
              {Object.values(counts).reduce((a, b) => a + b, 0)}
            </span>
          )}
        </button>

        {statuses.map(({ value: statusValue, label, Icon }) => (
          <button
            key={statusValue}
            onClick={() =>
              onChange(value === statusValue ? null : statusValue)
            }
            className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between transition-colors ${
              value === statusValue
                ? 'bg-blue-50 text-blue-700'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon size={14} />
              {label}
            </span>
            {counts && (
              <span className="text-xs text-gray-400">
                {counts[statusValue] || 0}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
