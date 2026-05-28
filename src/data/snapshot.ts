/**
 * Server-side cached market snapshot.
 *
 * The snapshot is a single JSON file (`public/data/snapshot.json`) produced by
 * the refresh script (`scripts/refresh.mjs`, run locally or via the GitHub
 * Action) and served by the static CDN. The client loads it automatically on
 * every visit — it never calls the upstream market APIs itself, so opening the
 * site doesn't hammer the public proxies.
 *
 * Refresh modes (server-side only):
 *   - complete: refetch every ticker
 *   - delta:    refetch only tickers whose `updatedAt` is older than a threshold
 */

import type { Fundamentals } from '../types';

export interface SnapshotTicker {
  perf1d: number | null;
  perf1w: number | null;
  perf1m: number | null;
  marketCap?: number | null;
  marketCapFmt?: string | null;
  floatShares?: number | null;
  floatSharesFmt?: string | null;
  institutionalPct?: number | null;
  updatedAt?: string; // ISO — when this ticker was last fetched (powers delta refresh)
}

export interface MarketSnapshot {
  generatedAt: string;        // ISO — when the snapshot file was written
  mode?: 'complete' | 'delta';
  tickerCount?: number;
  tickers: Record<string, SnapshotTicker>;
}

const SNAPSHOT_URL = '/data/snapshot.json';

/**
 * Load the server-cached snapshot. `bust` forces a fresh copy past the CDN /
 * browser cache (used by the manual "Refresh" button).
 */
export async function loadSnapshot(bust = false): Promise<MarketSnapshot | null> {
  try {
    const url = bust ? `${SNAPSHOT_URL}?t=${Date.now()}` : SNAPSHOT_URL;
    const res = await fetch(url, bust ? { cache: 'no-store' } : undefined);
    if (!res.ok) return null;
    const data = (await res.json()) as MarketSnapshot;
    if (!data || typeof data !== 'object' || typeof data.tickers !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export function fundamentalsFromSnapshot(t: SnapshotTicker): Fundamentals | null {
  if (t.marketCap == null && t.floatShares == null && t.institutionalPct == null) return null;
  return {
    marketCap: t.marketCap ?? null,
    marketCapFmt: t.marketCapFmt ?? null,
    floatShares: t.floatShares ?? null,
    floatSharesFmt: t.floatSharesFmt ?? null,
    institutionalPct: t.institutionalPct ?? null,
  };
}
