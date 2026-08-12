//! Tauri commands — settings and BalDoX memory.

use crate::database::{quarantine_dir, Database};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppSettings {
    pub theme: String,
    pub quarantine_path: String,
    pub scan_paths: Vec<String>,
    pub auto_clean_temp: bool,
    pub suggest_organize_downloads: bool,
    pub alert_low_disk_gb: f64,
    pub baldox_personality: String,
    pub baldox_proactive_greeting: bool,
    pub delete_mode: String,
    pub favorite_folders: Vec<String>,
    pub last_baldox_commands: Vec<String>,
    pub baldox_ai_mode: String,
    pub baldox_openai_key: String,
}

const SETTINGS_KEY: &str = "app_settings";

#[tauri::command]
pub fn get_settings(db: State<'_, Arc<Mutex<Database>>>) -> Result<AppSettings, String> {
    let db = db.lock();
    if let Ok(Some(json)) = db.get_setting(SETTINGS_KEY) {
        if let Ok(s) = serde_json::from_str::<AppSettings>(&json) {
            return Ok(s);
        }
    }
    Ok(default_settings())
}

#[tauri::command]
pub fn save_settings(
    db: State<'_, Arc<Mutex<Database>>>,
    settings: AppSettings,
) -> Result<(), String> {
    let json = serde_json::to_string(&settings).map_err(|e| e.to_string())?;
    db.lock()
        .set_setting(SETTINGS_KEY, &json)
        .map_err(|e| e.to_string())?;
    if !settings.quarantine_path.is_empty() {
        db.lock()
            .set_setting("quarantine_path", &settings.quarantine_path)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_baldox_memory(db: State<'_, Arc<Mutex<Database>>>) -> Result<HashMap<String, String>, String> {
    let db = db.lock();
    let keys = [
        "baldox_last_greeting",
        "baldox_user_name",
        "baldox_favorite_action",
    ];
    let mut map = HashMap::new();
    for key in keys {
        if let Ok(Some(val)) = db.get_setting(key) {
            map.insert(key.to_string(), val);
        }
    }
    Ok(map)
}

#[tauri::command]
pub fn set_baldox_memory(
    db: State<'_, Arc<Mutex<Database>>>,
    key: String,
    value: String,
) -> Result<(), String> {
    db.lock().set_setting(&key, &value).map_err(|e| e.to_string())
}

fn default_settings() -> AppSettings {
    AppSettings {
        theme: "system".to_string(),
        quarantine_path: quarantine_dir().to_string_lossy().to_string(),
        scan_paths: vec![],
        auto_clean_temp: false,
        suggest_organize_downloads: true,
        alert_low_disk_gb: 5.0,
        baldox_personality: "professional".to_string(),
        baldox_proactive_greeting: true,
        delete_mode: "quarantine".to_string(),
        favorite_folders: vec![],
        last_baldox_commands: vec![],
        baldox_ai_mode: "local".to_string(),
        baldox_openai_key: String::new(),
    }
}
