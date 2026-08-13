import { invoke } from "@tauri-apps/api/core";
import type { BalDoXIntent, BalDoXKnowledge, BalDoXLLMResponse, LLMChatOptions, LocalLLMChatOptions, ParsedEntities } from "../types/baldox";
import { DEFAULT_OLLAMA_URL } from "./ollamaService";
import { buildKnowledgeSummary, extractEntities } from "./aiManager";

const VALID_INTENTS: BalDoXIntent[] = [
  "SEARCH_FILES", "SCAN", "CLEANUP", "ORGANIZE", "DIAGNOSE", "MANAGE_FILES",
  "LIST_APPS", "DUPLICATES", "QUARANTINE", "NAVIGATE", "GENERAL_HELP", "UNKNOWN",
];

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_OLLAMA_MODEL = "llama3.2";

const CODING_KEYWORDS = [
  "código", "codigo", "programar", "programação", "programacao", "bug", "debug",
  "python", "javascript", "typescript", "rust", "react", "java", "html", "css",
  "sql", "função", "funcao", "classe", "variável", "variavel", "syntax", "erro de compilação",
  "stack trace", "api", "refatorar", "snippet", "script", "algoritmo",
];

function buildTone(personality: string): string {
  return personality === "friendly"
    ? "Tom amigável e prestativo, mas competente."
    : "Tom de secretário guerreiro leal — profissional, confiante e respeitoso (chame o usuário de Comandante ocasionalmente).";
}

function buildSystemPrompt(personality: string, knowledge?: BalDoXKnowledge): string {
  const pcContext = knowledge ? buildKnowledgeSummary(knowledge) : "Dados locais do PC indisponíveis no momento.";

  return `Você é BalDoX, secretário digital e guerreiro guardião do aplicativo BalDoX Guard (gerenciador de PC para Windows).
${buildTone(personality)}
Responda SEMPRE em português brasileiro.

CONTEXTO DO PC (dados locais reais — priorize sobre suposições):
${pcContext}

CAPACIDADES (via ActionManager — nunca execute diretamente):
- Escanear e indexar arquivos (SCAN)
- Buscar arquivos por extensão/tamanho (SEARCH_FILES)
- Diagnosticar disco, RAM, pastas grandes (DIAGNOSE)
- Limpar temp/cache com revisão (CLEANUP)
- Organizar Downloads (ORGANIZE)
- Detectar duplicados (DUPLICATES)
- Listar apps instalados (LIST_APPS)
- Quarentena reversível (QUARANTINE, MANAGE_FILES)
- Navegar páginas do app (NAVIGATE)

PROGRAMAÇÃO (modo consultivo):
- Explique, escreva snippets, debug e sugira correções em markdown.
- Use blocos \`\`\`linguagem para código. Explique em PT-BR.
- Não execute código no PC — apenas oriente.

REGRAS DE SEGURANÇA:
- Nunca sugira executar ações destrutivas sem confirmação do usuário.
- Para perguntas gerais (ciência, cultura, etc.), responda com seu conhecimento — marque isGeneralQuestion=true.
- Para perguntas sobre O PC, use SOMENTE o contexto local fornecido.
- intent=UNKNOWN se não souber classificar; nunca invente dados do disco.

Responda APENAS com JSON válido (sem markdown):
{
  "reply": "resposta natural em português",
  "intent": "SEARCH_FILES|SCAN|CLEANUP|ORGANIZE|DIAGNOSE|MANAGE_FILES|LIST_APPS|DUPLICATES|QUARANTINE|NAVIGATE|GENERAL_HELP|UNKNOWN",
  "confidence": 0.0-1.0,
  "isGeneralQuestion": false,
  "suggestedActions": [{"label":"texto curto","intent":"comando em PT"}]
}`;
}

function buildCodingSystemPrompt(personality: string, knowledge?: BalDoXKnowledge): string {
  const pcContext = knowledge ? buildKnowledgeSummary(knowledge) : "";

  return `Você é BalDoX, assistente local de programação integrado ao BalDoX Guard (gerenciador de PC).
${buildTone(personality)}
Responda SEMPRE em português brasileiro.

${pcContext ? `Contexto do PC do usuário:\n${pcContext}\n` : ""}

Instruções:
- Ajude a escrever, explicar, debugar e revisar código.
- Use blocos markdown \`\`\`linguagem para exemplos de código.
- Seja claro e prático. Não execute nada no PC — apenas oriente.
- Se precisar de mais contexto (arquivo, stack trace), peça ao usuário.`;
}

export function isCodingQuestion(input: string): boolean {
  const lower = input.toLowerCase();
  return CODING_KEYWORDS.some((kw) => lower.includes(kw));
}

function parseLLMJson(raw: string, userInput: string): BalDoXLLMResponse | null {
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? cleaned) as {
      reply?: string;
      intent?: string;
      confidence?: number;
      isGeneralQuestion?: boolean;
      suggestedActions?: { label?: string; intent?: string }[];
    };

    const intent = VALID_INTENTS.includes(parsed.intent as BalDoXIntent)
      ? (parsed.intent as BalDoXIntent)
      : "UNKNOWN";

    const localEntities = extractEntities(userInput);
    const suggestedActions = (parsed.suggestedActions ?? [])
      .filter((a) => a.label && a.intent)
      .map((a) => ({ label: a.label!, intent: a.intent! }));

    return {
      reply: parsed.reply?.trim() || "Comandante, processei sua solicitação.",
      intent,
      confidence: Math.min(Math.max(parsed.confidence ?? 0.85, 0), 1),
      entities: localEntities,
      suggestedActions,
      isGeneralQuestion: parsed.isGeneralQuestion ?? intent === "GENERAL_HELP",
    };
  } catch {
    return null;
  }
}

interface ChatCompletionRequest {
  api_key: string;
  base_url: string;
  model: string;
  messages: { role: string; content: string }[];
  stream: boolean;
}

interface ChatCompletionResponse {
  content: string;
  error?: string;
}

interface OllamaChatRequest {
  base_url: string;
  model: string;
  messages: { role: string; content: string }[];
  stream: boolean;
  json_mode?: boolean;
}

async function callLLMProxy(request: ChatCompletionRequest): Promise<string> {
  const res = await invoke<ChatCompletionResponse>("llm_chat_completion", { request });
  if (res.error) throw new Error(res.error);
  return res.content;
}

async function callLLMDirect(request: ChatCompletionRequest): Promise<string> {
  const url = `${request.base_url.replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.api_key}`,
    },
    body: JSON.stringify({
      model: request.model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: request.messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`LLM HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

async function callOllamaProxy(request: OllamaChatRequest): Promise<string> {
  const res = await invoke<ChatCompletionResponse>("ollama_chat_completion", { request });
  if (res.error) throw new Error(res.error);
  return res.content;
}

async function callOllamaDirect(request: OllamaChatRequest): Promise<string> {
  const url = `${request.base_url.replace(/\/$/, "")}/v1/chat/completions`;
  const body: Record<string, unknown> = {
    model: request.model,
    temperature: 0.4,
    messages: request.messages,
    stream: false,
  };
  if (request.json_mode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Ollama HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

export function isLLMAvailable(apiKey: string, aiMode: string): boolean {
  const online = aiMode === "online" || aiMode === "openai";
  return online && apiKey.trim().length > 0;
}

export function isLocalLLMAvailable(aiMode: string): boolean {
  return aiMode === "local_llm";
}

export function isAnyLLMAvailable(
  apiKey: string,
  aiMode: string,
): boolean {
  return isLocalLLMAvailable(aiMode) || isLLMAvailable(apiKey, aiMode);
}

export async function chatWithLocalLLM(
  userInput: string,
  options: LocalLLMChatOptions,
): Promise<BalDoXLLMResponse | null> {
  const {
    ollamaUrl = DEFAULT_OLLAMA_URL,
    model = DEFAULT_OLLAMA_MODEL,
    personality = "professional",
    knowledge,
    contextIntent,
    codingMode = isCodingQuestion(userInput),
  } = options;

  const systemPrompt = codingMode
    ? buildCodingSystemPrompt(personality, knowledge)
    : buildSystemPrompt(personality, knowledge);

  const messages = [
    { role: "system", content: systemPrompt },
    ...(contextIntent ? [{ role: "system", content: `Contexto da conversa anterior: intent=${contextIntent}` }] : []),
    { role: "user", content: userInput },
  ];

  const request: OllamaChatRequest = {
    base_url: ollamaUrl,
    model,
    messages,
    stream: false,
    json_mode: !codingMode,
  };

  let content: string;
  try {
    content = await callOllamaProxy(request);
  } catch {
    try {
      content = await callOllamaDirect(request);
    } catch {
      return null;
    }
  }

  if (codingMode) {
    const entities = extractEntities(userInput);
    return {
      reply: content.trim() || "Comandante, analisei sua questão de programação.",
      intent: "GENERAL_HELP",
      confidence: 0.9,
      entities,
      suggestedActions: [],
      isGeneralQuestion: true,
    };
  }

  const parsed = parseLLMJson(content, userInput);
  if (parsed) return parsed;

  return {
    reply: content.trim() || "Comandante, processei sua solicitação.",
    intent: "GENERAL_HELP",
    confidence: 0.7,
    entities: extractEntities(userInput),
    suggestedActions: [],
    isGeneralQuestion: true,
  };
}

export async function chatWithLLM(
  userInput: string,
  options: LLMChatOptions,
): Promise<BalDoXLLMResponse | null> {
  const { apiKey, baseUrl = DEFAULT_BASE_URL, model = DEFAULT_MODEL, personality = "professional", knowledge, contextIntent } = options;

  if (!apiKey.trim()) return null;

  const messages = [
    { role: "system", content: buildSystemPrompt(personality, knowledge) },
    ...(contextIntent ? [{ role: "system", content: `Contexto da conversa anterior: intent=${contextIntent}` }] : []),
    { role: "user", content: userInput },
  ];

  const request: ChatCompletionRequest = {
    api_key: apiKey,
    base_url: baseUrl,
    model,
    messages,
    stream: false,
  };

  let content: string;
  try {
    content = await callLLMDirect(request);
  } catch {
    try {
      content = await callLLMProxy(request);
    } catch {
      return null;
    }
  }

  return parseLLMJson(content, userInput);
}

/** Simula efeito de digitação no frontend após resposta completa do LLM. */
export async function streamTextToCallback(
  text: string,
  onChunk: (partial: string) => void,
  charsPerTick = 3,
  delayMs = 16,
): Promise<void> {
  let partial = "";
  for (let i = 0; i < text.length; i += charsPerTick) {
    partial = text.slice(0, i + charsPerTick);
    onChunk(partial);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  onChunk(text);
}

export function mergeEntities(local: ParsedEntities, remote: Partial<ParsedEntities>): ParsedEntities {
  return {
    paths: remote.paths?.length ? remote.paths : local.paths,
    sizes: remote.sizes?.length ? remote.sizes : local.sizes,
    extensions: remote.extensions?.length ? remote.extensions : local.extensions,
    numbers: remote.numbers?.length ? remote.numbers : local.numbers,
    days: remote.days ?? local.days,
    driveLetters: remote.driveLetters?.length ? remote.driveLetters : local.driveLetters,
    freeSpaceTargetGb: remote.freeSpaceTargetGb ?? local.freeSpaceTargetGb,
    confirmAction: remote.confirmAction ?? local.confirmAction,
    navigateTarget: remote.navigateTarget ?? local.navigateTarget,
  };
}
