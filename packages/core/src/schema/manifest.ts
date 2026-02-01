import { z } from 'zod';

export const ManifestSchema = z.object({
  version: z.literal(1),
  project: z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    created: z.string().date(),
    updated: z.string().date(),
  }),
});

export type Manifest = z.infer<typeof ManifestSchema>;
