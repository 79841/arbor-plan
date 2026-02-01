export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    700: '#1d4ed8',
  },
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    400: '#9ca3af',
    600: '#4b5563',
    800: '#1f2937',
  },
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

export const nodeColors = {
  project: { bg: colors.neutral[50], border: colors.neutral[400] },
  feature: { bg: colors.neutral[50], border: colors.primary[500] },
  config: { bg: colors.neutral[100], border: colors.neutral[400] },
  infra: { bg: colors.neutral[100], border: colors.neutral[400] },
  refactor: { bg: colors.neutral[100], border: colors.neutral[400] },
  test: { bg: colors.neutral[100], border: colors.neutral[400] },
  security: { bg: colors.neutral[100], border: colors.neutral[400] },
  performance: { bg: colors.neutral[100], border: colors.neutral[400] },
  plan: { bg: colors.primary[50], border: colors.primary[500] },
  doc: { bg: colors.neutral[50], border: colors.neutral[400] },

  task: {
    pending: { bg: colors.neutral[100], border: colors.neutral[400] },
    in_progress: { bg: colors.primary[50], border: colors.primary[500] },
    completed: { bg: '#dcfce7', border: colors.success },
    blocked: { bg: '#fee2e2', border: colors.error },
  },

  bug: {
    low: { bg: colors.neutral[100], border: colors.neutral[400] },
    medium: { bg: '#fef9c3', border: colors.warning },
    high: { bg: '#ffedd5', border: '#f97316' },
    critical: { bg: '#fee2e2', border: colors.error },
  },
};
