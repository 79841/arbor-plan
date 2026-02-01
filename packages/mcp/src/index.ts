export * from './tools/index.js';
export * from './watcher/index.js';
export * from './linker/index.js';
export * from './server.js';

import { runServer } from './server.js';

// Run if executed directly
runServer().catch(console.error);
