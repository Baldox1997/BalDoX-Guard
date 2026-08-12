import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { Loader2, Square } from "lucide-react";
import { api } from "../services/apiService";
import type { DriveInfo, ScanProgress, SpecialFolder } from "../types/api";
import { formatBytes } from "../utils/format";

export function ScannerPage() {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [folders, setFolders] = useState<SpecialFolder[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([api.getDrives(), api.getSpecialFolders()]).then(([d, f]) => {
      setDrives(d);
      setFolders(f);
      const defaults = new Set<string>();
      d.filter((x) => x.letter === "C:").forEach((x) => defaults.add(x.path));
      f.forEach((x) => defaults.add(x.path));
      setSelected(defaults);
    });
    api.getScanProgress().then(setProgress).catch(() => {});
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<ScanProgress>("scan-progress", (e) => {
      setProgress(e.payload);
      setScanning(e.payload.status === "running");
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, []);

  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function startScan() {
    if (selected.size === 0) {
      setError("Selecione ao menos um local.");
      return;
    }
    setError(null);
    setScanning(true);
    try {
      await api.startScan([...selected]);
    } catch (e) {
      setError(String(e));
      setScanning(false);
    }
  }

  async function cancelScan() {
    await api.cancelScan();
    setScanning(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="text-base font-semibold text-text-primary">Locais para varredura</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Caminhos protegidos (Windows, System32, Program Files) são ignorados automaticamente.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-text-primary">Unidades</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {drives.map((d) => (
                <label key={d.path} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <input type="checkbox" checked={selected.has(d.path)} onChange={() => toggle(d.path)} disabled={scanning} />
                  {d.letter} — {d.path}
                </label>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-primary">Pastas especiais</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {folders.map((f) => (
                <label key={f.path} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <input type="checkbox" checked={selected.has(f.path)} onChange={() => toggle(f.path)} disabled={scanning} />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => void startScan()}
            disabled={scanning}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {scanning && <Loader2 className="h-4 w-4 animate-spin" />}
            Iniciar scan
          </button>
          {scanning && (
            <button
              type="button"
              onClick={() => void cancelScan()}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-text-primary hover:bg-surface-muted"
            >
              <Square className="h-4 w-4" />
              Cancelar
            </button>
          )}
        </div>
      </section>

      {progress && progress.status !== "idle" && (
        <section className="rounded-xl border border-border bg-surface-elevated p-6">
          <h2 className="text-base font-semibold text-text-primary">Progresso</h2>
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: progress.status === "completed" ? "100%" : "60%" }}
              />
            </div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-text-secondary">Status</dt><dd className="font-medium capitalize">{progress.status}</dd></div>
              <div><dt className="text-text-secondary">Arquivos</dt><dd className="font-medium">{progress.files_scanned.toLocaleString()}</dd></div>
              <div><dt className="text-text-secondary">Tamanho</dt><dd className="font-medium">{formatBytes(progress.total_size)}</dd></div>
              <div><dt className="text-text-secondary">Tempo</dt><dd className="font-medium">{progress.elapsed_secs}s</dd></div>
            </dl>
            <p className="mt-2 truncate text-xs text-text-secondary">{progress.current_path}</p>
          </div>
        </section>
      )}
    </div>
  );
}
