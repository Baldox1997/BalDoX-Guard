interface GaugeBarProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  color?: string;
}

export function GaugeBar({ label, value, max = 100, unit = "%", color = "bg-primary" }: GaugeBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));

  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="font-medium text-text-primary">
          {unit === "%" ? `${Math.round(value)}%` : `${value}${unit}`}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
