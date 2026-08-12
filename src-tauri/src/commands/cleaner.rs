//! Tauri commands — cleanup operations.

use crate::actions::{execute_actions, ActionItem, ActionType};
use crate::cleaner::{analyze_cleanup, auto_clean_temp, find_empty_folders, CleanupCandidate};
use crate::database::Database;
use parking_lot::Mutex;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub fn analyze_cleanup_candidates() -> Vec<CleanupCandidate> {
    analyze_cleanup()
}

#[tauri::command]
pub fn find_empty_folders_cmd(path: String, max: Option<usize>) -> Vec<CleanupCandidate> {
    find_empty_folders(PathBuf::from(&path).as_path(), max.unwrap_or(100))
}

#[tauri::command]
pub fn clean_selected(
    db: State<'_, Arc<Mutex<Database>>>,
    paths: Vec<String>,
    use_quarantine: bool,
    source: Option<String>,
) -> crate::actions::ActionResult {
    let items: Vec<ActionItem> = paths
        .into_iter()
        .map(|p| ActionItem {
            action_type: if use_quarantine {
                ActionType::Quarantine
            } else {
                ActionType::Delete
            },
            source: p,
            destination: None,
            reason: Some("Limpeza selecionada pelo usuário".to_string()),
        })
        .collect();
    execute_actions(&db.lock(), &items, source.as_deref())
}

#[tauri::command]
pub fn auto_clean_temp_safe(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<String>, String> {
    let cleaned = auto_clean_temp()?;
    db.lock()
        .log_action(
            "auto_clean_temp",
            "completed",
            &serde_json::to_string(&cleaned).unwrap_or_default(),
            Some("automation"),
        )
        .map_err(|e| e.to_string())?;
    Ok(cleaned)
}
