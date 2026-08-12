import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BalDoXAvatar } from "../components/baldox/BalDoXAvatar";
import { BalDoXChat } from "../components/baldox/BalDoXChat";
import { getBalDoXState, initGreeting, loadChatHistory, subscribeBalDoX } from "../stores/baldoxStore";
import { getProactiveGreeting } from "../services/automationService";
import { BALDOX_STATE_LABELS } from "../constants/assistant";

export function AssistantPage() {
  const [state, setState] = useState(getBalDoXState());

  useEffect(() => {
    void loadChatHistory();
    getProactiveGreeting().then((g) => initGreeting(g));
    const unsub = subscribeBalDoX(() => setState({ ...getBalDoXState() }));
    return () => { unsub(); };
  }, []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:items-stretch">
      <aside className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-gradient-to-b from-surface-elevated to-surface-muted px-6 py-8 lg:w-72 xl:w-80">
        <BalDoXAvatar state={state.animationState} size="lg" className="h-60 w-48 sm:h-72 sm:w-56" />
        <div className="mt-6 text-center">
          <h2 className="text-lg font-semibold text-text-primary">BalDoX</h2>
          <p className="mt-1 text-sm text-text-secondary">Seu braço direito digital</p>
        </div>
        <div className="mt-6 w-full space-y-2">
          {["Análise inteligente", "Organização segura", "Limpeza com revisão", "Automação controlada"].map((item) => (
            <div key={item} className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-3 py-2 text-center text-xs text-text-secondary">
              {item}
            </div>
          ))}
        </div>
        <Link to="/settings" className="mt-4 text-xs text-accent hover:underline">Configurar automação</Link>
      </aside>

      <section className="min-w-0 flex-1">
        <BalDoXChat statusLabel={BALDOX_STATE_LABELS[state.animationState]} state={state.animationState} />
      </section>
    </div>
  );
}
