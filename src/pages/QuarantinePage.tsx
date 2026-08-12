import { useEffect, useState } from "react";
import { api } from "../services/apiService";
import type { QuarantineRow } from "../types/api";
import { formatBytes } from "../utils/format";

export function QuarantinePage() {
  const [items, setItems] = useState<QuarantineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listQuarantine().then(setItems).finally(() => setLoading(false));
  }, []);

  async function restore(id: number) {
    await api.restoreQuarantine(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function permanentDelete(id: number) {
    if (!confirm("Excluir permanentemente? Esta ação não pode ser desfeita.")) return;
    await api.deleteQuarantinePermanent(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="rounded-xl border border-border bg-surface-elevated p-4">
        <p className="text-sm text-text-secondary">
          Arquivos movidos para quarentena podem ser restaurados ou excluídos permanentemente após revisão.
        </p>
      </section>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-text-secondary">Quarentena vazia.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-text-secondary">
              <tr><th className="p-3">Original</th><th className="p-3">Tamanho</th><th className="p-3">Data</th><th className="p-3">Ações</th></tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="max-w-md truncate p-3">{item.original_path}</td>
                  <td className="p-3">{formatBytes(item.size)}</td>
                  <td className="p-3 text-text-secondary">{item.quarantined_at.slice(0, 10)}</td>
                  <td className="p-3">
                    <button type="button" onClick={() => void restore(item.id)} className="mr-3 text-xs text-green-600 hover:underline">Restaurar</button>
                    <button type="button" onClick={() => void permanentDelete(item.id)} className="text-xs text-red-600 hover:underline">Excluir</button>
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
