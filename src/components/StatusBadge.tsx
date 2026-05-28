import type { Consensus, CrashRisk, RiskScale, RegimeStatus } from '../types';

type BadgeVariant = 'consensus' | 'crashRisk' | 'riskScale' | 'regime';

interface StatusBadgeProps {
  variant: BadgeVariant;
  value: Consensus | CrashRisk | RiskScale | RegimeStatus;
}

function getBadgeClasses(variant: BadgeVariant, value: string): string {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold';

  if (variant === 'consensus') {
    if (value === 'Bullish') return `${base} bg-[#DCFCE7] text-[#16A34A]`;
    if (value === 'Bearish') return `${base} bg-[#FFE4E6] text-[#E11D48]`;
    return `${base} bg-[#F1F5F9] text-[#64748B]`;
  }

  if (variant === 'crashRisk') {
    if (value === 'Low') return `${base} bg-[#DCFCE7] text-[#16A34A]`;
    if (value === 'High') return `${base} bg-[#FFE4E6] text-[#E11D48]`;
    return `${base} bg-[#FEF3C7] text-[#D97706]`;
  }

  if (variant === 'riskScale') {
    if (value === 'Constructive') return `${base} bg-[#DCFCE7] text-[#16A34A]`;
    if (value === 'Defensive') return `${base} bg-[#FFE4E6] text-[#E11D48]`;
    return `${base} bg-[#FEF3C7] text-[#D97706]`;
  }

  if (variant === 'regime') {
    if (value === 'Risk-On' || value === 'Constructive' || value === 'Aggressive') {
      return `${base} bg-[#DCFCE7] text-[#16A34A]`;
    }
    if (value === 'Max Defensive') return `${base} bg-[#FFE4E6] text-[#E11D48]`;
    if (value === 'Defensive') return `${base} bg-[#FEF3C7] text-[#D97706]`;
  }

  return `${base} bg-[#F1F5F9] text-[#64748B]`;
}

export default function StatusBadge({ variant, value }: StatusBadgeProps) {
  return (
    <span className={getBadgeClasses(variant, value)}>
      {value}
    </span>
  );
}
