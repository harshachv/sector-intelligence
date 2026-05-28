# Project Context

## What Is This

Sector Intelligence is a frontend-only, light-themed market sector analytics dashboard. It provides ranked sector performance, model signals, probability scores, risk analysis, and sector detail pages.

## Status

Initial implementation complete. All components, mock data, and routing are in place.

A **live-data provider** for Finnhub is wired up (`src/data/dataProvider.ts` + `src/data/finnhub.ts`). When `VITE_FINNHUB_API_KEY` is set (or pasted via the in-app banner), the app fetches:

- **Real OHLCV** for the stock detail chart
- **Real quotes** to hydrate constituent perf1d/1w/1m on sector detail pages
- **Recomputed sector growth** from those real per-stock perfs

Without a key, the app runs on the bundled deterministic mock data — nothing breaks.

## Real vs. Derived — Honest Disclosure (no-mock policy)

The app now refuses to display mock perf numbers. Everything price-related comes from Yahoo Finance via corsproxy.io (no API key). Tickers Yahoo can't serve show "—" rather than fabricated values.

| Field | Source | Behaviour |
|---|---|---|
| Stock OHLCV / current price | Yahoo `v8/finance/chart` | Real. Failed fetch → "Data unavailable" badge, chart stays empty. |
| perf1d / perf1w / perf1m | Derived from Yahoo candles | Real. perf1d uses Yahoo's `regularMarketChangePct` when present, else `(current - candles[-2].close) / candles[-2].close`. |
| Sector growth (1D / 1W / 1M) | Weighted average of constituents | Real, recomputed at runtime. Constituents that didn't hydrate are excluded from the average. |
| Sector growth (1Y) | Bundled snapshot | Not refreshed (Yahoo free pull is 3mo for hydration). |
| Stage (Weinstein 1–4) | `classifyStage()` over real perfs | Real. Returns null → "—" pill when constituent has no live data. |
| Consensus / Probability / Crash Risk / Risk Scale / Regime | Bundled seed (no public API sells these) | Documented as model-derived stand-ins. Future work: derive proxies from real candles (RSI for probability, drawdown+ATR for crash risk, etc.). |
| Market Cap / Free Float / Institutional Ownership % | stockanalysis.com `/api/symbol/s/{ticker}/statistics` | Real, lazy-loaded per sector / per stock. Failed fetch → "—". Cached 24h. |

### Hydration flow at boot

`App.tsx` calls `hydrateConstituents()` for each of the 27 sectors in series at boot. Each call fans out ~10 parallel `fetchChart()` requests to Yahoo (throttled 10/s in `yahoo.ts`). Results are cached in `localStorage` (1h TTL), so a refresh re-mounts instantly off cache. The loading banner ("X/27 sectors hydrated") disappears when all are done.

### Failure handling

- Yahoo says "No data found, symbol may be delisted" → that constituent's perfs become `null`, the row shows "—", and that ticker is excluded from sector growth recomputation.
- Yahoo or corsproxy.io is down → the same null path; UI degrades gracefully with "—" everywhere; once connectivity returns, a reload re-hydrates.

## Architecture Decisions

- **Vite + React + TypeScript**: fast dev/build, strong typing
- **Tailwind CSS**: utility-first, consistent with design system colors
- **Mock data in `src/data/sectors.ts`**: single source of truth for all sector metrics across all timeframes
- **React state for navigation**: no router installed — `App.tsx` manages `selectedSector` and `timeframe` state, passing them down as props
- **Component-per-concern**: each UI section is its own component in `src/components/`

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root state: timeframe, selectedSector; renders Home or Detail view |
| `src/data/sectors.ts` | All mock sector data, typed, keyed by timeframe |
| `src/types/index.ts` | TypeScript interfaces for Sector, TimeframeData, Signal, Constituent |
| `src/components/Header.tsx` | Sticky header with brand and nav |
| `src/components/SectorRankingsTable.tsx` | Main rankings table with all columns |
| `src/components/SectorDetailPage.tsx` | Full detail view for a selected sector |

## How to Extend

1. **Add a new sector**: Add an entry to `src/data/sectors.ts` following the `Sector` type.
2. **Change a color**: Update `tailwind.config.js` custom colors AND `docs/UI_DESIGN_SYSTEM.md`.
3. **Add a new page**: Add state/routing in `App.tsx` and create a component in `src/components/`.
4. **Connect a real API**: Replace mock data import in `App.tsx` with an API call; keep the same TypeScript types.

## Constraints

- No backend — mock data only until explicitly requested.
- No external paid assets or copyrighted logos.
- Light theme is non-negotiable unless user explicitly changes it.
- Brand name is always "SECTOR INTELLIGENCE", not "AION ANALYTICS" or any other name.
