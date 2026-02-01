import type { Task } from '../schema/task.js';
import type { Bug } from '../schema/bug.js';
import type { Doc } from '../schema/doc.js';
import type { NodeType, NodeStatus } from '../schema/meta.js';

export interface Plan {
  id: string;
  name: string;
  path: string;
  content: string;
  linked_at: string;
}

export interface TreeNode {
  type: NodeType | 'project' | 'plan' | 'task' | 'bug' | 'doc';
  id: string;
  name: string;
  path: string;
  status?: NodeStatus;
  children?: TreeNode[];
  plans?: Plan[];
  tasks?: Task[];
  bugs?: Bug[];
  docs?: Doc[];
}

export interface TreeData {
  root: TreeNode;
  mappings: {
    linked: Array<{
      id: string;
      source: string;
      local: string;
      name: string;
    }>;
    unlinked: Array<{
      id: string;
      source: string;
      preview: string;
    }>;
  };
}
