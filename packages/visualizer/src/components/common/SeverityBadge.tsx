import type { BugSeverity } from '@arbor-plan/core';

interface SeverityBadgeProps {
  severity: BugSeverity;
}

const severityColors: Record<BugSeverity, { bg: string; text: string }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-700' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700' },
  critical: { bg: 'bg-red-100', text: 'text-red-700' },
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const colors = severityColors[severity];

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
    >
      {severity}
    </span>
  );
}
