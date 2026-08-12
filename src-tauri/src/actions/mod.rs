//! Action manager — preview, validate, execute destructive operations safely.

use crate::database::{quarantine_dir, Database};
use crate::safety;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ActionType {
    Move,
    Copy,
    Rename,
    Quarantine,
    Delete,
    Uninstall,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionItem {
    pub action_type: ActionType,
    pub source: String,
    pub destination: Option<String>,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionPreview {
    pub items: Vec<ActionItem>,
    pub total_bytes: u64,
    pub warnings: Vec<String>,
    pub blocked: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionResult {
    pub success: bool,
    pub executed: usize,
    pub failed: Vec<String>,
    pub action_log_id: Option<i64>,
}

pub fn preview_actions(items: &[ActionItem]) -> ActionPreview {
    let mut total_bytes = 0u64;
    let mut warnings = Vec::new();
    let mut blocked = Vec::new();
    let mut safe_items = Vec::new();

    for item in items {
        let source = PathBuf::from(&item.source);
        if safety::is_protected_path(&source) {
            blocked.push(format!("Bloqueado (protegido): {}", item.source));
            continue;
        }

        if let Ok(meta) = fs::metadata(&source) {
            if meta.is_file() {
                total_bytes += meta.len();
            }
        } else {
            blocked.push(format!("Não encontrado: {}", item.source));
            continue;
        }

        if let Some(dest) = &item.destination {
            let dest_path = PathBuf::from(dest);
            if safety::is_protected_path(&dest_path) {
                blocked.push(format!("Destino protegido: {dest}"));
                continue;
            }
        }

        match item.action_type {
            ActionType::Delete => {
                warnings.push(format!("Exclusão permanente: {}", item.source));
            }
            ActionType::Quarantine => {
                warnings.push(format!("Mover para quarentena: {}", item.source));
            }
            _ => {}
        }

        safe_items.push(item.clone());
    }

    ActionPreview {
        items: safe_items,
        total_bytes,
        warnings,
        blocked,
    }
}

pub fn execute_actions(db: &Database, items: &[ActionItem], source: Option<&str>) -> ActionResult {
    let preview = preview_actions(items);
    if !preview.blocked.is_empty() && preview.items.is_empty() {
        return ActionResult {
            success: false,
            executed: 0,
            failed: preview.blocked,
            action_log_id: None,
        };
    }

    let details = serde_json::to_string(items).unwrap_or_default();
    let log_id = db
        .log_action("batch", "running", &details, source)
        .ok();

    let mut executed = 0;
    let mut failed = preview.blocked;

    for item in &preview.items {
        match execute_single(db, item) {
            Ok(()) => executed += 1,
            Err(e) => failed.push(format!("{}: {e}", item.source)),
        }
    }

    let status = if failed.is_empty() { "completed" } else if executed > 0 { "partial" } else { "failed" };
    if let Some(id) = log_id {
        let _ = db.complete_action(id, status);
    }

    ActionResult {
        success: failed.is_empty(),
        executed,
        failed,
        action_log_id: log_id,
    }
}

fn execute_single(db: &Database, item: &ActionItem) -> Result<(), String> {
    let source = Path::new(&item.source);
    safety::validate_safe_path(source)?;

    match item.action_type {
        ActionType::Move => {
            let dest = item
                .destination
                .as_ref()
                .ok_or_else(|| "Destino não especificado".to_string())?;
            let dest_path = PathBuf::from(dest);
            safety::validate_safe_path(&dest_path)?;
            if let Some(parent) = dest_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            fs::rename(source, &dest_path).map_err(|e| e.to_string())?;
        }
        ActionType::Copy => {
            let dest = item
                .destination
                .as_ref()
                .ok_or_else(|| "Destino não especificado".to_string())?;
            let dest_path = PathBuf::from(dest);
            safety::validate_safe_path(&dest_path)?;
            if let Some(parent) = dest_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            fs::copy(source, &dest_path).map_err(|e| e.to_string())?;
        }
        ActionType::Rename => {
            let dest = item
                .destination
                .as_ref()
                .ok_or_else(|| "Novo nome não especificado".to_string())?;
            let dest_path = PathBuf::from(dest);
            safety::validate_safe_path(&dest_path)?;
            fs::rename(source, &dest_path).map_err(|e| e.to_string())?;
        }
        ActionType::Quarantine => {
            quarantine_file(db, source, item.reason.as_deref())?;
        }
        ActionType::Delete => {
            if source.is_dir() {
                fs::remove_dir_all(source).map_err(|e| e.to_string())?;
            } else {
                fs::remove_file(source).map_err(|e| e.to_string())?;
            }
        }
        ActionType::Uninstall => {
            let cmd = item
                .destination
                .as_ref()
                .ok_or_else(|| "Comando de desinstalação não especificado".to_string())?;
            std::process::Command::new("cmd")
                .args(["/C", cmd])
                .spawn()
                .map_err(|e| format!("Erro ao iniciar desinstalação: {e}"))?;
        }
    }

    Ok(())
}

pub fn quarantine_file(db: &Database, source: &Path, reason: Option<&str>) -> Result<String, String> {
    safety::validate_safe_path(source)?;
    let meta = fs::metadata(source).map_err(|e| e.to_string())?;
    let qdir = quarantine_dir();
    fs::create_dir_all(&qdir).map_err(|e| e.to_string())?;

    let file_name = source
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());
    let unique_name = format!("{}_{}", Uuid::new_v4(), file_name);
    let dest = qdir.join(unique_name);

    fs::rename(source, &dest).map_err(|e| e.to_string())?;

    db.insert_quarantine(
        &source.to_string_lossy(),
        &dest.to_string_lossy(),
        meta.len() as i64,
        reason,
    )
    .map_err(|e| e.to_string())?;

    Ok(dest.to_string_lossy().to_string())
}

pub fn restore_from_quarantine(db: &Database, id: i64) -> Result<String, String> {
    let record = db
        .remove_quarantine_record(id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Registro de quarentena não encontrado".to_string())?;

    let original = PathBuf::from(&record.original_path);
    let quarantine_path = PathBuf::from(&record.quarantine_path);

    if safety::is_protected_path(&original) {
        return Err("Caminho original é protegido.".to_string());
    }

    if let Some(parent) = original.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::rename(&quarantine_path, &original).map_err(|e| e.to_string())?;
    db.log_action("restore", "completed", &record.original_path, Some("quarantine"))
        .map_err(|e| e.to_string())?;

    Ok(record.original_path)
}

pub fn permanent_delete_quarantine(db: &Database, id: i64) -> Result<(), String> {
    let record = db
        .remove_quarantine_record(id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Registro de quarentena não encontrado".to_string())?;

    let quarantine_path = PathBuf::from(&record.quarantine_path);
    if quarantine_path.is_dir() {
        fs::remove_dir_all(&quarantine_path).map_err(|e| e.to_string())?;
    } else if quarantine_path.exists() {
        fs::remove_file(&quarantine_path).map_err(|e| e.to_string())?;
    }

    db.log_action(
        "delete_quarantine",
        "completed",
        &record.original_path,
        Some("quarantine"),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
