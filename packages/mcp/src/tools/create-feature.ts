import fs from 'fs-extra';
import path from 'path';
import {
  slugify,
  getDateString,
  writeYamlFile,
  type Meta,
  type NodeStatus,
} from '@arbor-plan/core';

export interface CreateFeatureInput {
  path: string;
  name: string;
  description?: string;
  status?: NodeStatus;
}

export interface CreateFeatureResult {
  success: boolean;
  path: string;
  meta: Meta;
  error?: { code: string; message: string };
}

export async function createFeature(
  arborRoot: string,
  input: CreateFeatureInput
): Promise<CreateFeatureResult> {
  const featurePath = path.join(arborRoot, 'features', input.path);
  const today = getDateString();
  const id = slugify(input.path.split('/').pop() || input.path);

  // Check if feature already exists
  if (await fs.pathExists(featurePath)) {
    return {
      success: false,
      path: featurePath,
      meta: {} as Meta,
      error: {
        code: 'ALREADY_EXISTS',
        message: `Feature already exists at ${input.path}`,
      },
    };
  }

  // Create parent directories if needed
  const parentPath = path.dirname(featurePath);
  if (parentPath !== path.join(arborRoot, 'features')) {
    const parentMeta = path.join(parentPath, '_meta.yaml');
    if (!(await fs.pathExists(parentMeta))) {
      return {
        success: false,
        path: featurePath,
        meta: {} as Meta,
        error: {
          code: 'INVALID_PARENT',
          message: `Parent feature does not exist. Create parent first.`,
        },
      };
    }
  }

  // Create feature directory structure
  await fs.ensureDir(featurePath);
  await fs.ensureDir(path.join(featurePath, 'plans'));
  await fs.ensureDir(path.join(featurePath, 'tasks'));
  await fs.ensureDir(path.join(featurePath, 'bugs'));
  await fs.ensureDir(path.join(featurePath, 'docs'));

  // Create _meta.yaml
  const meta: Meta = {
    type: 'feature',
    id,
    name: input.name,
    description: input.description,
    status: input.status || 'planned',
    created: today,
    updated: today,
  };

  await writeYamlFile(path.join(featurePath, '_meta.yaml'), meta);

  return {
    success: true,
    path: `features/${input.path}`,
    meta,
  };
}
