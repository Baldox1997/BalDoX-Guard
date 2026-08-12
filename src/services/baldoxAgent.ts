import type { BalDoXKnowledge } from "../types/baldox";
import { api } from "./apiService";
import {
  buildActionPlan,
  buildKnowledgeSummary,
  canAutoExecute,
  getPersonalityResponse,
  parseIntent,
  tryOpenAiIntent,
} from "./aiManager";
import { executeBalDoXPlan } from "./planExecutor";
import {
  addMessage,
  addTypingIndicator,
  confirmPendingPlan,
  getBalDoXContext,
  getBalDoXState,
  removeTypingIndicator,
  setLastIntent,
  setNavigateTo,
  setPendingPlan,
  setProcessing,
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
    }));

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

    let intentResult = parseIntent(trimmed, context.lastIntent);
    if (settings.baldox_ai_mode === "openai" && settings.baldox_openai_key) {
      const llmResult = await tryOpenAiIntent(trimmed, settings.baldox_openai_key);
      if (llmResult && llmResult.confidence > intentResult.confidence) {
        intentResult = llmResult;
      }
    }

    const { intent, entities, confidence } = intentResult;
    setLastIntent(intent, trimmed);

    const response = getPersonalityResponse(intent, settings.baldox_personality, knowledge);
    removeTypingIndicator(typingId);

    if (intent === "GENERAL_HELP" || intent === "DIAGNOSE") {
      const facts = buildKnowledgeSummary(knowledge);
      addMessage({
        role: "assistant",
        content: intent === "DIAGNOSE" ? `${response}\n\n${facts}` : response,
        messageType: intent === "DIAGNOSE" ? "disk_stats" : "text",
        diskStats: knowledge.dashboard ? [knowledge.dashboard.storage] : undefined,
      });
    } else {
      addMessage({ role: "assistant", content: response, messageType: "text" });
    }

    const plan = buildActionPlan(intent, trimmed, entities);
    if (plan.tier === "blocked" || plan.steps.length === 0) {
      if (intent === "UNKNOWN") {
        await api.logConversation(trimmed, response, intent).catch(() => {});
      }
      return;
    }

    const autoRun =
      canAutoExecute(plan.tier, settings, intent, plan) ||
      (confirmMatch && getBalDoXContext().sessionConfirmedPlanId === plan.id);

    if (plan.tier === "review" && !autoRun && !confirmMatch) {
      setPendingPlan(plan);
      addMessage({
        role: "assistant",
        content: `Preparei um plano de ação (confiança ${Math.round(confidence * 100)}%). Revise abaixo — diga "confirmo" para executar.`,
        messageType: "action_plan",
        plan,
      });
      await api.logConversation(trimmed, response, intent).catch(() => {});
      return;
    }

    if (intent === "NAVIGATE" && entities.navigateTarget) {
      setNavigateTo(entities.navigateTarget);
      onNavigate?.(entities.navigateTarget);
    }

    await executeBalDoXPlan(plan, onNavigate);
    await api.logConversation(trimmed, response, intent).catch(() => {});
  } catch (err) {
    removeTypingIndicator(typingId);
    addMessage({
      role: "assistant",
      content: `Comandante, encontrei um obstáculo: ${err instanceof Error ? err.message : String(err)}`,
      messageType: "text",
    });
  } finally {
    setProcessing(false);
  }
}
