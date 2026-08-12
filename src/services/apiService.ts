import { invoke } from "@tauri-apps/api/core";
import type {
  ActionItem,
  ActionPreview,
  ActionResult,
  ActionRow,
  AppSettings,
  CleanupCandidate,
  ControlPanelData,
  DashboardData,
  DirEntry,
  DriveInfo,
  DriveStats,
  DuplicateGroup,
  FileMetadata,
  FileRow,
  FolderAnalysis,
  InstalledApp,
  LargestFolder,
  OrganizePlan,
  QuarantineRow,
  ScanHistoryRow,
  ScanProgress,
  SpecialFolder,
  StorageCategory,
  SystemInfo,
} from "../types/api";

export const api = {
  getDrives: () => invoke<DriveInfo[]>("get_drives"),
  getSpecialFolders: () => invoke<SpecialFolder[]>("get_special_folders"),
  startScan: (paths: string[]) => invoke<number>("start_scan", { paths }),
  cancelScan: () => invoke<void>("cancel_scan"),
  getScanProgress: () => invoke<ScanProgress>("get_scan_progress"),
  getLatestScan: () => invoke<ScanHistoryRow | null>("get_latest_scan"),
  findDuplicates: (scanId: number, minSize?: number) =>
    invoke<DuplicateGroup[]>("find_duplicates", { scanId, minSize }),

  listDir: (path: string) => invoke<DirEntry[]>("list_dir", { path }),
  searchFiles: (params: {
    scanId: number;
    namePattern?: string;
    extension?: string;
    minSize?: number;
    maxSize?: number;
    limit?: number;
  }) => invoke<FileRow[]>("search_files", params),
  getLargeFiles: (scanId: number, minSize?: number, limit?: number) =>
    invoke<FileRow[]>("get_large_files", { scanId, minSize, limit }),
  getOldFiles: (scanId: number, days: number, limit?: number) =>
    invoke<FileRow[]>("get_old_files", { scanId, days, limit }),

  previewAction: (items: ActionItem[]) => invoke<ActionPreview>("preview_action", { items }),
  executeAction: (items: ActionItem[], source?: string) =>
    invoke<ActionResult>("execute_action", { items, source }),
  quarantineFile: (path: string, reason?: string) =>
    invoke<string>("quarantine_file", { path, reason }),
  restoreQuarantine: (id: number) => invoke<string>("restore_quarantine", { id }),
  deleteQuarantinePermanent: (id: number) => invoke<void>("delete_quarantine_permanent", { id }),
  listQuarantine: () => invoke<QuarantineRow[]>("list_quarantine"),

  analyzeCleanup: () => invoke<CleanupCandidate[]>("analyze_cleanup_candidates"),
  cleanSelected: (paths: string[], useQuarantine: boolean, source?: string) =>
    invoke<ActionResult>("clean_selected", { paths, useQuarantine, source }),
  autoCleanTempSafe: () => invoke<string[]>("auto_clean_temp_safe"),

  scanApps: () => invoke<InstalledApp[]>("scan_apps"),
  listApps: () => invoke<InstalledApp[]>("list_apps"),
  uninstallApp: (app: InstalledApp) => invoke<void>("uninstall_app", { app }),
  getAppLeftovers: (app: InstalledApp) => invoke<string[]>("get_app_leftovers", { app }),

  analyzeOrganization: (path?: string) => invoke<OrganizePlan>("analyze_organization", { path }),
  executeOrganization: (plan: OrganizePlan, source?: string) =>
    invoke<ActionResult>("execute_organization", { plan, source }),
  getDownloadsPath: () => invoke<string | null>("get_downloads_path"),

  getDashboardData: () => invoke<DashboardData>("get_dashboard_data"),
  checkDiskSpaceAlert: (thresholdGb: number) =>
    invoke<string | null>("check_disk_space_alert", { thresholdGb }),

  getScanHistory: (limit?: number) => invoke<ScanHistoryRow[]>("get_scan_history", { limit }),
  getActionHistory: (limit?: number) => invoke<ActionRow[]>("get_action_history", { limit }),
  logBaldoxAction: (actionType: string, details: string, status: string) =>
    invoke<number>("log_baldox_action", { actionType, details, status }),

  getSettings: () => invoke<AppSettings>("get_settings"),
  saveSettings: (settings: AppSettings) => invoke<void>("save_settings", { settings }),
  getBaldoxMemory: () => invoke<Record<string, string>>("get_baldox_memory"),
  setBaldoxMemory: (key: string, value: string) =>
    invoke<void>("set_baldox_memory", { key, value }),

  saveChatMessage: (params: {
    role: string;
    content: string;
    messageType?: string;
    metadata?: string;
  }) =>
    invoke<number>("save_chat_message", {
      role: params.role,
      content: params.content,
      messageType: params.messageType,
      metadata: params.metadata,
    }),
  getChatHistory: (limit?: number) =>
    invoke<import("../types/baldox").ChatHistoryRow[]>("get_chat_history", { limit }),
  clearChatHistory: () => invoke<void>("clear_chat_history"),
  logConversation: (userMessage: string, assistantMessage: string, intent?: string) =>
    invoke<void>("log_conversation", { userMessage, assistantMessage, intent }),

  getSystemInfo: () => invoke<SystemInfo>("get_system_info"),
  getAllDrivesStats: () => invoke<DriveStats[]>("get_all_drives_stats"),
  getDrivesOverview: () => invoke<DriveStats[]>("get_drives_overview"),
  getStorageBreakdown: (scanId?: number) =>
    invoke<StorageCategory[]>("get_storage_breakdown", { scanId: scanId ?? null }),
  getLargestFolders: (scanId?: number, limit?: number) =>
    invoke<LargestFolder[]>("get_largest_folders", { scanId: scanId ?? null, limit }),
  getControlPanelData: () => invoke<ControlPanelData>("get_control_panel_data"),
  analyzeFolderSize: (path: string, depth?: number) =>
    invoke<FolderAnalysis>("analyze_folder_size", { path, depth }),

  getFileMetadata: (path: string) => invoke<FileMetadata>("get_file_metadata", { path }),
  getFileHash: (path: string) => invoke<string>("get_file_hash", { path }),
  createFolder: (path: string) => invoke<void>("create_folder", { path }),
  openInExplorer: (path: string) => invoke<void>("open_in_explorer", { path }),
  searchLivePath: (path: string, namePattern?: string, limit?: number) =>
    invoke<DirEntry[]>("search_live_path", { path, namePattern, limit }),
  searchFilesAdvanced: (params: {
    scanId: number;
    namePattern?: string;
    extension?: string;
    minSize?: number;
    maxSize?: number;
    modifiedAfter?: string;
    modifiedBefore?: string;
    emptyOnly?: boolean;
    duplicatesOnly?: boolean;
    limit?: number;
  }) => invoke<FileRow[]>("search_files_advanced", {
    scanId: params.scanId,
    namePattern: params.namePattern,
    extension: params.extension,
    minSize: params.minSize,
    maxSize: params.maxSize,
    modifiedAfter: params.modifiedAfter,
    modifiedBefore: params.modifiedBefore,
    emptyOnly: params.emptyOnly,
    duplicatesOnly: params.duplicatesOnly,
    limit: params.limit,
  }),
};
