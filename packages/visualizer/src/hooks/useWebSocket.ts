import { useEffect, useState, useCallback } from 'react';
import type { TreeData } from '@arbor-plan/core';

interface WebSocketMessage {
  type: 'tree-update' | 'plan-linked' | 'plan-unlinked' | 'node-changed';
  data: TreeData;
}

export function useWebSocket(url: string) {
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const websocket = new WebSocket(url);
    setWs(websocket);

    websocket.onopen = () => {
      setConnected(true);
      setError(null);
      websocket.send(JSON.stringify({ type: 'get-tree' }));
    };

    websocket.onclose = () => {
      setConnected(false);
    };

    websocket.onerror = () => {
      setError(new Error('WebSocket connection failed'));
    };

    websocket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'tree-update':
            setTreeData(message.data);
            break;
          case 'plan-linked':
          case 'plan-unlinked':
          case 'node-changed':
            websocket.send(JSON.stringify({ type: 'get-tree' }));
            break;
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    return () => {
      websocket.close();
    };
  }, [url]);

  const refresh = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'get-tree' }));
    }
  }, [ws]);

  return { treeData, connected, error, refresh };
}
