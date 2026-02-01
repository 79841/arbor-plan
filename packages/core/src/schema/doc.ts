import { z } from 'zod';

export const DocType = z.enum([
  'architecture',
  'api',
  'guide',
  'reference',
  'decision',
]);

export type DocType = z.infer<typeof DocType>;

export const DocSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  type: DocType,
  created: z.string().date(),
  updated: z.string().date(),
});

export type Doc = z.infer<typeof DocSchema>;
