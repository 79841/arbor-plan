import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { createFeature } from '../create-feature.js';

describe('createFeature with nested structure', () => {
  let testDir: string;
  let arborRoot: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'arbor-test-'));
    arborRoot = path.join(testDir, '.arbor');

    // Create base structure
    await fs.mkdir(arborRoot, { recursive: true });
    await fs.mkdir(path.join(arborRoot, 'features'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should create root level feature', async () => {
    const result = await createFeature(arborRoot, {
      path: 'auth',
      name: 'Auth',
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe('features/auth');

    // Verify physical structure
    const metaExists = await fs.pathExists(
      path.join(arborRoot, 'features/auth/_meta.yaml')
    );
    expect(metaExists).toBe(true);
  });

  it('should create nested feature in features/ subdirectory', async () => {
    // First create parent
    await createFeature(arborRoot, { path: 'auth', name: 'Auth' });

    // Create nested feature
    const result = await createFeature(arborRoot, {
      path: 'auth/social-login',
      name: 'Social Login',
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe('features/auth/social-login');

    // Verify physical structure - should be in features/ subdirectory
    const metaExists = await fs.pathExists(
      path.join(arborRoot, 'features/auth/features/social-login/_meta.yaml')
    );
    expect(metaExists).toBe(true);

    // Verify subdirectories created
    const plansExists = await fs.pathExists(
      path.join(arborRoot, 'features/auth/features/social-login/plans')
    );
    expect(plansExists).toBe(true);
  });

  it('should create deeply nested feature', async () => {
    await createFeature(arborRoot, { path: 'auth', name: 'Auth' });
    await createFeature(arborRoot, {
      path: 'auth/social-login',
      name: 'Social Login',
    });

    const result = await createFeature(arborRoot, {
      path: 'auth/social-login/oauth',
      name: 'OAuth',
    });

    expect(result.success).toBe(true);

    // Verify physical structure
    const metaExists = await fs.pathExists(
      path.join(
        arborRoot,
        'features/auth/features/social-login/features/oauth/_meta.yaml'
      )
    );
    expect(metaExists).toBe(true);
  });

  it('should fail if parent feature does not exist', async () => {
    const result = await createFeature(arborRoot, {
      path: 'nonexistent/child',
      name: 'Child',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_PARENT');
  });

  it('should fail if feature already exists', async () => {
    await createFeature(arborRoot, { path: 'auth', name: 'Auth' });

    const result = await createFeature(arborRoot, {
      path: 'auth',
      name: 'Auth Again',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('ALREADY_EXISTS');
  });
});
