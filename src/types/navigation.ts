import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
  Clock,
  Copy,
  FileSearch,
  FolderOpen,
  FolderTree,
  HardDrive,
  Home,
  LayoutDashboard,
  Package,
  Settings,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ASSISTANT_NAME } from "../constants/assistant";

export type NavItemId =
  | "control"
  | "dashboard"
  | "diagnostics"
  | "scanner"
  | "files"
  | "cleanup"
  | "duplicates"
  | "large-files"
  | "apps"
  | "assistant"
  | "quarantine"
  | "history"
  | "settings"
  | "organize"
  | "old-files";

export interface NavItem {
  id: NavItemId;
  label: string;
  path: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "control", label: "Painel de Controle", path: "/control", icon: LayoutDashboard },
  { id: "dashboard", label: "Dashboard", path: "/", icon: Home },
  { id: "diagnostics", label: "Diagnóstico", path: "/diagnostics", icon: Activity },
  { id: "scanner", label: "Scanner", path: "/scanner", icon: FileSearch },
  { id: "files", label: "Arquivos", path: "/files", icon: FolderOpen },
  { id: "cleanup", label: "Limpeza", path: "/cleanup", icon: Trash2 },
  { id: "duplicates", label: "Duplicados", path: "/duplicates", icon: Copy },
  { id: "large-files", label: "Arquivos grandes", path: "/large-files", icon: HardDrive },
  { id: "old-files", label: "Arquivos antigos", path: "/old-files", icon: Clock },
  { id: "organize", label: "Organização", path: "/organize", icon: FolderTree },
  { id: "apps", label: "Aplicativos", path: "/apps", icon: Package },
  { id: "assistant", label: ASSISTANT_NAME, path: "/assistant", icon: Bot },
  { id: "quarantine", label: "Quarentena", path: "/quarantine", icon: Shield },
  { id: "history", label: "Histórico", path: "/history", icon: Clock },
  { id: "settings", label: "Configurações", path: "/settings", icon: Settings },
];

export const DASHBOARD_QUICK_ACTIONS = [
  { id: "analyze", label: "Analisar computador", icon: Sparkles },
] as const;
