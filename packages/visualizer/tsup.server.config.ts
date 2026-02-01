import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server/index.ts'],
  format: ['esm'],
  dts: true,
  clean: false,
  sourcemap: true,
  outDir: 'dist/server',
  external: ['express', 'ws', 'chokidar'],
});
