import { Command } from 'commander';
import chalk from 'chalk';
import { TreeParser, type TaskStatus } from '@arbor-plan/core';
import { findArborRoot } from '../utils/find-root.js';

export const statusCommand = new Command('status')
  .description('Task 상태 요약')
  .action(async () => {
    const arborRoot = await findArborRoot();

    if (!arborRoot) {
      console.error('Error: .arbor 디렉토리를 찾을 수 없습니다.');
      process.exit(1);
    }

    const parser = new TreeParser(arborRoot);
    const tree = await parser.parse();
    const tasks = parser.getAllTasks(tree);

    const counts: Record<TaskStatus, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
    };

    tasks.forEach((task) => {
      const status = task.status as TaskStatus;
      if (status in counts) {
        counts[status]++;
      }
    });

    console.log('\n📊 Task Status Summary\n');
    console.log(`  ${chalk.gray('○')} Pending:     ${counts.pending}`);
    console.log(`  ${chalk.blue('◉')} In Progress: ${counts.in_progress}`);
    console.log(`  ${chalk.green('✓')} Completed:   ${counts.completed}`);
    console.log(`  ${chalk.red('✕')} Blocked:     ${counts.blocked}`);
    console.log(`\n  Total: ${tasks.length}\n`);
  });
