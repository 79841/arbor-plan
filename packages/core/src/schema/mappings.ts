import { z } from 'zod';

export const TargetType = z.enum([
  'feature',
  'config',
  'infra',
  'refactor',
  'test',
  'security',
  'performance',
]);

export type TargetType = z.infer<typeof TargetType>;

export const LinkedPlanSchema = z.object({
  id: z.string(),
  source: z.string(),
  local: z.string(),
  target_type: TargetType,
  target_path: z.string(),
  name: z.string(),
  linked_at: z.string().datetime(),
  source_exists: z.boolean(),
});

export type LinkedPlan = z.infer<typeof LinkedPlanSchema>;

export const UnlinkedPlanSchema = z.object({
  id: z.string(),
  source: z.string(),
  detected_at: z.string().datetime(),
  preview: z.string().max(100),
});

export type UnlinkedPlan = z.infer<typeof UnlinkedPlanSchema>;

export const MappingsSchema = z.object({
  version: z.literal(1),
  project_id: z.string(),
  linked: z.array(LinkedPlanSchema).default([]),
  unlinked: z.array(UnlinkedPlanSchema).default([]),
});

export type Mappings = z.infer<typeof MappingsSchema>;
