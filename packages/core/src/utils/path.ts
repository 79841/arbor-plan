import path from 'path';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function toArborPath(targetType: string, targetPath: string): string {
  switch (targetType) {
    case 'feature':
      return path.join('features', targetPath);
    case 'config':
      return path.join('config', targetPath);
    case 'infra':
      return path.join('infra', targetPath);
    case 'refactor':
    case 'test':
    case 'security':
    case 'performance':
      // These are under feature path
      const parts = targetPath.split('/');
      const subType = parts.pop();
      return path.join('features', parts.join('/'), targetType);
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
