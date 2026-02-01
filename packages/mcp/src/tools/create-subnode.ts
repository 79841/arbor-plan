import fs from 'fs-extra';
import path from 'path';
import {
  slugify,
  getDateString,
  writeYamlFile,
  type Meta,
  type NodeType,
} from '@arbor-plan/core';

export interface CreateSubnodeInput {
  featurePath: string;
  name: string;
  description?: string;
}

export interface CreateSubnodeResult {
  success: boolean;
  path: string;
  meta: Meta;
  error?: { code: string; message: string };
}

async function createSubnode(
  arborRoot: string,
  nodeType: NodeType,
  input: CreateSubnodeInput
): Promise<CreateSubnodeResult> {
  const parentPath = path.join(arborRoot, 'features', input.featurePath);
  const subnodePath = path.join(parentPath, nodeType);
  const today = getDateString();
  const id = slugify(input.name);

  // Check parent feature exists
  const parentMeta = path.join(parentPath, '_meta.yaml');
  if (!(await fs.pathExists(parentMeta))) {
    return {
      success: false,
      path: subnodePath,
      meta: {} as Meta,
      error: {
        code: 'INVALID_PARENT',
        message: `Parent feature does not exist at ${input.featurePath}`,
      },
    };
  }

  if (await fs.pathExists(subnodePath)) {
    return {
      success: false,
      path: subnodePath,
      meta: {} as Meta,
      error: {
        code: 'ALREADY_EXISTS',
        message: `${nodeType} already exists under ${input.featurePath}`,
      },
    };
  }

  await fs.ensureDir(subnodePath);
  await fs.ensureDir(path.join(subnodePath, 'plans'));
  await fs.ensureDir(path.join(subnodePath, 'tasks'));
  await fs.ensureDir(path.join(subnodePath, 'bugs'));
  await fs.ensureDir(path.join(subnodePath, 'docs'));

  const meta: Meta = {
    type: nodeType,
    id,
    name: input.name,
    description: input.description,
    status: 'planned',
    created: today,
    updated: today,
  };

  await writeYamlFile(path.join(subnodePath, '_meta.yaml'), meta);

  return {
    success: true,
    path: `features/${input.featurePath}/${nodeType}`,
    meta,
  };
}

export async function createRefactor(
  arborRoot: string,
  input: CreateSubnodeInput
): Promise<CreateSubnodeResult> {
  return createSubnode(arborRoot, 'refactor', input);
}

export async function createTest(
  arborRoot: string,
  input: CreateSubnodeInput
): Promise<CreateSubnodeResult> {
  return createSubnode(arborRoot, 'test', input);
}

export async function createSecurity(
  arborRoot: string,
  input: CreateSubnodeInput
): Promise<CreateSubnodeResult> {
  return createSubnode(arborRoot, 'security', input);
}

export async function createPerformance(
  arborRoot: string,
  input: CreateSubnodeInput
): Promise<CreateSubnodeResult> {
  return createSubnode(arborRoot, 'performance', input);
}
