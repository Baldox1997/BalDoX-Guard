import { useEffect, useState } from "react";
import { api } from "../services/apiService";
import type { ActionPreview, CleanupCandidate } from "../types/api";
import { formatBytes } from "../utils/format";
import { ConfirmDialog } from "../components/ConfirmDialog";

export function CleanupPage() {
  const [candidates, setCandidates] = useState<CleanupCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<ActionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [useQuarantine, setUseQuarantine] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    api.analyzeCleanup().then(setCandidates).finally(() => setLoading(false));
  }, []);

  const selectedBytes = candidates.filter((c) => selected.has(c.path)).reduce((s, c) => s + c.size, 0);

  function toggleAll() {
    if (selected.size === candidates.length) setSelected(new Set());
    else setSelected(new Set(candidates.map((c) => c.path)));
  }

  async function analyzeSelected() {
    const items = [...selected].map((p) => ({
      action_type: useQuarantine ? "QUARANTINE" as const : "DELETE" as const,
      source: p,
      reason: "Limpeza revisada",
    }));
    setPreview(await api.previewAction(items));
  }

  async function executeClean() {
    setExecuting(true);
    try {
      await api.cleanSelected([...selected], useQuarantine, "user");
      setCandidates((prev) => prev.filter((c) => !selected.has(c.path)));
      setSelected(new Set());
      setPreview(null);
      setShowConfirm(false);
    } finally {
      setExecuting(false);
    }
  }

  function requestExecute() {
    if (!preview) {
      void analyzeSelected().then(() => setShowConfirm(true));
    } else {
      setShowConfirm(true);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="rounded-xl border border-border bg-surface-elevated p-4">
        <p className="text-sm text-text-secondary">
          Apenas caminhos seguros. Fluxo: selecionar → revisar → confirmar → executar.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useQuarantine} onChange={(e) => { setUseQuarantine(e.target.checked); setPreview(null); }} />
            Usar quarentena (recomendado)
          </label>
          <span className="text-sm text-text-secondary">{selected.size} selecionados — {formatBytes(selectedBytes)}</span>
          <button type="button" onClick={toggleAll} className="text-sm text-accent hover:underline">Alternar todos</button>
        </div>
      </section>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-text-secondary">
              <tr><th className="p-3 w-8" /><th className="p-3">Nome</th><th className="p-3">Categoria</th><th className="p-3">Tamanho</th></tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.path} className="border-t border-border">
                  <td className="p-3">
                    <input type="checkbox" checked={selected.has(c.path)} onChange={() => {
                      setSelected((prev) => { const n = new Set(prev); if (n.has(c.path)) n.delete(c.path); else n.add(c.path); setPreview(null); return n; });
                    }} />
                  </td>
                  <td className="max-w-xs truncate p-3">{c.name}</td>
                  <td className="p-3 text-text-secondary">{c.category}</td>
                  <td className="p-3">{formatBytes(c.size)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex gap-3">
          <button type="button" onClick={() => void analyzeSelected()} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-muted">
            Revisar seleção
          </button>
          <button type="button" onClick={requestExecute} disabled={executing} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
            {executing ? "Executando…" : useQuarantine ? "Limpar (quarentena)" : "Limpar (excluir)"}
          </button>
        </div>
      )}

      {preview && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h3 className="font-medium">Pré-visualização</h3>
          <p className="mt-1 text-sm text-text-secondary">{preview.items.length} itens — {formatBytes(preview.total_bytes)}</p>
          {preview.warnings.map((w) => <p key={w} className="mt-1 text-xs text-amber-600">{w}</p>)}
          {preview.blocked.map((b) => <p key={b} className="mt-1 text-xs text-red-600">{b}</p>)}
        </section>
      )}

      <ConfirmDialog
        open={showConfirm}
        title={useQuarantine ? "Confirmar limpeza (quarentena)" : "Confirmar exclusão"}
        message={`${selected.size} itens (${formatBytes(selectedBytes)}) serão ${useQuarantine ? "movidos para quarentena" : "excluídos permanentemente"}.`}
        confirmLabel={useQuarantine ? "Mover para quarentena" : "Excluir"}
        variant="danger"
        onConfirm={() => void executeClean()}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
