const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return "0 B";

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1,
  );
  const value = bytes / 1024 ** exponent;

  return `${value.toFixed(decimals)} ${UNITS[exponent]}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
