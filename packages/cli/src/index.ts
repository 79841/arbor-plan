import { Command } from 'commander';
import { serveCommand } from './commands/serve.js';
import { treeCommand } from './commands/tree.js';
import { statusCommand } from './commands/status.js';
import { unlinkedCommand } from './commands/unlinked.js';

const program = new Command();

program
  .name('arbor')
  .description('Claude Code Plan 파일 시각화 도구')
  .version('1.0.0');

program.addCommand(serveCommand);
program.addCommand(treeCommand);
program.addCommand(statusCommand);
program.addCommand(unlinkedCommand);

program.parse();
