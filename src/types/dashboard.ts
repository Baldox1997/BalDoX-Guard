export interface StorageInfo {
  usedBytes: number;
  totalBytes: number;
  usedLabel: string;
  totalLabel: string;
  usagePercent: number;
}

export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  description: string;
  icon: "cleanup" | "large" | "duplicates" | "empty-folders" | "temp" | "downloads" | "old" | "apps";
  accent: "blue" | "amber" | "green" | "purple" | "rose" | "cyan" | "orange" | "indigo";
}

export interface DashboardSummary {
  storage: StorageInfo;
  stats: DashboardStat[];
  potentialCleanupBytes: number;
  potentialCleanupLabel: string;
  lastScanId?: number | null;
}
