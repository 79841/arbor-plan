import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { DragPlanItem, DragDropState } from '../types/drag-drop';

interface DragDropContextValue extends DragDropState {
  startDrag: (plan: DragPlanItem) => void;
  endDrag: () => void;
}

const DragDropContext = createContext<DragDropContextValue | null>(null);

export function DragDropProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DragDropState>({
    isDragging: false,
    draggedPlan: null,
  });

  const startDrag = useCallback((plan: DragPlanItem) => {
    setState({
      isDragging: true,
      draggedPlan: plan,
    });
  }, []);

  const endDrag = useCallback(() => {
    setState({
      isDragging: false,
      draggedPlan: null,
    });
  }, []);

  return (
    <DragDropContext.Provider value={{ ...state, startDrag, endDrag }}>
      {children}
    </DragDropContext.Provider>
  );
}

export function useDragDrop() {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within DragDropProvider');
  }
  return context;
}
