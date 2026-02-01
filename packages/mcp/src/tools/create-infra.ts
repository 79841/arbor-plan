import fs from 'fs-extra';
import path from 'path';
import {
  slugify,
  getDateString,
  writeYamlFile,
  type Meta,
  type NodeStatus,
} from '@arbor-plan/core';

export interface CreateInfraInput {
  path: string;
  name: string;
  description?: string;
  status?: NodeStatus;
}

export interface CreateInfraResult {
  success: boolean;
  path: string;
  meta: Meta;
  error?: { code: string; message: string };
}

export async function createInfra(
  arborRoot: string,
  input: CreateInfraInput
): Promise<CreateInfraResult> {
  const infraPath = path.join(arborRoot, 'infra', input.path);
  const today = getDateString();
  const id = slugify(input.path.split('/').pop() || input.path);

  if (await fs.pathExists(infraPath)) {
    return {
      success: false,
      path: infraPath,
      meta: {} as Meta,
      error: {
        code: 'ALREADY_EXISTS',
        message: `Infra already exists at ${input.path}`,
      },
    };
  }

  await fs.ensureDir(infraPath);
  await fs.ensureDir(path.join(infraPath, 'plans'));
  await fs.ensureDir(path.join(infraPath, 'tasks'));
  await fs.ensureDir(path.join(infraPath, 'bugs'));
  await fs.ensureDir(path.join(infraPath, 'docs'));

  const meta: Meta = {
    type: 'infra',
    id,
    name: input.name,
    description: input.description,
    status: input.status || 'planned',
    created: today,
    updated: today,
  };

  await writeYamlFile(path.join(infraPath, '_meta.yaml'), meta);

  return {
    success: true,
    path: `infra/${input.path}`,
    meta,
  };
}
