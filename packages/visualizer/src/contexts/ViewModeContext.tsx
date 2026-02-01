import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ViewMode, PendingConnection } from '../types/view-mode';

interface ViewModeContextValue {
  /** Current view mode */
  mode: ViewMode;
  /** Toggle between diary and edit modes */
  toggleMode: () => void;
  /** Set specific mode */
  setMode: (mode: ViewMode) => void;
  /** Connection being created (edit mode only) */
  pendingConnection: PendingConnection | null;
  /** Start creating a connection from a node */
  startConnection: (connection: PendingConnection) => void;
  /** Cancel the pending connection */
  cancelConnection: () => void;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

interface ViewModeProviderProps {
  children: ReactNode;
  defaultMode?: ViewMode;
}

export function ViewModeProvider({ children, defaultMode = 'diary' }: ViewModeProviderProps) {
  const [mode, setModeState] = useState<ViewMode>(defaultMode);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const newMode = prev === 'diary' ? 'edit' : 'diary';
      // Clear pending connection when switching modes
      if (newMode === 'diary') {
        setPendingConnection(null);
      }
      return newMode;
    });
  }, []);

  const setMode = useCallback((newMode: ViewMode) => {
    setModeState(newMode);
    if (newMode === 'diary') {
      setPendingConnection(null);
    }
  }, []);

  const startConnection = useCallback((connection: PendingConnection) => {
    setPendingConnection(connection);
  }, []);

  const cancelConnection = useCallback(() => {
    setPendingConnection(null);
  }, []);

  return (
    <ViewModeContext.Provider
      value={{
        mode,
        toggleMode,
        setMode,
        pendingConnection,
        startConnection,
        cancelConnection,
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode(): ViewModeContextValue {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}
