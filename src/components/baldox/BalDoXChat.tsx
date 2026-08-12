import { ExternalLink, HardDrive, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ASSISTANT_INPUT_PLACEHOLDER,
  ASSISTANT_NAME,
  BALDOX_STATE_LABELS,
  type BalDoXAnimationState,
} from "../../constants/assistant";
import { processBalDoXMessage } from "../../services/baldoxAgent";
import { executeBalDoXPlan } from "../../services/planExecutor";
import {
  consumeNavigateTo,
  getBalDoXState,
  loadChatHistory,
  setPendingPlan,
  subscribeBalDoX,
} from "../../stores/baldoxStore";
import type { BalDoXMessage } from "../../types/baldox";
import type { FileRow } from "../../types/api";
import { formatBytes } from "../../utils/format";
import { BalDoXPlanCard } from "./BalDoXPlanCard";

interface BalDoXChatProps {
  statusLabel?: string;
  state?: BalDoXAnimationState;
  suggestions?: string[];
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

export function BalDoXChat({
  statusLabel,
  state: externalState,
  suggestions = DEFAULT_SUGGESTIONS,
}: BalDoXChatProps) {
  const [input, setInput] = useState("");
  const [storeState, setStoreState] = useState(getBalDoXState());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    void loadChatHistory();
    const unsub = subscribeBalDoX(() => setStoreState({ ...getBalDoXState() }));
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [storeState.messages, storeState.pendingPlan]);

  useEffect(() => {
    const path = consumeNavigateTo();
    if (path) navigate(path);
  }, [storeState.navigateTo, navigate]);

  const animationState = externalState ?? storeState.animationState;
  const status = statusLabel ?? BALDOX_STATE_LABELS[animationState];

  async function handleSubmit(text: string) {
    if (!text.trim() || storeState.isProcessing) return;
    setInput("");
    await processBalDoXMessage(text, (path) => navigate(path));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(input);
    }
  }

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-xl border border-border bg-surface-elevated">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Conversa com {ASSISTANT_NAME}</h2>
          <p className="mt-0.5 text-xs text-text-secondary">Comandos em linguagem natural — busca, execução e diagnóstico</p>
        </div>
        <StatusBadge label={status} state={animationState} />
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {storeState.messages.map((message) => (
          <MessageBubble key={message.id} message={message} onNavigate={(p) => navigate(p)} />
        ))}

        {storeState.pendingPlan && !storeState.messages.some((m) => m.plan?.id === storeState.pendingPlan?.id) && (
          <BalDoXPlanCard
            plan={storeState.pendingPlan}
            onApply={() => void executeBalDoXPlan(storeState.pendingPlan!, (p) => navigate(p))}
            onReview={() => {
              const route = routeForIntent(storeState.pendingPlan!.intent);
              if (route) navigate(route);
            }}
            onCancel={() => setPendingPlan(null)}
          />
        )}

        <div ref={bottomRef} />
      </div>

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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={storeState.isProcessing}
            placeholder={ASSISTANT_INPUT_PLACEHOLDER}
            className="flex-1 rounded-lg border border-border bg-surface-muted px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/70 disabled:opacity-70"
          />
          <button
            type="submit"
            disabled={storeState.isProcessing || !input.trim()}
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
          {message.content.split("\n").map((line, i) => (
            <p key={i} className={i > 0 ? "mt-1" : ""}>{line}</p>
          ))}
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
            onApply={() => void executeBalDoXPlan(message.plan!, onNavigate)}
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

function StatusBadge({ label, state }: { label: string; state: BalDoXAnimationState }) {
  const dotColor: Record<BalDoXAnimationState, string> = {
    idle: "bg-cyan-400",
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
