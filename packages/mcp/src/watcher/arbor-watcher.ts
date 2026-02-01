import chokidar, { type FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';

export interface ArborWatcherEvents {
  'file-changed': (filePath: string) => void;
  'file-added': (filePath: string) => void;
  'file-deleted': (filePath: string) => void;
}

export class ArborWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private arborRoot: string;

  constructor(arborRoot: string) {
    super();
    this.arborRoot = arborRoot;
  }

  async start(): Promise<void> {
    this.watcher = chokidar.watch(this.arborRoot, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher
      .on('add', (filePath: string) => this.emit('file-added', filePath))
      .on('change', (filePath: string) => this.emit('file-changed', filePath))
      .on('unlink', (filePath: string) => this.emit('file-deleted', filePath));
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
}
