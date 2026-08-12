use serde::Serialize;

#[derive(Serialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub phase: u8,
}

/// Returns basic application metadata for the frontend.
#[tauri::command]
pub fn get_app_info() -> AppInfo {
    AppInfo {
        name: "BalDoX Guard".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        phase: 8,
    }
}
