/**
 * Unified data provider: real Yahoo Finance data by default (no API key needed),
 * with the bundled mock data set as a fallback.
 *
 * Phase A — Stock detail: real OHLCV when reachable
 * Phase B — Constituent perfs: real quotes drive perf1d/1w/1m
 * Phase C — Sector growth: derived from real constituent perfs
 *
 * Proprietary signals (consensus, probabilities, crash risk, regime) stay
 * mock-derived because no public API sells these — see docs/PROJECT_CONTEXT.md.
 */

import type { Candle, Constituent, Fundamentals, Sector } from '../types';
import { fetchChart, perfsFromCandles, readCachedChart } from './yahoo';
import { fetchFundamentals, readCachedFundamentals } from './stockanalysis';

export type DataMode = 'live' | 'failed';

export interface CandleResult {
  candles: Candle[];     // empty when source === 'failed'
  source: DataMode;
  current?: number;
  changePct?: number;
}

// Re-export type for components that still consume it as a value
export type { Candle };
export type { Fundamentals };

/**
 * Synchronously read OHLCV from cache only — NO network. Returns null when
 * there's no cached series yet (the user must press Refresh). Used so pages
 * never auto-fetch on mount.
 */
export function getCachedCandles(ticker: string): CandleResult | null {
  const cached = readCachedChart(ticker, '1y', '1d');
  if (!cached || cached.candles.length === 0) return null;
  return {
    candles: cached.candles,
    source: 'live',
    current: cached.quote?.current,
    changePct: cached.quote?.changePct,
  };
}

/**
 * Synchronously read fundamentals from cache only — NO network.
 * undefined = nothing cached, null = cached "no data", object = cached.
 */
export function getCachedFundamentals(ticker: string): Fundamentals | null | undefined {
  return readCachedFundamentals(ticker);
}

/**
 * Resolve OHLCV (and current quote) for a ticker.
 * Returns `source: 'failed'` if Yahoo can't serve the ticker — never falls
 * back to mock so the UI can show "Data unavailable".
 */
export async function getCandles(ticker: string): Promise<CandleResult> {
  const live = await fetchChart(ticker, '1y', '1d');
  if (live && live.candles.length > 0) {
    return {
      candles: live.candles,
      source: 'live',
      current: live.quote?.current,
      changePct: live.quote?.changePct,
    };
  }
  return { candles: [], source: 'failed' };
}

/**
 * Hydrate a sector's constituents with real perfs from Yahoo. NEVER falls
 * back to seed values — failed tickers get `null` perfs and the UI shows "—".
 *
 * Constituents are processed SEQUENTIALLY (not Promise.all) so we don't
 * stampede public CORS proxies with a 10-12-request burst per sector. The
 * global throttle in proxyFetch keeps cumulative load polite. Cache hits
 * return synchronously so the sequential cost only applies on first warm-up.
 */
export async function hydrateConstituents(
  constituents: Constituent[]
): Promise<{ constituents: Constituent[]; liveCount: number; failedTickers: string[] }> {
  const failedTickers: string[] = [];
  const results: Constituent[] = [];
  for (const c of constituents) {
    const chart = await fetchChart(c.ticker, '3mo', '1d');
    const perfs = chart ? perfsFromCandles(chart.candles, chart.quote?.current) : null;
    if (!chart || !perfs) {
      failedTickers.push(c.ticker);
      results.push({ ...c, perf1d: null, perf1w: null, perf1m: null });
      continue;
    }
    results.push({
      ...c,
      perf1d: chart.quote?.changePct != null
        ? +chart.quote.changePct.toFixed(2)
        : perfs.perf1d,
      perf1w: perfs.perf1w,
      perf1m: perfs.perf1m,
    });
  }
  const liveCount = results.length - failedTickers.length;
  return { constituents: results, liveCount, failedTickers };
}

/**
 * Second pass: attach real fundamentals (market cap, float, institutional %)
 * to constituents. We do this separately from perf hydration so the perf
 * numbers can land first (they're more visible) while fundamentals fill in.
 *
 * Returns a new array of constituents; failures get `fundamentals: null` so
 * the UI distinguishes "loading" (undefined) from "no data" (null).
 */
export async function hydrateFundamentals(
  constituents: Constituent[]
): Promise<Constituent[]> {
  // Sequential to keep us under public-proxy rate limits — cache hits are
  // synchronous, so a warm second pass is effectively instant.
  const out: Constituent[] = [];
  for (const c of constituents) {
    const f = await fetchFundamentals(c.ticker);
    out.push({ ...c, fundamentals: f });
  }
  return out;
}

/**
 * Fetch fundamentals for a single ticker — used by the stock detail page.
 */
export async function getFundamentals(ticker: string): Promise<Fundamentals | null> {
  return fetchFundamentals(ticker);
}

/**
 * Hydrate constituents SYNCHRONOUSLY from the localStorage cache.
 * Used on app mount so the UI shows last-known real values immediately
 * instead of waiting for the network. Stocks without a cache entry keep
 * their null perfs / undefined fundamentals.
 */
export function hydrateConstituentsFromCache(constituents: Constituent[]): {
  constituents: Constituent[];
  hits: number;
} {
  let hits = 0;
  const out = constituents.map<Constituent>(c => {
    const chart = readCachedChart(c.ticker, '3mo', '1d');
    const cachedFund = readCachedFundamentals(c.ticker);
    if (!chart) {
      return { ...c, perf1d: null, perf1w: null, perf1m: null, fundamentals: cachedFund };
    }
    const perfs = perfsFromCandles(chart.candles, chart.quote?.current);
    if (!perfs) {
      return { ...c, perf1d: null, perf1w: null, perf1m: null, fundamentals: cachedFund };
    }
    hits++;
    return {
      ...c,
      perf1d: chart.quote?.changePct != null ? +chart.quote.changePct.toFixed(2) : perfs.perf1d,
      perf1w: perfs.perf1w,
      perf1m: perfs.perf1m,
      fundamentals: cachedFund,
    };
  });
  return { constituents: out, hits };
}

/**
 * After hydrating constituents, recompute the sector's headline growth
 * (1D / 1W / 1M) as the weight-weighted average of real perfs.
 *
 * 1Y is left as the bundled snapshot (we only pull 3mo of candles for
 * constituents to keep the request payload small).
 */
/**
 * Recompute sector headline growth from real constituent perfs. Constituents
 * with null perfs (failed Yahoo fetch) are skipped — the average is over
 * the subset that actually hydrated, with weights renormalised.
 *
 * Returns the original metric (NaN) if no constituent hydrated for a given
 * window; the UI will show "—" instead of a mock number.
 */
export function recomputeSectorGrowth(
  sector: Sector,
  constituents: Constituent[]
): Sector {
  const w = (key: 'perf1d' | 'perf1w' | 'perf1m'): number => {
    let sumW = 0;
    let sumP = 0;
    for (const c of constituents) {
      const v = c[key];
      if (v == null) continue;
      sumW += c.weight;
      sumP += v * c.weight;
    }
    return sumW === 0 ? NaN : +(sumP / sumW).toFixed(2);
  };

  return {
    ...sector,
    constituents,
    metrics: {
      ...sector.metrics,
      '1D': { ...sector.metrics['1D'], growth: w('perf1d') },
      '1W': { ...sector.metrics['1W'], growth: w('perf1w') },
      '1M': { ...sector.metrics['1M'], growth: w('perf1m') },
    },
  };
}
