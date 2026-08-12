//! Tauri commands — filesystem operations.

use crate::actions::{execute_actions, preview_actions, ActionItem, ActionPreview, ActionResult};
use crate::database::Database;
use crate::filesystem::{list_directory, read_metadata, DirEntry, FileMetadata};
use parking_lot::Mutex;
use std::sync::Arc;
use std::path::PathBuf;
use tauri::State;

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<DirEntry>, String> {
    list_directory(PathBuf::from(&path).as_path())
}

#[tauri::command]
pub fn get_file_metadata(path: String) -> Result<FileMetadata, String> {
    read_metadata(PathBuf::from(&path).as_path())
}

#[tauri::command]
pub fn get_file_hash(path: String) -> Result<String, String> {
    crate::filesystem::full_hash(PathBuf::from(&path).as_path())
}

#[tauri::command]
pub fn create_folder(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    crate::safety::validate_safe_path(&p)?;
    std::fs::create_dir_all(&p).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_in_explorer(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("Caminho não existe: {path}"));
    }
    std::process::Command::new("explorer")
        .arg(if p.is_dir() { p.to_string_lossy().to_string() } else {
            format!("/select,{}", p.to_string_lossy())
        })
        .spawn()
        .map_err(|e| format!("Erro ao abrir Explorer: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn search_live_path(
    path: String,
    name_pattern: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<DirEntry>, String> {
    crate::filesystem::search_live_directory(
        &path,
        name_pattern.as_deref(),
        limit.unwrap_or(200),
    )
}

#[tauri::command]
pub fn search_files_advanced(
    db: State<'_, Arc<Mutex<Database>>>,
    scan_id: i64,
    name_pattern: Option<String>,
    extension: Option<String>,
    min_size: Option<i64>,
    max_size: Option<i64>,
    modified_after: Option<String>,
    modified_before: Option<String>,
    empty_only: Option<bool>,
    duplicates_only: Option<bool>,
    limit: Option<i64>,
) -> Result<Vec<crate::database::FileRow>, String> {
    db.lock()
        .search_files_advanced(
            scan_id,
            name_pattern.as_deref(),
            extension.as_deref(),
            min_size,
            max_size,
            modified_after.as_deref(),
            modified_before.as_deref(),
            empty_only.unwrap_or(false),
            duplicates_only.unwrap_or(false),
            limit.unwrap_or(500),
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_files(
    db: State<'_, Arc<Mutex<Database>>>,
    scan_id: i64,
    name_pattern: Option<String>,
    extension: Option<String>,
    min_size: Option<i64>,
    max_size: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<crate::database::FileRow>, String> {
    db.lock()
        .search_files(
            scan_id,
            name_pattern.as_deref(),
            extension.as_deref(),
            min_size,
            max_size,
            limit.unwrap_or(500),
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_large_files(
    db: State<'_, Arc<Mutex<Database>>>,
    scan_id: i64,
    min_size: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<crate::database::FileRow>, String> {
    db.lock()
        .get_large_files(scan_id, min_size.unwrap_or(104857600), limit.unwrap_or(200))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_old_files(
    db: State<'_, Arc<Mutex<Database>>>,
    scan_id: i64,
    days: i64,
    limit: Option<i64>,
) -> Result<Vec<crate::database::FileRow>, String> {
    let before = crate::database::days_ago_iso(days);
    db.lock()
        .get_old_files(scan_id, &before, limit.unwrap_or(200))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn preview_action(items: Vec<ActionItem>) -> ActionPreview {
    preview_actions(&items)
}

#[tauri::command]
pub fn execute_action(
    db: State<'_, Arc<Mutex<Database>>>,
    items: Vec<ActionItem>,
    source: Option<String>,
) -> ActionResult {
    execute_actions(&db.lock(), &items, source.as_deref())
}

#[tauri::command]
pub fn quarantine_file(
    db: State<'_, Arc<Mutex<Database>>>,
    path: String,
    reason: Option<String>,
) -> Result<String, String> {
    crate::actions::quarantine_file(&db.lock(), PathBuf::from(&path).as_path(), reason.as_deref())
}

#[tauri::command]
pub fn restore_quarantine(
    db: State<'_, Arc<Mutex<Database>>>,
    id: i64,
) -> Result<String, String> {
    crate::actions::restore_from_quarantine(&db.lock(), id)
}

#[tauri::command]
pub fn delete_quarantine_permanent(
    db: State<'_, Arc<Mutex<Database>>>,
    id: i64,
) -> Result<(), String> {
    crate::actions::permanent_delete_quarantine(&db.lock(), id)
}

#[tauri::command]
pub fn list_quarantine(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<crate::database::QuarantineRow>, String> {
    db.lock().list_quarantine().map_err(|e| e.to_string())
}
