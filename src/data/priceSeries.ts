import type { Candle } from '../types';

// Deterministic seeded RNG (mulberry32) so each ticker produces stable data
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromTicker(ticker: string): number {
  let h = 2166136261;
  for (let i = 0; i < ticker.length; i++) {
    h ^= ticker.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function basePriceFromTicker(ticker: string): number {
  const rng = mulberry32(seedFromTicker(ticker));
  // 25–450 base
  return 25 + rng() * 425;
}

/**
 * Generate ~260 trading days of OHLCV data ending today.
 * Uses geometric Brownian-motion style walk with mild trend bias.
 */
export function generateCandles(ticker: string, days = 260): Candle[] {
  const seed = seedFromTicker(ticker);
  const rng = mulberry32(seed);
  const base = basePriceFromTicker(ticker);
  const trend = (rng() - 0.4) * 0.0015; // small drift

  const candles: Candle[] = [];
  let price = base;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends

    const vol = 0.012 + rng() * 0.018; // 1.2%–3% daily vol
    const ret = trend + (rng() - 0.5) * 2 * vol;
    const open = price;
    const close = open * (1 + ret);
    const wick = open * vol * (0.4 + rng() * 0.6);
    const high = Math.max(open, close) + wick * rng();
    const low = Math.min(open, close) - wick * rng();
    const volume = Math.round((500_000 + rng() * 4_500_000) * (1 + Math.abs(ret) * 10));

    candles.push({
      time: d.toISOString().slice(0, 10),
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume,
    });

    price = close;
  }
  return candles;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
