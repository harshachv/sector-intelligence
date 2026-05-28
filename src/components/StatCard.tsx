interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  accent?: boolean;
  valueColor?: string;
}

export default function StatCard({ label, value, subtext, accent, valueColor }: StatCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4 sm:p-5 flex flex-col gap-1 min-w-0 ${accent ? 'border-l-4 border-l-[#0284C7]' : ''}`}>
      <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
        {label}
      </span>
      <span
        className="text-2xl sm:text-3xl font-bold leading-tight break-words"
        style={{ color: valueColor ?? '#0F172A' }}
      >
        {value}
      </span>
      {subtext && (
        <span className="text-xs text-[#64748B] mt-0.5">{subtext}</span>
      )}
    </div>
  );
}
