//! Windows uninstaller integration via registry.

use crate::database::InstalledAppRow;
use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledApp {
    pub name: String,
    pub version: Option<String>,
    pub publisher: Option<String>,
    pub install_location: Option<String>,
    pub uninstall_string: Option<String>,
    pub size: Option<i64>,
    pub install_date: Option<String>,
}

#[cfg(windows)]
pub fn scan_installed_apps() -> Vec<InstalledApp> {
    use winreg::enums::*;
    use winreg::RegKey;

    let mut apps = Vec::new();
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let paths = [
        r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
    ];

    for reg_path in paths {
        if let Ok(uninstall) = hklm.open_subkey(reg_path) {
            for key_name in uninstall.enum_keys().flatten() {
                if let Ok(app_key) = uninstall.open_subkey(&key_name) {
                    if let Some(app) = read_app_key(&app_key) {
                        apps.push(app);
                    }
                }
            }
        }
    }

    if let Ok(hkcu) = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall")
    {
        for key_name in hkcu.enum_keys().flatten() {
            if let Ok(app_key) = hkcu.open_subkey(&key_name) {
                if let Some(app) = read_app_key(&app_key) {
                    apps.push(app);
                }
            }
        }
    }

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps.dedup_by(|a, b| a.name == b.name && a.uninstall_string == b.uninstall_string);
    apps
}

#[cfg(not(windows))]
pub fn scan_installed_apps() -> Vec<InstalledApp> {
    Vec::new()
}

#[cfg(windows)]
fn read_app_key(key: &winreg::RegKey) -> Option<InstalledApp> {
    let name: String = key.get_value("DisplayName").ok()?;
    if name.trim().is_empty() {
        return None;
    }

    let system_component: u32 = key.get_value("SystemComponent").unwrap_or(0);
    if system_component == 1 {
        return None;
    }

    Some(InstalledApp {
        name,
        version: key.get_value("DisplayVersion").ok(),
        publisher: key.get_value("Publisher").ok(),
        install_location: key.get_value("InstallLocation").ok(),
        uninstall_string: key.get_value("UninstallString").ok(),
        size: key.get_value::<u32, _>("EstimatedSize").ok().map(|s| s as i64 * 1024),
        install_date: key.get_value("InstallDate").ok(),
    })
}

pub fn to_db_rows(apps: &[InstalledApp]) -> Vec<InstalledAppRow> {
    let now = Utc::now().to_rfc3339();
    apps.iter()
        .enumerate()
        .map(|(i, a)| InstalledAppRow {
            id: i as i64,
            name: a.name.clone(),
            version: a.version.clone(),
            publisher: a.publisher.clone(),
            install_location: a.install_location.clone(),
            uninstall_string: a.uninstall_string.clone(),
            size: a.size,
            install_date: a.install_date.clone(),
            scanned_at: now.clone(),
        })
        .collect()
}

pub fn leftover_paths(app: &InstalledApp) -> Vec<String> {
    let mut paths = Vec::new();
    if let Some(loc) = &app.install_location {
        if !loc.trim().is_empty() && std::path::Path::new(loc).exists() {
            paths.push(loc.clone());
        }
    }
    if let Some(home) = dirs::home_dir() {
        let appdata = home.join("AppData/Local").join(&app.name);
        if appdata.exists() {
            paths.push(appdata.to_string_lossy().to_string());
        }
    }
    paths
}
