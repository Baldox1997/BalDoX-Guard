//! Tauri commands — scanner operations.

use crate::database::Database;
use crate::filesystem::{available_drives, special_folders};
use crate::scanner::{ScannerState, ScanProgress};
use parking_lot::Mutex;
use serde::Serialize;
use std::sync::Arc;
use tauri::State;

#[derive(Serialize)]
pub struct DriveInfo {
    pub letter: String,
    pub path: String,
}

#[derive(Serialize)]
pub struct SpecialFolder {
    pub label: String,
    pub path: String,
}

#[tauri::command]
pub fn get_drives() -> Vec<DriveInfo> {
    available_drives()
        .into_iter()
        .map(|(letter, path)| DriveInfo { letter, path })
        .collect()
}

#[tauri::command]
pub fn get_special_folders() -> Vec<SpecialFolder> {
    special_folders()
        .into_iter()
        .map(|(label, path)| SpecialFolder { label, path })
        .collect()
}

#[tauri::command]
pub fn start_scan(
    app: tauri::AppHandle,
    db: State<'_, Arc<Mutex<Database>>>,
    scanner: State<'_, Arc<ScannerState>>,
    paths: Vec<String>,
) -> Result<i64, String> {
    crate::scanner::start_scan(app, db.inner().clone(), scanner.inner().clone(), paths)
}

#[tauri::command]
pub fn cancel_scan(scanner: State<'_, Arc<ScannerState>>) -> Result<(), String> {
    if !scanner.is_running() {
        return Err("Nenhuma varredura em andamento.".to_string());
    }
    scanner.cancel();
    Ok(())
}

#[tauri::command]
pub fn get_scan_progress(scanner: State<'_, Arc<ScannerState>>) -> ScanProgress {
    scanner.get_progress()
}

#[tauri::command]
pub fn get_latest_scan(db: State<'_, Arc<Mutex<Database>>>) -> Result<Option<crate::database::ScanHistoryRow>, String> {
    db.lock().get_latest_scan().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn find_duplicates(
    db: State<'_, Arc<Mutex<Database>>>,
    scan_id: i64,
    min_size: Option<i64>,
) -> Result<Vec<crate::scanner::DuplicateGroup>, String> {
    let db = db.lock();
    crate::scanner::find_duplicate_groups(&db, scan_id, min_size.unwrap_or(1024))
}
