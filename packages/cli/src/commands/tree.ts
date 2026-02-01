import { Command } from 'commander';
import chalk from 'chalk';
import { TreeParser, type TreeNode } from '@arbor-plan/core';
import { findArborRoot } from '../utils/find-root.js';

export const treeCommand = new Command('tree')
  .description('트리 구조 출력')
  .option('-s, --status <status>', '상태별 필터링')
  .action(async (options) => {
    const arborRoot = await findArborRoot();

    if (!arborRoot) {
      console.error('Error: .arbor 디렉토리를 찾을 수 없습니다.');
      process.exit(1);
    }

    const parser = new TreeParser(arborRoot);
    const tree = await parser.parse();

    console.log();
    printTree(tree.root, '', true, options.status);
    console.log();
  });

function printTree(
  node: TreeNode,
  prefix: string,
  isLast: boolean,
  statusFilter?: string
) {
  const connector = isLast ? '└── ' : '├── ';
  const icon = getIcon(node.type);
  const status = (node as any).status;

  let name = node.name;
  if (status) {
    name += ` ${getStatusBadge(status)}`;
  }

  console.log(`${prefix}${connector}${icon} ${name}`);

  const childPrefix = prefix + (isLast ? '    ' : '│   ');

  // Print plans
  if (node.plans && node.plans.length > 0) {
    node.plans.forEach((plan, i) => {
      const isLastPlan = i === node.plans!.length - 1 && !node.tasks?.length && !node.bugs?.length && !node.children?.length;
      console.log(`${childPrefix}${isLastPlan ? '└── ' : '├── '}📋 ${plan.name}`);
    });
  }

  // Print tasks
  if (node.tasks && node.tasks.length > 0) {
    const filteredTasks = statusFilter
      ? node.tasks.filter((t) => t.status === statusFilter)
      : node.tasks;

    filteredTasks.forEach((task, i) => {
      const isLastTask = i === filteredTasks.length - 1 && !node.bugs?.length && !node.children?.length;
      const taskIcon = getTaskIcon(task.status);
      console.log(`${childPrefix}${isLastTask ? '└── ' : '├── '}${taskIcon} ${task.name} ${getStatusBadge(task.status)}`);
    });
  }

  // Print bugs
  if (node.bugs && node.bugs.length > 0) {
    node.bugs.forEach((bug, i) => {
      const isLastBug = i === node.bugs!.length - 1 && !node.children?.length;
      console.log(`${childPrefix}${isLastBug ? '└── ' : '├── '}🐛 ${bug.name} ${getSeverityBadge(bug.severity)}`);
    });
  }

  // Print children
  if (node.children && node.children.length > 0) {
    node.children.forEach((child, i) => {
      printTree(child, childPrefix, i === node.children!.length - 1, statusFilter);
    });
  }
}

function getIcon(type: string): string {
  const icons: Record<string, string> = {
    project: '📁',
    feature: '📦',
    config: '⚙️',
    infra: '🖥️',
    refactor: '🔄',
    test: '🧪',
    security: '🛡️',
    performance: '⚡',
    plan: '📋',
    doc: '📄',
    bug: '🐛',
    task: '✓',
  };
  return icons[type] || '📄';
}

function getTaskIcon(status: string): string {
  const icons: Record<string, string> = {
    pending: '○',
    in_progress: '◉',
    completed: '✓',
    blocked: '✕',
  };
  return icons[status] || '○';
}

function getStatusBadge(status: string): string {
  const colors: Record<string, (s: string) => string> = {
    pending: chalk.gray,
    in_progress: chalk.blue,
    completed: chalk.green,
    blocked: chalk.red,
    planned: chalk.gray,
    on_hold: chalk.yellow,
  };
  const colorFn = colors[status] || chalk.gray;
  return colorFn(`[${status.replace('_', ' ')}]`);
}

function getSeverityBadge(severity: string): string {
  const colors: Record<string, (s: string) => string> = {
    low: chalk.gray,
    medium: chalk.yellow,
    high: chalk.hex('#f97316'),
    critical: chalk.red,
  };
  const colorFn = colors[severity] || chalk.gray;
  return colorFn(`[${severity}]`);
}
