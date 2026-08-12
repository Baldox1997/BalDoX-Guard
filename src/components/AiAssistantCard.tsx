import { MessageSquare, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { BRAND_ICON_IMAGE } from "../constants/brand";
import { BalDoXAvatar } from "./baldox/BalDoXAvatar";
import {
  ASSISTANT_CARD_TITLE,
  ASSISTANT_GREETING,
  ASSISTANT_OPEN_LABEL,
} from "../constants/assistant";
import { processBalDoXMessage } from "../services/baldoxAgent";

const SUGGESTIONS = [
  "Encontre arquivos grandes",
  "Quanto espaço no C:?",
  "Organize meus downloads",
  "Rotina de manutenção",
];

export function AiAssistantCard() {
  const navigate = useNavigate();

  async function handleSuggestion(text: string) {
    navigate("/assistant");
    await processBalDoXMessage(text, (path) => navigate(path));
  }

  return (
    <section className="hero-warrior-card rounded-xl p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative flex shrink-0 items-center justify-center overflow-visible sm:w-44">
          <img
            src={BRAND_ICON_IMAGE}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -left-2 -top-2 h-12 w-12 rounded-xl border border-primary/30 opacity-40 blur-[0.5px]"
          />
          <BalDoXAvatar state="idle" size="sm" className="relative h-40 w-36" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-text-primary">{ASSISTANT_CARD_TITLE}</h2>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            &ldquo;{ASSISTANT_GREETING}&rdquo;
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void handleSuggestion(suggestion)}
                className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-text-secondary transition hover:bg-primary/10 hover:text-text-primary"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <Link
            to="/assistant"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-hover px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            <MessageSquare className="h-4 w-4" />
            {ASSISTANT_OPEN_LABEL}
          </Link>
        </div>
      </div>
    </section>
  );
}
