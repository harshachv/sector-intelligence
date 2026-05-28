interface ProgressMetricProps {
  value: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  showLabel?: boolean;
}

export default function ProgressMetric({
  value,
  label,
  size = 'sm',
  color = '#06B6D4',
  showLabel = true,
}: ProgressMetricProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const barHeight = size === 'lg' ? 'h-3' : size === 'md' ? 'h-2' : 'h-1.5';

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={`flex-1 ${barHeight} rounded-full bg-[#E2E8F0] min-w-[48px]`}>
        <div
          className={`${barHeight} rounded-full transition-all`}
          style={{ width: `${clampedValue}%`, backgroundColor: color }}
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label ?? `${clampedValue}%`}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-mono text-[#0F172A] w-8 text-right flex-shrink-0">
          {clampedValue}%
        </span>
      )}
    </div>
  );
}
