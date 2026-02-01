// Valid structure node types that can receive plans
const VALID_TARGET_TYPES: ReadonlySet<string> = new Set([
  'feature',
  'config',
  'infra',
  'refactor',
  'test',
  'security',
  'performance',
]);

export function isValidDropTarget(nodeType: string): boolean {
  return VALID_TARGET_TYPES.has(nodeType);
}

export function getTargetTypeFromNodeType(nodeType: string): string | null {
  if (VALID_TARGET_TYPES.has(nodeType)) {
    return nodeType;
  }
  return null;
}
