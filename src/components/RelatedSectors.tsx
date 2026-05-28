import type { Sector, Timeframe } from '../types';
import { fmtPct, perfTextColor } from '../utils/fmt';
import StatusDot from './StatusDot';

interface RelatedSectorsProps {
  relatedSectors: Sector[];
  timeframe: Timeframe;
  onSelect: (id: string) => void;
}

export default function RelatedSectors({ relatedSectors, timeframe, onSelect }: RelatedSectorsProps) {
  if (relatedSectors.length === 0) return null;

  return (
    <section aria-labelledby="related-heading">
      <h3 id="related-heading" className="text-base font-semibold text-[#0F172A] mb-3">
        Related Sectors
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {relatedSectors.map((sector) => {
          const m = sector.metrics[timeframe];
          return (
            <button
              key={sector.id}
              onClick={() => onSelect(sector.id)}
              className="text-left bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4 hover:shadow-md hover:border-[#0284C7] transition-all focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:ring-offset-1"
              aria-label={`Switch to ${sector.name}`}
            >
              <div className="font-bold text-sm text-[#0F172A] mb-1.5">{sector.name}</div>
              <div
                className="text-lg font-bold font-mono mb-1.5"
                style={{ color: perfTextColor(m.growth) }}
              >
                {fmtPct(m.growth)}
              </div>
              <div className="flex items-center gap-1.5">
                <StatusDot regime={m.regime} />
                <span className="text-[11px] text-[#64748B]">{m.regime}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
