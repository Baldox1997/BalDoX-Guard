//! SQLite persistence layer.

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DbError {
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

pub struct Database {
    conn: Connection,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanHistoryRow {
    pub id: i64,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub status: String,
    pub paths_scanned: String,
    pub files_count: i64,
    pub total_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileRow {
    pub id: i64,
    pub scan_id: i64,
    pub path: String,
    pub name: String,
    pub extension: Option<String>,
    pub size: i64,
    pub modified_at: Option<String>,
    pub created_at: Option<String>,
    pub file_type: String,
    pub partial_hash: Option<String>,
    pub full_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuarantineRow {
    pub id: i64,
    pub original_path: String,
    pub quarantine_path: String,
    pub size: i64,
    pub quarantined_at: String,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionRow {
    pub id: i64,
    pub action_type: String,
    pub status: String,
    pub details: String,
    pub created_at: String,
    pub completed_at: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledAppRow {
    pub id: i64,
    pub name: String,
    pub version: Option<String>,
    pub publisher: Option<String>,
    pub install_location: Option<String>,
    pub uninstall_string: Option<String>,
    pub size: Option<i64>,
    pub install_date: Option<String>,
    pub scanned_at: String,
}

impl Database {
    pub fn open() -> Result<Self, DbError> {
        let db_path = db_file_path();
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = Connection::open(&db_path)?;
        let db = Self { conn };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<(), DbError> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS scan_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                started_at TEXT NOT NULL,
                finished_at TEXT,
                status TEXT NOT NULL,
                paths_scanned TEXT NOT NULL,
                files_count INTEGER DEFAULT 0,
                total_size INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_id INTEGER NOT NULL,
                path TEXT NOT NULL,
                name TEXT NOT NULL,
                extension TEXT,
                size INTEGER NOT NULL,
                modified_at TEXT,
                created_at TEXT,
                file_type TEXT NOT NULL,
                partial_hash TEXT,
                full_hash TEXT,
                UNIQUE(scan_id, path),
                FOREIGN KEY (scan_id) REFERENCES scan_history(id)
            );

            CREATE INDEX IF NOT EXISTS idx_files_scan_id ON files(scan_id);
            CREATE INDEX IF NOT EXISTS idx_files_size ON files(size DESC);
            CREATE INDEX IF NOT EXISTS idx_files_hash ON files(full_hash);
            CREATE INDEX IF NOT EXISTS idx_files_modified ON files(modified_at);

            CREATE TABLE IF NOT EXISTS quarantine (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_path TEXT NOT NULL,
                quarantine_path TEXT NOT NULL,
                size INTEGER NOT NULL,
                quarantined_at TEXT NOT NULL,
                reason TEXT
            );

            CREATE TABLE IF NOT EXISTS actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_type TEXT NOT NULL,
                status TEXT NOT NULL,
                details TEXT NOT NULL,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                source TEXT
            );

            CREATE TABLE IF NOT EXISTS installed_apps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                version TEXT,
                publisher TEXT,
                install_location TEXT,
                uninstall_string TEXT,
                size INTEGER,
                install_date TEXT,
                scanned_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS baldox_chat (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                message_type TEXT,
                metadata TEXT,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_baldox_chat_created ON baldox_chat(created_at DESC);
            ",
        )?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, DbError> {
        self.conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), DbError> {
        self.conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn create_scan(&self, paths: &[String]) -> Result<i64, DbError> {
        let now = Utc::now().to_rfc3339();
        let paths_json = serde_json::to_string(paths).unwrap_or_else(|_| "[]".to_string());
        self.conn.execute(
            "INSERT INTO scan_history (started_at, status, paths_scanned) VALUES (?1, 'running', ?2)",
            params![now, paths_json],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn finish_scan(
        &self,
        scan_id: i64,
        status: &str,
        files_count: i64,
        total_size: i64,
    ) -> Result<(), DbError> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE scan_history SET finished_at = ?1, status = ?2, files_count = ?3, total_size = ?4 WHERE id = ?5",
            params![now, status, files_count, total_size, scan_id],
        )?;
        Ok(())
    }

    pub fn insert_file_batch(&self, scan_id: i64, files: &[(String, String, Option<String>, i64, Option<String>, Option<String>, String)]) -> Result<(), DbError> {
        let mut stmt = self.conn.prepare(
            "INSERT OR REPLACE INTO files (scan_id, path, name, extension, size, modified_at, created_at, file_type)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        )?;
        for (path, name, ext, size, modified, created, ftype) in files {
            stmt.execute(params![scan_id, path, name, ext, size, modified, created, ftype])?;
        }
        Ok(())
    }

    pub fn update_file_hash(&self, path: &str, partial: Option<&str>, full: Option<&str>) -> Result<(), DbError> {
        self.conn.execute(
            "UPDATE files SET partial_hash = COALESCE(?1, partial_hash), full_hash = COALESCE(?2, full_hash) WHERE path = ?3",
            params![partial, full, path],
        )?;
        Ok(())
    }

    pub fn get_latest_scan(&self) -> Result<Option<ScanHistoryRow>, DbError> {
        self.conn
            .query_row(
                "SELECT id, started_at, finished_at, status, paths_scanned, files_count, total_size
                 FROM scan_history ORDER BY id DESC LIMIT 1",
                [],
                |row| {
                    Ok(ScanHistoryRow {
                        id: row.get(0)?,
                        started_at: row.get(1)?,
                        finished_at: row.get(2)?,
                        status: row.get(3)?,
                        paths_scanned: row.get(4)?,
                        files_count: row.get(5)?,
                        total_size: row.get(6)?,
                    })
                },
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn get_scan_history(&self, limit: i64) -> Result<Vec<ScanHistoryRow>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, started_at, finished_at, status, paths_scanned, files_count, total_size
             FROM scan_history ORDER BY id DESC LIMIT ?1",
        )?;
        let rows = stmt
            .query_map(params![limit], |row| {
                Ok(ScanHistoryRow {
                    id: row.get(0)?,
                    started_at: row.get(1)?,
                    finished_at: row.get(2)?,
                    status: row.get(3)?,
                    paths_scanned: row.get(4)?,
                    files_count: row.get(5)?,
                    total_size: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn get_large_files(&self, scan_id: i64, min_size: i64, limit: i64) -> Result<Vec<FileRow>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, scan_id, path, name, extension, size, modified_at, created_at, file_type, partial_hash, full_hash
             FROM files WHERE scan_id = ?1 AND size >= ?2 AND file_type = 'file'
             ORDER BY size DESC LIMIT ?3",
        )?;
        let rows = stmt
            .query_map(params![scan_id, min_size, limit], map_file_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn get_old_files(&self, scan_id: i64, before: &str, limit: i64) -> Result<Vec<FileRow>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, scan_id, path, name, extension, size, modified_at, created_at, file_type, partial_hash, full_hash
             FROM files WHERE scan_id = ?1 AND file_type = 'file' AND modified_at IS NOT NULL AND modified_at < ?2
             ORDER BY modified_at ASC LIMIT ?3",
        )?;
        let rows = stmt
            .query_map(params![scan_id, before, limit], map_file_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn search_files(
        &self,
        scan_id: i64,
        name_pattern: Option<&str>,
        extension: Option<&str>,
        min_size: Option<i64>,
        max_size: Option<i64>,
        limit: i64,
    ) -> Result<Vec<FileRow>, DbError> {
        let mut sql = String::from(
            "SELECT id, scan_id, path, name, extension, size, modified_at, created_at, file_type, partial_hash, full_hash
             FROM files WHERE scan_id = ?1 AND file_type = 'file'",
        );
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(scan_id)];

        if let Some(pat) = name_pattern {
            sql.push_str(" AND name LIKE ?");
            params_vec.push(Box::new(format!("%{pat}%")));
        }
        if let Some(ext) = extension {
            sql.push_str(" AND extension = ?");
            params_vec.push(Box::new(ext.to_lowercase()));
        }
        if let Some(min) = min_size {
            sql.push_str(" AND size >= ?");
            params_vec.push(Box::new(min));
        }
        if let Some(max) = max_size {
            sql.push_str(" AND size <= ?");
            params_vec.push(Box::new(max));
        }
        sql.push_str(" ORDER BY size DESC LIMIT ?");
        params_vec.push(Box::new(limit));

        let param_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt
            .query_map(param_refs.as_slice(), map_file_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn get_files_by_size_for_duplicates(&self, scan_id: i64, min_size: i64) -> Result<Vec<FileRow>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, scan_id, path, name, extension, size, modified_at, created_at, file_type, partial_hash, full_hash
             FROM files WHERE scan_id = ?1 AND file_type = 'file' AND size >= ?2
             ORDER BY size DESC, name ASC",
        )?;
        let rows = stmt
            .query_map(params![scan_id, min_size], map_file_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn count_files_by_scan(&self, scan_id: i64) -> Result<(i64, i64), DbError> {
        let (count, total): (i64, i64) = self.conn.query_row(
            "SELECT COUNT(*), COALESCE(SUM(size), 0) FROM files WHERE scan_id = ?1 AND file_type = 'file'",
            params![scan_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;
        Ok((count, total))
    }

    pub fn get_dashboard_stats(&self, scan_id: i64) -> Result<DashboardDbStats, DbError> {
        let large_size: i64 = self.conn.query_row(
            "SELECT COALESCE(SUM(size), 0) FROM files WHERE scan_id = ?1 AND file_type = 'file' AND size >= 104857600",
            params![scan_id],
            |row| row.get(0),
        )?;

        let old_date = (Utc::now() - chrono::Duration::days(365)).to_rfc3339();
        let old_size: i64 = self.conn.query_row(
            "SELECT COALESCE(SUM(size), 0) FROM files WHERE scan_id = ?1 AND file_type = 'file' AND modified_at < ?2",
            params![scan_id, old_date],
            |row| row.get(0),
        )?;

        let large_count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM files WHERE scan_id = ?1 AND file_type = 'file' AND size >= 104857600",
            params![scan_id],
            |row| row.get(0),
        )?;

        let old_count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM files WHERE scan_id = ?1 AND file_type = 'file' AND modified_at < ?2",
            params![scan_id, old_date],
            |row| row.get(0),
        )?;

        Ok(DashboardDbStats {
            large_files_bytes: large_size,
            large_files_count: large_count,
            old_files_bytes: old_size,
            old_files_count: old_count,
        })
    }

    pub fn insert_quarantine(
        &self,
        original: &str,
        quarantine: &str,
        size: i64,
        reason: Option<&str>,
    ) -> Result<i64, DbError> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO quarantine (original_path, quarantine_path, size, quarantined_at, reason) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![original, quarantine, size, now, reason],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn list_quarantine(&self) -> Result<Vec<QuarantineRow>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, original_path, quarantine_path, size, quarantined_at, reason FROM quarantine ORDER BY quarantined_at DESC",
        )?;
        let rows = stmt
            .query_map([], |row| {
                Ok(QuarantineRow {
                    id: row.get(0)?,
                    original_path: row.get(1)?,
                    quarantine_path: row.get(2)?,
                    size: row.get(3)?,
                    quarantined_at: row.get(4)?,
                    reason: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn remove_quarantine_record(&self, id: i64) -> Result<Option<QuarantineRow>, DbError> {
        let row = self.conn
            .query_row(
                "SELECT id, original_path, quarantine_path, size, quarantined_at, reason FROM quarantine WHERE id = ?1",
                params![id],
                |row| {
                    Ok(QuarantineRow {
                        id: row.get(0)?,
                        original_path: row.get(1)?,
                        quarantine_path: row.get(2)?,
                        size: row.get(3)?,
                        quarantined_at: row.get(4)?,
                        reason: row.get(5)?,
                    })
                },
            )
            .optional()?;
        if row.is_some() {
            self.conn.execute("DELETE FROM quarantine WHERE id = ?1", params![id])?;
        }
        Ok(row)
    }

    pub fn log_action(
        &self,
        action_type: &str,
        status: &str,
        details: &str,
        source: Option<&str>,
    ) -> Result<i64, DbError> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO actions (action_type, status, details, created_at, source) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![action_type, status, details, now, source],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn complete_action(&self, id: i64, status: &str) -> Result<(), DbError> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE actions SET status = ?1, completed_at = ?2 WHERE id = ?3",
            params![status, now, id],
        )?;
        Ok(())
    }

    pub fn list_actions(&self, limit: i64) -> Result<Vec<ActionRow>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, action_type, status, details, created_at, completed_at, source FROM actions ORDER BY id DESC LIMIT ?1",
        )?;
        let rows = stmt
            .query_map(params![limit], |row| {
                Ok(ActionRow {
                    id: row.get(0)?,
                    action_type: row.get(1)?,
                    status: row.get(2)?,
                    details: row.get(3)?,
                    created_at: row.get(4)?,
                    completed_at: row.get(5)?,
                    source: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn replace_installed_apps(&self, apps: &[InstalledAppRow]) -> Result<(), DbError> {
        self.conn.execute("DELETE FROM installed_apps", [])?;
        let now = Utc::now().to_rfc3339();
        let mut stmt = self.conn.prepare(
            "INSERT INTO installed_apps (name, version, publisher, install_location, uninstall_string, size, install_date, scanned_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        )?;
        for app in apps {
            stmt.execute(params![
                app.name,
                app.version,
                app.publisher,
                app.install_location,
                app.uninstall_string,
                app.size,
                app.install_date,
                now
            ])?;
        }
        Ok(())
    }

    pub fn list_installed_apps(&self) -> Result<Vec<InstalledAppRow>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, version, publisher, install_location, uninstall_string, size, install_date, scanned_at
             FROM installed_apps ORDER BY name ASC",
        )?;
        let rows = stmt
            .query_map([], |row| {
                Ok(InstalledAppRow {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    version: row.get(2)?,
                    publisher: row.get(3)?,
                    install_location: row.get(4)?,
                    uninstall_string: row.get(5)?,
                    size: row.get(6)?,
                    install_date: row.get(7)?,
                    scanned_at: row.get(8)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn clear_files_for_scan(&self, scan_id: i64) -> Result<(), DbError> {
        self.conn.execute("DELETE FROM files WHERE scan_id = ?1", params![scan_id])?;
        Ok(())
    }

    pub fn get_storage_breakdown(&self, scan_id: i64) -> Result<Vec<StorageCategoryRow>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT extension, name, size FROM files WHERE scan_id = ?1 AND file_type = 'file'",
        )?;
        let rows = stmt
            .query_map(params![scan_id], |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i64>(2)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;

        let mut categories: std::collections::HashMap<String, (i64, i64)> = std::collections::HashMap::new();
        for (ext, name, size) in rows {
            let cat = extension_to_category(ext.as_deref(), &name);
            let entry = categories.entry(cat.to_string()).or_insert((0, 0));
            entry.0 += size;
            entry.1 += 1;
        }

        let labels: std::collections::HashMap<&str, &str> = [
            ("images", "Imagens"),
            ("videos", "Vídeos"),
            ("documents", "Documentos"),
            ("apps", "Aplicativos"),
            ("archives", "Arquivos compactados"),
            ("music", "Música"),
            ("other", "Outros"),
        ]
        .into_iter()
        .collect();

        let mut result: Vec<StorageCategoryRow> = categories
            .into_iter()
            .map(|(category, (bytes, count))| StorageCategoryRow {
                category: category.clone(),
                label: labels.get(category.as_str()).unwrap_or(&"Outros").to_string(),
                bytes,
                count,
            })
            .collect();
        result.sort_by(|a, b| b.bytes.cmp(&a.bytes));
        Ok(result)
    }

    pub fn get_largest_folders(&self, scan_id: i64, limit: i64) -> Result<Vec<LargestFolderRow>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT path, size FROM files WHERE scan_id = ?1 AND file_type = 'file'",
        )?;
        let rows = stmt
            .query_map(params![scan_id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
            })?
            .collect::<Result<Vec<_>, _>>()?;

        let mut folder_map: std::collections::HashMap<String, (i64, i64)> = std::collections::HashMap::new();
        for (path, size) in rows {
            if let Some(parent) = std::path::Path::new(&path).parent() {
                let parent_str = parent.to_string_lossy().to_string();
                let entry = folder_map.entry(parent_str).or_insert((0, 0));
                entry.0 += size;
                entry.1 += 1;
            }
        }

        let mut folders: Vec<LargestFolderRow> = folder_map
            .into_iter()
            .map(|(path, (bytes, file_count))| {
                let name = std::path::Path::new(&path)
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| path.clone());
                LargestFolderRow {
                    path,
                    name,
                    bytes,
                    file_count,
                }
            })
            .collect();
        folders.sort_by(|a, b| b.bytes.cmp(&a.bytes));
        folders.truncate(limit as usize);
        Ok(folders)
    }

    pub fn search_files_advanced(
        &self,
        scan_id: i64,
        name_pattern: Option<&str>,
        extension: Option<&str>,
        min_size: Option<i64>,
        max_size: Option<i64>,
        modified_after: Option<&str>,
        modified_before: Option<&str>,
        empty_only: bool,
        duplicates_only: bool,
        limit: i64,
    ) -> Result<Vec<FileRow>, DbError> {
        let mut sql = String::from(
            "SELECT f.id, f.scan_id, f.path, f.name, f.extension, f.size, f.modified_at, f.created_at, f.file_type, f.partial_hash, f.full_hash
             FROM files f WHERE f.scan_id = ?1 AND f.file_type = 'file'",
        );
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(scan_id)];

        if duplicates_only {
            sql.push_str(
                " AND f.full_hash IS NOT NULL AND f.full_hash IN (
                    SELECT full_hash FROM files WHERE scan_id = ?1 AND full_hash IS NOT NULL
                    GROUP BY full_hash HAVING COUNT(*) > 1
                )",
            );
        }
        if empty_only {
            sql.push_str(" AND f.size = 0");
        }
        if let Some(pat) = name_pattern {
            sql.push_str(" AND f.name LIKE ?");
            params_vec.push(Box::new(format!("%{pat}%")));
        }
        if let Some(ext) = extension {
            sql.push_str(" AND f.extension = ?");
            params_vec.push(Box::new(ext.to_lowercase()));
        }
        if let Some(min) = min_size {
            sql.push_str(" AND f.size >= ?");
            params_vec.push(Box::new(min));
        }
        if let Some(max) = max_size {
            sql.push_str(" AND f.size <= ?");
            params_vec.push(Box::new(max));
        }
        if let Some(after) = modified_after {
            sql.push_str(" AND f.modified_at >= ?");
            params_vec.push(Box::new(after.to_string()));
        }
        if let Some(before) = modified_before {
            sql.push_str(" AND f.modified_at <= ?");
            params_vec.push(Box::new(before.to_string()));
        }
        sql.push_str(" ORDER BY f.size DESC LIMIT ?");
        params_vec.push(Box::new(limit));

        let param_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt
            .query_map(param_refs.as_slice(), map_file_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct DashboardDbStats {
    pub large_files_bytes: i64,
    pub large_files_count: i64,
    pub old_files_bytes: i64,
    pub old_files_count: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct StorageCategoryRow {
    pub category: String,
    pub label: String,
    pub bytes: i64,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct LargestFolderRow {
    pub path: String,
    pub name: String,
    pub bytes: i64,
    pub file_count: i64,
}

fn extension_to_category(ext: Option<&str>, name: &str) -> &'static str {
    let ext = ext.map(|e| e.to_lowercase()).unwrap_or_default();
    match ext.as_str() {
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "bmp" | "svg" | "ico" | "heic" => "images",
        "mp4" | "mkv" | "avi" | "mov" | "wmv" | "webm" => "videos",
        "pdf" | "doc" | "docx" | "txt" | "rtf" | "odt" | "xls" | "xlsx" | "ppt" | "pptx" => {
            "documents"
        }
        "exe" | "msi" | "msix" | "dll" => "apps",
        "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" => "archives",
        "mp3" | "wav" | "flac" | "aac" | "ogg" => "music",
        _ => {
            if name.ends_with(".tmp") || name.ends_with(".log") {
                "other"
            } else {
                "other"
            }
        }
    }
}

fn map_file_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<FileRow> {
    Ok(FileRow {
        id: row.get(0)?,
        scan_id: row.get(1)?,
        path: row.get(2)?,
        name: row.get(3)?,
        extension: row.get(4)?,
        size: row.get(5)?,
        modified_at: row.get(6)?,
        created_at: row.get(7)?,
        file_type: row.get(8)?,
        partial_hash: row.get(9)?,
        full_hash: row.get(10)?,
    })
}

pub fn db_file_path() -> PathBuf {
    let preferred = PathBuf::from(r"D:\SmartPCManager\smart-pc-manager.db");
    if preferred
        .parent()
        .map(|p| p.exists() || std::fs::create_dir_all(p).is_ok())
        .unwrap_or(false)
    {
        return preferred;
    }
    let base = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("SmartPCManager").join("smart-pc-manager.db")
}

pub fn quarantine_dir() -> PathBuf {
    if let Some(setting) = Database::open().ok().and_then(|db| db.get_setting("quarantine_path").ok().flatten()) {
        return PathBuf::from(setting);
    }
    let preferred = PathBuf::from(r"D:\SmartPCManager\Quarantine");
    if preferred.parent().map(|p| p.exists()).unwrap_or(false) || std::fs::create_dir_all(&preferred).is_ok() {
        return preferred;
    }
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("SmartPCManager")
        .join("Quarantine")
}

pub fn days_ago_iso(days: i64) -> String {
    (Utc::now() - chrono::Duration::days(days)).to_rfc3339()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessageRow {
    pub id: i64,
    pub role: String,
    pub content: String,
    pub message_type: Option<String>,
    pub metadata: Option<String>,
    pub created_at: String,
}

impl Database {
    pub fn save_chat_message(
        &self,
        role: &str,
        content: &str,
        message_type: Option<&str>,
        metadata: Option<&str>,
    ) -> Result<i64, DbError> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO baldox_chat (role, content, message_type, metadata, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![role, content, message_type, metadata, now],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn get_chat_history(&self, limit: i64) -> Result<Vec<ChatMessageRow>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, role, content, message_type, metadata, created_at FROM baldox_chat ORDER BY id DESC LIMIT ?1",
        )?;
        let rows = stmt
            .query_map(params![limit], |row| {
                Ok(ChatMessageRow {
                    id: row.get(0)?,
                    role: row.get(1)?,
                    content: row.get(2)?,
                    message_type: row.get(3)?,
                    metadata: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        let mut out = rows;
        out.reverse();
        Ok(out)
    }

    pub fn clear_chat_history(&self) -> Result<(), DbError> {
        self.conn.execute("DELETE FROM baldox_chat", [])?;
        Ok(())
    }
}
