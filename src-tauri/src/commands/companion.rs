//! Tauri commands — BalDoX desktop companion window.

use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize)]
pub struct MonitorRect {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[tauri::command]
pub fn get_monitor_work_area(app: AppHandle) -> Result<MonitorRect, String> {
    let window = app
        .get_webview_window("companion")
        .or_else(|| app.get_webview_window("main"))
        .ok_or_else(|| "Nenhuma janela disponível".to_string())?;

    let monitor = window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Monitor não detectado".to_string())?;

    let work = monitor.work_area();

    Ok(MonitorRect {
        x: work.position.x,
        y: work.position.y,
        width: work.size.width,
        height: work.size.height,
    })
}

#[tauri::command]
pub fn focus_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(main) = app.get_webview_window("main") {
        main.show().map_err(|e| e.to_string())?;
        main.set_focus().map_err(|e| e.to_string())?;
        let _ = app.emit("tray-navigate", "/assistant");
    }
    Ok(())
}

#[tauri::command]
pub fn show_companion_window(app: AppHandle) -> Result<(), String> {
    if let Some(companion) = app.get_webview_window("companion") {
        companion.show().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn hide_companion_window(app: AppHandle) -> Result<(), String> {
    if let Some(companion) = app.get_webview_window("companion") {
        companion.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}
