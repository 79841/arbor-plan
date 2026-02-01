import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { TreeParser } from '@arbor-plan/core';
import chokidar from 'chokidar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerConfig {
  port: number;
  arborRoot: string;
}

export function createVisualizerServer(config: ServerConfig) {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // Serve static files
  const clientDir = path.resolve(__dirname, '../client');
  app.use(express.static(clientDir));

  // API routes
  app.get('/api/tree', async (_req, res) => {
    try {
      const parser = new TreeParser(config.arborRoot);
      const tree = await parser.parse();
      res.json(tree);
    } catch (error) {
      res.status(500).json({ error: 'Failed to parse tree' });
    }
  });

  // Fallback to index.html for SPA
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'));
  });

  // WebSocket handling
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'get-tree') {
          const parser = new TreeParser(config.arborRoot);
          const tree = await parser.parse();
          ws.send(JSON.stringify({ type: 'tree-update', data: tree }));
        }
      } catch (e) {
        console.error('Failed to handle message:', e);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  // Watch for file changes
  const watcher = chokidar.watch(config.arborRoot, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on('all', async () => {
    try {
      const parser = new TreeParser(config.arborRoot);
      const tree = await parser.parse();

      const message = JSON.stringify({ type: 'tree-update', data: tree });
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    } catch (e) {
      console.error('Failed to broadcast tree update:', e);
    }
  });

  return {
    start: () => {
      server.listen(config.port, () => {
        console.log(`Arbor Visualizer running at http://localhost:${config.port}`);
      });
    },
    stop: () => {
      watcher.close();
      wss.close();
      server.close();
    },
  };
}
