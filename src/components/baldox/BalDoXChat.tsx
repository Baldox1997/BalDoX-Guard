import { Copy, Check, ExternalLink, HardDrive, Mic, MicOff, Send, Wifi, WifiOff, Cpu, Brain } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ASSISTANT_INPUT_PLACEHOLDER,
  ASSISTANT_NAME,
  BALDOX_STATE_LABELS,
  VOICE_HINT_LABEL,
  VOICE_LISTENING_LABEL,
  VOICE_MIC_ARIA,
  VOICE_PROCESSING_LABEL,
  VOICE_UNSUPPORTED_MESSAGE,
  type BalDoXAnimationState,
} from "../../constants/assistant";
import { refreshAiConnectionStatus, processBalDoXMessage } from "../../services/baldoxAgent";
import { executeBalDoXPlan } from "../../services/planExecutor";
import { api } from "../../services/apiService";
import {
  cancelSpeech,
  getListeningState,
  isListening,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  speak,
  speechSummaryForMessage,
  startListening,
  stopListening,
  subscribeListeningState,
  type VoiceListeningState,
} from "../../services/voiceService";
import {
  consumeNavigateTo,
  confirmPendingPlan,
  getBalDoXState,
  loadChatHistory,
  setPendingPlan,
  subscribeBalDoX,
} from "../../stores/baldoxStore";
import type { AppSettings } from "../../types/api";
import type { AiConnectionMode, BalDoXMessage } from "../../types/baldox";
import type { FileRow } from "../../types/api";
import { formatBytes } from "../../utils/format";
import { BalDoXPlanCard } from "./BalDoXPlanCard";

interface BalDoXChatProps {
  statusLabel?: string;
  state?: BalDoXAnimationState;
  suggestions?: string[];
  onSpeakingChange?: (speaking: boolean) => void;
}

const DEFAULT_SUGGESTIONS = [
  "Quanto espaço no C:?",
  "Acha PDFs grandes",
  "Libere 20 GB",
  "Organize meus downloads",
  "O que está deixando meu PC lento?",
  "Encontre arquivos duplicados",
  "Abrir scanner",
];

const DEFAULT_VOICE_SETTINGS = {
  baldox_voice_input: false,
  baldox_voice_output: false,
  baldox_voice_continuous: false,
};

export function BalDoXChat({
  statusLabel,
  state: externalState,
  suggestions = DEFAULT_SUGGESTIONS,
  onSpeakingChange,
}: BalDoXChatProps) {
  const [input, setInput] = useState("");
  const [storeState, setStoreState] = useState(getBalDoXState());
  const [voiceSettings, setVoiceSettings] = useState<Pick<
    AppSettings,
    "baldox_voice_input" | "baldox_voice_output" | "baldox_voice_continuous"
  >>(DEFAULT_VOICE_SETTINGS);
  const [voiceState, setVoiceState] = useState<VoiceListeningState>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSpokenIdRef = useRef<string | null>(null);
  const pendingFinalRef = useRef<string | null>(null);
  const startMicRef = useRef<(force?: boolean) => void>(() => {});
  const navigate = useNavigate();

  const sttSupported = isSpeechRecognitionSupported();
  const ttsSupported = isSpeechSynthesisSupported();
  const voiceInputEnabled = voiceSettings.baldox_voice_input && sttSupported;
  const voiceOutputEnabled = voiceSettings.baldox_voice_output && ttsSupported;
  const voiceModeActive = voiceInputEnabled || voiceOutputEnabled;

  useEffect(() => {
    void loadChatHistory();
    void refreshAiConnectionStatus();
    api.getSettings().then((s) => {
      setVoiceSettings({
        baldox_voice_input: s.baldox_voice_input ?? false,
        baldox_voice_output: s.baldox_voice_output ?? false,
        baldox_voice_continuous: s.baldox_voice_continuous ?? false,
      });
    }).catch(() => {});
    const unsub = subscribeBalDoX(() => setStoreState({ ...getBalDoXState() }));
    const unsubVoice = subscribeListeningState(setVoiceState);
    return () => {
      unsub();
      unsubVoice();
      stopListening();
      cancelSpeech();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [storeState.messages, storeState.pendingPlan, interimTranscript]);

  useEffect(() => {
    const path = consumeNavigateTo();
    if (path) navigate(path);
  }, [storeState.navigateTo, navigate]);

  const handleSubmit = useCallback(async (text: string) => {
    if (!text.trim() || getBalDoXState().isProcessing) return;
    cancelSpeech();
    setInput("");
    setInterimTranscript("");
    pendingFinalRef.current = null;
    await processBalDoXMessage(text, (path) => navigate(path));
  }, [navigate]);

  const speakAssistantMessage = useCallback((message: BalDoXMessage) => {
    if (!voiceOutputEnabled || message.role !== "assistant" || message.typing) return;
    if (lastSpokenIdRef.current === message.id) return;

    const summary = speechSummaryForMessage(message.content, message.messageType);
    if (!summary) return;

    lastSpokenIdRef.current = message.id;
    onSpeakingChange?.(true);
    speak(summary, "pt-BR", () => {
      onSpeakingChange?.(false);
      if (voiceSettings.baldox_voice_continuous && voiceInputEnabled && !getBalDoXState().isProcessing) {
        startMicRef.current(true);
      }
    });
  }, [voiceOutputEnabled, voiceSettings.baldox_voice_continuous, voiceInputEnabled, onSpeakingChange]);

  useEffect(() => {
    const msgs = storeState.messages;
    if (msgs.length === 0) return;
    const last = msgs[msgs.length - 1];
    if (last.role === "assistant" && !last.typing && !storeState.isProcessing) {
      speakAssistantMessage(last);
    }
  }, [storeState.messages, storeState.isProcessing, speakAssistantMessage]);

  const toggleMic = useCallback((forceStart = false) => {
    setVoiceError(null);

    if (isListening() && !forceStart) {
      stopListening();
      setInterimTranscript("");
      if (pendingFinalRef.current?.trim()) {
        void handleSubmit(pendingFinalRef.current);
        pendingFinalRef.current = null;
      }
      return;
    }

    if (!voiceInputEnabled) {
      if (!sttSupported) setVoiceError(VOICE_UNSUPPORTED_MESSAGE);
      return;
    }

    cancelSpeech();
    const started = startListening({
      lang: "pt-BR",
      onResult: ({ transcript, isFinal }) => {
        setInterimTranscript(transcript);
        if (isFinal && transcript.trim()) {
          pendingFinalRef.current = transcript.trim();
          stopListening();
          void handleSubmit(transcript.trim());
        }
      },
      onError: (msg) => {
        setVoiceError(msg);
        setInterimTranscript("");
      },
    });

    if (!started && getListeningState() === "idle") {
      setVoiceError(VOICE_UNSUPPORTED_MESSAGE);
    }
  }, [voiceInputEnabled, sttSupported, handleSubmit]);

  startMicRef.current = toggleMic;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(input);
    }
  }

  const animationState = externalState ?? storeState.animationState;
  const status = statusLabel ?? BALDOX_STATE_LABELS[animationState];
  const displayInput = interimTranscript || input;

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-xl border border-border bg-surface-elevated">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Conversa com {ASSISTANT_NAME}</h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Comandos em linguagem natural — busca, execução e diagnóstico
          </p>
          {voiceModeActive && (
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
              {voiceInputEnabled && voiceState === "listening" ? (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  {VOICE_LISTENING_LABEL}
                </>
              ) : voiceState === "processing" ? (
                VOICE_PROCESSING_LABEL
              ) : (
                VOICE_HINT_LABEL
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AiConnectionBadge mode={storeState.aiConnectionMode} />
          <StatusBadge label={status} state={animationState} />
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {storeState.messages.map((message) => (
          <MessageBubble key={message.id} message={message} onNavigate={(p) => navigate(p)} />
        ))}

        {storeState.pendingPlan && !storeState.messages.some((m) => m.plan?.id === storeState.pendingPlan?.id) && (
          <BalDoXPlanCard
            plan={storeState.pendingPlan}
            onApply={() => {
              confirmPendingPlan();
              void executeBalDoXPlan(storeState.pendingPlan!, (p) => navigate(p));
            }}
            onReview={() => {
              const route = routeForIntent(storeState.pendingPlan!.intent);
              if (route) navigate(route);
            }}
            onCancel={() => setPendingPlan(null)}
          />
        )}

        <div ref={bottomRef} />
      </div>

      {voiceError && (
        <p className="border-t border-border px-4 py-2 text-xs text-amber-600 dark:text-amber-400">{voiceError}</p>
      )}

      <div className="border-t border-border px-4 py-2">
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void handleSubmit(s)}
              disabled={storeState.isProcessing}
              className="rounded-full border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1 text-xs text-text-secondary hover:bg-cyan-500/10 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <footer className="border-t border-border p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit(input);
          }}
          className="flex items-center gap-3"
        >
          <input
            ref={inputRef}
            type="text"
            value={displayInput}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={storeState.isProcessing || voiceState === "listening"}
            placeholder={
              voiceState === "listening"
                ? "Fale agora…"
                : ASSISTANT_INPUT_PLACEHOLDER
            }
            className="flex-1 rounded-lg border border-border bg-surface-muted px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/70 disabled:opacity-70"
          />
          {voiceInputEnabled && (
            <button
              type="button"
              onClick={() => toggleMic()}
              disabled={storeState.isProcessing}
              aria-label={VOICE_MIC_ARIA}
              aria-pressed={voiceState === "listening" || voiceState === "processing"}
              className={`relative inline-flex items-center justify-center rounded-lg border px-3 py-2.5 transition disabled:opacity-50 ${
                voiceState === "listening" || voiceState === "processing"
                  ? "border-red-500/50 bg-red-500/15 text-red-600 dark:text-red-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
              }`}
            >
              {(voiceState === "listening" || voiceState === "processing") && (
                <span className="absolute inset-0 animate-ping rounded-lg bg-red-500/20" aria-hidden />
              )}
              {voiceState === "listening" || voiceState === "processing" ? (
                <MicOff className="relative h-4 w-4" />
              ) : (
                <Mic className="relative h-4 w-4" />
              )}
            </button>
          )}
          <button
            type="submit"
            disabled={storeState.isProcessing || !displayInput.trim()}
            aria-label="Enviar mensagem"
            className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-white transition hover:bg-accent-hover disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </footer>
    </div>
  );
}

function MessageBubble({
  message,
  onNavigate,
}: {
  message: BalDoXMessage;
  onNavigate: (path: string) => void;
}) {
  if (message.typing) {
    return (
      <div className="flex justify-start">
        <div className="rounded-2xl rounded-tl-md border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:300ms]" />
            <span className="ml-2 text-xs text-text-secondary">{ASSISTANT_NAME} digitando…</span>
          </div>
        </div>
      </div>
    );
  }

  if (message.role === "system") {
    return <p className="text-center text-xs text-text-secondary">{message.content}</p>;
  }

  return (
    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[90%] space-y-2">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            message.role === "assistant"
              ? "rounded-tl-md border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 text-text-primary"
              : "rounded-tr-md bg-accent text-white"
          }`}
        >
          {message.role === "assistant" && (
            <p className="mb-1 text-xs font-medium text-cyan-600 dark:text-cyan-400">{ASSISTANT_NAME}</p>
          )}
          <AssistantContent content={message.content} />
        </div>

        {message.diskStats && message.diskStats.length > 0 && (
          <DiskStatsCard stats={message.diskStats} />
        )}

        {message.files && message.files.length > 0 && (
          <FileListCard files={message.files} onOpen={(path) => onNavigate(`/files?path=${encodeURIComponent(path)}`)} />
        )}

        {message.plan && message.plan.tier !== "blocked" && (
          <BalDoXPlanCard
            plan={message.plan}
            onApply={() => {
              confirmPendingPlan();
              void executeBalDoXPlan(message.plan!, onNavigate);
            }}
            onReview={() => {
              const route = routeForIntent(message.plan!.intent);
              if (route) onNavigate(route);
            }}
            onCancel={() => setPendingPlan(null)}
          />
        )}
      </div>
    </div>
  );
}

function AssistantContent({ content }: { content: string }) {
  const parts = parseMarkdownBlocks(content);

  return (
    <div className="space-y-2">
      {parts.map((part, i) =>
        part.type === "code" ? (
          <CodeBlock key={i} language={part.language ?? "text"} code={part.content} />
        ) : (
          part.content.split("\n").map((line, j) => (
            <p key={`${i}-${j}`} className={j > 0 ? "mt-1" : ""}>{line || "\u00A0"}</p>
          ))
        ),
      )}
    </div>
  );
}

interface MarkdownPart {
  type: "text" | "code";
  content: string;
  language?: string;
}

function parseMarkdownBlocks(text: string): MarkdownPart[] {
  const parts: MarkdownPart[] = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "code", language: match[1] || "text", content: match[2].trimEnd() });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: "text", content: text });
  }

  return parts;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-muted">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">{language}</span>
        <button
          type="button"
          onClick={() => void copyCode()}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-text-secondary hover:bg-surface-elevated"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed text-text-primary">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function DiskStatsCard({ stats }: { stats: NonNullable<BalDoXMessage["diskStats"]> }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted p-3">
      {stats.map((s) => (
        <div key={s.drive_letter} className="flex items-center gap-3">
          <HardDrive className="h-5 w-5 shrink-0 text-cyan-500" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-text-primary">{s.drive_letter}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.min(s.usage_percent, 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              {formatBytes(s.free_bytes)} livres / {formatBytes(s.total_bytes)} ({s.usage_percent.toFixed(0)}% usado)
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FileListCard({ files, onOpen }: { files: FileRow[]; onOpen: (path: string) => void }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted p-2">
      <ul className="max-h-48 space-y-1 overflow-y-auto">
        {files.slice(0, 15).map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => onOpen(f.path.replace(/\\[^\\]+$/, ""))}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-surface-elevated"
            >
              <ExternalLink className="h-3 w-3 shrink-0 text-cyan-500" />
              <span className="min-w-0 flex-1 truncate text-text-primary">{f.name}</span>
              <span className="shrink-0 text-text-secondary">{formatBytes(f.size)}</span>
            </button>
          </li>
        ))}
      </ul>
      {files.length > 15 && (
        <p className="px-2 py-1 text-xs text-text-secondary">+ {files.length - 15} arquivos…</p>
      )}
    </div>
  );
}

function routeForIntent(intent: string): string | null {
  const map: Record<string, string> = {
    CLEANUP: "/cleanup",
    DUPLICATES: "/duplicates",
    ORGANIZE: "/organize",
    SCAN: "/scanner",
    SEARCH_FILES: "/files",
    QUARANTINE: "/quarantine",
    LIST_APPS: "/apps",
    DIAGNOSE: "/diagnostics",
    MANAGE_FILES: "/files",
    NAVIGATE: "/control",
  };
  return map[intent] ?? null;
}

function AiConnectionBadge({ mode }: { mode: AiConnectionMode }) {
  const config: Record<AiConnectionMode, { label: string; icon: typeof Wifi; className: string }> = {
    online: { label: "Online", icon: Wifi, className: "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400" },
    offline: { label: "Offline", icon: WifiOff, className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    local: { label: "Local", icon: Cpu, className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
    local_llm: { label: "Local", icon: Brain, className: "border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  };
  const { label, icon: Icon, className } = config[mode];
  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${className}`}>
      <Icon className="h-3 w-3" aria-hidden />
      <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
    </div>
  );
}

function StatusBadge({ label, state }: { label: string; state: BalDoXAnimationState }) {
  const dotColor: Record<BalDoXAnimationState, string> = {
    idle: "bg-cyan-400",
    walking: "bg-cyan-400 animate-pulse",
    thinking: "bg-cyan-400 animate-pulse",
    scanning: "bg-blue-400 animate-pulse",
    organizing: "bg-blue-500 animate-pulse",
    success: "bg-green-500",
    warning: "bg-amber-500 animate-pulse",
  };

  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
      <span className={`h-2 w-2 rounded-full ${dotColor[state]}`} aria-hidden />
      <span className="text-xs font-medium text-text-secondary">{label}</span>
    </div>
  );
}
