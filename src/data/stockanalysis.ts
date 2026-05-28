/**
 * stockanalysis.com fundamentals client — provides market cap, float,
 * and institutional ownership %. No API key required, browser-friendly
 * through corsproxy.io.
 *
 * Endpoint: https://stockanalysis.com/api/symbol/s/<ticker>/statistics
 * Response shape (relevant pieces):
 *   data.valuation.data[id=marketcap]    -> { value: "4.53T", hover: "4,528,552,475,480" }
 *   data.shares.data[id=float]           -> { value: "14.66B", hover: "14,662,412,877" }
 *   data.shares.data[id=sharesInstitutions] -> { value: "64.14%", hover: "64.139%" }
 *
 * Cached aggressively in localStorage (24h) — these numbers shift slowly.
 */

import type { Fundamentals } from '../types';
import { proxyJSON } from './proxyFetch';

// Fundamentals shift slowly — keep them around for a week.
const FUNDAMENTALS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Throttling is centralised in proxyFetch.ts.
async function throttle(): Promise<void> { /* noop */ }

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

function targetUrl(ticker: string): string {
  // stockanalysis uses lowercase tickers. Symbols with periods (e.g. BRK.B)
  // become hyphens on their URL scheme — but we don't have any of those.
  const safe = ticker.toLowerCase();
  return `https://stockanalysis.com/api/symbol/s/${encodeURIComponent(safe)}/statistics`;
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

  await throttle();

  const json = await proxyJSON<StatsResponse>(targetUrl(ticker));
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
