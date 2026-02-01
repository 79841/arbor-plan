import fs from 'fs-extra';
import path from 'path';
import {
  generatePlanId,
  getDateTimeString,
  isExpired,
  slugify,
  readYamlFile,
  writeYamlFile,
  type PendingContext,
  type PendingItem,
  type Mappings,
  type LinkedPlan,
} from '@arbor-plan/core';
import { ClaudePlansWatcher } from '../watcher/claude-plans-watcher.js';

export interface AutoLinkerConfig {
  arborRoot: string;
  claudePlansPath?: string;
}

export type AutoLinkerEvent = 'plan-linked' | 'plan-unlinked' | 'error';

export interface AutoLinkerEventData {
  source: string;
  dest?: string;
  plan?: LinkedPlan;
  error?: Error;
}

export class AutoLinker {
  private watcher: ClaudePlansWatcher;
  private config: AutoLinkerConfig;
  private onUpdate?: (event: AutoLinkerEvent, data: AutoLinkerEventData) => void;

  constructor(config: AutoLinkerConfig) {
    this.config = config;
    this.watcher = new ClaudePlansWatcher(config.claudePlansPath);
  }

  async start(
    onUpdate?: (event: AutoLinkerEvent, data: AutoLinkerEventData) => void
  ): Promise<void> {
    this.onUpdate = onUpdate;

    this.watcher.on('plan-detected', (filePath) => this.handleNewPlan(filePath));

    await this.watcher.start();
  }

  async stop(): Promise<void> {
    await this.watcher.stop();
  }

  private async handleNewPlan(sourcePath: string): Promise<void> {
    try {
      const pending = await this.getLatestPendingContext();

      if (pending && !isExpired(pending.expires_at)) {
        await this.linkPlan(sourcePath, {
          targetType: pending.target_type,
          targetPath: pending.target_path,
          name: pending.name,
        });
        await this.removePendingContext(pending.id);
      } else {
        await this.addToUnlinked(sourcePath);
      }
    } catch (error) {
      this.onUpdate?.('error', {
        source: sourcePath,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  private async linkPlan(
    sourcePath: string,
    context: { targetType: string; targetPath: string; name?: string }
  ): Promise<void> {
    const arborRoot = this.config.arborRoot;

    // Build destination path
    const destDir = this.buildDestDir(context.targetType, context.targetPath);
    await fs.ensureDir(destDir);

    // Copy file (preserve original format)
    const fileName = this.generateFileName(
      context.name || path.basename(sourcePath, '.md')
    );
    const destPath = path.join(destDir, fileName);
    await fs.copy(sourcePath, destPath);

    // Update mappings.yaml
    const mappingsPath = path.join(arborRoot, 'mappings.yaml');
    const mappings = await this.loadMappings(mappingsPath);

    const linkedPlan: LinkedPlan = {
      id: generatePlanId(),
      source: sourcePath,
      local: path.relative(arborRoot, destPath),
      target_type: context.targetType as LinkedPlan['target_type'],
      target_path: context.targetPath,
      name: context.name || path.basename(sourcePath, '.md'),
      linked_at: getDateTimeString(),
      source_exists: true,
    };

    mappings.linked.push(linkedPlan);
    await writeYamlFile(mappingsPath, mappings);

    this.onUpdate?.('plan-linked', {
      source: sourcePath,
      dest: destPath,
      plan: linkedPlan,
    });
  }

  private buildDestDir(targetType: string, targetPath: string): string {
    const arborRoot = this.config.arborRoot;

    switch (targetType) {
      case 'feature':
        return path.join(arborRoot, 'features', targetPath, 'plans');
      case 'config':
        return path.join(arborRoot, 'config', targetPath, 'plans');
      case 'infra':
        return path.join(arborRoot, 'infra', targetPath, 'plans');
      case 'refactor':
      case 'test':
      case 'security':
      case 'performance':
        return path.join(arborRoot, 'features', targetPath, targetType, 'plans');
      default:
        throw new Error(`Unknown target type: ${targetType}`);
    }
  }

  private async addToUnlinked(sourcePath: string): Promise<void> {
    const arborRoot = this.config.arborRoot;
    const mappingsPath = path.join(arborRoot, 'mappings.yaml');
    const mappings = await this.loadMappings(mappingsPath);

    // Read preview
    const content = await fs.readFile(sourcePath, 'utf-8');
    const preview = content.slice(0, 100).replace(/\n/g, ' ');

    mappings.unlinked.push({
      id: generatePlanId(),
      source: sourcePath,
      detected_at: getDateTimeString(),
      preview,
    });

    await writeYamlFile(mappingsPath, mappings);

    this.onUpdate?.('plan-unlinked', { source: sourcePath });
  }

  private async getLatestPendingContext(): Promise<PendingItem | null> {
    const pendingPath = path.join(this.config.arborRoot, 'pending_context.yaml');

    if (!(await fs.pathExists(pendingPath))) {
      return null;
    }

    const data = await readYamlFile<PendingContext>(pendingPath);

    if (!data.pending || data.pending.length === 0) {
      return null;
    }

    // Return most recent
    return data.pending[data.pending.length - 1] || null;
  }

  private async removePendingContext(id: string): Promise<void> {
    const pendingPath = path.join(this.config.arborRoot, 'pending_context.yaml');
    const data = await readYamlFile<PendingContext>(pendingPath);

    data.pending = data.pending.filter((p) => p.id !== id);
    await writeYamlFile(pendingPath, data);
  }

  private async loadMappings(mappingsPath: string): Promise<Mappings> {
    if (!(await fs.pathExists(mappingsPath))) {
      return { version: 1, project_id: '', linked: [], unlinked: [] };
    }
    return readYamlFile<Mappings>(mappingsPath);
  }

  private generateFileName(name: string): string {
    return `${slugify(name)}.md`;
  }
}
