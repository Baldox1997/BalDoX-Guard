import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

export function ThemeToggle() {
  const { resolved, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-elevated text-text-secondary transition hover:bg-surface-muted hover:text-text-primary"
      title={resolved === "dark" ? "Modo claro" : "Modo escuro"}
      aria-label={resolved === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
