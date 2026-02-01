import type { TaskStatus } from '@arbor-plan/core';

interface StatusBadgeProps {
  status: TaskStatus;
}

const statusColors: Record<TaskStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-700' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  blocked: { bg: 'bg-red-100', text: 'text-red-700' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = statusColors[status];

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
