import fs from 'fs-extra';
import path from 'path';
import {
  generatePlanId,
  getDateTimeString,
  slugify,
  readYamlFile,
  writeYamlFile,
  toPhysicalFeaturePath,
  type Mappings,
  type LinkedPlan,
  type TargetType,
} from '@arbor-plan/core';

export interface ListUnlinkedResult {
  unlinked: Array<{
    id: string;
    source: string;
    detected_at: string;
    preview: string;
  }>;
}

export async function listUnlinked(arborRoot: string): Promise<ListUnlinkedResult> {
  const mappingsPath = path.join(arborRoot, 'mappings.yaml');

  if (!(await fs.pathExists(mappingsPath))) {
    return { unlinked: [] };
  }

  const mappings = await readYamlFile<Mappings>(mappingsPath);

  return {
    unlinked: mappings.unlinked.map((u) => ({
      id: u.id,
      source: u.source,
      detected_at: u.detected_at,
      preview: u.preview,
    })),
  };
}

export interface LinkPlanInput {
  planId: string;
  targetType: TargetType;
  targetPath: string;
  name?: string;
}

export interface LinkPlanResult {
  success: boolean;
  linkedPlan?: {
    id: string;
    source: string;
    local: string;
    name: string;
  };
  error?: { code: string; message: string };
}

export async function linkPlan(
  arborRoot: string,
  input: LinkPlanInput
): Promise<LinkPlanResult> {
  const mappingsPath = path.join(arborRoot, 'mappings.yaml');

  if (!(await fs.pathExists(mappingsPath))) {
    return {
      success: false,
      error: {
        code: 'NOT_INITIALIZED',
        message: 'Arbor is not initialized.',
      },
    };
  }

  const mappings = await readYamlFile<Mappings>(mappingsPath);

  // Find unlinked plan
  const unlinkedIndex = mappings.unlinked.findIndex((u) => u.id === input.planId);
  if (unlinkedIndex === -1) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Unlinked plan with id ${input.planId} not found.`,
      },
    };
  }

  const unlinkedPlan = mappings.unlinked[unlinkedIndex]!;

  // Verify source exists
  if (!(await fs.pathExists(unlinkedPlan.source))) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Source file no longer exists at ${unlinkedPlan.source}`,
      },
    };
  }

  // Build destination path
  let destDir: string;
  switch (input.targetType) {
    case 'feature': {
      const physicalPath = toPhysicalFeaturePath(input.targetPath);
      destDir = path.join(arborRoot, 'features', physicalPath, 'plans');
      break;
    }
    case 'config':
      destDir = path.join(arborRoot, 'config', input.targetPath, 'plans');
      break;
    case 'infra':
      destDir = path.join(arborRoot, 'infra', input.targetPath, 'plans');
      break;
    case 'refactor':
    case 'test':
    case 'security':
    case 'performance': {
      const physicalPath = toPhysicalFeaturePath(input.targetPath);
      destDir = path.join(arborRoot, 'features', physicalPath, input.targetType, 'plans');
      break;
    }
    default:
      return {
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: `Invalid target type: ${input.targetType}`,
        },
      };
  }

  // Verify target exists
  const targetMeta = path.dirname(destDir);
  if (!(await fs.pathExists(path.join(targetMeta, '_meta.yaml')))) {
    return {
      success: false,
      error: {
        code: 'INVALID_PARENT',
        message: `Target does not exist at ${input.targetPath}`,
      },
    };
  }

  await fs.ensureDir(destDir);

  // Generate file name
  const planName = input.name || path.basename(unlinkedPlan.source, '.md');
  const fileName = `${slugify(planName)}.md`;
  const destPath = path.join(destDir, fileName);

  // Copy file
  await fs.copy(unlinkedPlan.source, destPath);

  // Create linked plan entry
  const linkedPlan: LinkedPlan = {
    id: generatePlanId(),
    source: unlinkedPlan.source,
    local: path.relative(arborRoot, destPath),
    target_type: input.targetType,
    target_path: input.targetPath,
    name: planName,
    linked_at: getDateTimeString(),
    source_exists: true,
  };

  // Update mappings
  mappings.linked.push(linkedPlan);
  mappings.unlinked.splice(unlinkedIndex, 1);
  await writeYamlFile(mappingsPath, mappings);

  return {
    success: true,
    linkedPlan: {
      id: linkedPlan.id,
      source: linkedPlan.source,
      local: linkedPlan.local,
      name: linkedPlan.name,
    },
  };
}
