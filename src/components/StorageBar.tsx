import { formatPercent } from "../utils/format";

interface StorageBarProps {
  usedLabel: string;
  totalLabel: string;
  usagePercent: number;
}

export function StorageBar({ usedLabel, totalLabel, usagePercent }: StorageBarProps) {
  const clamped = Math.min(Math.max(usagePercent, 0), 100);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Armazenamento
          </p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">
            {usedLabel}
            <span className="text-base font-normal text-text-secondary"> / {totalLabel}</span>
          </p>
        </div>
        <span className="text-sm font-medium text-text-secondary">{formatPercent(clamped)}</span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Uso de armazenamento"
        />
      </div>
    </div>
  );
}
