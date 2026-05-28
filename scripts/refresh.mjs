#!/usr/bin/env node
/**
 * Server-side market data refresh.
 *
 * Fetches real data (Yahoo Finance perfs + stockanalysis.com fundamentals) for
 * every ticker in the sector universe and writes the cached snapshot to
 * public/data/snapshot.json. The client loads that file on every visit and
 * never calls the upstream APIs itself.
 *
 * Run where outbound IPs aren't rate-limited (your machine or CI — NOT a
 * Vercel serverless function, whose cloud IPs Yahoo blocks):
 *
 *   node scripts/refresh.mjs --mode complete   # refetch every ticker
 *   node scripts/refresh.mjs --mode delta      # refetch only stale tickers
 *
 * Delta uses each ticker's `updatedAt`; anything older than --max-age-hours
 * (default 12) or missing is refetched, everything else is kept as-is.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SECTORS_TS = join(ROOT, 'src/data/sectors.ts');
const OUT = join(ROOT, 'public/data/snapshot.json');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const THROTTLE_MS = 150;
const RETRIES = 3;

// ---------- CLI args ----------
const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}
const MODE = arg('mode', 'complete'); // 'complete' | 'delta'
const MAX_AGE_HOURS = Number(arg('max-age-hours', '12'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round2 = (n) => Math.round(n * 100) / 100;

async function fetchJSON(url) {
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (res.status === 429) { await sleep(1500 * (attempt + 1)); continue; }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      await sleep(500 * (attempt + 1));
    }
  }
  return null;
}

// ---------- universe ----------
async function readTickers() {
  const src = await readFile(SECTORS_TS, 'utf8');
  const set = new Set();
  for (const m of src.matchAll(/ticker:\s*'([^']+)'/g)) set.add(m[1]);
  return [...set];
}

// ---------- Yahoo perfs ----------
async function fetchPerfs(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=3mo`;
  const json = await fetchJSON(url);
  const r = json?.chart?.result?.[0];
  const q = r?.indicators?.quote?.[0];
  if (!r?.timestamp || !q?.close) return null;
  const closes = [];
  for (let i = 0; i < r.timestamp.length; i++) {
    if (q.close[i] != null) closes.push(q.close[i]);
  }
  if (closes.length < 2) return null;
  const meta = r.meta ?? {};
  const last = meta.regularMarketPrice ?? closes[closes.length - 1];
  const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? closes[closes.length - 2];
  const at = (off) => closes[Math.max(0, closes.length - 1 - off)];
  const pct = (from) => (from === 0 ? 0 : ((last - from) / from) * 100);
  return {
    perf1d: round2(prevClose === 0 ? 0 : ((last - prevClose) / prevClose) * 100),
    perf1w: round2(pct(at(5))),
    perf1m: round2(pct(at(21))),
  };
}

// ---------- stockanalysis fundamentals ----------
function findItem(section, id) {
  return section?.data?.find((it) => it.id === id);
}
function parseHover(s) {
  if (!s) return null;
  const n = Number(String(s).replace(/[,\s%$]/g, ''));
  return Number.isFinite(n) ? n : null;
}
async function fetchFundamentals(ticker) {
  const url = `https://stockanalysis.com/api/symbol/s/${encodeURIComponent(ticker.toLowerCase())}/statistics`;
  const json = await fetchJSON(url);
  if (json?.status !== 200 || !json.data) return null;
  const mc = findItem(json.data.valuation, 'marketcap');
  const fl = findItem(json.data.shares, 'float');
  const inst = findItem(json.data.shares, 'sharesInstitutions');
  const out = {
    marketCap: parseHover(mc?.hover),
    marketCapFmt: mc?.value ?? null,
    floatShares: parseHover(fl?.hover),
    floatSharesFmt: fl?.value ?? null,
    institutionalPct: parseHover(inst?.hover ?? inst?.value),
  };
  if (out.marketCap == null && out.floatShares == null && out.institutionalPct == null) return null;
  return out;
}

// ---------- main ----------
async function main() {
  const tickers = await readTickers();
  console.log(`[refresh] mode=${MODE} tickers=${tickers.length}`);

  let existing = { tickers: {} };
  if (MODE === 'delta') {
    try { existing = JSON.parse(await readFile(OUT, 'utf8')); } catch { existing = { tickers: {} }; }
  }
  const prev = existing.tickers ?? {};
  const cutoff = Date.now() - MAX_AGE_HOURS * 3600 * 1000;

  const result = {};
  let fetched = 0, kept = 0, failed = 0;

  for (const ticker of tickers) {
    const prevEntry = prev[ticker];
    const fresh = prevEntry?.updatedAt && Date.parse(prevEntry.updatedAt) > cutoff;
    if (MODE === 'delta' && fresh) {
      result[ticker] = prevEntry; // keep — still fresh
      kept++;
      continue;
    }

    await sleep(THROTTLE_MS);
    const [perfs, fundamentals] = await Promise.all([fetchPerfs(ticker), fetchFundamentals(ticker)]);

    if (!perfs && !fundamentals) {
      // keep stale prev entry if we have one; otherwise mark empty
      if (prevEntry) { result[ticker] = prevEntry; kept++; }
      else { result[ticker] = { perf1d: null, perf1w: null, perf1m: null, updatedAt: new Date().toISOString() }; failed++; }
      process.stdout.write(`  ✗ ${ticker}\n`);
      continue;
    }
    result[ticker] = {
      perf1d: perfs?.perf1d ?? null,
      perf1w: perfs?.perf1w ?? null,
      perf1m: perfs?.perf1m ?? null,
      ...(fundamentals ?? {}),
      updatedAt: new Date().toISOString(),
    };
    fetched++;
    process.stdout.write(`  ✓ ${ticker}\n`);
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    mode: MODE,
    tickerCount: Object.keys(result).length,
    tickers: result,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(snapshot, null, 0) + '\n', 'utf8');
  console.log(`[refresh] done — fetched=${fetched} kept=${kept} failed=${failed} → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
