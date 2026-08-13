import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { api } from "./apiService";
import type { AppSettings } from "../types/api";
import type { AutomationRule, BalDoXNotification } from "../types/baldox";

/**
 * Autonomia BalDoX em background (modo secretário).
 *
 * PERMITIDO sem confirmação do usuário:
 * - Notificações proativas (disco baixo, scan desatualizado, sugestão de organização — só aviso)
 * - Auto-limpeza de temp/cache seguro (`auto_clean_temp_safe`) quando habilitado em Settings
 *
 * NUNCA autônomo:
 * - Deletar/mover/organizar arquivos do usuário
 * - Quarentena ou delete permanente
 * - Desinstalar apps
 * - Qualquer caminho fora do Tier 1 (SafetyManager)
 */

const DEFAULT_INTERVAL_MIN = 10;
const SCAN_STALE_DAYS = 7;

let intervalId: ReturnType<typeof setInterval> | null = null;
let currentSettings: AppSettings | null = null;
const listeners = new Set<(notifications: BalDoXNotification[]) => void>();
let notifications: BalDoXNotification[] = [];
let trayListenersInitialized = false;

export const DEFAULT_RULES: AutomationRule[] = [
  {
    id: "auto-temp",
    label: "Auto-limpar temp semanalmente",
    description: "Remove arquivos temporários seguros (Tier 1)",
    enabled: false,
    tier: "safe",
    intervalHours: 168,
  },
  {
    id: "suggest-downloads",
    label: "Sugerir organização Downloads",
    description: "BalDoX sugere organizar Downloads ao abrir o app",
    enabled: true,
    tier: "review",
  },
  {
    id: "alert-disk",
    label: "Alertar disco C: crítico",
    description: "Notificação quando espaço livre estiver abaixo do limite",
    enabled: true,
    tier: "safe",
  },
  {
    id: "scan-stale",
    label: "Lembrar scan desatualizado",
    description: "Alerta se nenhum scan foi feito nos últimos 7 dias",
    enabled: true,
    tier: "safe",
  },
];

export function subscribeNotifications(cb: (n: BalDoXNotification[]) => void) {
  listeners.add(cb);
  cb(notifications);
  return () => listeners.delete(cb);
}

function emitNotifications() {
  listeners.forEach((cb) => cb([...notifications]));
}

export function addNotification(n: Omit<BalDoXNotification, "id" | "createdAt" | "read">) {
  const notification: BalDoXNotification = {
    ...n,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    read: false,
  };
  notifications = [notification, ...notifications].slice(0, 20);
  emitNotifications();
}

export function markNotificationRead(id: string) {
  notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
  emitNotifications();
}

export function isSecretaryActive(): boolean {
  return currentSettings?.baldox_secretary_active ?? true;
}

async function ensureNotificationPermission(): Promise<boolean> {
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      const perm = await requestPermission();
      granted = perm === "granted";
    }
    return granted;
  } catch {
    return false;
  }
}

async function pushNativeNotification(title: string, body: string) {
  try {
    const ok = await ensureNotificationPermission();
    if (ok) {
      sendNotification({ title, body });
    }
  } catch {
    /* dev sem Tauri */
  }
}

function daysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

export async function runProactiveChecks(settings: AppSettings) {
  currentSettings = settings;
  if (!settings.baldox_secretary_active) return;

  const threshold = settings.alert_low_disk_gb > 0 ? settings.alert_low_disk_gb : 2;

  if (threshold > 0) {
    try {
      const alert = await api.checkDiskSpaceAlert(threshold);
      if (alert) {
        addNotification({
          type: "warning",
          title: "Espaço em disco crítico",
          message: alert,
          actionLabel: "Liberar espaço",
          actionIntent: "libere 20 GB",
        });
        void pushNativeNotification("BalDoX Guard", alert);
      }
    } catch {
      /* ignore in dev without tauri */
    }
  }

  try {
    const latest = await api.getLatestScan();
    const stale =
      !latest ||
      latest.status !== "completed" ||
      daysSince(latest.started_at) >= SCAN_STALE_DAYS;

    if (stale) {
      const msg = latest
        ? `Último scan há ${daysSince(latest.started_at)} dias. Recomendo uma varredura completa.`
        : "Nenhum scan concluído ainda. Recomendo analisar seu PC.";
      addNotification({
        type: "info",
        title: "Scan desatualizado",
        message: msg,
        actionLabel: "Escanear agora",
        actionIntent: "escaneie meu pc",
      });
      void pushNativeNotification("BalDoX Guard", msg);
    }
  } catch {
    /* ignore */
  }

  if (settings.suggest_organize_downloads) {
    try {
      const downloads = await api.getDownloadsPath();
      if (downloads) {
        addNotification({
          type: "info",
          title: "Organizar Downloads?",
          message: "BalDoX pode analisar sua pasta Downloads e sugerir organização.",
          actionLabel: "Organizar",
          actionIntent: "organize meus downloads",
        });
      }
    } catch {
      /* ignore */
    }
  }
}

export async function runAutoCleanIfEnabled(settings: AppSettings) {
  if (!settings.auto_clean_temp || !settings.baldox_secretary_active) return;
  try {
    const cleaned = await api.autoCleanTempSafe();
    if (cleaned.length > 0) {
      const msg = `${cleaned.length} itens temporários removidos com segurança.`;
      addNotification({
        type: "success",
        title: "Limpeza automática concluída",
        message: msg,
      });
      void pushNativeNotification("BalDoX Guard", msg);
      await api.logBaldoxAction("auto_clean", JSON.stringify(cleaned), "completed");
    }
  } catch {
    /* ignore */
  }
}

export function startBackgroundMonitoring(settings: AppSettings) {
  stopBackgroundMonitoring();
  currentSettings = settings;

  if (!settings.baldox_secretary_active) return;

  void runProactiveChecks(settings);
  void runAutoCleanIfEnabled(settings);

  const intervalMin = Math.min(Math.max(settings.baldox_monitor_interval_min ?? DEFAULT_INTERVAL_MIN, 5), 15);
  const intervalMs = intervalMin * 60 * 1000;

  intervalId = setInterval(() => {
    void runProactiveChecks(settings);
    void runAutoCleanIfEnabled(settings);
  }, intervalMs);
}

export function stopBackgroundMonitoring() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function initTrayListeners(onNavigate: (path: string) => void, onQuickScan: () => void) {
  if (trayListenersInitialized) return;
  trayListenersInitialized = true;

  void listen<string>("tray-navigate", (event) => {
    if (event.payload) onNavigate(event.payload);
  });

  void listen("tray-quick-scan", () => {
    onQuickScan();
  });

  void getCurrentWindow().show().catch(() => {});
}

export async function getProactiveGreeting(): Promise<string> {
  try {
    const data = await api.getDashboardData();
    const free = data.storage.free_bytes;
    const freeGb = (free / (1024 ** 3)).toFixed(1);
    const scanStatus = data.last_scan_status;
    const secretary = currentSettings?.baldox_secretary_active ?? true;

    const prefix = secretary
      ? "Comandante, BalDoX Local está ativo — monitorando em modo seguro."
      : "Comandante,";

    if (scanStatus === "completed" && data.last_scan_id) {
      return `${prefix} Seu ${data.storage.drive_letter} tem ${freeGb} GB livres. Mantenho temp e alertas sozinho; para outras ações, sempre pergunto antes. Como posso servir?`;
    }
    return `${prefix} ${data.storage.drive_letter} com ${freeGb} GB livres. Ainda não há scan recente — recomendo uma análise completa. Diga o que precisa; confirmo antes de agir.`;
  } catch {
    return "Comandante, sou BalDoX Local — inteligente no seu PC. Mantenho temp e alertas sozinho; qualquer outra ação preciso da sua confirmação. O que precisa?";
  }
}
