import { z } from 'zod';

export const TaskStatus = z.enum([
  'pending',
  'in_progress',
  'completed',
  'blocked',
]);

export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  status: TaskStatus.default('pending'),
  plan_ref: z.string().optional(),
  created: z.string().date(),
  updated: z.string().date(),
});

export type Task = z.infer<typeof TaskSchema>;
