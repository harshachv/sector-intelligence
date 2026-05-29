import { useEffect, useMemo, useState } from 'react';
import type {
  Candle, ChartRange, ChartType, Constituent, Fundamentals,
  IndicatorKey, IndicatorState, Sector,
} from '../types';
import {
  getCandles, getFundamentals, getCachedCandles, getCachedFundamentals,
  type DataMode,
} from '../data/dataProvider';
import { constituentStageMeta } from '../utils/stage';
import StockPriceChart, { INDICATOR_COLORS } from './StockPriceChart';
import RefreshButton from './RefreshButton';

interface StockDetailPageProps {
  sector: Sector;
  stock: Constituent;
  onBack: () => void;
}

interface IndicatorMeta {
  key: IndicatorKey;
  label: string;
  color: string;
  group: 'ma' | 'overlay' | 'oscillator';
  dashed?: boolean;
}

const INDICATOR_META: IndicatorMeta[] = [
  { key: 'ma9',   label: 'MA 9',   color: INDICATOR_COLORS.ma9,   group: 'ma' },
  { key: 'ma21',  label: 'MA 21',  color: INDICATOR_COLORS.ma21,  group: 'ma' },
  { key: 'ma50',  label: 'MA 50',  color: INDICATOR_COLORS.ma50,  group: 'ma' },
  { key: 'ma200', label: 'MA 200', color: INDICATOR_COLORS.ma200, group: 'ma' },
  { key: 'ema9',  label: 'EMA 9',  color: INDICATOR_COLORS.ema9,  group: 'ma', dashed: true },
  { key: 'ema21', label: 'EMA 21', color: INDICATOR_COLORS.ema21, group: 'ma', dashed: true },
  { key: 'bb',    label: 'Boll (20,2)', color: INDICATOR_COLORS.bb,   group: 'overlay' },
  { key: 'vwap',  label: 'VWAP',        color: INDICATOR_COLORS.vwap, group: 'overlay', dashed: true },
  { key: 'rsi',   label: 'RSI (14)',    color: INDICATOR_COLORS.rsi,  group: 'oscillator' },
  { key: 'macd',  label: 'MACD',        color: INDICATOR_COLORS.macdLine, group: 'oscillator' },
  { key: 'atr',   label: 'ATR (14)',    color: INDICATOR_COLORS.atr,  group: 'oscillator' },
];

const DEFAULT_INDICATORS: IndicatorState = {
  ma9: true, ma21: true, ma50: true, ma200: true,
  ema9: false, ema21: false,
  bb: false, vwap: false,
  rsi: false, macd: false, atr: false,
};

const CHART_TYPES: { value: ChartType; label: string; icon: string }[] = [
  { value: 'candles',    label: 'Candles',     icon: '▦' },
  { value: 'heikinashi', label: 'Heikin-Ashi', icon: '◫' },
  { value: 'bars',       label: 'Bars',        icon: '▥' },
  { value: 'line',       label: 'Line',        icon: '╱' },
  { value: 'area',       label: 'Area',        icon: '◢' },
];

const RANGES: { value: ChartRange; label: string }[] = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: 'YTD', label: 'YTD' },
  { value: '1Y', label: '1Y' },
  { value: 'ALL', label: 'ALL' },
];

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}

function fmtVolume(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/**
 * Compute the [from, to] window for a given range button. Returns ISO YYYY-MM-DD strings.
 * The chart receives the FULL candle history and uses this window via setVisibleRange()
 * so indicators (MA200, Bollinger, EMA200) still have all bars to compute on.
 */
function rangeWindow(all: Candle[], range: ChartRange): { from?: string; to?: string } {
  if (all.length === 0) return {};
  const to = all[all.length - 1].time;
  if (range === 'ALL') return { from: all[0].time, to };
  const lastDate = new Date(to + 'T00:00:00Z');
  const start = new Date(lastDate);
  if (range === '1M') start.setMonth(start.getMonth() - 1);
  else if (range === '3M') start.setMonth(start.getMonth() - 3);
  else if (range === '6M') start.setMonth(start.getMonth() - 6);
  else if (range === '1Y') start.setFullYear(start.getFullYear() - 1);
  else if (range === 'YTD') { start.setMonth(0, 1); start.setHours(0, 0, 0, 0); }
  return { from: start.toISOString().slice(0, 10), to };
}


export default function StockDetailPage({ sector, stock, onBack }: StockDetailPageProps) {
  const [indicators, setIndicators] = useState<IndicatorState>(DEFAULT_INDICATORS);
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [range, setRange] = useState<ChartRange>('6M');
  const [logScale, setLogScale] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // No mock fallback — show a loading state while Yahoo data is in flight.
  const [allCandles, setAllCandles] = useState<Candle[]>([]);
  const [candleSource, setCandleSource] = useState<DataMode | 'loading' | 'idle'>('idle');
  const [liveQuote, setLiveQuote] = useState<{ current: number; changePct: number } | null>(null);
  // Fundamentals — undefined = loading, null = no data, object = loaded.
  const [fundamentals, setFundamentals] = useState<Fundamentals | null | undefined>(stock.fundamentals);

  const [refreshing, setRefreshing] = useState(false);

  // On mount: paint instantly from cache, then auto-load from the network when
  // the cache is empty/stale. OHLCV + fundamentals come straight from
  // stockanalysis.com (direct, CORS-allowed), so this is fast and reliable —
  // no flaky proxy, no manual Refresh required to see the chart.
  useEffect(() => {
    let cancelled = false;

    const cached = getCachedCandles(stock.ticker);
    if (cached) {
      setAllCandles(cached.candles);
      setCandleSource('live');
      setLiveQuote(
        cached.current != null && cached.changePct != null
          ? { current: cached.current, changePct: cached.changePct }
          : null
      );
    } else {
      setAllCandles([]);
      setLiveQuote(null);
    }
    const cachedFund = stock.fundamentals ?? getCachedFundamentals(stock.ticker);
    setFundamentals(cachedFund);

    // Nothing cached → fetch now so the user never stares at an empty chart.
    if (!cached) {
      setCandleSource('loading');
      (async () => {
        const res = await getCandles(stock.ticker);
        if (cancelled) return;
        setAllCandles(res.candles);
        setCandleSource(res.source);
        if (res.source === 'live' && res.current != null && res.changePct != null) {
          setLiveQuote({ current: res.current, changePct: res.changePct });
        }
      })();
    }
    if (cachedFund === undefined) {
      (async () => {
        const f = await getFundamentals(stock.ticker);
        if (!cancelled) setFundamentals(f);
      })();
    }

    return () => { cancelled = true; };
  }, [stock.ticker, stock.fundamentals]);

  // Explicit user Refresh — force a fresh network pull (bypasses the paint cache).
  async function refreshStock() {
    if (refreshing) return;
    setRefreshing(true);
    setCandleSource('loading');
    try {
      const res = await getCandles(stock.ticker);
      setAllCandles(res.candles);
      setCandleSource(res.source);
      if (res.source === 'live' && res.current != null && res.changePct != null) {
        setLiveQuote({ current: res.current, changePct: res.changePct });
      }
      const f = await getFundamentals(stock.ticker);
      setFundamentals(f);
    } finally {
      setRefreshing(false);
    }
  }

  const visibleWindow = useMemo(
    () => rangeWindow(allCandles, range),
    [allCandles, range]
  );

  const hasCandles = allCandles.length > 0;
  const last = hasCandles ? allCandles[allCandles.length - 1] : null;
  const prev = hasCandles ? (allCandles[allCandles.length - 2] ?? last!) : null;
  // Prefer the live quote (intraday-fresh) when available; fall back to last/prev close.
  const displayPrice = liveQuote?.current ?? last?.close ?? null;
  const displayChangePct = liveQuote?.changePct
    ?? (last && prev ? ((last.close - prev.close) / prev.close) * 100 : null);
  const change = displayPrice != null && prev ? displayPrice - prev.close : null;
  const changePct = displayChangePct;
  const isPositive = (change ?? 0) >= 0;
  const last52w = allCandles.slice(-252);
  const hi52 = last52w.length ? Math.max(...last52w.map(c => c.high)) : null;
  const lo52 = last52w.length ? Math.min(...last52w.map(c => c.low)) : null;
  const avgVol = hasCandles
    ? Math.round(allCandles.slice(-30).reduce((s, c) => s + c.volume, 0) / Math.min(30, allCandles.length))
    : null;

  const stageInfo = constituentStageMeta(stock);

  function toggle(key: IndicatorKey) {
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      {/* Subheader */}
      <div className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0284C7] hover:text-[#0369A1] mb-2 transition-colors focus:outline-none focus:underline"
            aria-label={`Back to ${sector.name} sector`}
          >
            ← {sector.name} Sector
          </button>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-[#0F172A]">{stock.name}</h1>
                <span className="font-mono font-bold text-base text-[#0284C7] bg-[#E0F2FE] rounded px-2 py-0.5">
                  {stock.ticker}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5"
                  style={{ backgroundColor: stageInfo.bg, color: stageInfo.color }}
                  title={stageInfo.description}
                >
                  <span className="font-mono">{stageInfo.shortLabel}</span>
                  <span>·</span>
                  <span>{stageInfo.name}</span>
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${candleSource === 'live'
                    ? 'bg-[#DCFCE7] text-[#16A34A]'
                    : candleSource === 'failed'
                    ? 'bg-[#FFE4E6] text-[#E11D48]'
                    : 'bg-[#FEF3C7] text-[#D97706]'}`}
                  title={candleSource === 'live'
                    ? 'OHLCV loaded from cache'
                    : candleSource === 'failed'
                    ? 'Yahoo Finance has no data for this symbol'
                    : candleSource === 'loading'
                    ? 'Fetching from Yahoo Finance…'
                    : 'No cached data — press Refresh'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${candleSource === 'live' ? 'bg-[#16A34A]' : candleSource === 'failed' ? 'bg-[#E11D48]' : candleSource === 'loading' ? 'bg-[#D97706] animate-pulse' : 'bg-[#D97706]'}`} aria-hidden="true" />
                  {candleSource === 'live' ? 'Cached' : candleSource === 'failed' ? 'No data' : candleSource === 'loading' ? 'Loading' : 'Refresh needed'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                {sector.name} · Sector weight {stock.weight.toFixed(1)}%
              </p>
            </div>
            <div className="flex items-center gap-4 self-start sm:self-auto">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold font-mono text-[#0F172A]">
                  {displayPrice != null ? fmtCurrency(displayPrice) : '—'}
                </span>
                {change != null && changePct != null && (
                  <span
                    className="text-sm font-semibold font-mono"
                    style={{ color: isPositive ? '#16A34A' : '#E11D48' }}
                  >
                    {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePct.toFixed(2)}%)
                  </span>
                )}
              </div>
              <RefreshButton onClick={refreshStock} refreshing={refreshing} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stat strip — price/volume */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Open" value={last ? fmtCurrency(last.open) : '—'} />
          <Stat label="High (1D)" value={last ? fmtCurrency(last.high) : '—'} />
          <Stat label="Low (1D)" value={last ? fmtCurrency(last.low) : '—'} />
          <Stat label="52W Range" value={(lo52 != null && hi52 != null) ? `${fmtCurrency(lo52)} – ${fmtCurrency(hi52)}` : '—'} small />
          <Stat label="Volume" value={last ? fmtVolume(last.volume) : '—'} mono />
          <Stat label="Avg Vol (30D)" value={avgVol != null ? fmtVolume(avgVol) : '—'} mono />
        </div>

        {/* Fundamentals strip — market cap, free float, institutional ownership */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat
            label="Market Cap"
            value={fundamentals === undefined
              ? 'Loading…'
              : (fundamentals?.marketCapFmt ?? '—')}
            mono
          />
          <Stat
            label="Free Float"
            value={fundamentals === undefined
              ? 'Loading…'
              : (fundamentals?.floatSharesFmt ? `${fundamentals.floatSharesFmt} sh` : '—')}
            mono
          />
          <Stat
            label="Institutional Ownership"
            value={fundamentals === undefined
              ? 'Loading…'
              : (fundamentals?.institutionalPct != null
                  ? `${fundamentals.institutionalPct.toFixed(1)}%`
                  : '—')}
            mono
          />
        </div>

        {/* Chart toolbar */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm">
          <div className="flex flex-wrap items-end gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-b border-[#E2E8F0]">
            {/* Chart type */}
            <ButtonGroup label="Chart">
              {CHART_TYPES.map(t => (
                <ToolbarButton
                  key={t.value}
                  active={chartType === t.value}
                  onClick={() => setChartType(t.value)}
                  ariaLabel={`Set chart type ${t.label}`}
                  title={t.label}
                >
                  <span className="font-mono text-sm" aria-hidden="true">{t.icon}</span>
                  <span className="hidden md:inline ml-1">{t.label}</span>
                </ToolbarButton>
              ))}
            </ButtonGroup>

            <Divider />

            {/* Range */}
            <ButtonGroup label="Range">
              {RANGES.map(r => (
                <ToolbarButton
                  key={r.value}
                  active={range === r.value}
                  onClick={() => setRange(r.value)}
                  ariaLabel={`Show ${r.label} of price history`}
                >
                  {r.label}
                </ToolbarButton>
              ))}
            </ButtonGroup>

            <Divider />

            {/* View options — grouped so they wrap as one unit on mobile */}
            <ButtonGroup label="View">
              <ToolbarButton
                active={logScale}
                onClick={() => setLogScale(s => !s)}
                ariaLabel="Toggle logarithmic price scale"
                title="Log scale"
              >
                Log
              </ToolbarButton>
              <ToolbarButton
                active={fullscreen}
                onClick={() => setFullscreen(s => !s)}
                ariaLabel="Toggle fullscreen chart"
                title="Fullscreen"
              >
                {fullscreen ? '⤢ Exit' : '⤢ Full'}
              </ToolbarButton>
            </ButtonGroup>
          </div>

          {/* Indicators panel */}
          <div className="flex flex-wrap items-start gap-x-4 sm:gap-x-5 gap-y-3 px-3 sm:px-4 py-3">
            <IndicatorGroup
              label="Moving Averages"
              indicators={INDICATOR_META.filter(i => i.group === 'ma')}
              state={indicators}
              onToggle={toggle}
            />
            <Divider />
            <IndicatorGroup
              label="Overlays"
              indicators={INDICATOR_META.filter(i => i.group === 'overlay')}
              state={indicators}
              onToggle={toggle}
            />
            <Divider />
            <IndicatorGroup
              label="Oscillators"
              indicators={INDICATOR_META.filter(i => i.group === 'oscillator')}
              state={indicators}
              onToggle={toggle}
            />
          </div>
        </div>

        {/* Chart — always feed the FULL series so long indicators (MA200,
            EMA200, Bollinger) can compute. Visible window is controlled
            separately via setVisibleRange. */}
        <StockPriceChart
          candles={allCandles}
          visibleFromTime={visibleWindow.from}
          visibleToTime={visibleWindow.to}
          indicators={indicators}
          chartType={chartType}
          logScale={logScale}
          fullscreen={fullscreen}
        />

        {/* Stock metadata footer */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Stock Snapshot</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <Row label="Ticker" value={stock.ticker} mono />
            <Row label="Company" value={stock.name} />
            <Row label="Sector" value={sector.name} />
            <Row label="Sector Weight" value={`${stock.weight.toFixed(1)}%`} />
            <Row label="1D" value={fmtPerf(stock.perf1d)} color={perfColor(stock.perf1d)} mono />
            <Row label="1W" value={fmtPerf(stock.perf1w)} color={perfColor(stock.perf1w)} mono />
            <Row label="1M" value={fmtPerf(stock.perf1m)} color={perfColor(stock.perf1m)} mono />
            <Row label="Signal" value={stock.signal} />
            <Row label="Stage" value={`${stageInfo.shortLabel} · ${stageInfo.name}`} color={stageInfo.color} />
          </div>
          <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">
              Stage Interpretation
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">{stageInfo.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, small, mono }: { label: string; value: string; small?: boolean; mono?: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">{label}</div>
      <div className={`font-bold text-[#0F172A] ${small ? 'text-xs' : 'text-lg'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">{label}</div>
      <div
        className={`font-semibold text-[#0F172A] ${mono ? 'font-mono' : ''}`}
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function ButtonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8]">{label}</span>
      <div className="flex items-center gap-1 bg-[#F1F5F9] rounded-md p-0.5">{children}</div>
    </div>
  );
}

function Divider() {
  return <span className="hidden sm:block w-px self-stretch bg-[#E2E8F0] my-1" aria-hidden="true" />;
}

function ToolbarButton({
  active, onClick, children, ariaLabel, title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      title={title}
      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:ring-offset-1 ${active
        ? 'bg-white text-[#0F172A] shadow-sm'
        : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/60'}`}
    >
      {children}
    </button>
  );
}

function IndicatorGroup({
  label, indicators, state, onToggle,
}: {
  label: string;
  indicators: IndicatorMeta[];
  state: IndicatorState;
  onToggle: (k: IndicatorKey) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8]">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {indicators.map(ind => (
          <IndicatorToggle
            key={ind.key}
            label={ind.label}
            color={ind.color}
            dashed={ind.dashed}
            active={state[ind.key]}
            onClick={() => onToggle(ind.key)}
          />
        ))}
      </div>
    </div>
  );
}

function IndicatorToggle({
  label, color, dashed, active, onClick,
}: { label: string; color: string; dashed?: boolean; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={active}
      aria-label={`Toggle ${label}`}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all border focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:ring-offset-1 ${active
        ? 'bg-white border-[#E2E8F0] text-[#0F172A] shadow-sm'
        : 'bg-[#F1F5F9] border-transparent text-[#64748B] hover:bg-[#E2E8F0]'
      }`}
    >
      <span
        className="inline-block w-3 h-0.5 rounded"
        style={{
          backgroundColor: active ? color : '#94A3B8',
          ...(dashed ? { backgroundImage: 'linear-gradient(to right, currentColor 50%, transparent 50%)' } : {}),
        }}
        aria-hidden="true"
      />
      {label}
    </button>
  );
}

function perfColor(v: number | null): string {
  if (v == null) return '#94A3B8';
  if (v > 0) return '#16A34A';
  if (v < 0) return '#E11D48';
  return '#64748B';
}

function fmtPerf(v: number | null): string {
  if (v == null) return '—';
  if (v === 0) return '0.0%';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}
