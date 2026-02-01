import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { createTasksFromPlan, extractAndCreateTasksFromPlanContent } from '../create-task.js';
import { createPlan } from '../create-plan.js';
import { createFeature } from '../create-feature.js';

describe('Task extraction from Plan', () => {
  let testDir: string;
  let arborRoot: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'arbor-task-test-'));
    arborRoot = path.join(testDir, '.arbor');

    await fs.mkdir(arborRoot, { recursive: true });
    await fs.mkdir(path.join(arborRoot, 'features'), { recursive: true });

    // Create mappings.yaml
    await fs.writeFile(
      path.join(arborRoot, 'mappings.yaml'),
      `version: 1
project_id: test-project
linked: []
unlinked: []
`
    );

    // Create a test feature
    await createFeature(arborRoot, { path: 'test-feature', name: 'Test Feature' });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('createTasksFromPlan', () => {
    it('should create tasks from parsed task list', async () => {
      const result = await createTasksFromPlan(arborRoot, {
        parentType: 'feature',
        parentPath: 'test-feature',
        planId: 'plan-test123',
        tasks: [
          { name: 'Task 1', status: 'pending' },
          { name: 'Task 2', status: 'completed', section: 'Phase 1' },
          { name: 'Task 3', status: 'pending', section: 'Phase 2' },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.created).toBe(3);
      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[0]!.status).toBe('pending');
      expect(result.tasks[1]!.status).toBe('completed');
    });

    it('should set plan_ref for all created tasks', async () => {
      await createTasksFromPlan(arborRoot, {
        parentType: 'feature',
        parentPath: 'test-feature',
        planId: 'plan-xyz',
        tasks: [{ name: 'Referenced Task', status: 'pending' }],
      });

      const tasksDir = path.join(arborRoot, 'features', 'test-feature', 'tasks');
      const files = await fs.readdir(tasksDir);
      expect(files.length).toBeGreaterThan(0);

      const taskContent = await fs.readFile(path.join(tasksDir, files[0]!), 'utf-8');
      expect(taskContent).toContain('plan_ref: plan-xyz');
    });
  });

  describe('extractAndCreateTasksFromPlanContent', () => {
    it('should extract and create tasks from plan content with checkboxes', async () => {
      const planContent = `# Test Plan

## Tasks
- [ ] Task A
- [x] Task B
- [ ] Task C
`;

      const result = await extractAndCreateTasksFromPlanContent(
        arborRoot,
        'feature',
        'test-feature',
        'plan-auto',
        planContent
      );

      expect(result.success).toBe(true);
      expect(result.created).toBe(3);
      expect(result.tasks[0]!.status).toBe('pending');
      expect(result.tasks[1]!.status).toBe('completed');
      expect(result.tasks[2]!.status).toBe('pending');
    });

    it('should extract and create tasks from numbered lists', async () => {
      const planContent = `# Implementation Plan

## Steps
1. Design the API
2. Implement backend
3. Create frontend
`;

      const result = await extractAndCreateTasksFromPlanContent(
        arborRoot,
        'feature',
        'test-feature',
        'plan-numbered',
        planContent
      );

      expect(result.success).toBe(true);
      expect(result.created).toBe(3);
      expect(result.tasks.every(t => t.status === 'pending')).toBe(true);
    });

    it('should return empty result for plan without tasks', async () => {
      const planContent = `# Plan Without Tasks

Just some documentation text.
`;

      const result = await extractAndCreateTasksFromPlanContent(
        arborRoot,
        'feature',
        'test-feature',
        'plan-empty',
        planContent
      );

      expect(result.success).toBe(true);
      expect(result.created).toBe(0);
      expect(result.tasks).toHaveLength(0);
    });
  });

  describe('createPlan with autoExtractTasks', () => {
    it('should auto-extract tasks when creating plan', async () => {
      const result = await createPlan(arborRoot, {
        parentType: 'feature',
        parentPath: 'test-feature',
        name: 'Auto Extract Plan',
        content: `# Plan

## Tasks
- [ ] Auto Task 1
- [x] Auto Task 2
`,
      });

      expect(result.success).toBe(true);
      expect(result.extractedTasks).toBeDefined();
      expect(result.extractedTasks!.created).toBe(2);
    });

    it('should not extract tasks when autoExtractTasks is false', async () => {
      const result = await createPlan(arborRoot, {
        parentType: 'feature',
        parentPath: 'test-feature',
        name: 'No Extract Plan',
        content: `# Plan

- [ ] Should not be extracted
`,
        autoExtractTasks: false,
      });

      expect(result.success).toBe(true);
      expect(result.extractedTasks).toBeUndefined();
    });
  });
});
