interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  slices: PieSlice[];
  size?: number;
}

export function PieChart({ slices, size = 180 }: PieChartProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) {
    return (
      <div className="flex items-center justify-center text-sm text-text-secondary" style={{ width: size, height: size }}>
        Sem dados
      </div>
    );
  }

  let cumulative = 0;
  const radius = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;

  const paths = slices.map((slice) => {
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    cumulative += slice.value;
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = slice.value / total > 0.5 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { d, color: slice.color, label: slice.label, pct: ((slice.value / total) * 100).toFixed(1) };
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p) => (
          <path key={p.label} d={p.d} fill={p.color} stroke="var(--color-surface-elevated)" strokeWidth={1.5} />
        ))}
      </svg>
      <ul className="space-y-1.5 text-sm">
        {paths.map((p) => (
          <li key={p.label} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: p.color }} />
            <span className="text-text-primary">{p.label}</span>
            <span className="text-text-secondary">{p.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const CATEGORY_COLORS: Record<string, string> = {
  images: "#f59e0b",
  videos: "#ef4444",
  documents: "#3b82f6",
  apps: "#8b5cf6",
  archives: "#10b981",
  music: "#ec4899",
  other: "#6b7280",
};
