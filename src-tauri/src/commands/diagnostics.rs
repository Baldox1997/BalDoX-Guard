//! Tauri commands — system diagnostics and control panel data.

use crate::cleaner::analyze_cleanup;
use crate::database::Database;
use parking_lot::Mutex;
use serde::Serialize;
use std::sync::Arc;
use sysinfo::{Disks, System};
use tauri::State;

#[derive(Serialize)]
pub struct SystemInfo {
    pub os_name: String,
    pub os_version: String,
    pub hostname: String,
    pub cpu_name: String,
    pub cpu_cores: usize,
    pub ram_total_bytes: u64,
    pub ram_used_bytes: u64,
    pub ram_usage_percent: f64,
    pub uptime_secs: u64,
}

#[derive(Serialize)]
pub struct DriveStats {
    pub letter: String,
    pub mount_point: String,
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub used_bytes: u64,
    pub usage_percent: f64,
    pub file_system: String,
}

#[derive(Serialize)]
pub struct StorageCategory {
    pub category: String,
    pub label: String,
    pub bytes: i64,
    pub count: i64,
}

#[derive(Serialize)]
pub struct LargestFolder {
    pub path: String,
    pub name: String,
    pub bytes: i64,
    pub file_count: i64,
}

#[derive(Serialize)]
pub struct ControlPanelData {
    pub drives: Vec<DriveStats>,
    pub system: SystemInfo,
    pub indexed_files: i64,
    pub indexed_bytes: i64,
    pub recoverable_bytes: u64,
    pub last_scan_id: Option<i64>,
    pub last_scan_status: Option<String>,
    pub recent_actions_count: i64,
}

#[derive(Serialize)]
pub struct FolderAnalysis {
    pub path: String,
    pub total_bytes: u64,
    pub file_count: u64,
    pub folder_count: u64,
    pub subfolders: Vec<LargestFolder>,
}

// FolderAnalysis kept for API compat — analyze_folder_size returns FolderAnalysisResult from filesystem

#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    let total = sys.total_memory();
    let used = sys.used_memory();
    let cpu_name = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Desconhecido".to_string());

    SystemInfo {
        os_name: System::name().unwrap_or_else(|| "Windows".to_string()),
        os_version: System::os_version().unwrap_or_default(),
        hostname: System::host_name().unwrap_or_default(),
        cpu_name,
        cpu_cores: sys.cpus().len(),
        ram_total_bytes: total,
        ram_used_bytes: used,
        ram_usage_percent: if total > 0 {
            (used as f64 / total as f64) * 100.0
        } else {
            0.0
        },
        uptime_secs: System::uptime(),
    }
}

#[tauri::command]
pub fn get_all_drives_stats() -> Vec<DriveStats> {
    let disks = Disks::new_with_refreshed_list();
    disks
        .iter()
        .map(|d| {
            let total = d.total_space();
            let free = d.available_space();
            let used = total.saturating_sub(free);
            let mount = d.mount_point().to_string_lossy().to_string();
            let letter = mount.chars().next().map(|c| format!("{c}:")).unwrap_or_else(|| mount.clone());
            DriveStats {
                letter,
                mount_point: mount,
                total_bytes: total,
                free_bytes: free,
                used_bytes: used,
                usage_percent: if total > 0 {
                    (used as f64 / total as f64) * 100.0
                } else {
                    0.0
                },
                file_system: d.file_system().to_string_lossy().to_string(),
            }
        })
        .collect()
}

#[tauri::command]
pub fn get_drives_overview() -> Vec<DriveStats> {
    get_all_drives_stats()
}

#[tauri::command]
pub fn get_storage_breakdown(
    db: State<'_, Arc<Mutex<Database>>>,
    scan_id: Option<i64>,
) -> Result<Vec<StorageCategory>, String> {
    let db = db.lock();
    let sid = match scan_id {
        Some(id) => id,
        None => db
            .get_latest_scan()
            .map_err(|e| e.to_string())?
            .filter(|s| s.status == "completed")
            .map(|s| s.id)
            .ok_or_else(|| "Nenhum scan concluído disponível.".to_string())?,
    };
    db.get_storage_breakdown(sid)
        .map(|rows| {
            rows.into_iter()
                .map(|r| StorageCategory {
                    category: r.category,
                    label: r.label,
                    bytes: r.bytes,
                    count: r.count,
                })
                .collect()
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_largest_folders(
    db: State<'_, Arc<Mutex<Database>>>,
    scan_id: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<LargestFolder>, String> {
    let db = db.lock();
    let sid = match scan_id {
        Some(id) => id,
        None => db
            .get_latest_scan()
            .map_err(|e| e.to_string())?
            .filter(|s| s.status == "completed")
            .map(|s| s.id)
            .ok_or_else(|| "Nenhum scan concluído disponível.".to_string())?,
    };
    db.get_largest_folders(sid, limit.unwrap_or(20))
        .map(|rows| {
            rows.into_iter()
                .map(|r| LargestFolder {
                    path: r.path,
                    name: r.name,
                    bytes: r.bytes,
                    file_count: r.file_count,
                })
                .collect()
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_control_panel_data(db: State<'_, Arc<Mutex<Database>>>) -> Result<ControlPanelData, String> {
    let db = db.lock();
    let drives = get_all_drives_stats();
    let system = get_system_info();
    let cleanup = analyze_cleanup();
    let recoverable: u64 = cleanup.iter().map(|c| c.size).sum();

    let latest = db.get_latest_scan().map_err(|e| e.to_string())?;
    let (indexed_files, indexed_bytes) = if let Some(ref scan) = latest {
        if scan.status == "completed" {
            db.count_files_by_scan(scan.id).unwrap_or((0, 0))
        } else {
            (0, 0)
        }
    } else {
        (0, 0)
    };

    let recent_actions = db.list_actions(10).map(|a| a.len() as i64).unwrap_or(0);

    Ok(ControlPanelData {
        drives,
        system,
        indexed_files,
        indexed_bytes,
        recoverable_bytes: recoverable,
        last_scan_id: latest.as_ref().map(|s| s.id),
        last_scan_status: latest.as_ref().map(|s| s.status.clone()),
        recent_actions_count: recent_actions,
    })
}

#[tauri::command]
pub fn analyze_folder_size(path: String, depth: Option<u32>) -> Result<crate::filesystem::FolderAnalysisResult, String> {
    crate::filesystem::analyze_folder(&path, depth.unwrap_or(1))
}
