import { useEffect, useState } from "react";
import { api } from "../services/apiService";
import type { ActionRow, ScanHistoryRow } from "../types/api";
import { formatBytes } from "../utils/format";

export function HistoryPage() {
  const [scans, setScans] = useState<ScanHistoryRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [tab, setTab] = useState<"scans" | "actions">("scans");

  useEffect(() => {
    void Promise.all([api.getScanHistory(), api.getActionHistory()]).then(([s, a]) => {
      setScans(s);
      setActions(a);
    });
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("scans")} className={`rounded-lg px-4 py-2 text-sm ${tab === "scans" ? "bg-accent text-white" : "border border-border"}`}>
          Histórico de scans
        </button>
        <button type="button" onClick={() => setTab("actions")} className={`rounded-lg px-4 py-2 text-sm ${tab === "actions" ? "bg-accent text-white" : "border border-border"}`}>
          Auditoria de ações
        </button>
      </div>

      {tab === "scans" ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-text-secondary">
              <tr><th className="p-3">Data</th><th className="p-3">Status</th><th className="p-3">Arquivos</th><th className="p-3">Tamanho</th></tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3">{s.started_at.slice(0, 16).replace("T", " ")}</td>
                  <td className="p-3 capitalize">{s.status}</td>
                  <td className="p-3">{s.files_count.toLocaleString()}</td>
                  <td className="p-3">{formatBytes(s.total_size)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-text-secondary">
              <tr><th className="p-3">Data</th><th className="p-3">Tipo</th><th className="p-3">Status</th><th className="p-3">Origem</th><th className="p-3">Detalhes</th></tr>
            </thead>
            <tbody>
              {actions.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-3">{a.created_at.slice(0, 16).replace("T", " ")}</td>
                  <td className="p-3">{a.action_type}</td>
                  <td className="p-3 capitalize">{a.status}</td>
                  <td className="p-3 text-text-secondary">{a.source ?? "—"}</td>
                  <td className="max-w-xs truncate p-3 text-text-secondary">{a.details.slice(0, 80)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
