//! Incremental directory scanner with progress events and cancel support.

use crate::database::Database;
use crate::filesystem::{classify_file_type, get_extension, metadata_to_iso};
use crate::safety;
use parking_lot::Mutex;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use tauri::{AppHandle, Emitter};
use walkdir::WalkDir;

const BATCH_SIZE: usize = 200;

#[derive(Debug, Clone, Serialize)]
pub struct ScanProgress {
    pub scan_id: i64,
    pub status: String,
    pub files_scanned: u64,
    pub total_size: u64,
    pub current_path: String,
    pub elapsed_secs: u64,
}

pub struct ScannerState {
    pub cancel_flag: Arc<AtomicBool>,
    pub progress: Mutex<ScanProgress>,
    pub running: Mutex<bool>,
}

impl ScannerState {
    pub fn new() -> Self {
        Self {
            cancel_flag: Arc::new(AtomicBool::new(false)),
            progress: Mutex::new(ScanProgress {
                scan_id: 0,
                status: "idle".to_string(),
                files_scanned: 0,
                total_size: 0,
                current_path: String::new(),
                elapsed_secs: 0,
            }),
            running: Mutex::new(false),
        }
    }

    pub fn get_progress(&self) -> ScanProgress {
        self.progress.lock().clone()
    }

    pub fn is_running(&self) -> bool {
        *self.running.lock()
    }

    pub fn cancel(&self) {
        self.cancel_flag.store(true, Ordering::SeqCst);
    }
}

pub fn start_scan(
    app: AppHandle,
    db: Arc<Mutex<Database>>,
    scanner: Arc<ScannerState>,
    paths: Vec<String>,
) -> Result<i64, String> {
    if scanner.is_running() {
        return Err("Já existe uma varredura em andamento.".to_string());
    }

    let scan_id = {
        let db = db.lock();
        db.create_scan(&paths).map_err(|e| e.to_string())?
    };

    scanner.cancel_flag.store(false, Ordering::SeqCst);
    *scanner.running.lock() = true;
    {
        let mut prog = scanner.progress.lock();
        *prog = ScanProgress {
            scan_id,
            status: "running".to_string(),
            files_scanned: 0,
            total_size: 0,
            current_path: paths.first().cloned().unwrap_or_default(),
            elapsed_secs: 0,
        };
    }

    let cancel = scanner.cancel_flag.clone();
    let scanner_ref = scanner.clone();

    thread::spawn(move || {
        let started = std::time::Instant::now();
        let mut batch: Vec<(String, String, Option<String>, i64, Option<String>, Option<String>, String)> =
            Vec::with_capacity(BATCH_SIZE);
        let mut files_count: u64 = 0;
        let mut total_size: u64 = 0;
        let mut cancelled = false;

        'paths: for root in &paths {
            if cancel.load(Ordering::SeqCst) {
                cancelled = true;
                break;
            }

            let root_path = PathBuf::from(root);
            if !root_path.exists() {
                continue;
            }

            if safety::is_protected_path(&root_path) {
                continue;
            }

            for entry in WalkDir::new(&root_path)
                .follow_links(false)
                .into_iter()
                .filter_entry(|e| !safety::is_protected_path(e.path()))
            {
                if cancel.load(Ordering::SeqCst) {
                    cancelled = true;
                    break 'paths;
                }

                let entry = match entry {
                    Ok(e) => e,
                    Err(_) => continue,
                };

                let path = entry.path();
                let meta = match entry.metadata() {
                    Ok(m) => m,
                    Err(_) => continue,
                };

                let name = path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                let ftype = classify_file_type(path, &meta);
                let size = if meta.is_file() { meta.len() } else { 0 };

                if meta.is_file() {
                    files_count += 1;
                    total_size += size;
                }

                batch.push((
                    path.to_string_lossy().to_string(),
                    name,
                    get_extension(path.file_name().unwrap_or_default().to_str().unwrap_or("")),
                    size as i64,
                    metadata_to_iso(meta.modified().ok()),
                    metadata_to_iso(meta.created().ok()),
                    ftype,
                ));

                if batch.len() >= BATCH_SIZE {
                    let db = db.lock();
                    let _ = db.insert_file_batch(scan_id, &batch);
                    batch.clear();
                }

                if files_count % 50 == 0 {
                    let elapsed = started.elapsed().as_secs();
                    {
                        let mut prog = scanner_ref.progress.lock();
                        prog.files_scanned = files_count;
                        prog.total_size = total_size;
                        prog.current_path = path.to_string_lossy().to_string();
                        prog.elapsed_secs = elapsed;
                    }
                    let _ = app.emit(
                        "scan-progress",
                        scanner_ref.get_progress(),
                    );
                }
            }
        }

        if !batch.is_empty() {
            let db = db.lock();
            let _ = db.insert_file_batch(scan_id, &batch);
        }

        let status = if cancelled { "cancelled" } else { "completed" };
        {
            let db = db.lock();
            let _ = db.finish_scan(scan_id, status, files_count as i64, total_size as i64);
        }

        {
            let mut prog = scanner_ref.progress.lock();
            prog.status = status.to_string();
            prog.files_scanned = files_count;
            prog.total_size = total_size;
            prog.elapsed_secs = started.elapsed().as_secs();
        }

        *scanner_ref.running.lock() = false;
        let _ = app.emit("scan-progress", scanner_ref.get_progress());
        let _ = app.emit("scan-complete", scanner_ref.get_progress());
    });

    Ok(scan_id)
}

pub fn find_duplicate_groups(
    db: &Database,
    scan_id: i64,
    min_size: i64,
) -> Result<Vec<DuplicateGroup>, String> {
    use crate::filesystem::{full_hash, partial_hash};
    use std::collections::HashMap;

    let files = db
        .get_files_by_size_for_duplicates(scan_id, min_size)
        .map_err(|e| e.to_string())?;

    let mut by_size: HashMap<i64, Vec<crate::database::FileRow>> = HashMap::new();
    for file in files {
        by_size.entry(file.size).or_default().push(file);
    }

    let mut groups = Vec::new();
    let mut group_id = 0i64;

    for (_size, mut size_group) in by_size {
        if size_group.len() < 2 {
            continue;
        }

        let mut by_partial: HashMap<String, Vec<crate::database::FileRow>> = HashMap::new();
        for file in &size_group {
            let path = Path::new(&file.path);
            let partial = partial_hash(path, 4096).unwrap_or_default();
            let _ = db.update_file_hash(&file.path, Some(&partial), None);
            by_partial.entry(partial).or_default().push(file.clone());
        }

        for (_partial, candidates) in by_partial {
            if candidates.len() < 2 {
                continue;
            }

            let mut by_full: HashMap<String, Vec<crate::database::FileRow>> = HashMap::new();
            for file in candidates {
                let path = Path::new(&file.path);
                let full = full_hash(path).unwrap_or_default();
                let _ = db.update_file_hash(&file.path, None, Some(&full));
                by_full.entry(full).or_default().push(file);
            }

            for (_hash, dup_files) in by_full {
                if dup_files.len() >= 2 {
                    group_id += 1;
                    let total_waste = dup_files.iter().map(|f| f.size).sum::<i64>()
                        - dup_files.first().map(|f| f.size).unwrap_or(0);
                    groups.push(DuplicateGroup {
                        id: group_id,
                        files: dup_files,
                        wasted_bytes: total_waste,
                    });
                }
            }
        }
    }

    groups.sort_by(|a, b| b.wasted_bytes.cmp(&a.wasted_bytes));
    Ok(groups)
}

#[derive(Debug, Clone, Serialize)]
pub struct DuplicateGroup {
    pub id: i64,
    pub files: Vec<crate::database::FileRow>,
    pub wasted_bytes: i64,
}
