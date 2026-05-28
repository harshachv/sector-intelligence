import type { Sector, Timeframe } from '../types';
import { fmtPct, perfTextColor, isMissing } from '../utils/fmt';
import RefreshButton from './RefreshButton';
import TimeframeSelector from './TimeframeSelector';
import StatusBadge from './StatusBadge';
import StatusDot from './StatusDot';
import ProgressMetric from './ProgressMetric';
import SignalCard from './SignalCard';
import RelatedSectors from './RelatedSectors';
import ConstituentsTable from './ConstituentsTable';

interface SectorDetailPageProps {
  sector: Sector;
  allSectors: Sector[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  onBack: () => void;
  onSelectSector: (id: string) => void;
  onSelectStock: (ticker: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '1D': '1-Day',
  '1W': '1-Week',
  '1M': '1-Month',
  '1Y': '1-Year',
};

function getTrendLabel(growth: number, avgGrowth: number): string {
  const diff = growth - avgGrowth;
  if (diff > 3) return 'Accelerating';
  if (diff < -3) return 'Weakening';
  return 'Stable';
}

function trendColor(label: string): string {
  if (label === 'Accelerating') return '#16A34A';
  if (label === 'Weakening') return '#E11D48';
  return '#D97706';
}

export default function SectorDetailPage({
  sector,
  allSectors,
  timeframe,
  onTimeframeChange,
  onBack,
  onSelectSector,
  onSelectStock,
  onRefresh,
  refreshing,
}: SectorDetailPageProps) {
  // Snapshot-driven: `sector` arrives fully hydrated from the app's snapshot
  // application. The Refresh button re-pulls the server snapshot (App), which
  // flows back down as new props — no upstream calls from this page.
  const liveCount = sector.constituents.filter(c => c.perf1d != null).length;

  const m = sector.metrics[timeframe];
  // Average across hydrated sectors only (skip NaN).
  const hydratedSectors = allSectors.filter(s => !isMissing(s.metrics[timeframe].growth));
  const avgGrowth = hydratedSectors.length
    ? hydratedSectors.reduce((sum, s) => sum + s.metrics[timeframe].growth, 0) / hydratedSectors.length
    : NaN;
  const trendLabel = !isMissing(m.growth) && !isMissing(avgGrowth)
    ? getTrendLabel(m.growth, avgGrowth)
    : 'Stable';
  // related sectors come from the hydrated app-level state, not from data file.
  const related = sector.relatedSectors
    .map(id => allSectors.find(s => s.id === id))
    .filter((s): s is Sector => s !== undefined);
  const showLiveBadge = liveCount > 0;
  const totalCount = sector.constituents.length;

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      {/* Subheader */}
      <div className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0284C7] hover:text-[#0369A1] mb-2 transition-colors focus:outline-none focus:underline"
                aria-label="Back to all sectors"
              >
                ← All Sectors
              </button>
              <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-[#0F172A]">{sector.name}</h1>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${showLiveBadge
                    ? 'bg-[#DCFCE7] text-[#16A34A]'
                    : 'bg-[#FEF3C7] text-[#D97706]'}`}
                  title={showLiveBadge
                    ? `${liveCount}/${totalCount} constituents loaded from cache`
                    : 'No cached data — press Refresh'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${showLiveBadge ? 'bg-[#16A34A]' : (refreshing ? 'bg-[#D97706] animate-pulse' : 'bg-[#D97706]')}`} aria-hidden="true" />
                  {showLiveBadge ? `${liveCount}/${totalCount} loaded` : 'No data'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Sector Index Intelligence • {TIMEFRAME_LABELS[timeframe]} View
              </p>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <RefreshButton onClick={onRefresh} refreshing={refreshing} />
              <TimeframeSelector selected={timeframe} onChange={onTimeframeChange} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Detail KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4 border-l-4 border-l-[#0284C7]">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">Growth</div>
            <div className="text-2xl font-bold" style={{ color: perfTextColor(m.growth) }}>
              {fmtPct(m.growth)}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">Consensus</div>
            <div className="mt-1"><StatusBadge variant="consensus" value={m.consensus} /></div>
          </div>
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">10D Probability</div>
            <div className="text-2xl font-bold text-[#0F172A]">{m.prob10d}%</div>
          </div>
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">Crash Risk</div>
            <div className="mt-1"><StatusBadge variant="crashRisk" value={m.crashRisk} /></div>
          </div>
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">Risk Scale</div>
            <div className="mt-1"><StatusBadge variant="riskScale" value={m.riskScale} /></div>
          </div>
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">Regime</div>
            <div className="flex items-center gap-1.5 mt-1">
              <StatusDot regime={m.regime} size="md" />
              <span className="text-xs font-semibold text-[#0F172A]">{m.regime}</span>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 1: Performance Overview */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Sector Performance Overview</h3>
            <div className="flex items-end gap-4 mb-4">
              <div>
                <div
                  className="text-4xl font-bold"
                  style={{ color: perfTextColor(m.growth) }}
                >
                  {fmtPct(m.growth)}
                </div>
                <div className="text-xs text-[#64748B] mt-1">{TIMEFRAME_LABELS[timeframe]} performance</div>
              </div>
              <div className="pb-1">
                <span
                  className="text-xs font-bold px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: trendColor(trendLabel) + '20',
                    color: trendColor(trendLabel),
                  }}
                >
                  {trendLabel}
                </span>
              </div>
            </div>
            <div className="space-y-2 pt-3 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B]">Sector average</span>
                <span className="font-mono font-semibold text-[#0F172A]">{fmtPct(avgGrowth)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B]">vs. Average</span>
                <span
                  className="font-mono font-semibold"
                  style={{ color: perfTextColor(m.growth - avgGrowth) }}
                >
                  {fmtPct(isMissing(m.growth) || isMissing(avgGrowth) ? null : m.growth - avgGrowth)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Probability Breakdown */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Probability Breakdown</h3>
            <div className="space-y-5">
              {[
                { label: '3-Day Probability', value: m.prob3d },
                { label: '10-Day Probability', value: m.prob10d },
                { label: '20-Day Probability', value: m.prob20d },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#0F172A]">{label}</span>
                    <span className="text-sm font-bold font-mono text-[#0F172A]">{value}%</span>
                  </div>
                  <ProgressMetric value={value} label={label} size="lg" showLabel={false} />
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Risk & Regime Analysis */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Risk & Regime Analysis</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-[#F7F9FC] rounded-lg border border-[#E2E8F0]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] mb-2">Crash Risk</div>
                <StatusBadge variant="crashRisk" value={m.crashRisk} />
              </div>
              <div className="text-center p-3 bg-[#F7F9FC] rounded-lg border border-[#E2E8F0]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] mb-2">Risk Scale</div>
                <StatusBadge variant="riskScale" value={m.riskScale} />
              </div>
              <div className="text-center p-3 bg-[#F7F9FC] rounded-lg border border-[#E2E8F0]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] mb-2">Regime</div>
                <div className="flex items-center justify-center gap-1.5">
                  <StatusDot regime={m.regime} size="md" />
                  <span className="text-xs font-semibold text-[#0F172A]">{m.regime}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              {m.riskScale === 'Constructive'
                ? `${sector.name} is in a constructive risk environment. Market participants are positioned for risk-on exposure with strong underlying fundamentals supporting continued momentum.`
                : m.riskScale === 'Cautious'
                ? `${sector.name} is in a cautious stance. Mixed signals suggest selective positioning. Monitor for regime confirmation before adding significant exposure.`
                : `${sector.name} is in a defensive regime. Capital preservation is prioritized. Consider reducing exposure and monitoring for regime reversal signals.`}
            </p>
          </div>

          {/* Section 4: Model Signals */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Model Signals</h3>
            <div className="grid grid-cols-2 gap-3">
              {sector.signals.map((signal) => (
                <SignalCard key={signal.name} signal={signal} />
              ))}
            </div>
          </div>
        </div>

        {/* Related Sectors */}
        <RelatedSectors
          relatedSectors={related}
          timeframe={timeframe}
          onSelect={onSelectSector}
        />

        {/* Constituents */}
        <ConstituentsTable constituents={sector.constituents} onSelectStock={onSelectStock} />
      </div>
    </div>
  );
}
