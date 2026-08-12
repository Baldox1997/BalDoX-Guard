//! Tauri commands — uninstaller.

use crate::database::Database;
use crate::uninstaller::{leftover_paths, scan_installed_apps, to_db_rows, InstalledApp};
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub fn scan_apps(db: State<'_, Arc<Mutex<Database>>>) -> Result<Vec<InstalledApp>, String> {
    let apps = scan_installed_apps();
    let rows = to_db_rows(&apps);
    db.lock()
        .replace_installed_apps(&rows)
        .map_err(|e| e.to_string())?;
    Ok(apps)
}

#[tauri::command]
pub fn list_apps(db: State<'_, Arc<Mutex<Database>>>) -> Result<Vec<InstalledApp>, String> {
    let rows = db.lock().list_installed_apps().map_err(|e| e.to_string())?;
    Ok(rows
        .into_iter()
        .map(|r| InstalledApp {
            name: r.name,
            version: r.version,
            publisher: r.publisher,
            install_location: r.install_location,
            uninstall_string: r.uninstall_string,
            size: r.size,
            install_date: r.install_date,
        })
        .collect())
}

#[tauri::command]
pub fn get_app_leftovers(app: InstalledApp) -> Vec<String> {
    leftover_paths(&app)
}

#[tauri::command]
pub fn uninstall_app(
    db: State<'_, Arc<Mutex<Database>>>,
    app: InstalledApp,
) -> Result<(), String> {
    let cmd = app
        .uninstall_string
        .ok_or_else(|| "Comando de desinstalação não disponível.".to_string())?;

    db.lock()
        .log_action("uninstall", "started", &app.name, Some("user"))
        .map_err(|e| e.to_string())?;

    std::process::Command::new("cmd")
        .args(["/C", &cmd])
        .spawn()
        .map_err(|e| format!("Erro ao iniciar desinstalação: {e}"))?;

    Ok(())
}
