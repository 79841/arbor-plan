import { nanoid } from 'nanoid';

export function generateId(prefix: string): string {
  return `${prefix}-${nanoid(8)}`;
}

export function generatePlanId(): string {
  return generateId('plan');
}

export function generateTaskId(): string {
  return generateId('task');
}

export function generateBugId(): string {
  return generateId('bug');
}

export function generateDocId(): string {
  return generateId('doc');
}

export function generateContextId(): string {
  return generateId('ctx');
}
