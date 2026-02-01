import { z } from 'zod';
import { TargetType } from './mappings.js';

export const PendingItemSchema = z.object({
  id: z.string(),
  target_type: TargetType,
  target_path: z.string(),
  name: z.string().optional(),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime(),
});

export type PendingItem = z.infer<typeof PendingItemSchema>;

export const PendingContextSchema = z.object({
  pending: z.array(PendingItemSchema).default([]),
});

export type PendingContext = z.infer<typeof PendingContextSchema>;
