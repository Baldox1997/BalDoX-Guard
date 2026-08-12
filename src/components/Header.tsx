import { Settings, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ASSISTANT_NAME } from "../constants/brand";
import { ThemeToggle } from "./ThemeToggle";
import { BalDoXNotifications } from "./baldox/BalDoXNotifications";
import { processBalDoXMessage } from "../services/baldoxAgent";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const navigate = useNavigate();

  async function handleNotificationAction(intent: string) {
    navigate("/assistant");
    await processBalDoXMessage(intent, (path) => navigate(path));
  }

  return (
    <header className="warrior-header flex items-center justify-between px-6 py-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-text-secondary">{subtitle}</p> : null}
      </div>

      <div className="flex items-center gap-2">
        <Link
          to="/assistant"
          className="hidden items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/15 sm:inline-flex"
          title={`Abrir ${ASSISTANT_NAME}`}
        >
          <Shield className="h-3.5 w-3.5" />
          {ASSISTANT_NAME}
        </Link>
        <BalDoXNotifications onAction={(intent) => void handleNotificationAction(intent)} />
        <ThemeToggle />
        <Link
          to="/settings"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-elevated text-text-secondary transition hover:bg-surface-muted hover:text-text-primary"
          title="Configurações"
          aria-label="Configurações"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
