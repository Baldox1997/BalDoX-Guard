mod actions;
mod cleaner;
mod commands;
mod database;
mod filesystem;
mod organizer;
mod safety;
mod scanner;
mod uninstaller;

use database::Database;
use parking_lot::Mutex;
use scanner::ScannerState;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = Arc::new(Mutex::new(
        Database::open().expect("Failed to open database"),
    ));
    let scanner = Arc::new(ScannerState::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(db)
        .manage(scanner)
        .invoke_handler(tauri::generate_handler![
            commands::get_app_info,
            commands::get_drives,
            commands::get_special_folders,
            commands::start_scan,
            commands::cancel_scan,
            commands::get_scan_progress,
            commands::get_latest_scan,
            commands::find_duplicates,
            commands::list_dir,
            commands::get_file_metadata,
            commands::get_file_hash,
            commands::create_folder,
            commands::open_in_explorer,
            commands::search_live_path,
            commands::search_files_advanced,
            commands::search_files,
            commands::get_large_files,
            commands::get_old_files,
            commands::preview_action,
            commands::execute_action,
            commands::quarantine_file,
            commands::restore_quarantine,
            commands::delete_quarantine_permanent,
            commands::list_quarantine,
            commands::analyze_cleanup_candidates,
            commands::find_empty_folders_cmd,
            commands::clean_selected,
            commands::auto_clean_temp_safe,
            commands::scan_apps,
            commands::list_apps,
            commands::get_app_leftovers,
            commands::uninstall_app,
            commands::analyze_organization,
            commands::execute_organization,
            commands::get_downloads_path,
            commands::get_dashboard_data,
            commands::check_disk_space_alert,
            commands::get_scan_history,
            commands::get_action_history,
            commands::log_baldox_action,
            commands::get_settings,
            commands::save_settings,
            commands::get_baldox_memory,
            commands::set_baldox_memory,
            commands::save_chat_message,
            commands::get_chat_history,
            commands::clear_chat_history,
            commands::log_conversation,
            commands::is_path_protected,
            commands::validate_path,
            commands::get_system_info,
            commands::get_all_drives_stats,
            commands::get_drives_overview,
            commands::get_storage_breakdown,
            commands::get_largest_folders,
            commands::get_control_panel_data,
            commands::analyze_folder_size,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
