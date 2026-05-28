import type { Signal } from '../types';

interface SignalCardProps {
  signal: Signal;
}

function directionColor(dir: Signal['direction']): { bg: string; text: string } {
  if (dir === 'Bullish') return { bg: '#DCFCE7', text: '#16A34A' };
  if (dir === 'Bearish') return { bg: '#FFE4E6', text: '#E11D48' };
  return { bg: '#F1F5F9', text: '#64748B' };
}

function scoreBarColor(score: number): string {
  if (score >= 70) return '#16A34A';
  if (score >= 45) return '#D97706';
  return '#E11D48';
}

export default function SignalCard({ signal }: SignalCardProps) {
  const { bg, text } = directionColor(signal.direction);

  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#0F172A]">{signal.name}</span>
        <span
          className="text-xs font-semibold rounded-full px-2 py-0.5"
          style={{ backgroundColor: bg, color: text }}
        >
          {signal.direction}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-[#E2E8F0]">
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${signal.score}%`, backgroundColor: scoreBarColor(signal.score) }}
          />
        </div>
        <span className="text-sm font-mono font-bold text-[#0F172A] w-8 text-right flex-shrink-0">
          {signal.score}
        </span>
      </div>
    </div>
  );
}
