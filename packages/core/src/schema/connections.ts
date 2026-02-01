import { z } from 'zod';

/**
 * Node connection representing a containment relationship
 * The arrow direction indicates: source contains target
 */
export const NodeConnectionSchema = z.object({
  id: z.string(),
  source_id: z.string(),
  source_path: z.string(),
  target_id: z.string(),
  target_path: z.string(),
  created_at: z.string().datetime(),
});

export type NodeConnection = z.infer<typeof NodeConnectionSchema>;

export const ConnectionsSchema = z.object({
  version: z.literal(1),
  connections: z.array(NodeConnectionSchema).default([]),
});

export type Connections = z.infer<typeof ConnectionsSchema>;
