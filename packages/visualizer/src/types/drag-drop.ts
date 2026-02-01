export interface DragPlanItem {
  type: 'unlinked-plan';
  planId: string;
  source: string;
  preview: string;
}

export interface DragDropState {
  isDragging: boolean;
  draggedPlan: DragPlanItem | null;
}

export interface LinkPlanRequest {
  planId: string;
  targetType: string;
  targetPath: string;
  name?: string;
}

export interface LinkPlanResponse {
  success: boolean;
  linkedPlan?: {
    id: string;
    source: string;
    local: string;
    name: string;
  };
  error?: {
    code: string;
    message: string;
  };
}
