import { Activity, Cpu, FolderTree, HardDrive, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { DriveCard } from "../components/DriveCard";
import { GaugeBar } from "../components/GaugeBar";
import { CATEGORY_COLORS, PieChart } from "../components/PieChart";
import { api } from "../services/apiService";
import type { LargestFolder, ScanHistoryRow, StorageCategory, SystemInfo } from "../types/api";
import { formatBytes } from "../utils/format";

export function DiagnosticsPage() {
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [breakdown, setBreakdown] = useState<StorageCategory[]>([]);
  const [folders, setFolders] = useState<LargestFolder[]>([]);
  const [scans, setScans] = useState<ScanHistoryRow[]>([]);
  const [folderPath, setFolderPath] = useState("C:\\Users");
  const [folderAnalysis, setFolderAnalysis] = useState<Awaited<ReturnType<typeof api.analyzeFolderSize>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [sys, br, fld, hist] = await Promise.all([
        api.getSystemInfo(),
        api.getStorageBreakdown().catch(() => []),
        api.getLargestFolders(undefined, 15).catch(() => []),
        api.getScanHistory(10),
      ]);
      setSystem(sys);
      setBreakdown(br);
      setFolders(fld);
      setScans(hist);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function analyzeFolder() {
    setAnalyzing(true);
    try {
      const result = await api.analyzeFolderSize(folderPath, 1);
      setFolderAnalysis(result);
    } catch {
      setFolderAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading || !system) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const pieSlices = breakdown.map((b) => ({
    label: b.label,
    value: b.bytes,
    color: CATEGORY_COLORS[b.category] ?? CATEGORY_COLORS.other,
  }));

  const maxScanSize = Math.max(...scans.map((s) => s.total_size), 1);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Diagnóstico do Sistema</h1>
            <p className="text-sm text-text-secondary">Métricas em tempo real e análise de armazenamento</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-muted">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-accent" />
          <h2 className="text-base font-semibold text-text-primary">Informações do sistema</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <GaugeBar label="RAM" value={system.ram_usage_percent} color="bg-accent" />
          <GaugeBar label="Uptime" value={Math.floor(system.uptime_secs / 3600)} max={168} unit="h" color="bg-primary" />
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-surface-muted p-3"><dt className="text-text-secondary">Sistema</dt><dd className="font-medium">{system.os_name} {system.os_version}</dd></div>
          <div className="rounded-lg bg-surface-muted p-3"><dt className="text-text-secondary">Processador</dt><dd className="font-medium">{system.cpu_name}</dd></div>
          <div className="rounded-lg bg-surface-muted p-3"><dt className="text-text-secondary">Núcleos</dt><dd className="font-medium">{system.cpu_cores}</dd></div>
          <div className="rounded-lg bg-surface-muted p-3"><dt className="text-text-secondary">RAM total</dt><dd className="font-medium">{formatBytes(system.ram_total_bytes)}</dd></div>
          <div className="rounded-lg bg-surface-muted p-3"><dt className="text-text-secondary">RAM em uso</dt><dd className="font-medium">{formatBytes(system.ram_used_bytes)}</dd></div>
          <div className="rounded-lg bg-surface-muted p-3"><dt className="text-text-secondary">Hostname</dt><dd className="font-medium">{system.hostname}</dd></div>
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-text-primary">Drives</h2>
        </div>
        <DrivesSection />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface-elevated p-6">
          <h2 className="text-base font-semibold text-text-primary">O que ocupa meu PC?</h2>
          <p className="mt-1 text-sm text-text-secondary">Breakdown por categoria (último scan)</p>
          <div className="mt-6 flex justify-center">
            {breakdown.length > 0 ? (
              <PieChart slices={pieSlices} />
            ) : (
              <p className="text-sm text-text-secondary">Execute um scan para ver o breakdown.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface-elevated p-6">
          <h2 className="text-base font-semibold text-text-primary">Timeline de scans</h2>
          <div className="mt-4 space-y-2">
            {scans.length === 0 ? (
              <p className="text-sm text-text-secondary">Nenhum scan registrado.</p>
            ) : (
              scans.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs text-text-secondary">{s.started_at.slice(0, 10)}</span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(s.total_size / maxScanSize) * 100}%` }} />
                    </div>
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs text-text-secondary">{formatBytes(s.total_size)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-semibold text-text-primary">Pastas maiores</h2>
        </div>
        {folders.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">Execute um scan para listar pastas grandes.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-text-secondary">
                <tr><th className="p-3">Pasta</th><th className="p-3">Arquivos</th><th className="p-3">Tamanho</th></tr>
              </thead>
              <tbody>
                {folders.map((f) => (
                  <tr key={f.path} className="border-t border-border hover:bg-surface-muted/50">
                    <td className="max-w-xs truncate p-3" title={f.path}>{f.name}</td>
                    <td className="p-3 text-text-secondary">{f.file_count.toLocaleString()}</td>
                    <td className="p-3 font-medium">{formatBytes(f.bytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="text-base font-semibold text-text-primary">Analisador de pasta</h2>
        <p className="mt-1 text-sm text-text-secondary">Escolha uma pasta para medir tamanho e subpastas</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => void analyzeFolder()} disabled={analyzing} className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover disabled:opacity-50">
            {analyzing ? "Analisando…" : "Analisar"}
          </button>
        </div>
        {folderAnalysis && (
          <div className="mt-4 rounded-lg border border-border bg-surface-muted p-4">
            <p className="font-medium">{formatBytes(folderAnalysis.total_bytes)} — {folderAnalysis.file_count} arquivos, {folderAnalysis.folder_count} pastas</p>
            {folderAnalysis.subfolders.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {folderAnalysis.subfolders.slice(0, 10).map((s) => (
                  <li key={s.path} className="flex justify-between gap-4">
                    <span className="truncate text-text-secondary">{s.name}</span>
                    <span className="shrink-0 font-medium">{formatBytes(s.bytes)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function DrivesSection() {
  const [drives, setDrives] = useState<Awaited<ReturnType<typeof api.getAllDrivesStats>>>([]);

  useEffect(() => {
    api.getAllDrivesStats().then(setDrives).catch(() => {});
  }, []);

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {drives.map((d) => (
        <DriveCard key={d.mount_point} drive={d} />
      ))}
    </div>
  );
}
