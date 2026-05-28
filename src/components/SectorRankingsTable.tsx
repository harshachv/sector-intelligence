import type { Sector, Timeframe } from '../types';
import { fmtPct, perfTextColor, isMissing } from '../utils/fmt';
import StatusBadge from './StatusBadge';
import StatusDot from './StatusDot';
import ProgressMetric from './ProgressMetric';

interface SectorRankingsTableProps {
  sectors: Sector[];
  timeframe: Timeframe;
  onSelect: (id: string) => void;
}

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '1D': 'Daily',
  '1W': 'Weekly',
  '1M': 'Monthly',
  '1Y': 'Yearly',
};

export default function SectorRankingsTable({ sectors, timeframe, onSelect }: SectorRankingsTableProps) {
  // Sort sectors with real growth values first (NaN goes to the bottom).
  const ranked = [...sectors].sort((a, b) => {
    const ag = a.metrics[timeframe].growth;
    const bg = b.metrics[timeframe].growth;
    const aMissing = isMissing(ag);
    const bMissing = isMissing(bg);
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    return bg - ag;
  });

  return (
    <section aria-labelledby="rankings-heading">
      <div className="flex items-center gap-3 mb-3">
        <h2 id="rankings-heading" className="text-base font-semibold text-[#0F172A]">
          Sector Rankings
        </h2>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] bg-[#F1F5F9] rounded px-2 py-0.5">
          {TIMEFRAME_LABELS[timeframe]}
        </span>
        <span className="text-[11px] text-[#64748B] hidden sm:inline ml-auto">
          Click a sector to open its stocks
        </span>
      </div>
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" role="table">
            <thead>
              <tr className="bg-[#F1F5F9] border-b border-[#E2E8F0]">
                {['#', 'Sector', 'Growth', 'Consensus', '3D Prob', '10D Prob', '20D Prob', 'Crash Risk', 'Risk Scale', 'Regime', 'Action'].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#64748B] whitespace-nowrap"
                    scope="col"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.map((sector, idx) => {
                const m = sector.metrics[timeframe];
                return (
                  <tr
                    key={sector.id}
                    className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F7F9FC] transition-colors cursor-pointer"
                    onClick={() => onSelect(sector.id)}
                  >
                    <td className="px-4 py-3 text-[11px] font-mono font-bold text-[#64748B] whitespace-nowrap">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelect(sector.id); }}
                        className="flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:ring-offset-1 rounded px-1 -mx-1 py-0.5"
                        aria-label={`Open ${sector.name} stocks`}
                      >
                        <span className="font-semibold text-[#0F172A] group-hover:text-[#0284C7] transition-colors">
                          {sector.name}
                        </span>
                        <span className="text-[10px] font-mono text-[#64748B] bg-[#F1F5F9] rounded px-1.5 py-0.5">
                          {sector.count}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="font-bold font-mono text-sm"
                        style={{ color: perfTextColor(m.growth) }}
                      >
                        {fmtPct(m.growth)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge variant="consensus" value={m.consensus} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap min-w-[100px]">
                      <ProgressMetric value={m.prob3d} label="3D probability" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap min-w-[100px]">
                      <ProgressMetric value={m.prob10d} label="10D probability" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap min-w-[100px]">
                      <ProgressMetric value={m.prob20d} label="20D probability" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge variant="crashRisk" value={m.crashRisk} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge variant="riskScale" value={m.riskScale} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <StatusDot regime={m.regime} />
                        <span className="text-xs text-[#0F172A]">{m.regime}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelect(sector.id); }}
                        className="text-xs font-semibold text-[#0284C7] hover:text-[#0369A1] bg-[#E0F2FE] hover:bg-[#BAE6FD] rounded px-2.5 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:ring-offset-1"
                        aria-label={`View details for ${sector.name}`}
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
