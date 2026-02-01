import fs from 'fs-extra';
import path from 'path';
import {
  generateContextId,
  getDateTimeString,
  getExpirationTime,
  readYamlFile,
  writeYamlFile,
  type PendingContext,
  type PendingItem,
  type TargetType,
} from '@arbor-plan/core';

const PENDING_CONTEXT_TTL = 5 * 60 * 1000; // 5 minutes

export interface SetPendingContextInput {
  targetType: TargetType;
  targetPath: string;
  name?: string;
}

export interface SetPendingContextResult {
  success: boolean;
  contextId: string;
  expiresAt: string;
  message: string;
  error?: { code: string; message: string };
}

export async function setPendingContext(
  arborRoot: string,
  input: SetPendingContextInput
): Promise<SetPendingContextResult> {
  const pendingPath = path.join(arborRoot, 'pending_context.yaml');

  // Verify target exists
  let targetDir: string;
  switch (input.targetType) {
    case 'feature':
      targetDir = path.join(arborRoot, 'features', input.targetPath);
      break;
    case 'config':
      targetDir = path.join(arborRoot, 'config', input.targetPath);
      break;
    case 'infra':
      targetDir = path.join(arborRoot, 'infra', input.targetPath);
      break;
    case 'refactor':
    case 'test':
    case 'security':
    case 'performance':
      targetDir = path.join(arborRoot, 'features', input.targetPath, input.targetType);
      break;
    default:
      return {
        success: false,
        contextId: '',
        expiresAt: '',
        message: '',
        error: {
          code: 'INVALID_PATH',
          message: `Invalid target type: ${input.targetType}`,
        },
      };
  }

  const targetMeta = path.join(targetDir, '_meta.yaml');
  if (!(await fs.pathExists(targetMeta))) {
    return {
      success: false,
      contextId: '',
      expiresAt: '',
      message: '',
      error: {
        code: 'NOT_FOUND',
        message: `Target does not exist at ${input.targetPath}`,
      },
    };
  }

  // Load existing pending context
  let pendingContext: PendingContext;
  if (await fs.pathExists(pendingPath)) {
    pendingContext = await readYamlFile<PendingContext>(pendingPath);
  } else {
    pendingContext = { pending: [] };
  }

  // Clean expired items
  const now = new Date();
  pendingContext.pending = pendingContext.pending.filter(
    (item) => new Date(item.expires_at) > now
  );

  // Add new pending item
  const contextId = generateContextId();
  const expiresAt = getExpirationTime(PENDING_CONTEXT_TTL);

  const newItem: PendingItem = {
    id: contextId,
    target_type: input.targetType,
    target_path: input.targetPath,
    name: input.name,
    created_at: getDateTimeString(),
    expires_at: expiresAt,
  };

  pendingContext.pending.push(newItem);
  await writeYamlFile(pendingPath, pendingContext);

  return {
    success: true,
    contextId,
    expiresAt,
    message: 'Pending context registered. Enter Plan Mode now.',
  };
}
