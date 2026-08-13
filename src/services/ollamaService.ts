import { invoke } from "@tauri-apps/api/core";

export interface OllamaStatus {
  available: boolean;
  models: string[];
  error?: string;
}

export const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";

export const RECOMMENDED_CODING_MODELS = [
  "llama3.2",
  "codellama",
  "deepseek-coder",
  "qwen2.5-coder",
] as const;

export async function checkOllamaStatus(baseUrl = DEFAULT_OLLAMA_URL): Promise<OllamaStatus> {
  try {
    return await invoke<OllamaStatus>("check_ollama_status", { baseUrl });
  } catch {
    return checkOllamaStatusDirect(baseUrl);
  }
}

async function checkOllamaStatusDirect(baseUrl: string): Promise<OllamaStatus> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/tags`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      return { available: false, models: [], error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { models?: { name?: string }[] };
    const models = (data.models ?? []).map((m) => m.name ?? "").filter(Boolean);
    return { available: true, models };
  } catch (err) {
    return {
      available: false,
      models: [],
      error: err instanceof Error ? err.message : "Ollama não detectado",
    };
  }
}

export async function listOllamaModels(baseUrl = DEFAULT_OLLAMA_URL): Promise<string[]> {
  const status = await checkOllamaStatus(baseUrl);
  return status.models;
}

export async function testOllamaConnection(
  baseUrl: string,
  model: string,
): Promise<{ ok: boolean; message: string }> {
  if (!model.trim()) {
    return { ok: false, message: "Informe um modelo (ex.: llama3.2)" };
  }

  const status = await checkOllamaStatus(baseUrl);
  if (!status.available) {
    return {
      ok: false,
      message: status.error ?? "Ollama não está rodando. Instale em ollama.com e execute ollama serve.",
    };
  }

  const modelBase = model.split(":")[0];
  const hasModel = status.models.some(
    (m) => m === model || m.startsWith(`${modelBase}:`) || m.startsWith(`${model}/`),
  );
  if (!hasModel && status.models.length > 0) {
    return {
      ok: false,
      message: `Modelo "${model}" não encontrado. Baixe com: ollama pull ${model}`,
    };
  }

  try {
    const res = await invoke<{ content: string; error?: string }>("ollama_chat_completion", {
      request: {
        base_url: baseUrl,
        model,
        messages: [{ role: "user", content: "Responda apenas: OK" }],
        stream: false,
      },
    });
    if (res.error) return { ok: false, message: res.error };
    return { ok: true, message: `Conectado — modelo ${model} respondeu.` };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao testar conexão",
    };
  }
}
