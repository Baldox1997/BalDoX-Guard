import type { BalDoXAnimationState } from "../constants/assistant";
import type { AiConnectionMode, BalDoXContext, BalDoXIntent, BalDoXMessage, BalDoXPlan } from "../types/baldox";
import { api } from "../services/apiService";

type Listener = () => void;

interface BalDoXState {
  messages: BalDoXMessage[];
  pendingPlan: BalDoXPlan | null;
  animationState: BalDoXAnimationState;
  isProcessing: boolean;
  taskQueue: BalDoXPlan[];
  context: BalDoXContext;
  navigateTo: string | null;
  historyLoaded: boolean;
  aiConnectionMode: AiConnectionMode;
  secretaryActive: boolean;
}

const defaultContext: BalDoXContext = {
  lastIntent: null,
  lastTopic: null,
  lastScanId: null,
  pendingPlanId: null,
  sessionConfirmedPlanId: null,
};

const state: BalDoXState = {
  messages: [],
  pendingPlan: null,
  animationState: "idle",
  isProcessing: false,
  taskQueue: [],
  context: { ...defaultContext },
  navigateTo: null,
  historyLoaded: false,
  aiConnectionMode: "local",
  secretaryActive: true,
};

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeBalDoX(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBalDoXState(): Readonly<BalDoXState> {
  return state;
}

export function getBalDoXContext(): Readonly<BalDoXContext> {
  return state.context;
}

export function updateContext(partial: Partial<BalDoXContext>) {
  state.context = { ...state.context, ...partial };
  emit();
}

export function addMessage(msg: Omit<BalDoXMessage, "id" | "timestamp">) {
  const message: BalDoXMessage = {
    ...msg,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  state.messages.push(message);
  emit();

  if (msg.role === "user" || msg.role === "assistant") {
    void persistMessage(message).catch(() => {});
  }
  return message;
}

async function persistMessage(msg: BalDoXMessage) {
  const metadata =
    msg.plan || msg.files || msg.diskStats || msg.navigateTo
      ? JSON.stringify({
          plan: msg.plan?.id,
          messageType: msg.messageType,
          navigateTo: msg.navigateTo,
        })
      : undefined;
  await api.saveChatMessage({
    role: msg.role,
    content: msg.content,
    messageType: msg.messageType ?? "text",
    metadata,
  });
}

export async function loadChatHistory() {
  if (state.historyLoaded) return;
  try {
    const rows = await api.getChatHistory(80);
    if (rows.length > 0 && state.messages.length === 0) {
      state.messages = rows.map((r) => ({
        id: String(r.id),
        role: r.role as BalDoXMessage["role"],
        content: r.content,
        timestamp: r.created_at,
        messageType: (r.message_type as BalDoXMessage["messageType"]) ?? "text",
      }));
    }
  } catch {
    /* dev without tauri */
  }
  state.historyLoaded = true;
  emit();
}

export function setPendingPlan(plan: BalDoXPlan | null) {
  state.pendingPlan = plan;
  state.context.pendingPlanId = plan?.id ?? null;
  state.animationState = plan ? "warning" : "idle";
  emit();
}

export function confirmPendingPlan() {
  if (state.pendingPlan) {
    state.context.sessionConfirmedPlanId = state.pendingPlan.id;
  }
  emit();
}

export function setAnimationState(s: BalDoXAnimationState) {
  state.animationState = s;
  emit();
}

export function setProcessing(v: boolean) {
  state.isProcessing = v;
  if (v && state.animationState === "idle") {
    state.animationState = "thinking";
  } else if (!v && !state.pendingPlan) {
    state.animationState = "idle";
  }
  emit();
}

export function enqueuePlan(plan: BalDoXPlan) {
  state.taskQueue.push(plan);
  emit();
}

export function dequeuePlan(): BalDoXPlan | undefined {
  const plan = state.taskQueue.shift();
  emit();
  return plan;
}

export function clearMessages() {
  state.messages = [];
  void api.clearChatHistory().catch(() => {});
  emit();
}

export function initGreeting(content: string) {
  if (state.messages.length === 0) {
    addMessage({ role: "assistant", content, messageType: "text" });
  }
}

export function setNavigateTo(path: string | null) {
  state.navigateTo = path;
  emit();
}

export function consumeNavigateTo(): string | null {
  const path = state.navigateTo;
  state.navigateTo = null;
  return path;
}

export function setLastIntent(intent: BalDoXIntent, topic: string) {
  state.context.lastIntent = intent;
  state.context.lastTopic = topic;
  emit();
}

export function addTypingIndicator(): string {
  const id = crypto.randomUUID();
  state.messages.push({
    id,
    role: "assistant",
    content: "",
    timestamp: new Date().toISOString(),
    typing: true,
  });
  emit();
  return id;
}

export function removeTypingIndicator(id: string) {
  state.messages = state.messages.filter((m) => m.id !== id);
  emit();
}

export function updateMessageContent(id: string, content: string) {
  state.messages = state.messages.map((m) => (m.id === id ? { ...m, content } : m));
  emit();
}

export function setAiConnectionMode(mode: AiConnectionMode) {
  state.aiConnectionMode = mode;
  emit();
}

export function setSecretaryActive(active: boolean) {
  state.secretaryActive = active;
  state.animationState = active && state.animationState === "idle" ? "idle" : state.animationState;
  emit();
}
