import fs from 'fs-extra';
import path from 'path';
import {
  generateTaskId,
  getDateString,
  toArborPath,
  writeMarkdownFile,
  parsePlanTasks,
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

/**
 * Plan에서 Task를 일괄 생성하기 위한 입력
 */
export interface CreateTasksFromPlanInput {
  parentType: TargetType;
  parentPath: string;
  planId: string;
  tasks: Array<{
    name: string;
    status: 'pending' | 'completed';
    section?: string;
  }>;
}

/**
 * Plan에서 Task 일괄 생성 결과
 */
export interface CreateTasksFromPlanResult {
  success: boolean;
  created: number;
  tasks: Array<{
    id: string;
    name: string;
    status: TaskStatus;
  }>;
  error?: { code: string; message: string };
}

/**
 * Plan에서 파싱된 Task들을 일괄 생성합니다.
 */
export async function createTasksFromPlan(
  arborRoot: string,
  input: CreateTasksFromPlanInput
): Promise<CreateTasksFromPlanResult> {
  const results: CreateTasksFromPlanResult['tasks'] = [];

  for (const taskInput of input.tasks) {
    const result = await createTask(arborRoot, {
      parentType: input.parentType,
      parentPath: input.parentPath,
      name: taskInput.name,
      status: taskInput.status as TaskStatus,
      planRef: input.planId,
      description: taskInput.section
        ? `Section: ${taskInput.section}`
        : undefined,
    });

    if (result.success) {
      results.push({
        id: result.task.id,
        name: result.task.name,
        status: result.task.status,
      });
    }
  }

  return {
    success: true,
    created: results.length,
    tasks: results,
  };
}

/**
 * Plan 내용에서 Task를 파싱하여 자동 생성합니다.
 */
export async function extractAndCreateTasksFromPlanContent(
  arborRoot: string,
  parentType: TargetType,
  parentPath: string,
  planId: string,
  planContent: string
): Promise<CreateTasksFromPlanResult> {
  const parseResult = parsePlanTasks(planContent);

  if (parseResult.tasks.length === 0) {
    return {
      success: true,
      created: 0,
      tasks: [],
    };
  }

  return createTasksFromPlan(arborRoot, {
    parentType,
    parentPath,
    planId,
    tasks: parseResult.tasks.map((t) => ({
      name: t.name,
      status: t.status,
      section: t.section,
    })),
  });
}
