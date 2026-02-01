import { Command } from 'commander';
import { createVisualizerServer } from '@arbor-plan/visualizer/server';
import { findArborRoot } from '../utils/find-root.js';

export const serveCommand = new Command('serve')
  .description('Visualizer 웹서버 실행')
  .option('-p, --port <number>', '포트 번호', '3000')
  .action(async (options) => {
    const arborRoot = await findArborRoot();

    if (!arborRoot) {
      console.error('Error: .arbor 디렉토리를 찾을 수 없습니다.');
      console.error('arbor_init을 먼저 실행해주세요.');
      process.exit(1);
    }

    const port = parseInt(options.port, 10);

    const server = createVisualizerServer({
      port,
      arborRoot,
    });

    server.start();
  });
