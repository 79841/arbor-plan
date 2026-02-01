import fs from 'fs-extra';
import path from 'path';
import {
  generatePlanId,
  getDateTimeString,
  slugify,
  getPlansDir,
  toArborPath,
  readYamlFile,
  writeYamlFile,
  type Mappings,
  type LinkedPlan,
  type TargetType,
} from '@arbor-plan/core';

export interface CreatePlanInput {
  parentType: TargetType;
  parentPath: string;
  name: string;
  content: string;
}

export interface CreatePlanResult {
  success: boolean;
  path: string;
  plan: {
    id: string;
    name: string;
    local: string;
    linked_at: string;
  };
  error?: { code: string; message: string };
}

export async function createPlan(
  arborRoot: string,
  input: CreatePlanInput
): Promise<CreatePlanResult> {
  // 1. Validate parent exists
  const basePath = toArborPath(input.parentType, input.parentPath);
  const parentMeta = path.join(arborRoot, basePath, '_meta.yaml');

  if (!(await fs.pathExists(parentMeta))) {
    return {
      success: false,
      path: '',
      plan: {} as CreatePlanResult['plan'],
      error: {
        code: 'INVALID_PARENT',
        message: `Parent node does not exist at ${input.parentPath}`,
      },
    };
  }

  // 2. Ensure plans directory exists
  const plansDir = getPlansDir(arborRoot, input.parentType, input.parentPath);
  await fs.ensureDir(plansDir);

  // 3. Generate file name from name
  const id = generatePlanId();
  const fileName = `${slugify(input.name)}.md`;
  const planPath = path.join(plansDir, fileName);

  // 4. Check if file already exists
  if (await fs.pathExists(planPath)) {
    return {
      success: false,
      path: '',
      plan: {} as CreatePlanResult['plan'],
      error: {
        code: 'ALREADY_EXISTS',
        message: `Plan file already exists: ${fileName}`,
      },
    };
  }

  // 5. Check mappings.yaml exists (Arbor initialized)
  const mappingsPath = path.join(arborRoot, 'mappings.yaml');

  if (!(await fs.pathExists(mappingsPath))) {
    return {
      success: false,
      path: '',
      plan: {} as CreatePlanResult['plan'],
      error: {
        code: 'NOT_INITIALIZED',
        message: 'Arbor is not initialized. Run arbor_init first.',
      },
    };
  }

  // 6. Write pure markdown (no frontmatter) - matches Plan Mode format
  await fs.writeFile(planPath, input.content, 'utf-8');

  // 7. Update mappings.yaml
  const linkedAt = getDateTimeString();
  const mappings = await readYamlFile<Mappings>(mappingsPath);

  const linkedPlan: LinkedPlan = {
    id,
    source: 'arbor_created', // Special marker for directly created plans
    local: path.relative(arborRoot, planPath),
    target_type: input.parentType,
    target_path: input.parentPath,
    name: input.name,
    linked_at: linkedAt,
    source_exists: false, // No external source file
  };

  mappings.linked.push(linkedPlan);
  await writeYamlFile(mappingsPath, mappings);

  // 8. Return result
  return {
    success: true,
    path: path.relative(arborRoot, planPath),
    plan: {
      id,
      name: input.name,
      local: path.relative(arborRoot, planPath),
      linked_at: linkedAt,
    },
  };
}
