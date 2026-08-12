import { api } from "./apiService";
import type { AppSettings } from "../types/api";
import type { AutomationRule, BalDoXNotification } from "../types/baldox";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<(notifications: BalDoXNotification[]) => void>();
let notifications: BalDoXNotification[] = [];

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
    label: "Alertar disco C: < 5 GB",
    description: "Notificação quando espaço livre estiver crítico",
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

export async function runProactiveChecks(settings: AppSettings) {
  if (settings.alert_low_disk_gb > 0) {
    try {
      const alert = await api.checkDiskSpaceAlert(settings.alert_low_disk_gb);
      if (alert) {
        addNotification({
          type: "warning",
          title: "Espaço em disco crítico",
          message: alert,
          actionLabel: "Liberar espaço",
          actionIntent: "libere 20 GB",
        });
      }
    } catch {
      /* ignore in dev without tauri */
    }
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
  if (!settings.auto_clean_temp) return;
  try {
    const cleaned = await api.autoCleanTempSafe();
    if (cleaned.length > 0) {
      addNotification({
        type: "success",
        title: "Limpeza automática concluída",
        message: `${cleaned.length} itens temporários removidos com segurança.`,
      });
      await api.logBaldoxAction("auto_clean", JSON.stringify(cleaned), "completed");
    }
  } catch {
    /* ignore */
  }
}

export function startBackgroundMonitoring(settings: AppSettings) {
  stopBackgroundMonitoring();
  void runProactiveChecks(settings);
  intervalId = setInterval(() => {
    void runProactiveChecks(settings);
  }, CHECK_INTERVAL_MS);
}

export function stopBackgroundMonitoring() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export async function getProactiveGreeting(): Promise<string> {
  try {
    const data = await api.getDashboardData();
    const free = data.storage.free_bytes;
    const freeGb = (free / (1024 ** 3)).toFixed(1);
    const scanStatus = data.last_scan_status;

    if (scanStatus === "completed" && data.last_scan_id) {
      return `Comandante, seu ${data.storage.drive_letter} tem ${freeGb} GB livres. Último scan concluído — ${data.stats.find((s) => s.id === "cleanup")?.value ?? "?"} recuperáveis em temp. Como posso servir?`;
    }
    return `Comandante, ${data.storage.drive_letter} com ${freeGb} GB livres. Ainda não há scan recente — recomendo uma análise completa.`;
  } catch {
    return "Comandante, estou pronto para ser seu braço direito digital. O que precisa?";
  }
}
