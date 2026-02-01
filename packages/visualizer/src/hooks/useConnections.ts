import { useEffect, useState, useCallback } from 'react';
import type { NodeConnection } from '@arbor-plan/core';

interface ConnectionsResponse {
  connections: NodeConnection[];
}

export function useConnections() {
  const [connections, setConnections] = useState<NodeConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/connections');
      if (!response.ok) {
        throw new Error('Failed to fetch connections');
      }
      const data: ConnectionsResponse = await response.json();
      setConnections(data.connections || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  return { connections, loading, error, refresh: fetchConnections };
}
