import fs from 'fs-extra';
import path from 'path';
import {
  generateTaskId,
  getDateString,
  toArborPath,
  writeMarkdownFile,
  type TaskStatus,
  type TargetType,
} from '@arbor-plan/core';

export interface CreateTaskInput {
  parentType: TargetType;
  parentPath: string;
  name: string;
  description?: string;
  status?: TaskStatus;
  planRef?: string;
}

export interface CreateTaskResult {
  success: boolean;
  path: string;
  task: {
    id: string;
    name: string;
    status: TaskStatus;
    created: string;
  };
  error?: { code: string; message: string };
}

export async function createTask(
  arborRoot: string,
  input: CreateTaskInput
): Promise<CreateTaskResult> {
  const basePath = toArborPath(input.parentType, input.parentPath);
  const tasksDir = path.join(arborRoot, basePath, 'tasks');
  const today = getDateString();
  const id = generateTaskId();

  // Check parent exists
  const parentMeta = path.join(arborRoot, basePath, '_meta.yaml');
  if (!(await fs.pathExists(parentMeta))) {
    return {
      success: false,
      path: '',
      task: {} as CreateTaskResult['task'],
      error: {
        code: 'INVALID_PARENT',
        message: `Parent node does not exist at ${input.parentPath}`,
      },
    };
  }

  await fs.ensureDir(tasksDir);

  const taskPath = path.join(tasksDir, `${id}.md`);
  const frontmatter: Record<string, string> = {
    id,
    name: input.name,
    status: input.status || 'pending',
    created: today,
    updated: today,
  };

  if (input.planRef) {
    frontmatter.plan_ref = input.planRef;
  }

  const content = input.description
    ? `# ${input.name}\n\n${input.description}`
    : `# ${input.name}`;

  await writeMarkdownFile(taskPath, frontmatter, content);

  return {
    success: true,
    path: path.relative(arborRoot, taskPath),
    task: {
      id,
      name: input.name,
      status: input.status || 'pending',
      created: today,
    },
  };
}
