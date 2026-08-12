//! Tauri commands — safety validation.

use crate::safety;

#[tauri::command]
pub fn is_path_protected(path: String) -> bool {
    safety::is_protected_path(std::path::Path::new(&path))
}

#[tauri::command]
pub fn validate_path(path: String) -> Result<(), String> {
    safety::validate_safe_path(std::path::Path::new(&path))
}
