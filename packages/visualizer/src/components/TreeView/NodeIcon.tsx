import {
  FolderKanban,
  Layers,
  Settings,
  Server,
  RefreshCw,
  TestTube2,
  Shield,
  Zap,
  ClipboardList,
  FileText,
  Bug,
  Circle,
  CircleDot,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

export const nodeIcons: Record<string, LucideIcon> = {
  project: FolderKanban,
  feature: Layers,
  config: Settings,
  infra: Server,
  refactor: RefreshCw,
  test: TestTube2,
  security: Shield,
  performance: Zap,
  plan: ClipboardList,
  doc: FileText,
  bug: Bug,
};

export const taskIcons: Record<string, LucideIcon> = {
  pending: Circle,
  in_progress: CircleDot,
  completed: CheckCircle2,
  blocked: XCircle,
};

interface NodeIconProps {
  type: string;
  status?: string;
  size?: number;
  className?: string;
}

export function NodeIcon({ type, status, size = 16, className }: NodeIconProps) {
  let Icon: LucideIcon;

  if (type === 'task' && status) {
    Icon = taskIcons[status] || Circle;
  } else {
    Icon = nodeIcons[type] || FileText;
  }

  return <Icon size={size} className={className} />;
}
