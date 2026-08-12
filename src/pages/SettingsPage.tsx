import { Monitor, Moon, Sun, Bot } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import type { ThemeMode } from "../types/theme";
import type { AppSettings } from "../types/api";
import { api } from "../services/apiService";
import { DEFAULT_RULES } from "../services/automationService";

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: "light", label: "Claro", icon: Sun },
  { mode: "dark", label: "Escuro", icon: Moon },
  { mode: "system", label: "Sistema", icon: Monitor },
];

export function SettingsPage() {
  const { mode, setMode } = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  async function save() {
    if (!settings) return;
    await api.saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!settings) {
    return <div className="flex h-40 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="text-base font-semibold text-text-primary">Aparência</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map(({ mode: optionMode, label, icon: Icon }) => (
            <button
              key={optionMode}
              type="button"
              onClick={() => setMode(optionMode)}
              className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-5 text-sm font-medium transition ${
                mode === optionMode ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface text-text-secondary hover:border-accent/40"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-cyan-500" />
          <h2 className="text-base font-semibold text-text-primary">BalDoX — Automação</h2>
        </div>
        <p className="mt-1 text-sm text-text-secondary">Tier 1 (seguro) pode auto-executar se habilitado. Tier 2+ sempre exige revisão.</p>

        <div className="mt-5 space-y-4">
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Auto-limpar temp (Tier 1 — seguro)</span>
            <input type="checkbox" checked={settings.auto_clean_temp} onChange={(e) => setSettings({ ...settings, auto_clean_temp: e.target.checked })} />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Sugerir organização Downloads ao abrir</span>
            <input type="checkbox" checked={settings.suggest_organize_downloads} onChange={(e) => setSettings({ ...settings, suggest_organize_downloads: e.target.checked })} />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Saudação proativa ao abrir app</span>
            <input type="checkbox" checked={settings.baldox_proactive_greeting} onChange={(e) => setSettings({ ...settings, baldox_proactive_greeting: e.target.checked })} />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Alertar disco C: abaixo de (GB)</span>
            <input type="number" min={1} max={50} value={settings.alert_low_disk_gb} onChange={(e) => setSettings({ ...settings, alert_low_disk_gb: Number(e.target.value) })} className="w-20 rounded-lg border border-border px-2 py-1 text-sm" />
          </label>
          <label className="block">
            <span className="text-sm">Personalidade BalDoX</span>
            <select value={settings.baldox_personality} onChange={(e) => setSettings({ ...settings, baldox_personality: e.target.value })} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
              <option value="professional">Secretário/Warrior (profissional e leal)</option>
              <option value="friendly">Amigável</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm">Modo IA BalDoX</span>
            <select
              value={settings.baldox_ai_mode ?? "local"}
              onChange={(e) => setSettings({ ...settings, baldox_ai_mode: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="local">Local (offline — regras + regex)</option>
              <option value="openai">OpenAI (melhor compreensão NL)</option>
            </select>
          </label>
          {settings.baldox_ai_mode === "openai" && (
            <label className="block">
              <span className="text-sm text-text-secondary">Chave OpenAI API</span>
              <input
                type="password"
                value={settings.baldox_openai_key ?? ""}
                onChange={(e) => setSettings({ ...settings, baldox_openai_key: e.target.value })}
                placeholder="sk-…"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-text-secondary">Opcional. Se vazio, usa parser local offline.</p>
            </label>
          )}
        </div>

        <div className="mt-4 rounded-lg border border-border bg-surface-muted p-3">
          <p className="text-xs font-medium text-text-secondary">Regras de automação</p>
          <ul className="mt-2 space-y-1">
            {DEFAULT_RULES.map((r) => (
              <li key={r.id} className="text-xs text-text-secondary">• {r.label} — Tier {r.tier}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="text-base font-semibold text-text-primary">Scanner e Quarentena</h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm text-text-secondary">Modo de exclusão no explorador</span>
            <select
              value={settings.delete_mode ?? "quarantine"}
              onChange={(e) => setSettings({ ...settings, delete_mode: e.target.value as "quarantine" | "permanent" })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="quarantine">Quarentena (reversível — padrão)</option>
              <option value="permanent">Exclusão permanente</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-text-secondary">Pasta de quarentena</span>
            <input type="text" value={settings.quarantine_path} onChange={(e) => setSettings({ ...settings, quarantine_path: e.target.value })} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </label>
        </div>
      </section>

      <button type="button" onClick={() => void save()} className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-hover">
        {saved ? "Salvo!" : "Salvar configurações"}
      </button>

      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="text-base font-semibold text-text-primary">Sobre</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-text-secondary">Versão</dt><dd className="font-medium">0.1.0 (Fases 2–8)</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-text-secondary">Stack</dt><dd className="font-medium">Tauri 2 + React + Rust + SQLite</dd></div>
        </dl>
      </section>
    </div>
  );
}
