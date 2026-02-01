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
  type TargetType,
} from '@arbor-plan/core';
import { ClaudePlansWatcher } from '../watcher/claude-plans-watcher.js';
import { extractAndCreateTasksFromPlanContent } from '../tools/create-task.js';

export interface AutoLinkerConfig {
  arborRoot: string;
  claudePlansPath?: string;
}

export type AutoLinkerEvent = 'plan-linked' | 'plan-unlinked' | 'scan-complete' | 'source-updated' | 'tasks-extracted' | 'error';

export interface AutoLinkerEventData {
  source: string;
  dest?: string;
  plan?: LinkedPlan;
  error?: Error;
  newUnlinked?: number;
  sourceUpdated?: number;
  total?: number;
  tasksCount?: number;
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

    // Perform initial scan before starting the watcher
    await this.initialScan();

    await this.watcher.start();
  }

  /**
   * Performs initial scan of existing plan files.
   * - Scans all .md files in ~/.claude/plans/
   * - Checks if each file is already tracked in mappings.yaml
   * - Adds untracked files to unlinked array
   * - Updates source_exists flag for all linked plans
   */
  async initialScan(): Promise<{
    newUnlinked: number;
    sourceUpdated: number;
    total: number;
  }> {
    const result = { newUnlinked: 0, sourceUpdated: 0, total: 0 };

    try {
      // 1. Get all existing plan files
      const existingFiles = await this.watcher.scanExisting();
      result.total = existingFiles.length;

      // 2. Load current mappings
      const mappingsPath = path.join(this.config.arborRoot, 'mappings.yaml');
      if (!(await fs.pathExists(mappingsPath))) {
        return result; // Arbor not initialized
      }

      const mappings = await this.loadMappings(mappingsPath);

      // 3. Build a Set of already tracked source paths
      const trackedSources = new Set<string>();

      // Add linked sources
      for (const linked of mappings.linked) {
        trackedSources.add(linked.source);
      }

      // Add unlinked sources
      for (const unlinked of mappings.unlinked) {
        trackedSources.add(unlinked.source);
      }

      // 4. Find untracked files and add to unlinked
      for (const filePath of existingFiles) {
        if (!trackedSources.has(filePath)) {
          await this.addToUnlinked(filePath);
          result.newUnlinked++;
        }
      }

      // 5. Update source_exists flag for all linked plans
      let hasUpdates = false;
      for (const linked of mappings.linked) {
        // Skip plans created directly via arbor_create_plan
        if (linked.source === 'arbor_created') {
          continue;
        }

        const sourceExists = await fs.pathExists(linked.source);
        if (linked.source_exists !== sourceExists) {
          linked.source_exists = sourceExists;
          hasUpdates = true;
          result.sourceUpdated++;

          this.onUpdate?.('source-updated', {
            source: linked.source,
            plan: linked,
          });
        }
      }

      // 6. Save updated mappings if needed
      if (hasUpdates) {
        await writeYamlFile(mappingsPath, mappings);
      }

      this.onUpdate?.('scan-complete', {
        source: this.watcher.getWatchPath(),
        newUnlinked: result.newUnlinked,
        sourceUpdated: result.sourceUpdated,
        total: result.total,
      });

      return result;
    } catch (error) {
      this.onUpdate?.('error', {
        source: this.watcher.getWatchPath(),
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
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

    // Task 자동 추출
    try {
      const planContent = await fs.readFile(destPath, 'utf-8');
      const tasksResult = await extractAndCreateTasksFromPlanContent(
        arborRoot,
        context.targetType as TargetType,
        context.targetPath,
        linkedPlan.id,
        planContent
      );

      if (tasksResult.created > 0) {
        this.onUpdate?.('tasks-extracted', {
          source: sourcePath,
          plan: linkedPlan,
          tasksCount: tasksResult.created,
        });
      }
    } catch (error) {
      // Task 추출 실패는 에러로 처리하지 않고 로그만 남김
      this.onUpdate?.('error', {
        source: sourcePath,
        error: new Error(`Task extraction failed: ${error instanceof Error ? error.message : String(error)}`),
      });
    }
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
