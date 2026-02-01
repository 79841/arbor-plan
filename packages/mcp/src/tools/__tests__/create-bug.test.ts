import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { createBug } from '../create-bug.js';
import { createFeature } from '../create-feature.js';

describe('createBug with detailed template', () => {
  let testDir: string;
  let arborRoot: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'arbor-bug-test-'));
    arborRoot = path.join(testDir, '.arbor');

    await fs.mkdir(arborRoot, { recursive: true });
    await fs.mkdir(path.join(arborRoot, 'features'), { recursive: true });

    // Create a test feature to add bugs to
    await createFeature(arborRoot, { path: 'test-feature', name: 'Test Feature' });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should create bug with basic fields', async () => {
    const result = await createBug(arborRoot, {
      parentType: 'feature',
      parentPath: 'test-feature',
      name: 'Test Bug',
      severity: 'high',
    });

    expect(result.success).toBe(true);
    expect(result.bug.name).toBe('Test Bug');
    expect(result.bug.severity).toBe('high');
    expect(result.bug.status).toBe('open');
  });

  it('should create bug with detailed template fields', async () => {
    const result = await createBug(arborRoot, {
      parentType: 'feature',
      parentPath: 'test-feature',
      name: 'Memory Leak Bug',
      description: 'Memory usage increases over time',
      severity: 'critical',
      causeAnalysis: 'Uncleared event listeners in component lifecycle',
      solution: 'Add cleanup function in useEffect return',
      impactScope: 'Dashboard page, user list component',
      stepsToReproduce: '1. Open dashboard\n2. Navigate to user list\n3. Repeat 10 times',
    });

    expect(result.success).toBe(true);

    // Read the generated file and verify template content
    const bugContent = await fs.readFile(
      path.join(arborRoot, 'features', 'test-feature', 'bugs', `${result.bug.id}.md`),
      'utf-8'
    );

    expect(bugContent).toContain('# Memory Leak Bug');
    expect(bugContent).toContain('## 개요');
    expect(bugContent).toContain('Memory usage increases over time');
    expect(bugContent).toContain('## 재현 단계');
    expect(bugContent).toContain('1. Open dashboard');
    expect(bugContent).toContain('## 원인 분석');
    expect(bugContent).toContain('Uncleared event listeners');
    expect(bugContent).toContain('## 해결 방법');
    expect(bugContent).toContain('Add cleanup function');
    expect(bugContent).toContain('## 영향 범위');
    expect(bugContent).toContain('Dashboard page');
  });

  it('should create bug with partial template fields', async () => {
    const result = await createBug(arborRoot, {
      parentType: 'feature',
      parentPath: 'test-feature',
      name: 'Partial Bug',
      severity: 'medium',
      causeAnalysis: 'Known root cause',
      // solution, impactScope, stepsToReproduce not provided
    });

    expect(result.success).toBe(true);

    const bugContent = await fs.readFile(
      path.join(arborRoot, 'features', 'test-feature', 'bugs', `${result.bug.id}.md`),
      'utf-8'
    );

    expect(bugContent).toContain('## 원인 분석');
    expect(bugContent).toContain('Known root cause');
    // Empty sections should have placeholder text
    expect(bugContent).toContain('## 해결 방법');
    expect(bugContent).toContain('## 영향 범위');
  });

  it('should fail for invalid parent type', async () => {
    const result = await createBug(arborRoot, {
      parentType: 'refactor' as any,
      parentPath: 'test-feature',
      name: 'Invalid Bug',
      severity: 'low',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_PARENT');
  });

  it('should fail if parent does not exist', async () => {
    const result = await createBug(arborRoot, {
      parentType: 'feature',
      parentPath: 'nonexistent-feature',
      name: 'Orphan Bug',
      severity: 'low',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_PARENT');
  });
});
