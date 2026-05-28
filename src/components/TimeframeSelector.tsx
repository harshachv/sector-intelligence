import type { Timeframe } from '../types';

interface TimeframeSelectorProps {
  selected: Timeframe;
  onChange: (tf: Timeframe) => void;
}

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '1Y'];

export default function TimeframeSelector({ selected, onChange }: TimeframeSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-[#F1F5F9] rounded-lg p-1" role="group" aria-label="Select timeframe">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          aria-pressed={selected === tf}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:ring-offset-1 ${
            selected === tf
              ? 'bg-[#0284C7] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white'
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
