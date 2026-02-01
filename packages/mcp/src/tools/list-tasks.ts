import { TreeParser, type Task, type TaskStatus, type TreeNode } from '@arbor-plan/core';

export interface ListTasksInput {
  status?: TaskStatus;
  path?: string;
}

export interface TaskWithPath extends Task {
  path: string;
  parentType: string;
  parentPath: string;
}

export interface ListTasksResult {
  tasks: TaskWithPath[];
  counts: {
    pending: number;
    in_progress: number;
    completed: number;
    blocked: number;
    total: number;
  };
}

export async function listTasks(
  arborRoot: string,
  input: ListTasksInput
): Promise<ListTasksResult> {
  const parser = new TreeParser(arborRoot);
  const treeData = await parser.parse();

  const tasks: TaskWithPath[] = [];

  function collectTasks(node: TreeNode, parentPath: string) {
    if (node.tasks) {
      for (const task of node.tasks) {
        tasks.push({
          ...task,
          path: `${parentPath}/${node.path}/tasks/${task.id}`,
          parentType: node.type as string,
          parentPath: node.path,
        });
      }
    }

    if (node.children) {
      for (const child of node.children) {
        collectTasks(child, `${parentPath}/${node.path}`);
      }
    }
  }

  // Start collection
  if (input.path) {
    const startNode = findNodeByPath(treeData.root, input.path);
    if (startNode) {
      collectTasks(startNode, '');
    }
  } else {
    collectTasks(treeData.root, '');
  }

  // Filter by status
  let filteredTasks = tasks;
  if (input.status) {
    filteredTasks = tasks.filter((t) => t.status === input.status);
  }

  // Calculate counts
  const counts = {
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    blocked: tasks.filter((t) => t.status === 'blocked').length,
    total: tasks.length,
  };

  return {
    tasks: filteredTasks,
    counts,
  };
}

function findNodeByPath(node: TreeNode, targetPath: string): TreeNode | null {
  if (node.path === targetPath) {
    return node;
  }

  if (node.children) {
    for (const child of node.children) {
      const found = findNodeByPath(child, targetPath);
      if (found) return found;
    }
  }

  return null;
}
