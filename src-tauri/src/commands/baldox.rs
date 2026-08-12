//! Tauri commands — BalDoX chat history.

use crate::database::{ChatMessageRow, Database};
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub fn save_chat_message(
    db: State<'_, Arc<Mutex<Database>>>,
    role: String,
    content: String,
    message_type: Option<String>,
    metadata: Option<String>,
) -> Result<i64, String> {
    db.lock()
        .save_chat_message(
            &role,
            &content,
            message_type.as_deref(),
            metadata.as_deref(),
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_chat_history(
    db: State<'_, Arc<Mutex<Database>>>,
    limit: Option<i64>,
) -> Result<Vec<ChatMessageRow>, String> {
    db.lock()
        .get_chat_history(limit.unwrap_or(100))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_chat_history(db: State<'_, Arc<Mutex<Database>>>) -> Result<(), String> {
    db.lock().clear_chat_history().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn log_conversation(
    db: State<'_, Arc<Mutex<Database>>>,
    user_message: String,
    assistant_message: String,
    intent: Option<String>,
) -> Result<(), String> {
    let db = db.lock();
    db.save_chat_message("user", &user_message, Some("text"), None)
        .map_err(|e| e.to_string())?;
    db.save_chat_message(
        "assistant",
        &assistant_message,
        Some("text"),
        intent.as_deref(),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
