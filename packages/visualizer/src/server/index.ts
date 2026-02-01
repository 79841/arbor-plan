import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import {
  TreeParser,
  generatePlanId,
  getDateTimeString,
  readYamlFile,
  writeYamlFile,
  type Mappings,
  type Connections,
} from '@arbor-plan/core';
import { nanoid } from 'nanoid';
import { linkPlan } from '@arbor-plan/mcp';
import chokidar from 'chokidar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper functions for unlinked plan management
async function addUnlinkedPlan(arborRoot: string, filePath: string): Promise<void> {
  const mappingsPath = path.join(arborRoot, 'mappings.yaml');
  if (!existsSync(mappingsPath)) return;

  const mappings = await readYamlFile<Mappings>(mappingsPath);

  // 이미 linked 또는 unlinked에 있는지 확인
  const isLinked = mappings.linked.some((p) => p.source === filePath);
  const isUnlinked = mappings.unlinked.some((p) => p.source === filePath);

  if (!isLinked && !isUnlinked) {
    const content = await readFile(filePath, 'utf-8');
    const preview = content.slice(0, 100).replace(/\n/g, ' ');

    mappings.unlinked.push({
      id: generatePlanId(),
      source: filePath,
      detected_at: getDateTimeString(),
      preview,
    });

    await writeYamlFile(mappingsPath, mappings);
  }
}

async function removeUnlinkedPlan(arborRoot: string, filePath: string): Promise<void> {
  const mappingsPath = path.join(arborRoot, 'mappings.yaml');
  if (!existsSync(mappingsPath)) return;

  const mappings = await readYamlFile<Mappings>(mappingsPath);
  mappings.unlinked = mappings.unlinked.filter((p) => p.source !== filePath);
  await writeYamlFile(mappingsPath, mappings);
}

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
  app.use(express.json());

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

  // Link plan API
  app.post('/api/link-plan', async (req, res) => {
    try {
      const { planId, targetType, targetPath, name } = req.body;

      if (!planId || !targetType || !targetPath) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing required fields' },
        });
      }

      const result = await linkPlan(config.arborRoot, {
        planId,
        targetType,
        targetPath,
        name,
      });

      res.json(result);
    } catch (error) {
      console.error('Failed to link plan:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to link plan' },
      });
    }
  });

  // Connect nodes API (for edit mode containment relationships)
  app.post('/api/connect-nodes', async (req, res) => {
    try {
      const { sourceId, sourcePath, targetId, targetPath } = req.body;

      if (!sourceId || !sourcePath || !targetId || !targetPath) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing required fields' },
        });
      }

      const connectionsPath = path.join(config.arborRoot, 'connections.yaml');

      // Read or create connections file
      let connections: Connections;
      if (existsSync(connectionsPath)) {
        connections = await readYamlFile<Connections>(connectionsPath);
      } else {
        connections = { version: 1, connections: [] };
      }

      // Check if connection already exists
      const exists = connections.connections.some(
        (c) => c.source_id === sourceId && c.target_id === targetId
      );

      if (exists) {
        return res.json({
          success: true,
          message: 'Connection already exists',
        });
      }

      // Add new connection
      connections.connections.push({
        id: nanoid(),
        source_id: sourceId,
        source_path: sourcePath,
        target_id: targetId,
        target_path: targetPath,
        created_at: getDateTimeString(),
      });

      await writeYamlFile(connectionsPath, connections);

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to connect nodes:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to connect nodes' },
      });
    }
  });

  // Disconnect nodes API
  app.delete('/api/connect-nodes', async (req, res) => {
    try {
      const { connectionId } = req.body;

      if (!connectionId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing connectionId' },
        });
      }

      const connectionsPath = path.join(config.arborRoot, 'connections.yaml');

      if (!existsSync(connectionsPath)) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'No connections file found' },
        });
      }

      const connections = await readYamlFile<Connections>(connectionsPath);
      connections.connections = connections.connections.filter((c) => c.id !== connectionId);
      await writeYamlFile(connectionsPath, connections);

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to disconnect nodes:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to disconnect nodes' },
      });
    }
  });

  // Get connections API
  app.get('/api/connections', async (_req, res) => {
    try {
      const connectionsPath = path.join(config.arborRoot, 'connections.yaml');

      if (!existsSync(connectionsPath)) {
        return res.json({ connections: [] });
      }

      const connections = await readYamlFile<Connections>(connectionsPath);
      res.json(connections);
    } catch (error) {
      console.error('Failed to get connections:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get connections' },
      });
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

  // Broadcast helper
  const broadcastTreeUpdate = async () => {
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
  };

  // Watch for file changes in .arbor directory
  const watcher = chokidar.watch(config.arborRoot, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on('all', broadcastTreeUpdate);

  // Watch for Claude plan files in ~/.claude/plans/
  const claudePlansDir = path.join(os.homedir(), '.claude', 'plans');
  const claudePlansWatcher = chokidar.watch(claudePlansDir, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: false, // 초기 파일도 스캔
  });

  claudePlansWatcher.on('add', async (filePath) => {
    if (!filePath.endsWith('.md')) return;
    console.log(`[Claude Plans] Detected: ${filePath}`);
    await addUnlinkedPlan(config.arborRoot, filePath);
    await broadcastTreeUpdate();
  });

  claudePlansWatcher.on('unlink', async (filePath) => {
    if (!filePath.endsWith('.md')) return;
    console.log(`[Claude Plans] Removed: ${filePath}`);
    await removeUnlinkedPlan(config.arborRoot, filePath);
    await broadcastTreeUpdate();
  });

  return {
    start: () => {
      server.listen(config.port, () => {
        console.log(`Arbor Visualizer running at http://localhost:${config.port}`);
        console.log(`Watching Claude plans at: ${claudePlansDir}`);
      });
    },
    stop: () => {
      watcher.close();
      claudePlansWatcher.close();
      wss.close();
      server.close();
    },
  };
}
