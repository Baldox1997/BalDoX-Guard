import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/apiService";
import type { FileRow } from "../types/api";
import { formatBytes } from "../utils/format";

const DAY_OPTIONS = [
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
  { days: 180, label: "180 dias" },
  { days: 365, label: "1 ano" },
  { days: 730, label: "2 anos" },
];

export function OldFilesPage() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [days, setDays] = useState(365);
  const [loading, setLoading] = useState(true);
  const [scanId, setScanId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.getLatestScan().then((scan) => {
      if (!scan?.id) { setLoading(false); return; }
      setScanId(scan.id);
      return api.getOldFiles(scan.id, days);
    }).then((f) => { if (f) setFiles(f); }).finally(() => setLoading(false));
  }, [days]);

  async function quarantineSelected() {
    for (const path of selected) {
      await api.quarantineFile(path, `Arquivo antigo (${days}+ dias)`);
    }
    setFiles((prev) => prev.filter((f) => !selected.has(f.path)));
    setSelected(new Set());
  }

  if (!scanId && !loading) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-text-secondary">Execute um scan primeiro.</p>
        <Link to="/scanner" className="mt-4 inline-block text-accent hover:underline">Ir ao Scanner</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface-elevated p-4">
        {DAY_OPTIONS.map((o) => (
          <button
            key={o.days}
            type="button"
            onClick={() => setDays(o.days)}
            className={`rounded-lg px-3 py-1.5 text-sm ${days === o.days ? "bg-accent text-white" : "border border-border"}`}
          >
            {o.label}
          </button>
        ))}
        {selected.size > 0 && (
          <button type="button" onClick={() => void quarantineSelected()} className="ml-auto rounded-lg bg-amber-600 px-3 py-1.5 text-sm text-white">
            Quarentena ({selected.size})
          </button>
        )}
      </div>

      {!loading && (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-text-secondary">
              <tr><th className="p-3 w-8" /><th className="p-3">Nome</th><th className="p-3">Tamanho</th><th className="p-3">Modificado</th></tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.path} className="border-t border-border">
                  <td className="p-3">
                    <input type="checkbox" checked={selected.has(f.path)} onChange={() => {
                      setSelected((prev) => { const n = new Set(prev); if (n.has(f.path)) n.delete(f.path); else n.add(f.path); return n; });
                    }} />
                  </td>
                  <td className="p-3">{f.name}</td>
                  <td className="p-3">{formatBytes(f.size)}</td>
                  <td className="p-3 text-text-secondary">{f.modified_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
