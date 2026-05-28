import type { Candle } from '../types';

export interface LinePoint {
  time: string;
  value: number;
}

/** Simple moving average of closing prices. */
export function sma(candles: Candle[], period: number): LinePoint[] {
  if (period <= 0 || candles.length < period) return [];
  const out: LinePoint[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) {
      out.push({ time: candles[i].time, value: round2(sum / period) });
    }
  }
  return out;
}

/**
 * Volume-weighted average price, reset each session.
 * For daily candles we use a cumulative VWAP across the entire window
 * (a common simplification for mock daily charts).
 */
export function vwap(candles: Candle[]): LinePoint[] {
  const out: LinePoint[] = [];
  let cumPV = 0;
  let cumV = 0;
  for (const c of candles) {
    const typical = (c.high + c.low + c.close) / 3;
    cumPV += typical * c.volume;
    cumV += c.volume;
    if (cumV > 0) {
      out.push({ time: c.time, value: round2(cumPV / cumV) });
    }
  }
  return out;
}

/** Average True Range over `period` (default 14). */
export function atr(candles: Candle[], period = 14): LinePoint[] {
  if (candles.length < period + 1) return [];
  const trs: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      trs.push(candles[i].high - candles[i].low);
    } else {
      const prevClose = candles[i - 1].close;
      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - prevClose),
        Math.abs(candles[i].low - prevClose)
      );
      trs.push(tr);
    }
  }

  const out: LinePoint[] = [];
  // Wilder's smoothing: first ATR = SMA of first `period` TRs
  let prevAtr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push({ time: candles[period - 1].time, value: round2(prevAtr) });
  for (let i = period; i < trs.length; i++) {
    prevAtr = (prevAtr * (period - 1) + trs[i]) / period;
    out.push({ time: candles[i].time, value: round2(prevAtr) });
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Exponential moving average of close prices. */
export function ema(candles: Candle[], period: number): LinePoint[] {
  if (period <= 0 || candles.length < period) return [];
  const k = 2 / (period + 1);
  const out: LinePoint[] = [];

  // Seed with SMA of first `period` closes
  let sum = 0;
  for (let i = 0; i < period; i++) sum += candles[i].close;
  let prev = sum / period;
  out.push({ time: candles[period - 1].time, value: round2(prev) });

  for (let i = period; i < candles.length; i++) {
    prev = candles[i].close * k + prev * (1 - k);
    out.push({ time: candles[i].time, value: round2(prev) });
  }
  return out;
}

export interface BollingerBands {
  upper: LinePoint[];
  middle: LinePoint[];
  lower: LinePoint[];
}

/** Bollinger Bands: SMA ± stdDev × σ over `period`. */
export function bollinger(candles: Candle[], period = 20, stdDev = 2): BollingerBands {
  const result: BollingerBands = { upper: [], middle: [], lower: [] };
  if (candles.length < period) return result;
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    const mean = sum / period;
    let varSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varSum += (candles[j].close - mean) ** 2;
    }
    const sigma = Math.sqrt(varSum / period);
    const t = candles[i].time;
    result.middle.push({ time: t, value: round2(mean) });
    result.upper.push({ time: t, value: round2(mean + stdDev * sigma) });
    result.lower.push({ time: t, value: round2(mean - stdDev * sigma) });
  }
  return result;
}

/** Wilder-smoothed RSI (Relative Strength Index). */
export function rsi(candles: Candle[], period = 14): LinePoint[] {
  if (candles.length < period + 1) return [];
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    gains.push(Math.max(0, diff));
    losses.push(Math.max(0, -diff));
  }
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  const out: LinePoint[] = [];
  function push(i: number) {
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    const value = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    out.push({ time: candles[i].time, value: round2(value) });
  }
  push(period);

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    push(i + 1);
  }
  return out;
}

export interface MacdResult {
  macd: LinePoint[];
  signal: LinePoint[];
  histogram: LinePoint[];
}

/** MACD: EMA(fast) - EMA(slow), signal = EMA of macd, histogram = macd - signal. */
export function macd(
  candles: Candle[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): MacdResult {
  const empty: MacdResult = { macd: [], signal: [], histogram: [] };
  if (candles.length < slow + signalPeriod) return empty;

  const fastEma = ema(candles, fast);
  const slowEma = ema(candles, slow);
  // Align by time (slowEma is shorter)
  const slowMap = new Map(slowEma.map(p => [p.time, p.value]));
  const macdLine: LinePoint[] = [];
  for (const p of fastEma) {
    const s = slowMap.get(p.time);
    if (s !== undefined) macdLine.push({ time: p.time, value: round2(p.value - s) });
  }

  if (macdLine.length < signalPeriod) return empty;

  // EMA of macd line, computed manually since ema() takes Candle[]
  const k = 2 / (signalPeriod + 1);
  let seed = 0;
  for (let i = 0; i < signalPeriod; i++) seed += macdLine[i].value;
  let prev = seed / signalPeriod;
  const signalLine: LinePoint[] = [
    { time: macdLine[signalPeriod - 1].time, value: round2(prev) },
  ];
  for (let i = signalPeriod; i < macdLine.length; i++) {
    prev = macdLine[i].value * k + prev * (1 - k);
    signalLine.push({ time: macdLine[i].time, value: round2(prev) });
  }

  const signalMap = new Map(signalLine.map(p => [p.time, p.value]));
  const histogram: LinePoint[] = [];
  for (const p of macdLine) {
    const s = signalMap.get(p.time);
    if (s !== undefined) histogram.push({ time: p.time, value: round2(p.value - s) });
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

/** Heikin-Ashi transformation of OHLC candles. */
export function heikinAshi(candles: Candle[]): Candle[] {
  if (candles.length === 0) return [];
  const out: Candle[] = [];
  let prevHaOpen = candles[0].open;
  let prevHaClose = candles[0].close;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0
      ? (c.open + c.close) / 2
      : (prevHaOpen + prevHaClose) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    out.push({
      time: c.time,
      open: round2(haOpen),
      high: round2(haHigh),
      low: round2(haLow),
      close: round2(haClose),
      volume: c.volume,
    });
    prevHaOpen = haOpen;
    prevHaClose = haClose;
  }
  return out;
}
