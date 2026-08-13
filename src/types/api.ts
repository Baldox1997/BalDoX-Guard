export interface DriveInfo {
  letter: string;
  path: string;
}

export interface SpecialFolder {
  label: string;
  path: string;
}

export interface ScanProgress {
  scan_id: number;
  status: string;
  files_scanned: number;
  total_size: number;
  current_path: string;
  elapsed_secs: number;
}

export interface ScanHistoryRow {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  paths_scanned: string;
  files_count: number;
  total_size: number;
}

export interface FileRow {
  id: number;
  scan_id: number;
  path: string;
  name: string;
  extension: string | null;
  size: number;
  modified_at: string | null;
  created_at: string | null;
  file_type: string;
  partial_hash: string | null;
  full_hash: string | null;
}

export interface DirEntry {
  path: string;
  name: string;
  extension: string | null;
  size: number;
  modified_at: string | null;
  file_type: string;
  is_protected: boolean;
}

export interface DuplicateGroup {
  id: number;
  files: FileRow[];
  wasted_bytes: number;
}

export interface CleanupCandidate {
  path: string;
  name: string;
  size: number;
  category: string;
  safe: boolean;
  reason: string;
}

export interface QuarantineRow {
  id: number;
  original_path: string;
  quarantine_path: string;
  size: number;
  quarantined_at: string;
  reason: string | null;
}

export interface ActionItem {
  action_type: "MOVE" | "COPY" | "RENAME" | "QUARANTINE" | "DELETE" | "UNINSTALL";
  source: string;
  destination?: string | null;
  reason?: string | null;
}

export interface ActionPreview {
  items: ActionItem[];
  total_bytes: number;
  warnings: string[];
  blocked: string[];
}

export interface ActionResult {
  success: boolean;
  executed: number;
  failed: string[];
  action_log_id: number | null;
}

export interface InstalledApp {
  name: string;
  version: string | null;
  publisher: string | null;
  install_location: string | null;
  uninstall_string: string | null;
  size: number | null;
  install_date: string | null;
}

export interface OrganizeSuggestion {
  source: string;
  destination: string;
  category: string;
  size: number;
}

export interface OrganizePlan {
  root: string;
  suggestions: OrganizeSuggestion[];
  total_files: number;
  total_bytes: number;
}

export interface ActionRow {
  id: number;
  action_type: string;
  status: string;
  details: string;
  created_at: string;
  completed_at: string | null;
  source: string | null;
}

export interface AppSettings {
  theme: string;
  quarantine_path: string;
  scan_paths: string[];
  auto_clean_temp: boolean;
  suggest_organize_downloads: boolean;
  alert_low_disk_gb: number;
  baldox_personality: string;
  baldox_proactive_greeting: boolean;
  delete_mode: "quarantine" | "permanent";
  favorite_folders: string[];
  last_baldox_commands: string[];
  baldox_ai_mode: string;
  baldox_openai_key: string;
  baldox_llm_model: string;
  baldox_llm_base_url: string;
  baldox_ollama_url: string;
  baldox_ollama_model: string;
  baldox_secretary_active: boolean;
  baldox_monitor_interval_min: number;
  baldox_minimize_to_tray: boolean;
  baldox_voice_input: boolean;
  baldox_voice_output: boolean;
  baldox_voice_continuous: boolean;
  baldox_desktop_companion: boolean;
  baldox_companion_speed: number;
}

export interface StorageInfo {
  used_bytes: number;
  total_bytes: number;
  usage_percent: number;
  drive_letter: string;
  free_bytes: number;
}

export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  description: string;
  count: number;
  bytes: number;
}

export interface DashboardData {
  storage: StorageInfo;
  stats: DashboardStat[];
  potential_cleanup_bytes: number;
  last_scan_id: number | null;
  last_scan_status: string | null;
  app_count: number;
}

export interface SystemInfo {
  os_name: string;
  os_version: string;
  hostname: string;
  cpu_name: string;
  cpu_cores: number;
  ram_total_bytes: number;
  ram_used_bytes: number;
  ram_usage_percent: number;
  uptime_secs: number;
}

export interface DriveStats {
  letter: string;
  mount_point: string;
  total_bytes: number;
  free_bytes: number;
  used_bytes: number;
  usage_percent: number;
  file_system: string;
}

export interface StorageCategory {
  category: string;
  label: string;
  bytes: number;
  count: number;
}

export interface LargestFolder {
  path: string;
  name: string;
  bytes: number;
  file_count: number;
}

export interface ControlPanelData {
  drives: DriveStats[];
  system: SystemInfo;
  indexed_files: number;
  indexed_bytes: number;
  recoverable_bytes: number;
  last_scan_id: number | null;
  last_scan_status: string | null;
  recent_actions_count: number;
}

export interface FolderAnalysis {
  path: string;
  total_bytes: number;
  file_count: number;
  folder_count: number;
  subfolders: LargestFolder[];
}

export interface FileMetadata {
  path: string;
  name: string;
  extension: string | null;
  size: number;
  modified_at: string | null;
  created_at: string | null;
  file_type: string;
  is_protected: boolean;
}
