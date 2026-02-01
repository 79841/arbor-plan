import path from 'path';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Convert a logical feature path to its physical representation.
 *
 * Logical paths are user-facing: "auth/social-login/oauth"
 * Physical paths include features/ subdirectories: "auth/features/social-login/features/oauth"
 *
 * @param logicalPath - The logical path (e.g., "auth/social-login")
 * @returns The physical path (e.g., "auth/features/social-login")
 */
export function toPhysicalFeaturePath(logicalPath: string): string {
  if (!logicalPath) {
    return '';
  }

  const segments = logicalPath.split('/').filter(Boolean);

  if (segments.length <= 1) {
    return logicalPath;
  }

  // Insert 'features' between each segment except the first
  const result: string[] = [segments[0] as string];
  for (let i = 1; i < segments.length; i++) {
    result.push('features', segments[i] as string);
  }

  return result.join('/');
}

/**
 * Convert a physical feature path back to its logical representation.
 *
 * @param physicalPath - The physical path (e.g., "auth/features/social-login")
 * @returns The logical path (e.g., "auth/social-login")
 */
export function toLogicalFeaturePath(physicalPath: string): string {
  if (!physicalPath) {
    return '';
  }

  const segments = physicalPath.split('/').filter(Boolean);

  // Remove all 'features' segments
  const result = segments.filter((s) => s !== 'features');

  return result.join('/');
}

export function toArborPath(targetType: string, targetPath: string): string {
  switch (targetType) {
    case 'feature': {
      const physicalPath = toPhysicalFeaturePath(targetPath);
      return path.join('features', physicalPath);
    }
    case 'config':
      return path.join('config', targetPath);
    case 'infra':
      return path.join('infra', targetPath);
    case 'refactor':
    case 'test':
    case 'security':
    case 'performance': {
      // These are under feature path
      const physicalPath = toPhysicalFeaturePath(targetPath);
      return path.join('features', physicalPath, targetType);
    }
    default:
      throw new Error(`Unknown target type: ${targetType}`);
  }
}

export function getPlansDir(arborRoot: string, targetType: string, targetPath: string): string {
  const basePath = toArborPath(targetType, targetPath);
  return path.join(arborRoot, basePath, 'plans');
}

export function getTasksDir(arborRoot: string, targetType: string, targetPath: string): string {
  const basePath = toArborPath(targetType, targetPath);
  return path.join(arborRoot, basePath, 'tasks');
}

export function getBugsDir(arborRoot: string, targetType: string, targetPath: string): string {
  const basePath = toArborPath(targetType, targetPath);
  return path.join(arborRoot, basePath, 'bugs');
}

export function getDocsDir(arborRoot: string, targetType: string, targetPath: string): string {
  const basePath = toArborPath(targetType, targetPath);
  return path.join(arborRoot, basePath, 'docs');
}
