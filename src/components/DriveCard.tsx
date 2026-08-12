import type { DriveStats } from "../types/api";
import { formatBytes } from "../utils/format";

interface DriveCardProps {
  drive: DriveStats;
  onClick?: () => void;
}

export function DriveCard({ drive, onClick }: DriveCardProps) {
  const pct = Math.round(drive.usage_percent);
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-primary";

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-border bg-surface-elevated p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-text-primary">{drive.letter}</span>
        <span className="text-xs text-text-secondary">{drive.file_system}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-text-secondary">
        <span>{formatBytes(drive.used_bytes)} usado</span>
        <span>{formatBytes(drive.free_bytes)} livre</span>
      </div>
      <p className="mt-1 text-xs text-text-secondary">{formatBytes(drive.total_bytes)} total · {pct}%</p>
    </button>
  );
}
