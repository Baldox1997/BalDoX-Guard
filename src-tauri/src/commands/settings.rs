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
    #[serde(default)]
    pub baldox_openai_key: String,
    #[serde(default = "default_llm_model")]
    pub baldox_llm_model: String,
    #[serde(default = "default_llm_base_url")]
    pub baldox_llm_base_url: String,
    #[serde(default = "default_ollama_url")]
    pub baldox_ollama_url: String,
    #[serde(default = "default_ollama_model")]
    pub baldox_ollama_model: String,
    #[serde(default = "default_true")]
    pub baldox_secretary_active: bool,
    #[serde(default = "default_monitor_interval")]
    pub baldox_monitor_interval_min: u32,
    #[serde(default = "default_true")]
    pub baldox_minimize_to_tray: bool,
    #[serde(default)]
    pub baldox_voice_input: bool,
    #[serde(default)]
    pub baldox_voice_output: bool,
    #[serde(default)]
    pub baldox_voice_continuous: bool,
    #[serde(default)]
    pub baldox_desktop_companion: bool,
    #[serde(default = "default_companion_speed")]
    pub baldox_companion_speed: f64,
}

const SETTINGS_KEY: &str = "app_settings";

fn default_llm_model() -> String {
    "gpt-4o-mini".to_string()
}

fn default_llm_base_url() -> String {
    "https://api.openai.com/v1".to_string()
}

fn default_ollama_url() -> String {
    "http://127.0.0.1:11434".to_string()
}

fn default_ollama_model() -> String {
    "llama3.2".to_string()
}

fn default_true() -> bool {
    true
}

fn default_monitor_interval() -> u32 {
    10
}

fn default_companion_speed() -> f64 {
    80.0
}

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
        baldox_llm_model: "gpt-4o-mini".to_string(),
        baldox_llm_base_url: "https://api.openai.com/v1".to_string(),
        baldox_ollama_url: "http://127.0.0.1:11434".to_string(),
        baldox_ollama_model: "llama3.2".to_string(),
        baldox_secretary_active: true,
        baldox_monitor_interval_min: 10,
        baldox_minimize_to_tray: true,
        baldox_voice_input: false,
        baldox_voice_output: false,
        baldox_voice_continuous: false,
        baldox_desktop_companion: false,
        baldox_companion_speed: 80.0,
    }
}
