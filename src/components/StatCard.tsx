import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Clock,
  Copy,
  Download,
  FolderOpen,
  HardDrive,
  Package,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { DashboardStat } from "../types/dashboard";

const ICON_MAP: Record<DashboardStat["icon"], LucideIcon> = {
  cleanup: Trash2,
  large: HardDrive,
  duplicates: Copy,
  "empty-folders": FolderOpen,
  temp: Sparkles,
  downloads: Download,
  old: Clock,
  apps: Package,
};

const ACCENT_MAP: Record<DashboardStat["accent"], string> = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  green: "bg-green-500/10 text-green-600 dark:text-green-400",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
};

const PAGE_LINKS: Partial<Record<DashboardStat["icon"], string>> = {
  cleanup: "/cleanup",
  large: "/large-files",
  duplicates: "/duplicates",
  old: "/old-files",
  apps: "/apps",
};

interface StatCardProps {
  stat: DashboardStat;
}

export function StatCard({ stat }: StatCardProps) {
  const Icon = ICON_MAP[stat.icon];
  const href = PAGE_LINKS[stat.icon];

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={`rounded-lg p-2 ${ACCENT_MAP[stat.accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold text-text-primary">{stat.value}</span>
      </div>
      <h3 className="mt-3 text-sm font-medium text-text-primary">{stat.label}</h3>
      <p className="mt-1 text-xs text-text-secondary">{stat.description}</p>
    </>
  );

  if (href) {
    return (
      <Link to={href} className="block rounded-xl border border-border bg-surface-elevated p-4 transition hover:border-accent/30 hover:shadow-sm">
        {content}
      </Link>
    );
  }

  return (
    <article className="rounded-xl border border-border bg-surface-elevated p-4 transition hover:border-accent/30 hover:shadow-sm">
      {content}
    </article>
  );
}
