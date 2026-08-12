import { useEffect, useState } from "react";
import { api } from "../services/apiService";
import type { InstalledApp } from "../types/api";
import { formatBytes } from "../utils/format";

export function AppsPage() {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [leftovers, setLeftovers] = useState<string[]>([]);

  useEffect(() => {
    api.listApps().then(setApps).catch(() => api.scanApps().then(setApps)).finally(() => setLoading(false));
  }, []);

  async function refresh() {
    setLoading(true);
    const result = await api.scanApps();
    setApps(result);
    setLoading(false);
  }

  async function uninstall(app: InstalledApp) {
    if (!confirm(`Desinstalar "${app.name}" usando o desinstalador oficial do Windows?`)) return;
    await api.uninstallApp(app);
    const paths = await api.getAppLeftovers(app);
    setLeftovers(paths);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => void refresh()} className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover">
          Atualizar lista
        </button>
      </div>

      {leftovers.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h3 className="font-medium">Possíveis resíduos pós-desinstalação</h3>
          <ul className="mt-2 text-sm text-text-secondary">
            {leftovers.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </section>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-text-secondary">
              <tr><th className="p-3">Nome</th><th className="p-3">Versão</th><th className="p-3">Editor</th><th className="p-3">Tamanho</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={`${app.name}-${app.uninstall_string}`} className="border-t border-border">
                  <td className="p-3 font-medium">{app.name}</td>
                  <td className="p-3 text-text-secondary">{app.version ?? "—"}</td>
                  <td className="p-3 text-text-secondary">{app.publisher ?? "—"}</td>
                  <td className="p-3">{app.size ? formatBytes(app.size) : "—"}</td>
                  <td className="p-3">
                    {app.uninstall_string && (
                      <button type="button" onClick={() => void uninstall(app)} className="text-xs text-red-600 hover:underline">
                        Desinstalar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
