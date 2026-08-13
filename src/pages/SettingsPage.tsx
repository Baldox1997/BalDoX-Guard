import { Monitor, Moon, Sun, Bot, ChevronDown, Mic, Brain } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import type { ThemeMode } from "../types/theme";
import type { AppSettings } from "../types/api";
import { api } from "../services/apiService";
import { refreshAiConnectionStatus } from "../services/baldoxAgent";
import { startBackgroundMonitoring, DEFAULT_RULES } from "../services/automationService";
import { syncCompanionWithSettings } from "../services/companionService";
import { listOllamaModels, RECOMMENDED_CODING_MODELS, testOllamaConnection } from "../services/ollamaService";
import { setSecretaryActive } from "../stores/baldoxStore";

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: "light", label: "Claro", icon: Sun },
  { mode: "dark", label: "Escuro", icon: Moon },
  { mode: "system", label: "Sistema", icon: Monitor },
];

export function SettingsPage() {
  const { mode, setMode } = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaTestResult, setOllamaTestResult] = useState<string | null>(null);
  const [ollamaTesting, setOllamaTesting] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    if (!settings || settings.baldox_ai_mode !== "local_llm") return;
    const url = settings.baldox_ollama_url ?? "http://127.0.0.1:11434";
    void listOllamaModels(url).then(setOllamaModels).catch(() => setOllamaModels([]));
  }, [settings?.baldox_ai_mode, settings?.baldox_ollama_url]);

  async function save() {
    if (!settings) return;
    await api.saveSettings(settings);
    setSecretaryActive(settings.baldox_secretary_active ?? true);
    await syncCompanionWithSettings(settings);
    startBackgroundMonitoring(settings);
    void refreshAiConnectionStatus();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTestOllama() {
    if (!settings) return;
    setOllamaTesting(true);
    setOllamaTestResult(null);
    const result = await testOllamaConnection(
      settings.baldox_ollama_url ?? "http://127.0.0.1:11434",
      settings.baldox_ollama_model ?? "llama3.2",
    );
    setOllamaTestResult(result.message);
    setOllamaTesting(false);
    if (result.ok) {
      const models = await listOllamaModels(settings.baldox_ollama_url ?? "http://127.0.0.1:11434");
      setOllamaModels(models);
    }
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
          <h2 className="text-base font-semibold text-text-primary">BalDoX Local — inteligente no seu PC</h2>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Modo padrão: inteligência local (regras + contexto do PC). BalDoX confirma antes de agir no chat; em background, só limpa temp seguro e envia alertas.
        </p>

        <div className="mt-5 space-y-4">
          <label className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm">Modo secretário ativo</span>
              <p className="text-xs text-text-secondary">Monitora disco, scan e envia notificações em background</p>
            </div>
            <input
              type="checkbox"
              checked={settings.baldox_secretary_active ?? true}
              onChange={(e) => setSettings({ ...settings, baldox_secretary_active: e.target.checked })}
            />
          </label>

          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Auto-limpar temp (Tier 1 — seguro, em background)</span>
            <input type="checkbox" checked={settings.auto_clean_temp} onChange={(e) => setSettings({ ...settings, auto_clean_temp: e.target.checked })} />
          </label>

          <label className="block">
            <span className="text-sm">Intervalo de monitoramento (minutos)</span>
            <input
              type="number"
              min={5}
              max={15}
              value={settings.baldox_monitor_interval_min ?? 10}
              onChange={(e) => setSettings({ ...settings, baldox_monitor_interval_min: Number(e.target.value) })}
              className="mt-1 w-24 rounded-lg border border-border px-2 py-1 text-sm"
            />
            <p className="mt-1 text-xs text-text-secondary">Entre 5 e 15 minutos. Padrão: 10.</p>
          </label>

          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Sugerir organização Downloads (só notificação)</span>
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

          <label className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm">Minimizar para bandeja ao fechar</span>
              <p className="text-xs text-text-secondary">BalDoX continua ativo na system tray do Windows</p>
            </div>
            <input
              type="checkbox"
              checked={settings.baldox_minimize_to_tray ?? true}
              onChange={(e) => setSettings({ ...settings, baldox_minimize_to_tray: e.target.checked })}
            />
          </label>

          <label className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm">BalDoX no desktop (personagem ambulante)</span>
              <p className="text-xs text-text-secondary">
                Janela transparente sobre o desktop quando o modo secretário está ativo. Clique no personagem para abrir o chat.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.baldox_desktop_companion ?? false}
              onChange={(e) => setSettings({ ...settings, baldox_desktop_companion: e.target.checked })}
            />
          </label>

          {(settings.baldox_desktop_companion ?? false) && (
            <label className="block">
              <span className="text-sm">Velocidade da patrulha (px/s)</span>
              <input
                type="number"
                min={30}
                max={200}
                value={settings.baldox_companion_speed ?? 80}
                onChange={(e) =>
                  setSettings({ ...settings, baldox_companion_speed: Number(e.target.value) })
                }
                className="mt-1 w-24 rounded-lg border border-border px-2 py-1 text-sm"
              />
              <p className="mt-1 text-xs text-text-secondary">Padrão: 80. Salve para aplicar; a janela companion recarrega ao reabrir.</p>
            </label>
          )}
        </div>

        <div className="mt-4 rounded-lg border border-border bg-surface-muted p-3">
          <p className="text-xs font-medium text-text-secondary">Autonomia em background (Tier 1)</p>
          <ul className="mt-2 space-y-1">
            {DEFAULT_RULES.map((r) => (
              <li key={r.id} className="text-xs text-text-secondary">• {r.label} — Tier {r.tier}</li>
            ))}
          </ul>
        </div>

        <details className="mt-5 rounded-lg border border-border bg-surface-muted">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-text-secondary [&::-webkit-details-marker]:hidden">
            <ChevronDown className="h-4 w-4 shrink-0 transition [[open]_&]:rotate-180" />
            IA: Ollama local ou online (opcional)
          </summary>
          <div className="space-y-4 border-t border-border px-4 py-4">
            <p className="text-xs text-text-secondary">
              Padrão: regras locais. Para IA completa offline, use Ollama. Para nuvem, use OpenAI-compatible.
            </p>
            <label className="block">
              <span className="text-sm">Modo IA</span>
              <select
                value={settings.baldox_ai_mode ?? "local"}
                onChange={(e) => setSettings({ ...settings, baldox_ai_mode: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                <option value="local">Local (regras — offline básico)</option>
                <option value="local_llm">Local LLM (Ollama — recomendado)</option>
                <option value="online">Online avançado (OpenAI ou compatível)</option>
              </select>
            </label>

            {settings.baldox_ai_mode === "local_llm" && (
              <>
                <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-xs text-text-secondary">
                  <p className="flex items-center gap-1.5 font-medium text-text-primary">
                    <Brain className="h-3.5 w-3.5 text-purple-500" />
                    Instalar Ollama
                  </p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4">
                    <li>Baixe em <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-purple-600 underline">ollama.com</a></li>
                    <li><code className="rounded bg-surface-muted px-1">ollama pull llama3.2</code></li>
                    <li>Programação: <code className="rounded bg-surface-muted px-1">ollama pull qwen2.5-coder</code></li>
                  </ol>
                </div>

                <label className="block">
                  <span className="text-sm text-text-secondary">URL Ollama</span>
                  <input
                    type="url"
                    value={settings.baldox_ollama_url ?? "http://127.0.0.1:11434"}
                    onChange={(e) => setSettings({ ...settings, baldox_ollama_url: e.target.value })}
                    placeholder="http://127.0.0.1:11434"
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-text-secondary">Modelo</span>
                  {ollamaModels.length > 0 ? (
                    <select
                      value={settings.baldox_ollama_model ?? "llama3.2"}
                      onChange={(e) => setSettings({ ...settings, baldox_ollama_model: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      {ollamaModels.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={settings.baldox_ollama_model ?? "llama3.2"}
                      onChange={(e) => setSettings({ ...settings, baldox_ollama_model: e.target.value })}
                      placeholder="llama3.2"
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                    />
                  )}
                  <p className="mt-1 text-xs text-text-secondary">
                    Recomendados: {RECOMMENDED_CODING_MODELS.join(", ")}
                  </p>
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleTestOllama()}
                    disabled={ollamaTesting}
                    className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-500/20 disabled:opacity-50 dark:text-purple-400"
                  >
                    {ollamaTesting ? "Testando…" : "Testar conexão"}
                  </button>
                  {ollamaTestResult && (
                    <p className={`text-xs ${ollamaTestResult.startsWith("Conectado") ? "text-green-600" : "text-amber-600"}`}>
                      {ollamaTestResult}
                    </p>
                  )}
                </div>
              </>
            )}

            {(settings.baldox_ai_mode === "online" || settings.baldox_ai_mode === "openai") && (
              <>
                <label className="block">
                  <span className="text-sm text-text-secondary">Chave API</span>
                  <input
                    type="password"
                    value={settings.baldox_openai_key ?? ""}
                    onChange={(e) => setSettings({ ...settings, baldox_openai_key: e.target.value })}
                    placeholder="sk-…"
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                    autoComplete="off"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-text-secondary">Modelo</span>
                  <input
                    type="text"
                    value={settings.baldox_llm_model ?? "gpt-4o-mini"}
                    onChange={(e) => setSettings({ ...settings, baldox_llm_model: e.target.value })}
                    placeholder="gpt-4o-mini"
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-text-secondary">Base URL (OpenAI-compatible)</span>
                  <input
                    type="url"
                    value={settings.baldox_llm_base_url ?? "https://api.openai.com/v1"}
                    onChange={(e) => setSettings({ ...settings, baldox_llm_base_url: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </label>
              </>
            )}
          </div>
        </details>
      </section>

      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-semibold text-text-primary">BalDoX — Modo voz</h2>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Comandos de voz locais via Web Speech API (microfone e síntese do Windows/Edge). Sem envio de áudio para a nuvem.
        </p>

        <div className="mt-5 space-y-4">
          <label className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm">Ativar entrada por voz (microfone)</span>
              <p className="text-xs text-text-secondary">Botão de microfone no chat — clique para ouvir e falar</p>
            </div>
            <input
              type="checkbox"
              checked={settings.baldox_voice_input ?? false}
              onChange={(e) => setSettings({ ...settings, baldox_voice_input: e.target.checked })}
            />
          </label>

          <label className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm">Ativar resposta falada</span>
              <p className="text-xs text-text-secondary">BalDoX lê as respostas em português (TTS local)</p>
            </div>
            <input
              type="checkbox"
              checked={settings.baldox_voice_output ?? false}
              onChange={(e) => setSettings({ ...settings, baldox_voice_output: e.target.checked })}
            />
          </label>

          <label className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm">Conversa contínua</span>
              <p className="text-xs text-text-secondary">Reabre o microfone automaticamente após BalDoX terminar de falar</p>
            </div>
            <input
              type="checkbox"
              checked={settings.baldox_voice_continuous ?? false}
              onChange={(e) => setSettings({ ...settings, baldox_voice_continuous: e.target.checked })}
              disabled={!(settings.baldox_voice_input && settings.baldox_voice_output)}
            />
          </label>
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
