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

use tauri::{

    menu::{Menu, MenuItem},

    tray::{TrayIconBuilder, TrayIconEvent},

    Emitter, Manager,
};



#[cfg_attr(mobile, tauri::mobile_entry_point)]

pub fn run() {

    let db = Arc::new(Mutex::new(

        Database::open().expect("Failed to open database"),

    ));

    let scanner = Arc::new(ScannerState::new());

    let db_for_setup = db.clone();



    tauri::Builder::default()

        .plugin(tauri_plugin_opener::init())

        .plugin(tauri_plugin_notification::init())

        .manage(db)

        .manage(scanner)

        .setup(move |app| {

            let open_i = MenuItem::with_id(app, "open", "Abrir BalDoX Guard", true, None::<&str>)?;

            let chat_i = MenuItem::with_id(app, "chat", "BalDoX Chat", true, None::<&str>)?;

            let scan_i = MenuItem::with_id(app, "scan", "Quick Scan", true, None::<&str>)?;

            let quit_i = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&open_i, &chat_i, &scan_i, &quit_i])?;



            let icon = app

                .default_window_icon()

                .cloned()

                .expect("missing tray icon");



            let app_handle = app.handle().clone();

            TrayIconBuilder::new()

                .icon(icon)

                .tooltip("BalDoX Guard — Secretário ativo")

                .menu(&menu)

                .on_menu_event(move |app, event| {

                    let id = event.id.as_ref();

                    if let Some(window) = app.get_webview_window("main") {

                        match id {

                            "open" => {

                                let _ = window.show();

                                let _ = window.set_focus();

                            }

                            "chat" => {

                                let _ = window.show();

                                let _ = window.set_focus();

                                let _ = app.emit("tray-navigate", "/assistant");

                            }

                            "scan" => {

                                let _ = window.show();

                                let _ = window.set_focus();

                                let _ = app.emit("tray-quick-scan", ());

                            }

                            "quit" => {

                                app.exit(0);

                            }

                            _ => {}

                        }

                    } else if id == "quit" {

                        app.exit(0);

                    }

                })

                .on_tray_icon_event(|tray, event| {

                    if let TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, button_state: tauri::tray::MouseButtonState::Up, .. } = event {

                        if let Some(window) = tray.app_handle().get_webview_window("main") {

                            let _ = window.show();

                            let _ = window.set_focus();

                        }

                    }

                })

                .build(app)?;



            let _ = app_handle;

            let _ = db_for_setup;

            Ok(())

        })

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

            commands::llm_chat_completion,

            commands::check_ollama_status,

            commands::ollama_chat_completion,

        ])

        .on_window_event(|window, event| {

            if let tauri::WindowEvent::CloseRequested { api, .. } = event {

                let db = window.state::<Arc<Mutex<Database>>>();

                let minimize = db.lock()

                    .get_setting("app_settings")

                    .ok()

                    .flatten()

                    .and_then(|json| {

                        serde_json::from_str::<commands::AppSettings>(&json).ok()

                    })

                    .map(|s| s.baldox_minimize_to_tray)

                    .unwrap_or(true);



                if minimize {

                    api.prevent_close();

                    let _ = window.hide();

                }

            }

        })

        .build(tauri::generate_context!())

        .expect("error while running tauri application")
        .run(|_app_handle, _event| {});
}

