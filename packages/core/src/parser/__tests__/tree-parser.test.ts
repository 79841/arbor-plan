import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { TreeParser } from '../tree-parser.js';

describe('TreeParser with nested features', () => {
  let testDir: string;
  let arborRoot: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'arbor-test-'));
    arborRoot = path.join(testDir, '.arbor');

    // Create base structure
    await fs.mkdir(arborRoot, { recursive: true });
    await fs.mkdir(path.join(arborRoot, 'features'), { recursive: true });

    // Create manifest.yaml
    await fs.writeFile(
      path.join(arborRoot, 'manifest.yaml'),
      `version: 1
project:
  id: test-project
  name: Test Project
`
    );

    // Create mappings.yaml
    await fs.writeFile(
      path.join(arborRoot, 'mappings.yaml'),
      `version: 1
project_id: test-project
linked: []
unlinked: []
`
    );
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  async function createFeature(
    featurePath: string,
    name: string
  ): Promise<void> {
    const fullPath = path.join(arborRoot, 'features', featurePath);
    await fs.mkdir(fullPath, { recursive: true });
    await fs.mkdir(path.join(fullPath, 'plans'), { recursive: true });
    await fs.mkdir(path.join(fullPath, 'tasks'), { recursive: true });
    await fs.mkdir(path.join(fullPath, 'bugs'), { recursive: true });
    await fs.mkdir(path.join(fullPath, 'docs'), { recursive: true });

    const id = name.toLowerCase().replace(/\s+/g, '-');
    await fs.writeFile(
      path.join(fullPath, '_meta.yaml'),
      `type: feature
id: ${id}
name: ${name}
status: planned
created: '2025-02-01'
updated: '2025-02-01'
`
    );
  }

  it('should parse root level features', async () => {
    await createFeature('auth', 'Auth');

    const parser = new TreeParser(arborRoot);
    const tree = await parser.parse();

    const auth = tree.root.children?.find((n) => n.name === 'Auth');
    expect(auth).toBeDefined();
    expect(auth?.type).toBe('feature');
    expect(auth?.path).toBe('auth');
  });

  it('should parse nested features from features/ subdirectory', async () => {
    // Create parent feature
    await createFeature('auth', 'Auth');
    // Create nested feature in features/ subdirectory
    await createFeature('auth/features/social-login', 'Social Login');

    const parser = new TreeParser(arborRoot);
    const tree = await parser.parse();

    const auth = tree.root.children?.find((n) => n.name === 'Auth');
    expect(auth).toBeDefined();

    const socialLogin = auth?.children?.find((n) => n.name === 'Social Login');
    expect(socialLogin).toBeDefined();
    expect(socialLogin?.type).toBe('feature');
    // Path should be logical (without 'features' segments)
    expect(socialLogin?.path).toBe('auth/social-login');
  });

  it('should parse deeply nested features', async () => {
    await createFeature('auth', 'Auth');
    await createFeature('auth/features/social-login', 'Social Login');
    await createFeature(
      'auth/features/social-login/features/oauth',
      'OAuth'
    );

    const parser = new TreeParser(arborRoot);
    const tree = await parser.parse();

    const auth = tree.root.children?.find((n) => n.name === 'Auth');
    const socialLogin = auth?.children?.find((n) => n.name === 'Social Login');
    const oauth = socialLogin?.children?.find((n) => n.name === 'OAuth');

    expect(oauth).toBeDefined();
    expect(oauth?.type).toBe('feature');
    expect(oauth?.path).toBe('auth/social-login/oauth');
  });

  it('should not parse directories without features/ subdirectory as nested features', async () => {
    await createFeature('auth', 'Auth');
    // Create a directory directly (old style) - should NOT be parsed as child
    await createFeature('auth/old-style-child', 'Old Style');

    const parser = new TreeParser(arborRoot);
    const tree = await parser.parse();

    const auth = tree.root.children?.find((n) => n.name === 'Auth');
    // Old style child should NOT appear as a child of auth
    const oldStyle = auth?.children?.find((n) => n.name === 'Old Style');
    expect(oldStyle).toBeUndefined();
  });

  it('should parse subnodes under nested features', async () => {
    await createFeature('auth', 'Auth');
    await createFeature('auth/features/social-login', 'Social Login');

    // Create test subnode under nested feature
    const testPath = path.join(
      arborRoot,
      'features',
      'auth/features/social-login',
      'test'
    );
    await fs.mkdir(testPath, { recursive: true });
    await fs.mkdir(path.join(testPath, 'plans'), { recursive: true });
    await fs.mkdir(path.join(testPath, 'tasks'), { recursive: true });
    await fs.mkdir(path.join(testPath, 'bugs'), { recursive: true });
    await fs.mkdir(path.join(testPath, 'docs'), { recursive: true });
    await fs.writeFile(
      path.join(testPath, '_meta.yaml'),
      `type: test
id: test
name: Test
status: planned
created: '2025-02-01'
updated: '2025-02-01'
`
    );

    const parser = new TreeParser(arborRoot);
    const tree = await parser.parse();

    const auth = tree.root.children?.find((n) => n.name === 'Auth');
    const socialLogin = auth?.children?.find((n) => n.name === 'Social Login');
    const testNode = socialLogin?.children?.find((n) => n.type === 'test');

    expect(testNode).toBeDefined();
    expect(testNode?.name).toBe('Test');
  });
});
