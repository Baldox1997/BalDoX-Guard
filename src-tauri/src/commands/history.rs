//! Tauri commands — history and audit log.

use crate::database::Database;
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub fn get_scan_history(
    db: State<'_, Arc<Mutex<Database>>>,
    limit: Option<i64>,
) -> Result<Vec<crate::database::ScanHistoryRow>, String> {
    db.lock()
        .get_scan_history(limit.unwrap_or(50))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_action_history(
    db: State<'_, Arc<Mutex<Database>>>,
    limit: Option<i64>,
) -> Result<Vec<crate::database::ActionRow>, String> {
    db.lock()
        .list_actions(limit.unwrap_or(100))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn log_baldox_action(
    db: State<'_, Arc<Mutex<Database>>>,
    action_type: String,
    details: String,
    status: String,
) -> Result<i64, String> {
    db.lock()
        .log_action(&action_type, &status, &details, Some("baldox"))
        .map_err(|e| e.to_string())
}
