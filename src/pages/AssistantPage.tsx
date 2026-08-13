import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Mic } from "lucide-react";
import { BalDoXAvatar } from "../components/baldox/BalDoXAvatar";
import { BalDoXChat } from "../components/baldox/BalDoXChat";
import { getBalDoXState, initGreeting, loadChatHistory, subscribeBalDoX } from "../stores/baldoxStore";
import { getProactiveGreeting } from "../services/automationService";
import { refreshAiConnectionStatus } from "../services/baldoxAgent";
import { api } from "../services/apiService";
import { BALDOX_STATE_LABELS, VOICE_HINT_LABEL } from "../constants/assistant";
import type { BalDoXAnimationState } from "../constants/assistant";

export function AssistantPage() {
  const [state, setState] = useState(getBalDoXState());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  useEffect(() => {
    void loadChatHistory();
    void refreshAiConnectionStatus();
    getProactiveGreeting().then((g) => initGreeting(g));
    api.getSettings().then((s) => {
      setVoiceEnabled((s.baldox_voice_input ?? false) || (s.baldox_voice_output ?? false));
    }).catch(() => {});
    const unsub = subscribeBalDoX(() => setState({ ...getBalDoXState() }));
    return () => { unsub(); };
  }, []);

  const baseAvatarState = state.secretaryActive && state.animationState === "idle" ? "scanning" : state.animationState;
  const avatarState: BalDoXAnimationState = isSpeaking ? "thinking" : baseAvatarState;
  const statusText = state.secretaryActive
    ? "BalDoX ativo — monitorando (modo seguro)"
    : BALDOX_STATE_LABELS[state.animationState];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:items-stretch">
      <aside className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-gradient-to-b from-surface-elevated to-surface-muted px-6 py-8 lg:w-72 xl:w-80">
        <div className="relative">
          <BalDoXAvatar state={avatarState} size="lg" className="h-60 w-48 sm:h-72 sm:w-56" />
          {state.secretaryActive && (
            <span className="absolute bottom-2 right-2 flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface-elevated bg-green-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-300" />
            </span>
          )}
        </div>
        <div className="mt-6 text-center">
          <h2 className="text-lg font-semibold text-text-primary">BalDoX Local</h2>
          <p className="mt-1 text-sm text-text-secondary">Seu guardião inteligente no PC</p>
        </div>

        {voiceEnabled && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <Mic className="h-3.5 w-3.5" />
            <span>{VOICE_HINT_LABEL}</span>
          </div>
        )}

        <div className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs ${
          state.secretaryActive
            ? "border-green-500/25 bg-green-500/10 text-green-700 dark:text-green-400"
            : "border-border bg-surface-muted text-text-secondary"
        }`}>
          <Activity className={`h-3.5 w-3.5 ${state.secretaryActive ? "animate-pulse" : ""}`} />
          <span>{statusText}</span>
        </div>

        <div className="mt-4 w-full space-y-2">
          {["Inteligência local", "Confirma antes de agir", "Temp e alertas automáticos", "Seus arquivos protegidos"].map((item) => (
            <div key={item} className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-3 py-2 text-center text-xs text-text-secondary">
              {item}
            </div>
          ))}
        </div>
        <Link to="/settings" className="mt-4 text-xs text-accent hover:underline">Configurar BalDoX</Link>
      </aside>

      <section className="min-w-0 flex-1">
        <BalDoXChat statusLabel={statusText} state={avatarState} onSpeakingChange={setIsSpeaking} />
      </section>
    </div>
  );
}
