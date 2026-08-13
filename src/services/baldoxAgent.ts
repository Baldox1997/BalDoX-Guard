import type { AiConnectionMode } from "../types/baldox";
import type { BalDoXKnowledge } from "../types/baldox";
import { api } from "./apiService";
import {
  buildActionPlan,
  buildKnowledgeSummary,
  interpretMessage,
} from "./aiManager";
import { isAnyLLMAvailable, isLocalLLMAvailable } from "./llmService";
import { checkOllamaStatus } from "./ollamaService";
import { executeBalDoXPlan } from "./planExecutor";
import {
  addMessage,
  addTypingIndicator,
  confirmPendingPlan,
  getBalDoXContext,
  getBalDoXState,
  removeTypingIndicator,
  setAiConnectionMode,
  setLastIntent,
  setNavigateTo,
  setPendingPlan,
  setProcessing,
  setSecretaryActive,
  updateMessageContent,
  updateContext,
} from "../stores/baldoxStore";

export async function fetchBalDoXKnowledge(): Promise<BalDoXKnowledge> {
  const knowledge: BalDoXKnowledge = {
    dashboard: null,
    drives: [],
    quarantineCount: 0,
    quarantineBytes: 0,
  };

  try {
    const [dashboard, drives, quarantine] = await Promise.all([
      api.getDashboardData(),
      api.getDrives(),
      api.listQuarantine().catch(() => []),
    ]);
    knowledge.dashboard = {
      storage: dashboard.storage,
      stats: dashboard.stats,
      lastScanId: dashboard.last_scan_id,
      lastScanStatus: dashboard.last_scan_status,
      appCount: dashboard.app_count,
      potentialCleanupBytes: dashboard.potential_cleanup_bytes,
    };
    knowledge.drives = drives;
    knowledge.quarantineCount = quarantine.length;
    knowledge.quarantineBytes = quarantine.reduce((s, q) => s + q.size, 0);
    updateContext({ lastScanId: dashboard.last_scan_id });
  } catch {
    /* dev without tauri */
  }

  return knowledge;
}

function resolveConnectionMode(
  settings: {
    baldox_ai_mode: string;
    baldox_openai_key: string;
    baldox_ollama_url?: string;
    baldox_secretary_active?: boolean;
  },
  interpretationSource: "llm" | "local_llm" | "local",
  llmFailed: boolean,
): AiConnectionMode {
  if (interpretationSource === "local_llm") return "local_llm";
  if (interpretationSource === "llm" && !llmFailed) return "online";

  const online = settings.baldox_ai_mode === "online" || settings.baldox_ai_mode === "openai";
  if (online && settings.baldox_openai_key.trim() && llmFailed) return "offline";

  if (isLocalLLMAvailable(settings.baldox_ai_mode) && interpretationSource === "local") {
    return "local";
  }

  return "local";
}

export async function processBalDoXMessage(
  text: string,
  onNavigate?: (path: string) => void,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed || getBalDoXState().isProcessing) return;

  addMessage({ role: "user", content: trimmed, messageType: "text" });
  setProcessing(true);
  const typingId = addTypingIndicator();

  try {
    const settings = await api.getSettings().catch(() => ({
      baldox_personality: "professional",
      auto_clean_temp: false,
      baldox_ai_mode: "local",
      baldox_openai_key: "",
      baldox_llm_model: "gpt-4o-mini",
      baldox_llm_base_url: "https://api.openai.com/v1",
      baldox_ollama_url: "http://127.0.0.1:11434",
      baldox_ollama_model: "llama3.2",
      baldox_secretary_active: true,
    }));

    setSecretaryActive(settings.baldox_secretary_active ?? true);

    const context = getBalDoXContext();
    const { pendingPlan } = getBalDoXState();

    const confirmMatch = /\b(confirmo|confirmar|pode\s+executar|pode\s+fazer|sim,?\s+executa|aprovado)\b/i.test(trimmed);
    if (confirmMatch && pendingPlan) {
      removeTypingIndicator(typingId);
      confirmPendingPlan();
      addMessage({ role: "assistant", content: "Plano confirmado. Executando agora.", messageType: "execution_result" });
      await executeBalDoXPlan(pendingPlan, onNavigate);
      return;
    }

    const knowledge = await fetchBalDoXKnowledge();

    let streamingMsgId: string | null = null;
    let llmFailed = false;
    let interpretation;

    const useStreaming = isAnyLLMAvailable(
      settings.baldox_openai_key ?? "",
      settings.baldox_ai_mode ?? "local",
    );

    try {
      interpretation = await interpretMessage(trimmed, {
        apiKey: settings.baldox_openai_key ?? "",
        aiMode: settings.baldox_ai_mode ?? "local",
        personality: settings.baldox_personality,
        knowledge,
        contextIntent: context.lastIntent,
        llmModel: settings.baldox_llm_model ?? "gpt-4o-mini",
        llmBaseUrl: settings.baldox_llm_base_url ?? "https://api.openai.com/v1",
        ollamaUrl: settings.baldox_ollama_url ?? "http://127.0.0.1:11434",
        ollamaModel: settings.baldox_ollama_model ?? "llama3.2",
        onReplyToken: useStreaming
          ? (partial) => {
              if (!streamingMsgId) {
                removeTypingIndicator(typingId);
                const msg = addMessage({ role: "assistant", content: partial, messageType: "text" });
                streamingMsgId = msg.id;
              } else {
                updateMessageContent(streamingMsgId, partial);
              }
            }
          : undefined,
      });
    } catch {
      llmFailed = true;
      interpretation = await interpretMessage(trimmed, {
        apiKey: "",
        aiMode: "local",
        personality: settings.baldox_personality,
        knowledge,
        contextIntent: context.lastIntent,
      });
    }

    const mode = resolveConnectionMode(settings, interpretation.source, llmFailed);
    setAiConnectionMode(mode);

    const { intent, entities, confidence, reply, suggestedActions, isGeneralQuestion } = interpretation;
    setLastIntent(intent, trimmed);
    removeTypingIndicator(typingId);

    const showDiskStats = intent === "DIAGNOSE" || (intent === "GENERAL_HELP" && knowledge.dashboard);
    const finalReply =
      intent === "DIAGNOSE"
        ? `${reply}\n\n${buildKnowledgeSummary(knowledge)}`
        : reply;

    if (streamingMsgId) {
      updateMessageContent(streamingMsgId, finalReply);
    } else {
      addMessage({
        role: "assistant",
        content: finalReply,
        messageType: showDiskStats ? "disk_stats" : "text",
        diskStats: showDiskStats && knowledge.dashboard ? [knowledge.dashboard.storage] : undefined,
      });
    }

    if (isGeneralQuestion && intent === "GENERAL_HELP") {
      await api.logConversation(trimmed, finalReply, intent).catch(() => {});
      return;
    }

    const plan = buildActionPlan(intent, trimmed, entities);
    if (plan.tier === "blocked" || plan.steps.length === 0) {
      if (intent === "UNKNOWN" && suggestedActions.length === 0) {
        await api.logConversation(trimmed, finalReply, intent).catch(() => {});
      }
      return;
    }

    const sessionConfirmed =
      confirmMatch && getBalDoXContext().sessionConfirmedPlanId === plan.id;

    if (!sessionConfirmed) {
      setPendingPlan(plan);
      addMessage({
        role: "assistant",
        content: `Preparei um plano de ação (confiança ${Math.round(confidence * 100)}%). Quer que eu faça isso? Revise abaixo e confirme.`,
        messageType: "action_plan",
        plan,
      });
      await api.logConversation(trimmed, finalReply, intent).catch(() => {});
      return;
    }

    if (intent === "NAVIGATE" && entities.navigateTarget) {
      setNavigateTo(entities.navigateTarget);
      onNavigate?.(entities.navigateTarget);
    }

    await executeBalDoXPlan(plan, onNavigate);
    await api.logConversation(trimmed, finalReply, intent).catch(() => {});
  } catch (err) {
    removeTypingIndicator(typingId);
    setAiConnectionMode("offline");
    addMessage({
      role: "assistant",
      content: `Comandante, encontrei um obstáculo: ${err instanceof Error ? err.message : String(err)}`,
      messageType: "text",
    });
  } finally {
    setProcessing(false);
  }
}

export async function refreshAiConnectionStatus(): Promise<AiConnectionMode> {
  try {
    const settings = await api.getSettings();

    setSecretaryActive(settings.baldox_secretary_active ?? true);

    if (isLocalLLMAvailable(settings.baldox_ai_mode ?? "local")) {
      const status = await checkOllamaStatus(settings.baldox_ollama_url ?? "http://127.0.0.1:11434");
      if (status.available) {
        setAiConnectionMode("local_llm");
        return "local_llm";
      }
      setAiConnectionMode("local");
      return "local";
    }

    if (isAnyLLMAvailable(settings.baldox_openai_key ?? "", settings.baldox_ai_mode ?? "local")) {
      setAiConnectionMode("online");
      return "online";
    }

    setAiConnectionMode("local");
    return "local";
  } catch {
    setAiConnectionMode("local");
    return "local";
  }
}
