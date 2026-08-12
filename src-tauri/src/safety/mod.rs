//! Safety checks — blocks destructive operations on protected system paths.

use std::path::{Path, PathBuf};

const PROTECTED_PREFIXES: &[&str] = &[
    r"C:\Windows",
    r"C:\Program Files",
    r"C:\Program Files (x86)",
    r"C:\ProgramData",
    r"C:\System Volume Information",
    r"C:\$Recycle.Bin",
    r"C:\Recovery",
    r"C:\Boot",
    r"C:\PerfLogs",
];

const PROTECTED_SEGMENTS: &[&str] = &[
    "System32",
    "SysWOW64",
    "WinSxS",
    "AppData\\Local\\Microsoft\\Windows",
];

/// Returns true if the path is protected and must not be modified or deleted.
pub fn is_protected_path(path: &Path) -> bool {
    let normalized = normalize_path(path);

    for prefix in PROTECTED_PREFIXES {
        let protected = PathBuf::from(prefix);
        if normalized.starts_with(&protected) {
            return true;
        }
    }

    let path_str = normalized.to_string_lossy();
    for segment in PROTECTED_SEGMENTS {
        if path_str.contains(segment) {
            return true;
        }
    }

    false
}

/// Validates that a path is safe for destructive operations.
pub fn validate_safe_path(path: &Path) -> Result<(), String> {
    if is_protected_path(path) {
        return Err(format!(
            "Caminho protegido do sistema: {}",
            path.display()
        ));
    }
    Ok(())
}

fn normalize_path(path: &Path) -> PathBuf {
    let mut result = PathBuf::new();
    for component in path.components() {
        result.push(component.as_os_str().to_string_lossy().to_string());
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blocks_windows_folder() {
        assert!(is_protected_path(Path::new(r"C:\Windows\System32\kernel32.dll")));
    }

    #[test]
    fn allows_user_downloads() {
        assert!(!is_protected_path(Path::new(
            r"C:\Users\Test\Downloads\file.zip"
        )));
    }
}
