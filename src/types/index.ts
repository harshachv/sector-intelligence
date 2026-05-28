export type Timeframe = '1D' | '1W' | '1M' | '1Y';

export type Consensus = 'Bullish' | 'Bearish' | 'Neutral';
export type CrashRisk = 'Low' | 'Medium' | 'High';
export type RiskScale = 'Constructive' | 'Cautious' | 'Defensive';
export type RegimeStatus = 'Risk-On' | 'Constructive' | 'Aggressive' | 'Defensive' | 'Max Defensive';
export type SignalDirection = 'Bullish' | 'Bearish' | 'Neutral';
export type ConstituentSignal = 'Buy' | 'Hold' | 'Sell';

export interface TimeframeMetrics {
  growth: number;
  consensus: Consensus;
  prob3d: number;
  prob10d: number;
  prob20d: number;
  crashRisk: CrashRisk;
  riskScale: RiskScale;
  regime: RegimeStatus;
}

export interface Signal {
  name: string;
  score: number;
  direction: SignalDirection;
}

export interface Constituent {
  name: string;
  ticker: string;
  weight: number;
  /**
   * Perf is null until live data hydrates (or if Yahoo can't serve the ticker).
   * The data file ships seed values to make the type happy and for unit-test
   * scenarios; the runtime ALWAYS replaces these with real data (or null on
   * failure) before display. UI must render null as "—" and never show the seeds.
   */
  perf1d: number | null;
  perf1w: number | null;
  perf1m: number | null;
  signal: ConstituentSignal;
  /**
   * Real-data fundamentals fetched from stockanalysis.com's public statistics
   * API. Populated lazily when a sector or stock page is opened. Null until
   * fetched, or if the fundamentals endpoint can't serve the ticker.
   */
  fundamentals?: Fundamentals | null;
}

/**
 * Per-stock fundamentals. We keep both the parsed numeric values (for sorting
 * and arithmetic) and the human-readable formatted strings the data provider
 * already gives us, so the UI can display either.
 */
export interface Fundamentals {
  marketCap: number | null;          // raw $, e.g. 4528552475480
  marketCapFmt: string | null;       // e.g. "4.53T"
  floatShares: number | null;        // raw count, e.g. 14662412877
  floatSharesFmt: string | null;     // e.g. "14.66B"
  institutionalPct: number | null;   // percent 0..100, e.g. 64.14
}

/**
 * Weinstein-style 4-stage technical lifecycle.
 * 1 = Basing (sideways after decline; accumulation)
 * 2 = Advancing (uptrend; the buy zone)
 * 3 = Topping (sideways after rally; distribution)
 * 4 = Declining (downtrend; the sell zone)
 */
export type Stage = 1 | 2 | 3 | 4;

export interface Sector {
  id: string;
  name: string;
  count: number;
  metrics: Record<Timeframe, TimeframeMetrics>;
  signals: Signal[];
  relatedSectors: string[];
  constituents: Constituent[];
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type IndicatorKey =
  | 'ma9' | 'ma21' | 'ma50' | 'ma200'
  | 'ema9' | 'ema21'
  | 'bb' | 'vwap'
  | 'rsi' | 'macd' | 'atr';

export interface IndicatorState {
  ma9: boolean;
  ma21: boolean;
  ma50: boolean;
  ma200: boolean;
  ema9: boolean;
  ema21: boolean;
  bb: boolean;
  vwap: boolean;
  rsi: boolean;
  macd: boolean;
  atr: boolean;
}

export type ChartType = 'candles' | 'line' | 'area' | 'bars' | 'heikinashi';

export type ChartRange = '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL';
