import { useEffect, useState } from "react";
import { api } from "../services/apiService";
import type { ActionPreview, OrganizePlan } from "../types/api";
import { formatBytes } from "../utils/format";

export function OrganizationPage() {
  const [plan, setPlan] = useState<OrganizePlan | null>(null);
  const [preview, setPreview] = useState<ActionPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [path, setPath] = useState("");

  useEffect(() => {
    api.getDownloadsPath().then((p) => { if (p) setPath(p); });
  }, []);

  async function analyze() {
    setLoading(true);
    try {
      const result = await api.analyzeOrganization(path || undefined);
      setPlan(result);
      const items = result.suggestions.map((s) => ({
        action_type: "MOVE" as const,
        source: s.source,
        destination: s.destination,
        reason: `Organizar em ${s.category}`,
      }));
      const p = await api.previewAction(items);
      setPreview(p);
    } finally {
      setLoading(false);
    }
  }

  async function execute() {
    if (!plan) return;
    setExecuting(true);
    try {
      await api.executeOrganization(plan, "user");
      setPlan(null);
      setPreview(null);
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="rounded-xl border border-border bg-surface-elevated p-4">
        <p className="text-sm text-text-secondary">Organize arquivos soltos em subpastas por categoria. Revise antes de mover.</p>
        <div className="mt-3 flex gap-3">
          <input type="text" value={path} onChange={(e) => setPath(e.target.value)} placeholder="Caminho da pasta" className="flex-1 rounded-lg border border-border px-3 py-2 text-sm" />
          <button type="button" onClick={() => void analyze()} disabled={loading} className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover disabled:opacity-50">
            {loading ? "Analisando…" : "Analisar"}
          </button>
        </div>
      </section>

      {plan && (
        <>
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <p className="text-sm"><strong>{plan.total_files}</strong> arquivos — <strong>{formatBytes(plan.total_bytes)}</strong></p>
          </div>
          <div className="max-h-96 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-muted text-left text-text-secondary">
                <tr><th className="p-3">Arquivo</th><th className="p-3">Categoria</th><th className="p-3">Destino</th></tr>
              </thead>
              <tbody>
                {plan.suggestions.map((s) => (
                  <tr key={s.source} className="border-t border-border">
                    <td className="max-w-xs truncate p-3">{s.source.split("\\").pop()}</td>
                    <td className="p-3">{s.category}</td>
                    <td className="max-w-xs truncate p-3 text-text-secondary">{s.destination}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview && preview.blocked.length === 0 && (
            <button type="button" onClick={() => void execute()} disabled={executing} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
              {executing ? "Organizando…" : "Aplicar organização"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
