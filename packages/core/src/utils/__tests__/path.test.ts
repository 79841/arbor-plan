import { describe, it, expect } from 'vitest';
import {
  toPhysicalFeaturePath,
  toLogicalFeaturePath,
  toArborPath,
} from '../path.js';

describe('toPhysicalFeaturePath', () => {
  it('should return root feature path unchanged', () => {
    expect(toPhysicalFeaturePath('auth')).toBe('auth');
  });

  it('should insert features/ for 2-level nested paths', () => {
    expect(toPhysicalFeaturePath('auth/social-login')).toBe(
      'auth/features/social-login'
    );
  });

  it('should handle 3-level nested paths', () => {
    expect(toPhysicalFeaturePath('auth/social-login/oauth')).toBe(
      'auth/features/social-login/features/oauth'
    );
  });

  it('should handle deeply nested paths', () => {
    expect(toPhysicalFeaturePath('a/b/c/d')).toBe(
      'a/features/b/features/c/features/d'
    );
  });

  it('should handle empty string', () => {
    expect(toPhysicalFeaturePath('')).toBe('');
  });
});

describe('toLogicalFeaturePath', () => {
  it('should return root feature path unchanged', () => {
    expect(toLogicalFeaturePath('auth')).toBe('auth');
  });

  it('should remove features/ from nested paths', () => {
    expect(toLogicalFeaturePath('auth/features/social-login')).toBe(
      'auth/social-login'
    );
  });

  it('should handle deeply nested physical paths', () => {
    expect(
      toLogicalFeaturePath('auth/features/social-login/features/oauth')
    ).toBe('auth/social-login/oauth');
  });

  it('should handle path without features segments', () => {
    expect(toLogicalFeaturePath('auth')).toBe('auth');
  });

  it('should handle empty string', () => {
    expect(toLogicalFeaturePath('')).toBe('');
  });
});

describe('toArborPath', () => {
  describe('feature type', () => {
    it('should handle root feature', () => {
      expect(toArborPath('feature', 'auth')).toBe('features/auth');
    });

    it('should handle nested feature with physical path conversion', () => {
      expect(toArborPath('feature', 'auth/social-login')).toBe(
        'features/auth/features/social-login'
      );
    });

    it('should handle deeply nested feature', () => {
      expect(toArborPath('feature', 'auth/social-login/oauth')).toBe(
        'features/auth/features/social-login/features/oauth'
      );
    });
  });

  describe('config type', () => {
    it('should return config path unchanged', () => {
      expect(toArborPath('config', 'env-setup')).toBe('config/env-setup');
    });
  });

  describe('infra type', () => {
    it('should return infra path unchanged', () => {
      expect(toArborPath('infra', 'ci-cd')).toBe('infra/ci-cd');
    });
  });

  describe('subnode types', () => {
    it('should handle refactor under root feature', () => {
      expect(toArborPath('refactor', 'auth')).toBe('features/auth/refactor');
    });

    it('should handle test under nested feature', () => {
      expect(toArborPath('test', 'auth/social-login')).toBe(
        'features/auth/features/social-login/test'
      );
    });

    it('should handle security under deeply nested feature', () => {
      expect(toArborPath('security', 'auth/social-login/oauth')).toBe(
        'features/auth/features/social-login/features/oauth/security'
      );
    });

    it('should handle performance subnode', () => {
      expect(toArborPath('performance', 'core')).toBe(
        'features/core/performance'
      );
    });
  });

  describe('error handling', () => {
    it('should throw for unknown target type', () => {
      expect(() => toArborPath('unknown', 'test')).toThrow(
        'Unknown target type: unknown'
      );
    });
  });
});
