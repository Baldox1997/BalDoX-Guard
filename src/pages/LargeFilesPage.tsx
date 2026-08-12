import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/apiService";
import type { FileRow } from "../types/api";
import { formatBytes } from "../utils/format";

export function LargeFilesPage() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [minSize, setMinSize] = useState(104857600);
  const [loading, setLoading] = useState(true);
  const [scanId, setScanId] = useState<number | null>(null);

  useEffect(() => {
    api.getLatestScan().then((scan) => {
      if (!scan?.id) {
        setLoading(false);
        return;
      }
      setScanId(scan.id);
      return api.getLargeFiles(scan.id, minSize);
    }).then((f) => {
      if (f) setFiles(f);
    }).finally(() => setLoading(false));
  }, [minSize]);

  async function quarantine(path: string) {
    await api.quarantineFile(path, "Arquivo grande — ação manual");
    setFiles((prev) => prev.filter((f) => f.path !== path));
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
        <label className="text-sm text-text-secondary">
          Mínimo:
          <select
            value={minSize}
            onChange={(e) => setMinSize(Number(e.target.value))}
            className="ml-2 rounded-lg border border-border px-2 py-1"
          >
            <option value={52428800}>50 MB</option>
            <option value={104857600}>100 MB</option>
            <option value={524288000}>500 MB</option>
            <option value={1073741824}>1 GB</option>
          </select>
        </label>
        <span className="text-sm text-text-secondary">{files.length} arquivos</span>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-text-secondary">
              <tr><th className="p-3">Nome</th><th className="p-3">Tamanho</th><th className="p-3">Caminho</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.path} className="border-t border-border">
                  <td className="p-3 font-medium">{f.name}</td>
                  <td className="p-3">{formatBytes(f.size)}</td>
                  <td className="max-w-xs truncate p-3 text-text-secondary">{f.path}</td>
                  <td className="p-3">
                    <button type="button" onClick={() => void quarantine(f.path)} className="text-xs text-amber-600 hover:underline">
                      Quarentena
                    </button>
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
