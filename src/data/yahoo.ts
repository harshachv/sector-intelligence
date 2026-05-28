/**
 * Yahoo Finance client — no API key required.
 *
 * Yahoo's `query1.finance.yahoo.com/v8/finance/chart/<ticker>` endpoint returns
 * both historical OHLCV and the latest meta-quote in a single call. We use it
 * for everything: the stock chart, the current price, and the perf1d/1w/1m
 * derivations for constituent rows.
 *
 * CORS: Yahoo does not set Access-Control-Allow-Origin, so we route through:
 *  - In dev: a Vite proxy at `/yfproxy/*` (see vite.config.ts)
 *  - In production: a public proxy (corsproxy.io by default)
 *  - Override either via `VITE_YAHOO_PROXY` env var
 *
 * Aggressively cached in localStorage (1h TTL) to be a good citizen.
 */

import type { Candle } from '../types';

const CHART_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Throttling is centralised in proxyFetch.ts — no per-module gate here.
async function throttle(): Promise<void> { /* noop */ }

// Live mode is the only mode — no mock fallback. Kept for callers
// that still reference the symbol; always true.
export function isLiveEnabled(): boolean { return true; }

// ---------- URL routing ----------

import { proxyJSON } from './proxyFetch';

async function fetchYahooJSON<T = unknown>(ticker: string, range: string, interval: string): Promise<T | null> {
  const path = `/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;
  const envProxy = (import.meta.env.VITE_YAHOO_PROXY ?? '').trim();
  if (envProxy) {
    const base = envProxy.endsWith('/') ? envProxy.slice(0, -1) : envProxy;
    try {
      const res = await fetch(`${base}${path}`);
      if (res.ok) return await res.json() as T;
    } catch { /* fall through to public proxies */ }
  }
  return proxyJSON<T>(`https://query1.finance.yahoo.com${path}`);
}

// ---------- Cache ----------

interface CacheEntry<T> { t: number; v: T }

function cacheGet<T>(key: string, ttl: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - parsed.t > ttl) return null;
    return parsed.v;
  } catch { return null; }
}

function cacheSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value } as CacheEntry<T>));
  } catch { /* quota or disabled */ }
}

// ---------- Public API ----------

export interface YahooQuote {
  current: number;
  prevClose: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  open: number;
}

export interface YahooChartResult {
  candles: Candle[];
  quote: YahooQuote | null;
}

interface YahooChartResponse {
  chart: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketOpen?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
    error?: { code: string; description: string } | null;
  };
}

/**
 * Fetch ~1 year of daily candles + the live meta-quote in a single round trip.
 * Returns null if the ticker is unknown or the proxy is unreachable.
 */
export async function fetchChart(
  ticker: string,
  range: '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' = '1y',
  interval: '1d' | '1wk' = '1d',
): Promise<YahooChartResult | null> {
  if (!isLiveEnabled()) return null;

  const cacheKey = `yh:chart:${ticker}:${range}:${interval}`;
  const cached = cacheGet<YahooChartResult>(cacheKey, CHART_TTL_MS);
  if (cached) return cached;

  await throttle();
  const json = await fetchYahooJSON<YahooChartResponse>(ticker, range, interval);
  if (!json) return null;

  const result = json?.chart?.result?.[0];
  if (!result || !result.timestamp || !result.indicators?.quote?.[0]) return null;

  const q = result.indicators.quote[0];
  const ts = result.timestamp;
  const candles: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close?.[i];
    const open = q.open?.[i];
    const high = q.high?.[i];
    const low = q.low?.[i];
    if (close == null || open == null || high == null || low == null) continue;
    const iso = new Date(ts[i] * 1000).toISOString().slice(0, 10);
    candles.push({
      time: iso,
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume: q.volume?.[i] ?? 0,
    });
  }

  if (candles.length === 0) return null;

  const meta = result.meta ?? {};
  const last = candles[candles.length - 1].close;
  // Prefer Yahoo's `previousClose` (true yesterday). Fall back to the second-to-last
  // candle. Do NOT fall back to `chartPreviousClose` — that's the close from before
  // the requested range (e.g. ~1y ago for range=1y), which gives wildly wrong %.
  const prevClose = meta.previousClose
    ?? (candles.length >= 2 ? candles[candles.length - 2].close : last);
  const current = meta.regularMarketPrice ?? last;

  const quote: YahooQuote = {
    current: round2(current),
    prevClose: round2(prevClose),
    change: round2(current - prevClose),
    changePct: prevClose === 0 ? 0 : round2(((current - prevClose) / prevClose) * 100),
    open: round2(meta.regularMarketOpen ?? candles[candles.length - 1].open),
    high: round2(meta.regularMarketDayHigh ?? candles[candles.length - 1].high),
    low: round2(meta.regularMarketDayLow ?? candles[candles.length - 1].low),
  };

  const out: YahooChartResult = { candles, quote };
  cacheSet(cacheKey, out);
  return out;
}

/**
 * Compute perf1d / perf1w / perf1m from a candle series.
 * Yahoo skips weekends/holidays, so offsets here are trading days.
 */
export function perfsFromCandles(
  candles: Candle[],
  current?: number
): { perf1d: number; perf1w: number; perf1m: number } | null {
  if (candles.length < 2) return null;
  const last = current ?? candles[candles.length - 1].close;
  const closeAt = (offset: number) =>
    candles[Math.max(0, candles.length - 1 - offset)].close;
  const pct = (from: number) => from === 0 ? 0 : ((last - from) / from) * 100;
  return {
    perf1d: round2(pct(closeAt(1))),
    perf1w: round2(pct(closeAt(5))),
    perf1m: round2(pct(closeAt(21))),
  };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

/**
 * Synchronously read a previously-cached chart result. Returns null when
 * there is no cache entry OR the entry has expired. Used to populate the
 * app with last-known data immediately on mount so the UI is never blank.
 */
export function readCachedChart(
  ticker: string,
  range: '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' = '1y',
  interval: '1d' | '1wk' = '1d',
): YahooChartResult | null {
  return cacheGet<YahooChartResult>(`yh:chart:${ticker}:${range}:${interval}`, CHART_TTL_MS);
}
