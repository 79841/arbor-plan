import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { createRefactor, createTest, createSecurity, createPerformance } from '../create-subnode.js';
import { createFeature } from '../create-feature.js';

describe('createSubnode with detailed templates', () => {
  let testDir: string;
  let arborRoot: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'arbor-subnode-test-'));
    arborRoot = path.join(testDir, '.arbor');

    await fs.mkdir(arborRoot, { recursive: true });
    await fs.mkdir(path.join(arborRoot, 'features'), { recursive: true });

    // Create a test feature to add subnodes to
    await createFeature(arborRoot, { path: 'test-feature', name: 'Test Feature' });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('createRefactor', () => {
    it('should create refactor node with basic fields', async () => {
      const result = await createRefactor(arborRoot, {
        featurePath: 'test-feature',
        name: 'Code Cleanup',
        description: 'Clean up legacy code',
      });

      expect(result.success).toBe(true);
      expect(result.meta.type).toBe('refactor');
      expect(result.meta.name).toBe('Code Cleanup');
    });

    it('should create refactor with detailed template', async () => {
      const result = await createRefactor(arborRoot, {
        featurePath: 'test-feature',
        name: 'Extract Utils',
        description: 'Extract common utilities to shared module',
        targetCode: 'src/components/Form.tsx, src/components/Input.tsx',
        reason: 'Reduce code duplication and improve maintainability',
        approach: 'Extract common validation logic to src/utils/validation.ts',
        expectedOutcome: 'Cleaner components, reusable validation functions',
        risks: 'May affect existing form behavior, need thorough testing',
      });

      expect(result.success).toBe(true);

      // Verify refactor doc was created
      const docPath = path.join(
        arborRoot,
        'features',
        'test-feature',
        'refactor',
        'docs',
        'refactor-plan.md'
      );
      const docExists = await fs.pathExists(docPath);
      expect(docExists).toBe(true);

      const docContent = await fs.readFile(docPath, 'utf-8');
      expect(docContent).toContain('# Extract Utils 리팩토링 문서');
      expect(docContent).toContain('## 리팩토링 대상');
      expect(docContent).toContain('src/components/Form.tsx');
      expect(docContent).toContain('## 리팩토링 이유');
      expect(docContent).toContain('Reduce code duplication');
      expect(docContent).toContain('## 접근 방식');
      expect(docContent).toContain('Extract common validation');
      expect(docContent).toContain('## 기대 결과');
      expect(docContent).toContain('Cleaner components');
      expect(docContent).toContain('## 위험 요소');
      expect(docContent).toContain('May affect existing form');
      expect(docContent).toContain('## 작업 체크리스트');
    });

    it('should fail if parent feature does not exist', async () => {
      const result = await createRefactor(arborRoot, {
        featurePath: 'nonexistent-feature',
        name: 'Invalid Refactor',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_PARENT');
    });

    it('should fail if refactor already exists', async () => {
      await createRefactor(arborRoot, {
        featurePath: 'test-feature',
        name: 'First Refactor',
      });

      const result = await createRefactor(arborRoot, {
        featurePath: 'test-feature',
        name: 'Second Refactor',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ALREADY_EXISTS');
    });
  });

  describe('other subnodes', () => {
    it('should create test node', async () => {
      const result = await createTest(arborRoot, {
        featurePath: 'test-feature',
        name: 'Unit Tests',
      });

      expect(result.success).toBe(true);
      expect(result.meta.type).toBe('test');
    });

    it('should create security node', async () => {
      const result = await createSecurity(arborRoot, {
        featurePath: 'test-feature',
        name: 'Auth Security',
      });

      expect(result.success).toBe(true);
      expect(result.meta.type).toBe('security');
    });

    it('should create performance node', async () => {
      const result = await createPerformance(arborRoot, {
        featurePath: 'test-feature',
        name: 'Load Optimization',
      });

      expect(result.success).toBe(true);
      expect(result.meta.type).toBe('performance');
    });
  });
});
