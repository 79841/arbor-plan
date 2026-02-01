import { z } from 'zod';

export const BugSeverity = z.enum(['low', 'medium', 'high', 'critical']);
export type BugSeverity = z.infer<typeof BugSeverity>;

export const BugStatus = z.enum(['open', 'in_progress', 'resolved', 'closed']);
export type BugStatus = z.infer<typeof BugStatus>;

export const BugSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  severity: BugSeverity.default('medium'),
  status: BugStatus.default('open'),
  related_task: z.string().optional(),
  created: z.string().date(),
  updated: z.string().date(),
});

export type Bug = z.infer<typeof BugSchema>;
