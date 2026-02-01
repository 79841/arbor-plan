import { Command } from 'commander';
import chalk from 'chalk';
import { readYamlFile, type Mappings } from '@arbor-plan/core';
import path from 'path';
import { findArborRoot } from '../utils/find-root.js';

export const unlinkedCommand = new Command('unlinked')
  .description('미연결 Plan 목록')
  .action(async () => {
    const arborRoot = await findArborRoot();

    if (!arborRoot) {
      console.error('Error: .arbor 디렉토리를 찾을 수 없습니다.');
      process.exit(1);
    }

    const mappingsPath = path.join(arborRoot, 'mappings.yaml');
    const mappings = await readYamlFile<Mappings>(mappingsPath);

    if (mappings.unlinked.length === 0) {
      console.log('\n✓ 미연결 Plan이 없습니다.\n');
      return;
    }

    console.log(`\n📋 Unlinked Plans (${mappings.unlinked.length})\n`);

    mappings.unlinked.forEach((plan, index) => {
      console.log(`  ${chalk.yellow(`${index + 1}.`)} ${chalk.bold(plan.id)}`);
      console.log(`     Source: ${chalk.gray(plan.source)}`);
      console.log(`     Preview: ${chalk.dim(plan.preview.slice(0, 60))}...`);
      console.log(`     Detected: ${chalk.dim(plan.detected_at)}`);
      console.log();
    });

    console.log(chalk.dim('  Use arbor_link_plan to connect these plans to features.\n'));
  });
