//! Proxy LLM chat completions — evita CORS e mantém chave no backend Tauri.
//! Inclui suporte a Ollama local (sem API key).

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmChatRequest {
    pub api_key: String,
    pub base_url: String,
    pub model: String,
    pub messages: Vec<LlmMessage>,
    pub stream: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmChatResponse {
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaChatRequest {
    pub base_url: String,
    pub model: String,
    pub messages: Vec<LlmMessage>,
    pub stream: bool,
    #[serde(default)]
    pub json_mode: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaStatus {
    pub available: bool,
    pub models: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OllamaTagsResponse {
    models: Option<Vec<OllamaModelEntry>>,
}

#[derive(Debug, Deserialize)]
struct OllamaModelEntry {
    name: Option<String>,
}

fn ollama_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_ollama_status(base_url: String) -> Result<OllamaStatus, String> {
    let url = format!("{}/api/tags", base_url.trim_end_matches('/'));
    let client = ollama_client()?;

    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Ok(OllamaStatus {
            available: false,
            models: vec![],
            error: Some(format!("HTTP {}", res.status())),
        });
    }

    let data: OllamaTagsResponse = res.json().await.map_err(|e| e.to_string())?;
    let models: Vec<String> = data
        .models
        .unwrap_or_default()
        .into_iter()
        .filter_map(|m| m.name)
        .collect();

    Ok(OllamaStatus {
        available: true,
        models,
        error: None,
    })
}

#[tauri::command]
pub async fn ollama_chat_completion(request: OllamaChatRequest) -> Result<LlmChatResponse, String> {
    let url = format!(
        "{}/v1/chat/completions",
        request.base_url.trim_end_matches('/')
    );

    let mut body = serde_json::json!({
        "model": request.model,
        "temperature": 0.4,
        "messages": request.messages,
        "stream": request.stream,
    });

    if request.json_mode {
        body["response_format"] = serde_json::json!({ "type": "json_object" });
    }

    let client = ollama_client()?;

    let res = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Falha na requisição Ollama: {e}"))?;

    if !res.status().is_success() {
        let status = res.status();
        let err_body = res.text().await.unwrap_or_default();
        return Ok(LlmChatResponse {
            content: String::new(),
            error: Some(format!(
                "Ollama HTTP {status}: {}",
                err_body.chars().take(300).collect::<String>()
            )),
        });
    }

    let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let content = data["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(LlmChatResponse {
        content,
        error: None,
    })
}

#[tauri::command]
pub async fn llm_chat_completion(request: LlmChatRequest) -> Result<LlmChatResponse, String> {
    if request.api_key.trim().is_empty() {
        return Ok(LlmChatResponse {
            content: String::new(),
            error: Some("API key vazia".into()),
        });
    }

    let url = format!(
        "{}/chat/completions",
        request.base_url.trim_end_matches('/')
    );

    let body = serde_json::json!({
        "model": request.model,
        "temperature": 0.4,
        "response_format": { "type": "json_object" },
        "messages": request.messages,
        "stream": request.stream,
    });

    let client = ollama_client()?;

    let res = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", request.api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Falha na requisição LLM: {e}"))?;

    if !res.status().is_success() {
        let status = res.status();
        let err_body = res.text().await.unwrap_or_default();
        let safe_err = err_body.replace(&request.api_key, "***");
        return Ok(LlmChatResponse {
            content: String::new(),
            error: Some(format!(
                "LLM HTTP {status}: {}",
                safe_err.chars().take(300).collect::<String>()
            )),
        });
    }

    let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let content = data["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(LlmChatResponse {
        content,
        error: None,
    })
}
