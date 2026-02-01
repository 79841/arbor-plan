import chokidar, { type FSWatcher } from 'chokidar';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';

export interface ClaudePlansWatcherEvents {
  'plan-detected': (filePath: string) => void;
  'plan-changed': (filePath: string) => void;
  'plan-deleted': (filePath: string) => void;
}

export class ClaudePlansWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private claudePlansPath: string;

  constructor(customPath?: string) {
    super();
    this.claudePlansPath = customPath || path.join(os.homedir(), '.claude', 'plans');
  }

  async start(): Promise<void> {
    await fs.ensureDir(this.claudePlansPath);

    this.watcher = chokidar.watch(this.claudePlansPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', (filePath: string) => {
        if (filePath.endsWith('.md')) {
          this.emit('plan-detected', filePath);
        }
      })
      .on('change', (filePath: string) => {
        if (filePath.endsWith('.md')) {
          this.emit('plan-changed', filePath);
        }
      })
      .on('unlink', (filePath: string) => {
        if (filePath.endsWith('.md')) {
          this.emit('plan-deleted', filePath);
        }
      });
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  getWatchPath(): string {
    return this.claudePlansPath;
  }

  /**
   * Scans the claude plans directory and returns all existing .md files.
   * This does NOT emit any events - it's for initial scan purposes only.
   */
  async scanExisting(): Promise<string[]> {
    await fs.ensureDir(this.claudePlansPath);

    const files = await fs.readdir(this.claudePlansPath);
    return files
      .filter((f) => f.endsWith('.md') && !f.startsWith('.'))
      .map((f) => path.join(this.claudePlansPath, f));
  }
}
