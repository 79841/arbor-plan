/**
 * View mode types for the visualizer
 */

/**
 * Available view modes
 * - diary: Read-only mode for viewing the tree structure
 * - edit: Edit mode for creating connections between nodes
 */
export type ViewMode = 'diary' | 'edit';

/**
 * Connection being created in edit mode
 */
export interface PendingConnection {
  sourceNodeId: string;
  sourceNodeType: string;
  sourceNodePath: string;
}
