//! Safe cleanup recommendations — temp files and cache (safe paths only).

use crate::safety;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize)]
pub struct CleanupCandidate {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub category: String,
    pub safe: bool,
    pub reason: String,
}

pub fn analyze_cleanup() -> Vec<CleanupCandidate> {
    let mut candidates = Vec::new();

    if let Some(temp) = std::env::var_os("TEMP") {
        scan_temp_dir(Path::new(&temp), &mut candidates);
    }

    if let Some(local) = dirs::home_dir().map(|h| h.join("AppData/Local/Temp")) {
        if local.exists() {
            scan_temp_dir(&local, &mut candidates);
        }
    }

    if let Some(home) = dirs::home_dir() {
        let browser_caches = [
            ("Chrome Cache", home.join("AppData/Local/Google/Chrome/User Data/Default/Cache")),
            ("Edge Cache", home.join("AppData/Local/Microsoft/Edge/User Data/Default/Cache")),
            ("Firefox Cache", home.join("AppData/Local/Mozilla/Firefox/Profiles")),
        ];
        for (label, path) in browser_caches {
            if path.exists() && !safety::is_protected_path(&path) {
                scan_dir_limited(&path, label, &mut candidates, 500);
            }
        }
    }

    candidates.sort_by(|a, b| b.size.cmp(&a.size));
    candidates
}

fn scan_temp_dir(dir: &Path, out: &mut Vec<CleanupCandidate>) {
    if safety::is_protected_path(dir) {
        return;
    }
    scan_dir_limited(dir, "Temp", out, 1000);
}

fn scan_dir_limited(dir: &Path, category: &str, out: &mut Vec<CleanupCandidate>, max: usize) {
    if !dir.is_dir() || safety::is_protected_path(dir) {
        return;
    }

    let read_dir = match fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return,
    };

    for (i, entry) in read_dir.enumerate() {
        if i >= max {
            break;
        }
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let path = entry.path();
        if safety::is_protected_path(&path) {
            continue;
        }
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let name = entry.file_name().to_string_lossy().to_string();
        let size = if meta.is_dir() {
            dir_size_limited(&path, 3)
        } else {
            meta.len()
        };

        if size == 0 {
            continue;
        }

        out.push(CleanupCandidate {
            path: path.to_string_lossy().to_string(),
            name,
            size,
            category: category.to_string(),
            safe: true,
            reason: format!("Arquivo temporário ou cache ({category})"),
        });
    }
}

fn dir_size_limited(path: &Path, depth: u32) -> u64 {
    if depth == 0 || safety::is_protected_path(path) {
        return 0;
    }
    let mut total = 0u64;
    let read_dir = match fs::read_dir(path) {
        Ok(r) => r,
        Err(_) => return 0,
    };
    for entry in read_dir.flatten().take(200) {
        let p = entry.path();
        if safety::is_protected_path(&p) {
            continue;
        }
        if let Ok(m) = entry.metadata() {
            total += if m.is_dir() {
                dir_size_limited(&p, depth - 1)
            } else {
                m.len()
            };
        }
    }
    total
}

pub fn find_empty_folders(root: &Path, max: usize) -> Vec<CleanupCandidate> {
    let mut empty = Vec::new();
    find_empty_recursive(root, root, &mut empty, max);
    empty
}

fn find_empty_recursive(root: &Path, dir: &Path, out: &mut Vec<CleanupCandidate>, max: usize) {
    if out.len() >= max || safety::is_protected_path(dir) {
        return;
    }
    let read_dir = match fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return,
    };

    let mut has_content = false;
    for entry in read_dir.flatten() {
        let p = entry.path();
        if safety::is_protected_path(&p) {
            continue;
        }
        if p.is_dir() {
            find_empty_recursive(root, &p, out, max);
            if !has_content {
                has_content = true;
            }
        } else {
            has_content = true;
        }
    }

    if !has_content && dir != root {
        out.push(CleanupCandidate {
            path: dir.to_string_lossy().to_string(),
            name: dir
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default(),
            size: 0,
            category: "Empty Folder".to_string(),
            safe: true,
            reason: "Pasta vazia".to_string(),
        });
    }
}

pub fn auto_clean_temp() -> Result<Vec<String>, String> {
    let candidates = analyze_cleanup()
        .into_iter()
        .filter(|c| c.category == "Temp" && c.safe)
        .take(100)
        .collect::<Vec<_>>();

    let mut cleaned = Vec::new();
    for c in candidates {
        let path = PathBuf::from(&c.path);
        if safety::is_protected_path(&path) {
            continue;
        }
        let result = if path.is_dir() {
            fs::remove_dir_all(&path)
        } else {
            fs::remove_file(&path)
        };
        if result.is_ok() {
            cleaned.push(c.path);
        }
    }
    Ok(cleaned)
}
