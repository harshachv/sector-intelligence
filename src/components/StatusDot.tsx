import type { RegimeStatus } from '../types';

interface StatusDotProps {
  regime: RegimeStatus;
  size?: 'sm' | 'md';
}

function regimeColor(regime: RegimeStatus): string {
  if (regime === 'Defensive' || regime === 'Max Defensive') return 'bg-[#E11D48]';
  if (regime === 'Risk-On' || regime === 'Constructive' || regime === 'Aggressive') return 'bg-[#16A34A]';
  return 'bg-[#D97706]';
}

export default function StatusDot({ regime, size = 'sm' }: StatusDotProps) {
  const dim = size === 'md' ? 'w-3 h-3' : 'w-2 h-2';
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${dim} ${regimeColor(regime)}`}
      aria-hidden="true"
    />
  );
}
