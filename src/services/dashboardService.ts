import type { DashboardSummary } from "../types/dashboard";
import { formatBytes } from "../utils/format";
import { api } from "./apiService";

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  try {
    const data = await api.getDashboardData();
    const cleanupStat = data.stats.find((s) => s.id === "cleanup");
    const largeStat = data.stats.find((s) => s.id === "large");
    const oldStat = data.stats.find((s) => s.id === "old");
    const appsStat = data.stats.find((s) => s.id === "apps");

    return {
      storage: {
        usedBytes: data.storage.used_bytes,
        totalBytes: data.storage.total_bytes,
        usedLabel: formatBytes(data.storage.used_bytes, 0),
        totalLabel: formatBytes(data.storage.total_bytes, 0),
        usagePercent: data.storage.usage_percent,
      },
      potentialCleanupBytes: data.potential_cleanup_bytes,
      potentialCleanupLabel: formatBytes(data.potential_cleanup_bytes, 1),
      lastScanId: data.last_scan_id,
      stats: [
        {
          id: "cleanup",
          label: "Limpeza possível",
          value: cleanupStat?.value ?? formatBytes(0),
          description: "Temp e cache seguro",
          icon: "cleanup",
          accent: "green",
        },
        {
          id: "large",
          label: "Arquivos grandes",
          value: largeStat?.value ?? formatBytes(0),
          description: "Acima de 100 MB",
          icon: "large",
          accent: "blue",
        },
        {
          id: "duplicates",
          label: "Duplicados",
          value: "Ver scan",
          description: "Detectar após scan",
          icon: "duplicates",
          accent: "amber",
        },
        {
          id: "old",
          label: "Arquivos antigos",
          value: oldStat?.value ?? formatBytes(0),
          description: "1+ ano sem modificação",
          icon: "old",
          accent: "rose",
        },
        {
          id: "apps",
          label: "Aplicativos",
          value: appsStat?.value ?? String(data.app_count),
          description: "Programas instalados",
          icon: "apps",
          accent: "indigo",
        },
      ],
    };
  } catch {
    return mockFallback();
  }
}

function mockFallback(): DashboardSummary {
  return {
    storage: { usedBytes: 0, totalBytes: 0, usedLabel: "—", totalLabel: "—", usagePercent: 0 },
    potentialCleanupBytes: 0,
    potentialCleanupLabel: "—",
    stats: [],
  };
}
