/**
 * stockanalysis.com client — provides daily OHLCV history plus fundamentals
 * (market cap, float, institutional ownership %). No API key required.
 *
 * IMPORTANT: stockanalysis.com sends `Access-Control-Allow-Origin: *`, so the
 * browser can call it DIRECTLY — no CORS proxy needed. This is far more
 * reliable than the public-proxy → Yahoo path (Yahoo now 429s cloud *and*
 * residential IPs), so the chart and fundamentals both load straight from
 * the CDN-cached stockanalysis API.
 *
 * Endpoints:
 *   /api/symbol/s/<ticker>/history?range=1Y&period=Daily  -> OHLCV (newest-first)
 *   /api/symbol/s/<ticker>/statistics                     -> market cap / float / inst %
 *
 * Cached aggressively in localStorage.
 */

import type { Candle, Fundamentals } from '../types';

// Fundamentals shift slowly — keep them around for a week.
const FUNDAMENTALS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// Daily OHLCV — refresh at most every 6h.
const CHART_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Direct browser fetch (no proxy). stockanalysis.com allows cross-origin
 * requests, so we hit it straight. Returns parsed JSON or null on any failure.
 */
async function saFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

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

interface StatsItem { id?: string; title?: string; value?: string; hover?: string }
interface StatsSection { data?: StatsItem[] }
interface StatsResponse {
  status?: number;
  data?: {
    valuation?: StatsSection;
    shares?: StatsSection;
  };
}

// Display ticker → the symbol stockanalysis.com actually serves under. Covers
// renames/relistings where the live ticker differs from the data provider's
// (e.g. Fiserv trades as FI but stockanalysis still indexes it as FISV).
const SYMBOL_ALIAS: Record<string, string> = {
  FI: 'FISV',
};

function saSymbol(ticker: string): string {
  return (SYMBOL_ALIAS[ticker.toUpperCase()] ?? ticker).toLowerCase();
}

function statsUrl(ticker: string): string {
  // stockanalysis uses lowercase tickers. Symbols with periods (e.g. BRK.B)
  // become hyphens on their URL scheme — but we don't have any of those.
  return `https://stockanalysis.com/api/symbol/s/${encodeURIComponent(saSymbol(ticker))}/statistics`;
}

function historyUrl(ticker: string): string {
  return `https://stockanalysis.com/api/symbol/s/${encodeURIComponent(saSymbol(ticker))}/history?range=1Y&period=Daily`;
}

function parseHoverNumber(s?: string): number | null {
  if (!s) return null;
  // Strip commas, percent signs, spaces.
  const cleaned = s.replace(/[,\s%$]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function findItem(section: StatsSection | undefined, id: string): StatsItem | undefined {
  return section?.data?.find(it => it.id === id);
}

/**
 * Fetch real fundamentals for a ticker. Returns null when the upstream
 * doesn't recognise the symbol or the network call fails.
 */
export async function fetchFundamentals(ticker: string): Promise<Fundamentals | null> {
  const cacheKey = `sa:stats:${ticker}`;
  const cached = cacheGet<Fundamentals | null>(cacheKey, FUNDAMENTALS_TTL_MS);
  if (cached !== null) return cached;

  const json = await saFetch<StatsResponse>(statsUrl(ticker));
  if (!json || json.status !== 200 || !json.data) {
    cacheSet(cacheKey, null);
    return null;
  }

  const marketCap = findItem(json.data.valuation, 'marketcap');
  const floatItem = findItem(json.data.shares, 'float');
  const instItem = findItem(json.data.shares, 'sharesInstitutions');

  const out: Fundamentals = {
    marketCap: parseHoverNumber(marketCap?.hover),
    marketCapFmt: marketCap?.value ?? null,
    floatShares: parseHoverNumber(floatItem?.hover),
    floatSharesFmt: floatItem?.value ?? null,
    institutionalPct: parseHoverNumber(instItem?.hover ?? instItem?.value),
  };

  // If literally nothing came back, treat as a miss.
  if (out.marketCap == null && out.floatShares == null && out.institutionalPct == null) {
    cacheSet(cacheKey, null);
    return null;
  }

  cacheSet(cacheKey, out);
  return out;
}

/**
 * Synchronously read cached fundamentals (or null if none).
 * Returns:
 *   undefined → no cache entry (or expired)  ← UI should show "Loading…"
 *   null      → cached as "no data available" ← UI should show "—"
 *   object    → cached fundamentals
 */
export function readCachedFundamentals(ticker: string): Fundamentals | null | undefined {
  const raw = (() => {
    try { return localStorage.getItem(`sa:stats:${ticker}`); }
    catch { return null; }
  })();
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { t: number; v: Fundamentals | null };
    if (Date.now() - parsed.t > FUNDAMENTALS_TTL_MS) return undefined;
    return parsed.v;
  } catch { return undefined; }
}

// ---------- OHLCV chart history ----------

export interface ChartQuote {
  current: number;
  prevClose: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
}

export interface ChartResult {
  candles: Candle[];   // oldest → newest (chart order)
  quote: ChartQuote | null;
}

interface HistoryRow { t: string; o: number; h: number; l: number; c: number; a?: number; v?: number; ch?: number }
interface HistoryResponse { status?: number; data?: HistoryRow[] }

function round2(n: number): number { return Math.round(n * 100) / 100; }

function rowsToResult(rows: HistoryRow[]): ChartResult | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  // stockanalysis returns newest-first; the chart wants oldest-first.
  const ordered = [...rows].reverse();
  const candles: Candle[] = [];
  for (const r of ordered) {
    if (r.c == null || r.o == null || r.h == null || r.l == null) continue;
    candles.push({
      time: r.t,
      open: round2(r.o),
      high: round2(r.h),
      low: round2(r.l),
      close: round2(r.c),
      volume: r.v ?? 0,
    });
  }
  if (candles.length === 0) return null;

  const last = candles[candles.length - 1];
  const prev = candles.length >= 2 ? candles[candles.length - 2] : last;
  const changePct = prev.close === 0 ? 0 : ((last.close - prev.close) / prev.close) * 100;
  const quote: ChartQuote = {
    current: last.close,
    prevClose: prev.close,
    change: round2(last.close - prev.close),
    changePct: round2(changePct),
    open: last.open,
    high: last.high,
    low: last.low,
  };
  return { candles, quote };
}

/**
 * Fetch ~1 year of daily OHLCV for a ticker, straight from stockanalysis.com
 * (direct, CORS-allowed). Returns null on failure. Cached 6h in localStorage.
 */
export async function fetchChartHistory(ticker: string): Promise<ChartResult | null> {
  const cacheKey = `sa:chart:${ticker}`;
  const cached = cacheGet<ChartResult>(cacheKey, CHART_TTL_MS);
  if (cached) return cached;

  const json = await saFetch<HistoryResponse>(historyUrl(ticker));
  if (!json || json.status !== 200 || !json.data) return null;
  const result = rowsToResult(json.data);
  if (!result) return null;
  cacheSet(cacheKey, result);
  return result;
}

/**
 * Synchronously read a previously-cached OHLCV series (or null). Used for
 * instant paint on the stock detail page before the network refresh lands.
 */
export function readCachedChartHistory(ticker: string): ChartResult | null {
  return cacheGet<ChartResult>(`sa:chart:${ticker}`, CHART_TTL_MS);
}
