import fs from 'fs-extra';
import path from 'path';
import {
  generateBugId,
  getDateString,
  toArborPath,
  writeMarkdownFile,
  type BugSeverity,
  type BugStatus,
  type TargetType,
} from '@arbor-plan/core';

export interface CreateBugInput {
  parentType: TargetType;
  parentPath: string;
  name: string;
  description?: string;
  severity: BugSeverity;
  status?: BugStatus;
  relatedTask?: string;
}

export interface CreateBugResult {
  success: boolean;
  path: string;
  bug: {
    id: string;
    name: string;
    severity: BugSeverity;
    status: BugStatus;
    created: string;
  };
  error?: { code: string; message: string };
}

export async function createBug(
  arborRoot: string,
  input: CreateBugInput
): Promise<CreateBugResult> {
  // Bugs only allowed under feature, config, infra, test
  const allowedTypes: TargetType[] = ['feature', 'config', 'infra', 'test'];
  if (!allowedTypes.includes(input.parentType)) {
    return {
      success: false,
      path: '',
      bug: {} as CreateBugResult['bug'],
      error: {
        code: 'INVALID_PARENT',
        message: `Bugs can only be created under ${allowedTypes.join(', ')}`,
      },
    };
  }

  const basePath = toArborPath(input.parentType, input.parentPath);
  const bugsDir = path.join(arborRoot, basePath, 'bugs');
  const today = getDateString();
  const id = generateBugId();

  const parentMeta = path.join(arborRoot, basePath, '_meta.yaml');
  if (!(await fs.pathExists(parentMeta))) {
    return {
      success: false,
      path: '',
      bug: {} as CreateBugResult['bug'],
      error: {
        code: 'INVALID_PARENT',
        message: `Parent node does not exist at ${input.parentPath}`,
      },
    };
  }

  await fs.ensureDir(bugsDir);

  const bugPath = path.join(bugsDir, `${id}.md`);
  const frontmatter: Record<string, string> = {
    id,
    name: input.name,
    severity: input.severity,
    status: input.status || 'open',
    created: today,
    updated: today,
  };

  if (input.relatedTask) {
    frontmatter.related_task = input.relatedTask;
  }

  const content = input.description
    ? `# ${input.name}\n\n${input.description}`
    : `# ${input.name}`;

  await writeMarkdownFile(bugPath, frontmatter, content);

  return {
    success: true,
    path: path.relative(arborRoot, bugPath),
    bug: {
      id,
      name: input.name,
      severity: input.severity,
      status: input.status || 'open',
      created: today,
    },
  };
}
