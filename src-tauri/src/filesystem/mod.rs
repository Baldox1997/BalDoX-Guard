//! File system utilities — metadata, hashing, directory listing.

use crate::safety;
use chrono::{DateTime, Utc};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize)]
pub struct FileMetadata {
    pub path: String,
    pub name: String,
    pub extension: Option<String>,
    pub size: u64,
    pub modified_at: Option<String>,
    pub created_at: Option<String>,
    pub file_type: String,
    pub is_protected: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct DirEntry {
    pub path: String,
    pub name: String,
    pub extension: Option<String>,
    pub size: u64,
    pub modified_at: Option<String>,
    pub file_type: String,
    pub is_protected: bool,
}

pub fn classify_file_type(path: &Path, metadata: &fs::Metadata) -> String {
    if metadata.is_dir() {
        "directory".to_string()
    } else if metadata.is_symlink() {
        "symlink".to_string()
    } else {
        "file".to_string()
    }
}

pub fn get_extension(name: &str) -> Option<String> {
    Path::new(name)
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .filter(|e| !e.is_empty())
}

pub fn metadata_to_iso(time: Option<std::time::SystemTime>) -> Option<String> {
    time.map(|t| {
        let dt: DateTime<Utc> = t.into();
        dt.to_rfc3339()
    })
}

pub fn read_metadata(path: &Path) -> Result<FileMetadata, String> {
    let meta = fs::metadata(path).map_err(|e| format!("Erro ao ler metadados: {e}"))?;
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    Ok(FileMetadata {
        path: path.to_string_lossy().to_string(),
        name,
        extension: path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase()),
        size: meta.len(),
        modified_at: metadata_to_iso(meta.modified().ok()),
        created_at: metadata_to_iso(meta.created().ok()),
        file_type: classify_file_type(path, &meta),
        is_protected: safety::is_protected_path(path),
    })
}

pub fn list_directory(path: &Path) -> Result<Vec<DirEntry>, String> {
    if !path.exists() {
        return Err(format!("Caminho não existe: {}", path.display()));
    }
    if !path.is_dir() {
        return Err(format!("Não é um diretório: {}", path.display()));
    }

    let mut entries = Vec::new();
    let read_dir = fs::read_dir(path).map_err(|e| format!("Erro ao listar diretório: {e}"))?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Erro ao ler entrada: {e}"))?;
        let entry_path = entry.path();
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let name = entry
            .file_name()
            .to_string_lossy()
            .to_string();

        entries.push(DirEntry {
            path: entry_path.to_string_lossy().to_string(),
            name,
            extension: get_extension(entry_path.file_name().unwrap_or_default().to_str().unwrap_or("")),
            size: if meta.is_dir() { 0 } else { meta.len() },
            modified_at: metadata_to_iso(meta.modified().ok()),
            file_type: classify_file_type(&entry_path, &meta),
            is_protected: safety::is_protected_path(&entry_path),
        });
    }

    entries.sort_by(|a, b| {
        match (a.file_type.as_str(), b.file_type.as_str()) {
            ("directory", "file") => std::cmp::Ordering::Less,
            ("file", "directory") => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

pub fn partial_hash(path: &Path, sample_bytes: u64) -> Result<String, String> {
    let mut file = File::open(path).map_err(|e| format!("Erro ao abrir arquivo: {e}"))?;
    let meta = file.metadata().map_err(|e| e.to_string())?;
    let size = meta.len();
    let mut hasher = Sha256::new();
    hasher.update(size.to_le_bytes());

    let mut buf = vec![0u8; sample_bytes.min(65536) as usize];
    let read = file.read(&mut buf).map_err(|e| e.to_string())?;
    hasher.update(&buf[..read]);

    if size > sample_bytes {
        let seek_pos = size.saturating_sub(sample_bytes);
        file.seek(SeekFrom::Start(seek_pos)).map_err(|e| e.to_string())?;
        let read = file.read(&mut buf).map_err(|e| e.to_string())?;
        hasher.update(&buf[..read]);
    }

    Ok(hex::encode(hasher.finalize()))
}

pub fn full_hash(path: &Path) -> Result<String, String> {
    let mut file = File::open(path).map_err(|e| format!("Erro ao abrir arquivo: {e}"))?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 65536];
    loop {
        let n = file.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(hex::encode(hasher.finalize()))
}

pub fn special_folders() -> Vec<(String, String)> {
    let mut folders = Vec::new();
    if let Some(home) = dirs::home_dir() {
        let candidates = [
            ("Downloads", home.join("Downloads")),
            ("Documents", home.join("Documents")),
            ("Desktop", home.join("Desktop")),
            ("Pictures", home.join("Pictures")),
            ("Videos", home.join("Videos")),
            ("Music", home.join("Music")),
        ];
        for (label, path) in candidates {
            if path.exists() {
                folders.push((label.to_string(), path.to_string_lossy().to_string()));
            }
        }
    }
    folders
}

pub fn available_drives() -> Vec<(String, String)> {
    let mut drives = Vec::new();
    for letter in b'A'..=b'Z' {
        let root = format!("{}:\\", letter as char);
        let path = PathBuf::from(&root);
        if path.exists() {
            drives.push((format!("{}:", letter as char), root));
        }
    }
    drives
}

#[derive(Debug, Clone, Serialize)]
pub struct FolderAnalysisResult {
    pub path: String,
    pub total_bytes: u64,
    pub file_count: u64,
    pub folder_count: u64,
    pub subfolders: Vec<SubfolderSize>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SubfolderSize {
    pub path: String,
    pub name: String,
    pub bytes: i64,
    pub file_count: i64,
}

pub fn analyze_folder(path_str: &str, depth: u32) -> Result<FolderAnalysisResult, String> {
    let path = PathBuf::from(path_str);
    if !path.exists() {
        return Err(format!("Caminho não existe: {path_str}"));
    }
    if !path.is_dir() {
        return Err(format!("Não é um diretório: {path_str}"));
    }

    let mut total_bytes = 0u64;
    let mut file_count = 0u64;
    let mut folder_count = 0u64;
    let mut subfolder_sizes: Vec<(String, String, i64, i64)> = Vec::new();

    if depth > 0 {
        let read_dir = fs::read_dir(&path).map_err(|e| e.to_string())?;
        for entry in read_dir {
            let entry = entry.map_err(|e| e.to_string())?;
            let entry_path = entry.path();
            if entry_path.is_dir() {
                folder_count += 1;
                let name = entry_path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                let (sub_bytes, sub_files) = dir_size_recursive(&entry_path)?;
                subfolder_sizes.push((
                    entry_path.to_string_lossy().to_string(),
                    name,
                    sub_bytes as i64,
                    sub_files,
                ));
                total_bytes += sub_bytes;
                file_count += sub_files as u64;
            } else if let Ok(meta) = entry.metadata() {
                file_count += 1;
                total_bytes += meta.len();
            }
        }
    } else {
        let (bytes, files, folders) = dir_size_full(&path)?;
        total_bytes = bytes;
        file_count = files;
        folder_count = folders;
    }

    subfolder_sizes.sort_by(|a, b| b.2.cmp(&a.2));

    Ok(FolderAnalysisResult {
        path: path_str.to_string(),
        total_bytes,
        file_count,
        folder_count,
        subfolders: subfolder_sizes
            .into_iter()
            .take(20)
            .map(|(path, name, bytes, file_count)| SubfolderSize {
                path,
                name,
                bytes,
                file_count,
            })
            .collect(),
    })
}

fn dir_size_recursive(path: &Path) -> Result<(u64, i64), String> {
    let mut total = 0u64;
    let mut files = 0i64;
    let read_dir = fs::read_dir(path).map_err(|e| e.to_string())?;
    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        if entry_path.is_dir() {
            let (sub, sub_files) = dir_size_recursive(&entry_path)?;
            total += sub;
            files += sub_files;
        } else if let Ok(meta) = entry.metadata() {
            total += meta.len();
            files += 1;
        }
    }
    Ok((total, files))
}

fn dir_size_full(path: &Path) -> Result<(u64, u64, u64), String> {
    let mut total = 0u64;
    let mut files = 0u64;
    let mut folders = 0u64;
    let read_dir = fs::read_dir(path).map_err(|e| e.to_string())?;
    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        if entry_path.is_dir() {
            folders += 1;
            let (sub, sub_files, sub_folders) = dir_size_full(&entry_path)?;
            total += sub;
            files += sub_files;
            folders += sub_folders;
        } else if let Ok(meta) = entry.metadata() {
            total += meta.len();
            files += 1;
        }
    }
    Ok((total, files, folders))
}

pub fn search_live_directory(
    root: &str,
    name_pattern: Option<&str>,
    max_results: usize,
) -> Result<Vec<DirEntry>, String> {
    let root_path = PathBuf::from(root);
    if !root_path.exists() {
        return Err(format!("Caminho não existe: {root}"));
    }

    let pattern = name_pattern.map(|p| p.to_lowercase());
    let mut results = Vec::new();
    search_live_recursive(&root_path, pattern.as_deref(), &mut results, max_results)?;
    Ok(results)
}

fn search_live_recursive(
    path: &Path,
    pattern: Option<&str>,
    results: &mut Vec<DirEntry>,
    max: usize,
) -> Result<(), String> {
    if results.len() >= max {
        return Ok(());
    }
    if safety::is_protected_path(path) {
        return Ok(());
    }

    let read_dir = match fs::read_dir(path) {
        Ok(d) => d,
        Err(_) => return Ok(()),
    };

    for entry in read_dir {
        if results.len() >= max {
            break;
        }
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if let Some(pat) = pattern {
            if !name.to_lowercase().contains(pat) {
                if entry_path.is_dir() {
                    search_live_recursive(&entry_path, pattern, results, max)?;
                }
                continue;
            }
        }

        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        results.push(DirEntry {
            path: entry_path.to_string_lossy().to_string(),
            name: name.clone(),
            extension: get_extension(&name),
            size: if meta.is_dir() { 0 } else { meta.len() },
            modified_at: metadata_to_iso(meta.modified().ok()),
            file_type: classify_file_type(&entry_path, &meta),
            is_protected: safety::is_protected_path(&entry_path),
        });

        if entry_path.is_dir() {
            search_live_recursive(&entry_path, pattern, results, max)?;
        }
    }
    Ok(())
}

pub fn categorize_by_extension(name: &str) -> &'static str {
    let ext = get_extension(name).unwrap_or_default();
    match ext.as_str() {
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "bmp" | "svg" | "ico" | "heic" => "Images",
        "pdf" | "doc" | "docx" | "txt" | "rtf" | "odt" | "xls" | "xlsx" | "ppt" | "pptx" => {
            "Documents"
        }
        "exe" | "msi" | "msix" => "Installers",
        "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" => "Archives",
        "mp4" | "mkv" | "avi" | "mov" | "wmv" => "Videos",
        "mp3" | "wav" | "flac" | "aac" | "ogg" => "Music",
        _ => "Other",
    }
}
