//! Tauri commands — dashboard and system info.

use crate::cleaner::analyze_cleanup;
use crate::database::Database;
use parking_lot::Mutex;
use serde::Serialize;
use std::sync::Arc;
use sysinfo::Disks;
use tauri::State;

#[derive(Serialize)]
pub struct StorageInfo {
    pub used_bytes: u64,
    pub total_bytes: u64,
    pub usage_percent: f64,
    pub drive_letter: String,
    pub free_bytes: u64,
}

#[derive(Serialize)]
pub struct DashboardStat {
    pub id: String,
    pub label: String,
    pub value: String,
    pub description: String,
    pub count: i64,
    pub bytes: i64,
}

#[derive(Serialize)]
pub struct DashboardData {
    pub storage: StorageInfo,
    pub stats: Vec<DashboardStat>,
    pub potential_cleanup_bytes: u64,
    pub last_scan_id: Option<i64>,
    pub last_scan_status: Option<String>,
    pub app_count: i64,
}

#[tauri::command]
pub fn get_dashboard_data(db: State<'_, Arc<Mutex<Database>>>) -> Result<DashboardData, String> {
    let db = db.lock();
    let disks = Disks::new_with_refreshed_list();
    let c_disk = disks
        .iter()
        .find(|d| d.mount_point().to_string_lossy().starts_with("C:"))
        .or_else(|| disks.iter().next());

    let storage = if let Some(d) = c_disk {
        let total = d.total_space();
        let free = d.available_space();
        let used = total.saturating_sub(free);
        StorageInfo {
            used_bytes: used,
            total_bytes: total,
            usage_percent: if total > 0 {
                (used as f64 / total as f64) * 100.0
            } else {
                0.0
            },
            drive_letter: d.mount_point().to_string_lossy().to_string(),
            free_bytes: free,
        }
    } else {
        StorageInfo {
            used_bytes: 0,
            total_bytes: 0,
            usage_percent: 0.0,
            drive_letter: "C:\\".to_string(),
            free_bytes: 0,
        }
    };

    let latest = db.get_latest_scan().map_err(|e| e.to_string())?;
    let cleanup_candidates = analyze_cleanup();
    let cleanup_bytes: u64 = cleanup_candidates.iter().map(|c| c.size).sum();

    let mut stats = Vec::new();
    let app_count = db.list_installed_apps().map(|a| a.len() as i64).unwrap_or(0);

    if let Some(scan) = &latest {
        if scan.status == "completed" {
            let db_stats = db.get_dashboard_stats(scan.id).map_err(|e| e.to_string())?;
            stats.push(DashboardStat {
                id: "large".to_string(),
                label: "Arquivos grandes".to_string(),
                value: format_size(db_stats.large_files_bytes),
                description: "Arquivos acima de 100 MB".to_string(),
                count: db_stats.large_files_count,
                bytes: db_stats.large_files_bytes,
            });
            stats.push(DashboardStat {
                id: "old".to_string(),
                label: "Arquivos antigos".to_string(),
                value: format_size(db_stats.old_files_bytes),
                description: "Sem modificação há 1+ ano".to_string(),
                count: db_stats.old_files_count,
                bytes: db_stats.old_files_bytes,
            });
        }
    }

    stats.push(DashboardStat {
        id: "cleanup".to_string(),
        label: "Limpeza possível".to_string(),
        value: format_size(cleanup_bytes as i64),
        description: "Temp e cache seguro".to_string(),
        count: cleanup_candidates.len() as i64,
        bytes: cleanup_bytes as i64,
    });
    stats.push(DashboardStat {
        id: "apps".to_string(),
        label: "Aplicativos".to_string(),
        value: app_count.to_string(),
        description: "Programas detectados".to_string(),
        count: app_count,
        bytes: 0,
    });

    Ok(DashboardData {
        storage,
        stats,
        potential_cleanup_bytes: cleanup_bytes,
        last_scan_id: latest.as_ref().map(|s| s.id),
        last_scan_status: latest.as_ref().map(|s| s.status.clone()),
        app_count,
    })
}

#[tauri::command]
pub fn check_disk_space_alert(threshold_gb: f64) -> Result<Option<String>, String> {
    let disks = Disks::new_with_refreshed_list();
    let threshold_bytes = (threshold_gb * 1024.0 * 1024.0 * 1024.0) as u64;
    for d in disks.iter() {
        if d.available_space() < threshold_bytes {
            return Ok(Some(format!(
                "Disco {} com apenas {} livres",
                d.mount_point().to_string_lossy(),
                format_size(d.available_space() as i64)
            )));
        }
    }
    Ok(None)
}

fn format_size(bytes: i64) -> String {
    const UNITS: [&str; 5] = ["B", "KB", "MB", "GB", "TB"];
    if bytes <= 0 {
        return "0 B".to_string();
    }
    let exp = (bytes as f64).log(1024.0).floor() as usize;
    let exp = exp.min(UNITS.len() - 1);
    let value = bytes as f64 / 1024f64.powi(exp as i32);
    format!("{value:.1} {}", UNITS[exp])
}
