import {
  Activity,
  ArrowRight,
  Cpu,
  FileSearch,
  FolderOpen,
  HardDrive,
  History,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DriveCard } from "../components/DriveCard";
import { GaugeBar } from "../components/GaugeBar";
import { api } from "../services/apiService";
import type { ControlPanelData } from "../types/api";
import { formatBytes } from "../utils/format";

const MODULE_LINKS = [
  { label: "Explorador de Arquivos", path: "/files", icon: FolderOpen, desc: "Navegue e gerencie qualquer pasta" },
  { label: "Diagnóstico", path: "/diagnostics", icon: Activity, desc: "Saúde do sistema e armazenamento" },
  { label: "Scanner", path: "/scanner", icon: FileSearch, desc: "Indexar drives e pastas" },
  { label: "Limpeza", path: "/cleanup", icon: Trash2, desc: "Temp, cache e quarentena" },
  { label: "Arquivos grandes", path: "/large-files", icon: HardDrive, desc: "Top consumidores de espaço" },
  { label: "Histórico", path: "/history", icon: History, desc: "Scans e auditoria de ações" },
];

export function ControlPanelPage() {
  const [data, setData] = useState<ControlPanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api.getControlPanelData().then((d) => {
        if (!cancelled) setData(d);
      });
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="hero-warrior-card relative overflow-hidden rounded-xl p-6">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <Shield className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Painel de Controle</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Centro de comando do seu PC — gerencie, meça e diagnostique tudo com liberdade total.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Arquivos indexados"
          value={data.indexed_files.toLocaleString()}
          sub={formatBytes(data.indexed_bytes)}
          icon={<FileSearch className="h-5 w-5 text-primary" />}
        />
        <StatCard
          label="Espaço recuperável"
          value={formatBytes(data.recoverable_bytes)}
          sub="Temp e cache seguro"
          icon={<Trash2 className="h-5 w-5 text-green-500" />}
        />
        <StatCard
          label="Saúde RAM"
          value={`${Math.round(data.system.ram_usage_percent)}%`}
          sub={`${formatBytes(data.system.ram_used_bytes)} / ${formatBytes(data.system.ram_total_bytes)}`}
          icon={<Cpu className="h-5 w-5 text-accent" />}
        />
        <StatCard
          label="Ações recentes"
          value={String(data.recent_actions_count)}
          sub={data.last_scan_status ? `Scan: ${data.last_scan_status}` : "Sem scan"}
          icon={<History className="h-5 w-5 text-amber-500" />}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="text-base font-semibold text-text-primary">Armazenamento por drive</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.drives.map((d) => (
            <DriveCard key={d.mount_point} drive={d} onClick={() => navigate(`/files?path=${encodeURIComponent(d.mount_point)}`)} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="text-base font-semibold text-text-primary">Saúde do sistema</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <GaugeBar label="Memória RAM" value={data.system.ram_usage_percent} color="bg-accent" />
          <GaugeBar
            label="Uptime"
            value={Math.floor(data.system.uptime_secs / 3600)}
            max={168}
            unit="h"
            color="bg-primary"
          />
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-text-secondary">SO</dt><dd className="font-medium">{data.system.os_name} {data.system.os_version}</dd></div>
          <div><dt className="text-text-secondary">CPU</dt><dd className="font-medium">{data.system.cpu_name} ({data.system.cpu_cores} núcleos)</dd></div>
          <div><dt className="text-text-secondary">Host</dt><dd className="font-medium">{data.system.hostname}</dd></div>
        </dl>
        <Link to="/diagnostics" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          Diagnóstico completo <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="text-base font-semibold text-text-primary">Módulos</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULE_LINKS.map((m) => (
            <Link
              key={m.path}
              to={m.path}
              className="flex items-start gap-3 rounded-lg border border-border p-4 transition hover:border-primary/40 hover:bg-primary/5"
            >
              <m.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-text-primary">{m.label}</p>
                <p className="text-xs text-text-secondary">{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link to="/scanner" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover">
          <Sparkles className="h-4 w-4" /> Iniciar scan
        </Link>
        <Link to="/files" className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:border-primary/40">
          <FolderOpen className="h-4 w-4" /> Abrir explorador
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold text-text-primary">{value}</p>
      <p className="mt-1 text-xs text-text-secondary">{sub}</p>
    </div>
  );
}
