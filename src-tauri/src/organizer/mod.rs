//! Smart folder organization — analyze and suggest subfolder moves.

use crate::filesystem::categorize_by_extension;
use crate::safety;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizeSuggestion {
    pub source: String,
    pub destination: String,
    pub category: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizePlan {
    pub root: String,
    pub suggestions: Vec<OrganizeSuggestion>,
    pub total_files: usize,
    pub total_bytes: u64,
}

pub fn analyze_folder(root: &Path) -> Result<OrganizePlan, String> {
    if !root.is_dir() {
        return Err(format!("Não é um diretório: {}", root.display()));
    }
    if safety::is_protected_path(root) {
        return Err("Pasta protegida do sistema.".to_string());
    }

    let read_dir = fs::read_dir(root).map_err(|e| e.to_string())?;
    let mut suggestions = Vec::new();
    let mut total_bytes = 0u64;

    for entry in read_dir.flatten() {
        let path = entry.path();
        if safety::is_protected_path(&path) {
            continue;
        }
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        if !meta.is_file() {
            continue;
        }

        let name = entry.file_name().to_string_lossy().to_string();
        let category = categorize_by_extension(&name);
        if category == "Other" {
            continue;
        }

        let dest_dir = root.join(category);
        let dest = dest_dir.join(&name);
        if path == dest {
            continue;
        }

        total_bytes += meta.len();
        suggestions.push(OrganizeSuggestion {
            source: path.to_string_lossy().to_string(),
            destination: dest.to_string_lossy().to_string(),
            category: category.to_string(),
            size: meta.len(),
        });
    }

    suggestions.sort_by(|a, b| a.category.cmp(&b.category));

    Ok(OrganizePlan {
        root: root.to_string_lossy().to_string(),
        total_files: suggestions.len(),
        total_bytes,
        suggestions,
    })
}

pub fn summarize_by_category(plan: &OrganizePlan) -> HashMap<String, (usize, u64)> {
    let mut map = HashMap::new();
    for s in &plan.suggestions {
        let entry = map.entry(s.category.clone()).or_insert((0, 0));
        entry.0 += 1;
        entry.1 += s.size;
    }
    map
}

pub fn default_downloads_path() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join("Downloads"))
}
