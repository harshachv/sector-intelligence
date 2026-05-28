/**
 * Display formatters for numeric values that may be null or NaN
 * (which the no-mock data layer uses to mean "no real data available").
 */

export function isMissing(v: number | null | undefined): boolean {
  return v == null || Number.isNaN(v);
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (isMissing(v)) return '—';
  if (v === 0) return `0.0%`;
  return `${(v as number) >= 0 ? '+' : ''}${(v as number).toFixed(digits)}%`;
}

export function perfTextColor(v: number | null | undefined): string {
  if (isMissing(v)) return '#94A3B8';
  return (v as number) > 0 ? '#16A34A' : (v as number) < 0 ? '#E11D48' : '#64748B';
}
