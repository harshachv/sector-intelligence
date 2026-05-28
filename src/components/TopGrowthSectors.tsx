import type { Sector, Timeframe } from '../types';
import { fmtPct, perfTextColor, isMissing } from '../utils/fmt';
import StatusBadge from './StatusBadge';
import ProgressMetric from './ProgressMetric';

interface TopGrowthSectorsProps {
  sectors: Sector[];
  timeframe: Timeframe;
  onSelect: (id: string) => void;
}

export default function TopGrowthSectors({ sectors, timeframe, onSelect }: TopGrowthSectorsProps) {
  // Only sectors with a real growth number qualify.
  const sorted = sectors
    .filter(s => !isMissing(s.metrics[timeframe].growth))
    .sort((a, b) => b.metrics[timeframe].growth - a.metrics[timeframe].growth)
    .slice(0, 5);

  if (sorted.length === 0) {
    return (
      <section aria-labelledby="top-growth-heading">
        <h2 id="top-growth-heading" className="text-base font-semibold text-[#0F172A] mb-3">
          Top Growth Sectors
        </h2>
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-6 text-center text-xs text-[#64748B]">
          No market data yet — press Refresh to load live prices.
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="top-growth-heading">
      <h2 id="top-growth-heading" className="text-base font-semibold text-[#0F172A] mb-3">
        Top Growth Sectors
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {sorted.map((sector, idx) => {
          const m = sector.metrics[timeframe];
          const color = perfTextColor(m.growth);
          return (
            <button
              key={sector.id}
              onClick={() => onSelect(sector.id)}
              className="text-left bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4 hover:shadow-md hover:border-[#0284C7] transition-all focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:ring-offset-1"
              aria-label={`View ${sector.name} details`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-[11px] font-mono font-bold text-[#64748B] bg-[#F1F5F9] rounded px-1.5 py-0.5">
                  #{idx + 1}
                </span>
                <StatusBadge variant="consensus" value={m.consensus} />
              </div>
              <div className="font-bold text-sm text-[#0F172A] mb-1">{sector.name}</div>
              <div className="text-xl font-bold mb-2" style={{ color }}>
                {fmtPct(m.growth)}
              </div>
              <ProgressMetric
                value={Math.min(100, Math.abs(m.growth) * 2)}
                label={`${sector.name} growth`}
                color={color}
                showLabel={false}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
