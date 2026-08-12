import type { FileRow, StorageInfo } from "./api";

export type AutonomyTier = "safe" | "review" | "blocked";

export type BalDoXIntent =
  | "SEARCH_FILES"
  | "SCAN"
  | "CLEANUP"
  | "ORGANIZE"
  | "DIAGNOSE"
  | "MANAGE_FILES"
  | "LIST_APPS"
  | "DUPLICATES"
  | "QUARANTINE"
  | "NAVIGATE"
  | "GENERAL_HELP"
  | "UNKNOWN";

export type BalDoXMessageType =
  | "text"
  | "file_list"
  | "disk_stats"
  | "action_plan"
  | "execution_result";

export interface BalDoXPlanStep {
  id: string;
  label: string;
  description: string;
  tier: AutonomyTier;
  command?: string;
  params?: Record<string, unknown>;
}

export interface BalDoXPlan {
  id: string;
  intent: BalDoXIntent;
  title: string;
  summary: string;
  steps: BalDoXPlanStep[];
  tier: AutonomyTier;
  estimatedBytes?: number;
}

export interface BalDoXMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  messageType?: BalDoXMessageType;
  plan?: BalDoXPlan;
  typing?: boolean;
  files?: FileRow[];
  diskStats?: StorageInfo[];
  navigateTo?: string;
}

export interface ParsedEntities {
  paths: string[];
  sizes: { value: number; unit: string; bytes: number }[];
  extensions: string[];
  numbers: number[];
  days: number | null;
  driveLetters: string[];
  freeSpaceTargetGb: number | null;
  confirmAction: boolean;
  navigateTarget: string | null;
}

export interface IntentResult {
  intent: BalDoXIntent;
  confidence: number;
  entities: ParsedEntities;
}

export interface BalDoXContext {
  lastIntent: BalDoXIntent | null;
  lastTopic: string | null;
  lastScanId: number | null;
  pendingPlanId: string | null;
  sessionConfirmedPlanId: string | null;
}

export interface BalDoXKnowledge {
  dashboard: {
    storage: StorageInfo;
    stats: { id: string; label: string; value: string; count: number; bytes: number }[];
    lastScanId: number | null;
    lastScanStatus: string | null;
    appCount: number;
    potentialCleanupBytes: number;
  } | null;
  drives: { letter: string; path: string }[];
  quarantineCount: number;
  quarantineBytes: number;
}

export interface AutomationRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  tier: AutonomyTier;
  intervalHours?: number;
}

export interface BalDoXNotification {
  id: string;
  type: "info" | "warning" | "success";
  title: string;
  message: string;
  actionLabel?: string;
  actionIntent?: string;
  createdAt: string;
  read: boolean;
}

export interface ChatHistoryRow {
  id: number;
  role: string;
  content: string;
  message_type: string | null;
  metadata: string | null;
  created_at: string;
}
