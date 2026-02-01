import { z } from 'zod';

export const NodeType = z.enum([
  'feature',
  'config',
  'infra',
  'refactor',
  'test',
  'security',
  'performance',
]);

export type NodeType = z.infer<typeof NodeType>;

export const NodeStatus = z.enum([
  'planned',
  'in_progress',
  'completed',
  'on_hold',
]);

export type NodeStatus = z.infer<typeof NodeStatus>;

export const MetaSchema = z.object({
  type: NodeType,
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  status: NodeStatus.default('planned'),
  created: z.string().date(),
  updated: z.string().date(),
});

export type Meta = z.infer<typeof MetaSchema>;
