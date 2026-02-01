import fs from 'fs-extra';
import path from 'path';
import {
  slugify,
  getDateString,
  writeYamlFile,
  type Meta,
  type NodeStatus,
} from '@arbor-plan/core';

export interface CreateConfigInput {
  path: string;
  name: string;
  description?: string;
  status?: NodeStatus;
}

export interface CreateConfigResult {
  success: boolean;
  path: string;
  meta: Meta;
  error?: { code: string; message: string };
}

export async function createConfig(
  arborRoot: string,
  input: CreateConfigInput
): Promise<CreateConfigResult> {
  const configPath = path.join(arborRoot, 'config', input.path);
  const today = getDateString();
  const id = slugify(input.path.split('/').pop() || input.path);

  if (await fs.pathExists(configPath)) {
    return {
      success: false,
      path: configPath,
      meta: {} as Meta,
      error: {
        code: 'ALREADY_EXISTS',
        message: `Config already exists at ${input.path}`,
      },
    };
  }

  await fs.ensureDir(configPath);
  await fs.ensureDir(path.join(configPath, 'plans'));
  await fs.ensureDir(path.join(configPath, 'tasks'));
  await fs.ensureDir(path.join(configPath, 'bugs'));
  await fs.ensureDir(path.join(configPath, 'docs'));

  const meta: Meta = {
    type: 'config',
    id,
    name: input.name,
    description: input.description,
    status: input.status || 'planned',
    created: today,
    updated: today,
  };

  await writeYamlFile(path.join(configPath, '_meta.yaml'), meta);

  return {
    success: true,
    path: `config/${input.path}`,
    meta,
  };
}
