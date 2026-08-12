import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/apiService";
import type { DuplicateGroup } from "../types/api";
import { formatBytes } from "../utils/format";

export function DuplicatesPage() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanId, setScanId] = useState<number | null>(null);

  useEffect(() => {
    api.getLatestScan().then((s) => setScanId(s?.id ?? null));
  }, []);

  async function findDupes() {
    if (!scanId) return;
    setLoading(true);
    try {
      const result = await api.findDuplicates(scanId);
      setGroups(result);
    } finally {
      setLoading(false);
    }
  }

  async function quarantineGroup(group: DuplicateGroup, keepIndex: number) {
    const toQuarantine = group.files.filter((_, i) => i !== keepIndex);
    for (const f of toQuarantine) {
      await api.quarantineFile(f.path, "Duplicado");
    }
    setGroups((prev) => prev.filter((g) => g.id !== group.id));
  }

  if (!scanId) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-text-secondary">Execute um scan primeiro.</p>
        <Link to="/scanner" className="mt-4 inline-block text-accent hover:underline">Ir ao Scanner</Link>
      </div>
    );
  }

  const totalWaste = groups.reduce((s, g) => s + g.wasted_bytes, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface-elevated p-4">
        <div>
          <p className="text-sm text-text-secondary">{groups.length} grupos — {formatBytes(totalWaste)} recuperáveis</p>
        </div>
        <button
          type="button"
          onClick={() => void findDupes()}
          disabled={loading}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? "Analisando…" : "Detectar duplicados"}
        </button>
      </div>

      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.id} className="rounded-xl border border-border bg-surface-elevated p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{g.files.length} cópias — {formatBytes(g.wasted_bytes)} desperdiçados</span>
            </div>
            <ul className="mt-3 space-y-2">
              {g.files.map((f, i) => (
                <li key={f.path} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-text-secondary">{f.path}</span>
                  <div className="flex shrink-0 gap-2">
                    {i === 0 && <span className="text-xs text-green-600">Manter</span>}
                    {i > 0 && (
                      <button type="button" onClick={() => void quarantineGroup(g, 0)} className="text-xs text-amber-600 hover:underline">
                        Quarentena
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
