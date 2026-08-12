import {
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Folder,
  FolderPlus,
  Grid,
  Hash,
  List,
  Move,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { api } from "../services/apiService";
import type { ActionItem, AppSettings, DirEntry, FileMetadata, FileRow } from "../types/api";
import { formatBytes } from "../utils/format";

type ViewMode = "list" | "grid" | "details";
type Tab = "browse" | "search";

interface FileRowDisplay {
  path: string;
  name: string;
  size: number;
  modified_at: string | null;
  file_type: string;
  is_protected?: boolean;
}

export function ExplorerPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("browse");
  const [path, setPath] = useState(searchParams.get("path") ?? "C:\\");
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [searchResults, setSearchResults] = useState<FileRow[]>([]);
  const [liveResults, setLiveResults] = useState<DirEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchExt, setSearchExt] = useState("");
  const [searchLive, setSearchLive] = useState(false);
  const [searchEmpty, setSearchEmpty] = useState(false);
  const [searchDupes, setSearchDupes] = useState(false);
  const [scanId, setScanId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>("list");
  const [sortBy, setSortBy] = useState<"name" | "size" | "date">("name");
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [drives, setDrives] = useState<{ letter: string; path: string }[]>([]);
  const [properties, setProperties] = useState<FileMetadata | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [hashLoading, setHashLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const [modal, setModal] = useState<"move" | "copy" | "rename" | "newfolder" | "delete" | null>(null);
  const [destPath, setDestPath] = useState("");
  const [newName, setNewName] = useState("");
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getLatestScan().then((s) => setScanId(s?.id ?? null));
    api.getSettings().then(setSettings).catch(() => {});
    api.getDrives().then(setDrives).catch(() => {});
  }, []);

  const refreshDir = useCallback(() => {
    setLoading(true);
    api.listDir(path).then(setEntries).catch((e) => {
      setError(String(e));
      setEntries([]);
    }).finally(() => setLoading(false));
  }, [path]);

  useEffect(() => {
    if (tab !== "browse") return;
    refreshDir();
  }, [path, tab, refreshDir]);

  useEffect(() => {
    function closeCtx(e: MouseEvent) {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    document.addEventListener("mousedown", closeCtx);
    return () => document.removeEventListener("mousedown", closeCtx);
  }, []);

  const sorted = [...entries].sort((a, b) => {
    if (sortBy === "size") return b.size - a.size;
    if (sortBy === "date") return (b.modified_at ?? "").localeCompare(a.modified_at ?? "");
    return a.name.localeCompare(b.name);
  });

  function navigateUp() {
    const parts = path.replace(/\\$/, "").split("\\");
    if (parts.length > 1) setPath(parts.slice(0, -1).join("\\") + "\\");
  }

  function openEntry(entry: DirEntry) {
    if (entry.file_type === "directory") setPath(entry.path);
  }

  function toggleSelect(p: string, multi = false) {
    setSelected((prev) => {
      const next = multi ? new Set(prev) : new Set<string>();
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  function selectAll() {
    const rows = tab === "browse" ? sorted : getSearchRows();
    setSelected(new Set(rows.map((r) => r.path)));
  }

  function getSearchRows(): FileRowDisplay[] {
    if (searchLive) return liveResults.map(toDisplay);
    return searchResults.map((f) => ({ path: f.path, name: f.name, size: f.size, modified_at: f.modified_at, file_type: f.file_type, is_protected: false }));
  }

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      if (searchLive) {
        const results = await api.searchLivePath(path, searchQuery || undefined, 300);
        setLiveResults(results);
      } else if (scanId) {
        const results = await api.searchFilesAdvanced({
          scanId,
          namePattern: searchQuery || undefined,
          extension: searchExt || undefined,
          emptyOnly: searchEmpty,
          duplicatesOnly: searchDupes,
          limit: 500,
        });
        setSearchResults(results);
      }
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    const rows = getSearchRows();
    const csv = ["Nome,Tamanho,Caminho", ...rows.map((r) => `"${r.name}",${r.size},"${r.path}"`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "baldox-search-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function showProperties(p: string) {
    setHash(null);
    try {
      const meta = await api.getFileMetadata(p);
      setProperties(meta);
    } catch {
      setProperties(null);
    }
    setContextMenu(null);
  }

  async function computeHash() {
    if (!properties) return;
    setHashLoading(true);
    try {
      const h = await api.getFileHash(properties.path);
      setHash(h);
    } finally {
      setHashLoading(false);
    }
  }

  async function executeBulkAction(action: "delete" | "move" | "copy", destination?: string) {
    const paths = Array.from(selected);
    if (paths.length === 0) return;

    setProgress({ current: 0, total: paths.length, label: action });
    const items: ActionItem[] = paths.map((src) => {
      if (action === "delete") {
        const useQuarantine = settings?.delete_mode !== "permanent";
        return {
          action_type: useQuarantine ? "QUARANTINE" : "DELETE",
          source: src,
          reason: "Ação manual do explorador",
        } as ActionItem;
      }
      const dest = destination!.endsWith("\\") ? destination + src.split("\\").pop()! : destination + "\\" + src.split("\\").pop()!;
      return {
        action_type: action === "move" ? "MOVE" : "COPY",
        source: src,
        destination: dest,
      } as ActionItem;
    });

    try {
      const preview = await api.previewAction(items);
      if (preview.blocked.length > 0 && preview.items.length === 0) {
        setError(`Bloqueado: ${preview.blocked.join("; ")}`);
        setProgress(null);
        return;
      }
      const result = await api.executeAction(preview.items, "explorer");
      setProgress({ current: result.executed, total: paths.length, label: "Concluído" });
      setSelected(new Set());
      refreshDir();
      if (result.failed.length > 0) setError(result.failed.join("; "));
    } catch (e) {
      setError(String(e));
    } finally {
      setTimeout(() => setProgress(null), 1500);
      setModal(null);
    }
  }

  async function renameSelected() {
    const src = Array.from(selected)[0];
    if (!src || !newName) return;
    const parent = src.substring(0, src.lastIndexOf("\\") + 1);
    const dest = parent + newName;
    const items: ActionItem[] = [{ action_type: "RENAME", source: src, destination: dest }];
    setProgress({ current: 0, total: 1, label: "Renomear" });
    try {
      const result = await api.executeAction(items, "explorer");
      setSelected(new Set());
      refreshDir();
      if (result.failed.length > 0) setError(result.failed.join("; "));
    } catch (e) {
      setError(String(e));
    } finally {
      setTimeout(() => setProgress(null), 1500);
      setModal(null);
      setNewName("");
    }
  }

  async function createNewFolder() {
    const folderPath = path.endsWith("\\") ? path + newName : path + "\\" + newName;
    try {
      await api.createFolder(folderPath);
      setModal(null);
      setNewName("");
      refreshDir();
    } catch (e) {
      setError(String(e));
    }
  }

  const selectedCount = selected.size;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-text-primary">Explorador de Arquivos</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => setTab("browse")} className={`rounded-lg px-4 py-2 text-sm ${tab === "browse" ? "bg-primary text-white" : "border border-border"}`}>
            Navegar
          </button>
          <button type="button" onClick={() => setTab("search")} className={`rounded-lg px-4 py-2 text-sm ${tab === "search" ? "bg-primary text-white" : "border border-border"}`}>
            Busca avançada
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {tab === "browse" ? (
        <>
          <Toolbar
            path={path}
            setPath={setPath}
            drives={drives}
            sortBy={sortBy}
            setSortBy={setSortBy}
            view={view}
            setView={setView}
            navigateUp={navigateUp}
            onRefresh={refreshDir}
            selectedCount={selectedCount}
            onMove={() => { setDestPath(""); setModal("move"); }}
            onCopy={() => { setDestPath(""); setModal("copy"); }}
            onDelete={() => setModal("delete")}
            onRename={() => { setNewName(Array.from(selected)[0]?.split("\\").pop() ?? ""); setModal("rename"); }}
            onNewFolder={() => { setNewName("Nova Pasta"); setModal("newfolder"); }}
            onSelectAll={selectAll}
            onClearSelection={() => setSelected(new Set())}
          />

          {loading ? <LoadingSpinner /> : view === "grid" ? (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {sorted.map((e) => (
                <button
                  key={e.path}
                  type="button"
                  onClick={() => openEntry(e)}
                  onContextMenu={(ev) => { ev.preventDefault(); setContextMenu({ x: ev.clientX, y: ev.clientY, path: e.path }); }}
                  className={`rounded-xl border p-4 text-left hover:bg-surface-muted ${selected.has(e.path) ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <Folder className="h-8 w-8 text-primary" />
                  <p className="mt-2 truncate text-sm font-medium">{e.name}</p>
                  <p className="text-xs text-text-secondary">{e.file_type === "file" ? formatBytes(e.size) : "Pasta"}</p>
                </button>
              ))}
            </div>
          ) : (
            <FileTable
              rows={sorted.map(toDisplay)}
              selected={selected}
              onToggle={(p, ev) => toggleSelect(p, ev?.shiftKey || ev?.ctrlKey || ev?.metaKey)}
              onOpen={(row) => { const entry = sorted.find((e) => e.path === row.path); if (entry) openEntry(entry); }}
              onContextMenu={(ev, p) => { ev.preventDefault(); setContextMenu({ x: ev.clientX, y: ev.clientY, path: p }); }}
            />
          )}
        </>
      ) : (
        <>
          <div className="space-y-3 rounded-xl border border-border bg-surface-elevated p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Search className="h-4 w-4 text-text-secondary" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Nome do arquivo…" className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
              <input type="text" value={searchExt} onChange={(e) => setSearchExt(e.target.value)} placeholder="Extensão" className="w-28 rounded-lg border border-border bg-surface px-3 py-2 text-sm" disabled={searchLive} />
              <button type="button" onClick={() => void runSearch()} disabled={!searchLive && !scanId} className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover disabled:opacity-50">
                Buscar
              </button>
              <button type="button" onClick={exportCsv} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted">
                <Download className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={searchLive} onChange={(e) => setSearchLive(e.target.checked)} /> Busca ao vivo no caminho</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={searchEmpty} onChange={(e) => setSearchEmpty(e.target.checked)} disabled={searchLive} /> Arquivos vazios</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={searchDupes} onChange={(e) => setSearchDupes(e.target.checked)} disabled={searchLive} /> Duplicados</label>
            </div>
            {!searchLive && !scanId && <p className="text-sm text-text-secondary">Execute um scan ou use busca ao vivo.</p>}
          </div>
          {loading ? <LoadingSpinner /> : (
            <FileTable
              rows={getSearchRows()}
              selected={selected}
              onToggle={(p) => toggleSelect(p, true)}
              onContextMenu={(ev, p) => { ev.preventDefault(); setContextMenu({ x: ev.clientX, y: ev.clientY, path: p }); }}
            />
          )}
        </>
      )}

      {contextMenu && (
        <div ref={contextRef} className="fixed z-50 min-w-44 rounded-lg border border-border bg-surface-elevated py-1 shadow-xl" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <CtxBtn icon={FileText} label="Propriedades" onClick={() => void showProperties(contextMenu.path)} />
          <CtxBtn icon={ExternalLink} label="Abrir no Explorer" onClick={() => { void api.openInExplorer(contextMenu.path); setContextMenu(null); }} />
          <CtxBtn icon={Copy} label="Copiar caminho" onClick={() => { void navigator.clipboard.writeText(contextMenu.path); setContextMenu(null); }} />
          <hr className="my-1 border-border" />
          <CtxBtn icon={Trash2} label="Excluir" onClick={() => { setSelected(new Set([contextMenu.path])); setModal("delete"); setContextMenu(null); }} danger />
        </div>
      )}

      {properties && (
        <div className="fixed inset-y-0 right-0 z-40 w-80 border-l border-border bg-surface-elevated p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Propriedades</h3>
            <button type="button" onClick={() => setProperties(null)}><X className="h-4 w-4" /></button>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div><dt className="text-text-secondary">Nome</dt><dd className="break-all font-medium">{properties.name}</dd></div>
            <div><dt className="text-text-secondary">Tamanho</dt><dd>{formatBytes(properties.size)}</dd></div>
            <div><dt className="text-text-secondary">Tipo</dt><dd>{properties.file_type}</dd></div>
            <div><dt className="text-text-secondary">Modificado</dt><dd>{properties.modified_at?.slice(0, 19) ?? "—"}</dd></div>
            <div><dt className="text-text-secondary">Criado</dt><dd>{properties.created_at?.slice(0, 19) ?? "—"}</dd></div>
            <div><dt className="text-text-secondary">Caminho</dt><dd className="break-all text-xs">{properties.path}</dd></div>
            {properties.is_protected && <p className="text-amber-500">Caminho protegido pelo SafetyManager</p>}
          </dl>
          {properties.file_type === "file" && !properties.is_protected && (
            <button type="button" onClick={() => void computeHash()} disabled={hashLoading} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted">
              <Hash className="h-4 w-4" /> {hashLoading ? "Calculando…" : "Calcular hash SHA-256"}
            </button>
          )}
          {hash && <p className="mt-2 break-all font-mono text-xs text-text-secondary">{hash}</p>}
        </div>
      )}

      {progress && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl border border-border bg-surface-elevated p-4 shadow-xl">
          <p className="text-sm font-medium">{progress.label}: {progress.current}/{progress.total}</p>
          <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={modal === "delete"}
        title={settings?.delete_mode === "permanent" ? "Excluir permanentemente?" : "Mover para quarentena?"}
        message={`${selectedCount} item(ns) selecionado(s). Caminhos protegidos do Windows serão bloqueados.`}
        confirmLabel={settings?.delete_mode === "permanent" ? "Excluir" : "Quarentena"}
        variant="danger"
        onConfirm={() => void executeBulkAction("delete")}
        onCancel={() => setModal(null)}
      />

      {(modal === "move" || modal === "copy") && (
        <PathModal
          title={modal === "move" ? "Mover para" : "Copiar para"}
          value={destPath}
          onChange={setDestPath}
          onConfirm={() => void executeBulkAction(modal, destPath)}
          onCancel={() => setModal(null)}
        />
      )}

      {modal === "rename" && (
        <PathModal title="Renomear" value={newName} onChange={setNewName} onConfirm={() => void renameSelected()} onCancel={() => setModal(null)} />
      )}

      {modal === "newfolder" && (
        <PathModal title="Nova pasta" value={newName} onChange={setNewName} onConfirm={() => void createNewFolder()} onCancel={() => setModal(null)} />
      )}
    </div>
  );
}

function toDisplay(e: DirEntry): FileRowDisplay {
  return { path: e.path, name: e.name, size: e.size, modified_at: e.modified_at, file_type: e.file_type, is_protected: e.is_protected };
}

function Toolbar({
  path, setPath, drives, sortBy, setSortBy, view, setView, navigateUp, onRefresh,
  selectedCount, onMove, onCopy, onDelete, onRename, onNewFolder, onSelectAll, onClearSelection,
}: {
  path: string; setPath: (p: string) => void; drives: { letter: string; path: string }[];
  sortBy: "name" | "size" | "date"; setSortBy: (s: "name" | "size" | "date") => void;
  view: ViewMode; setView: (v: ViewMode) => void; navigateUp: () => void; onRefresh: () => void;
  selectedCount: number; onMove: () => void; onCopy: () => void; onDelete: () => void;
  onRename: () => void; onNewFolder: () => void; onSelectAll: () => void; onClearSelection: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-elevated p-3">
        <button type="button" onClick={navigateUp} className="rounded-lg border border-border p-2 hover:bg-surface-muted"><ChevronUp className="h-4 w-4" /></button>
        <select value={path.match(/^[A-Z]:\\/)?.[0] ?? ""} onChange={(e) => setPath(e.target.value)} className="rounded-lg border border-border px-2 py-2 text-sm">
          {drives.map((d) => <option key={d.path} value={d.path}>{d.letter}</option>)}
        </select>
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onRefresh()}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono"
        />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="rounded-lg border border-border px-2 py-2 text-sm">
          <option value="name">Nome</option>
          <option value="size">Tamanho</option>
          <option value="date">Data</option>
        </select>
        <div className="flex rounded-lg border border-border">
          {(["list", "grid"] as ViewMode[]).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={`p-2 ${view === v ? "bg-primary/10 text-primary" : ""}`}>
              {v === "list" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onNewFolder} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-muted"><FolderPlus className="h-4 w-4" /> Nova pasta</button>
        {selectedCount > 0 && (
          <>
            <span className="text-sm text-text-secondary">{selectedCount} selecionado(s)</span>
            <button type="button" onClick={onMove} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-muted"><Move className="h-4 w-4" /> Mover</button>
            <button type="button" onClick={onCopy} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-muted"><Copy className="h-4 w-4" /> Copiar</button>
            <button type="button" onClick={onRename} disabled={selectedCount !== 1} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-muted disabled:opacity-50"><Pencil className="h-4 w-4" /> Renomear</button>
            <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"><Trash2 className="h-4 w-4" /> Excluir</button>
            <button type="button" onClick={onClearSelection} className="text-sm text-text-secondary hover:underline">Limpar</button>
          </>
        )}
        <button type="button" onClick={onSelectAll} className="text-sm text-primary hover:underline">Selecionar todos</button>
      </div>
    </div>
  );
}

function PathModal({ title, value, onChange, onConfirm, onCancel }: {
  title: string; value: string; onChange: (v: string) => void; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface-elevated p-6 shadow-xl">
        <h3 className="font-semibold text-text-primary">{title}</h3>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="mt-4 w-full rounded-lg border border-border px-3 py-2 text-sm font-mono" />
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
          <button type="button" onClick={onConfirm} className="rounded-lg bg-primary px-4 py-2 text-sm text-white">Confirmar</button>
        </div>
      </div>
    </div>
  );
}

function CtxBtn({ icon: Icon, label, onClick, danger }: { icon: typeof FileText; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-surface-muted ${danger ? "text-red-600" : "text-text-primary"}`}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex h-40 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function FileTable({
  rows, selected, onToggle, onOpen, onContextMenu,
}: {
  rows: FileRowDisplay[]; selected: Set<string>;
  onToggle: (p: string, ev?: React.MouseEvent) => void;
  onOpen?: (row: FileRowDisplay) => void;
  onContextMenu?: (ev: React.MouseEvent, path: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted text-left text-text-secondary">
          <tr><th className="w-8 p-3" /><th className="p-3">Nome</th><th className="p-3">Tamanho</th><th className="p-3">Modificado</th></tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.path} className={`border-t border-border hover:bg-surface-muted/50 ${selected.has(e.path) ? "bg-primary/5" : ""}`} onContextMenu={(ev) => onContextMenu?.(ev, e.path)}>
              <td className="p-3"><input type="checkbox" checked={selected.has(e.path)} onChange={() => onToggle(e.path, { ctrlKey: true } as React.MouseEvent)} /></td>
              <td className="p-3">
                <button type="button" onClick={() => onOpen?.(e)} className="flex items-center gap-2 text-left hover:text-primary">
                  <Folder className="h-4 w-4 shrink-0" />
                  <span className="truncate">{e.name}</span>
                  {e.is_protected && <span className="text-xs text-amber-500">protegido</span>}
                </button>
              </td>
              <td className="p-3 text-text-secondary">{e.file_type === "file" ? formatBytes(e.size) : "—"}</td>
              <td className="p-3 text-text-secondary">{e.modified_at?.slice(0, 10) ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
