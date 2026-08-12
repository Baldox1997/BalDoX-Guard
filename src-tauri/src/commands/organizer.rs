//! Tauri commands — smart organization.

use crate::actions::{execute_actions, ActionItem, ActionType};
use crate::database::Database;
use crate::organizer::{analyze_folder, default_downloads_path, OrganizePlan};
use parking_lot::Mutex;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub fn analyze_organization(path: Option<String>) -> Result<OrganizePlan, String> {
    let root = path
        .map(PathBuf::from)
        .or_else(default_downloads_path)
        .ok_or_else(|| "Pasta Downloads não encontrada.".to_string())?;
    analyze_folder(&root)
}

#[tauri::command]
pub fn execute_organization(
    db: State<'_, Arc<Mutex<Database>>>,
    plan: OrganizePlan,
    source: Option<String>,
) -> crate::actions::ActionResult {
    let items: Vec<ActionItem> = plan
        .suggestions
        .into_iter()
        .map(|s| ActionItem {
            action_type: ActionType::Move,
            source: s.source,
            destination: Some(s.destination),
            reason: Some(format!("Organizar em {}", s.category)),
        })
        .collect();
    execute_actions(&db.lock(), &items, source.as_deref())
}

#[tauri::command]
pub fn get_downloads_path() -> Option<String> {
    default_downloads_path().map(|p| p.to_string_lossy().to_string())
}
