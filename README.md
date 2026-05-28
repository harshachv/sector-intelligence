# Sector Intelligence

A light-themed, institutional-style **market sector analytics dashboard**. Ranks 44 market
sectors (~427 constituent stocks) by performance and shows per-sector and per-stock detail
pages with a TradingView-style chart, technical indicators, fundamentals, and a Weinstein
4-stage classification.

> ⚠️ **Educational use only — not financial advice.** This is a personal demonstration
> project. Nothing here is a recommendation to buy or sell any security. The proprietary
> "signals" (consensus, probability, crash risk, regime, stage) are illustrative,
> model-derived stand-ins. See the **Disclaimer & Terms** link in the app footer.

## Features

- **44 sectors**, thematic (Quantum, AI Infra, Semis, Crypto…) and broad-market (Banks,
  Healthcare, REITs, Utilities, Airlines…).
- **Real market data** from Yahoo Finance (prices/OHLCV) and stockanalysis.com (market cap,
  free float, institutional ownership %) — no API key required, routed through a public
  CORS-proxy fallback chain.
- **Manual refresh model** — nothing is fetched automatically. The app renders from a
  `localStorage` cache instantly; press **Refresh** to pull fresh data. (Keeps free proxies
  happy and puts the user in control.)
- **Stock detail chart** (`lightweight-charts` v5): candles / Heikin-Ashi / bars / line / area,
  range presets, log scale, fullscreen, and indicators — MA 9/21/50/200, EMA 9/21, Bollinger,
  VWAP, RSI, MACD, ATR.
- **Global search** (⌘/Ctrl-K) across sectors and stocks.
- Fully **responsive** (mobile / tablet / desktop).

## Tech stack

React + TypeScript + Vite + Tailwind CSS. No backend.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
```

## Deploy (Vercel)

This is a zero-config Vite app — Vercel auto-detects it:

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project → Import** the repo.
3. Framework preset **Vite**, Build Command `npm run build`, Output Directory `dist` (auto-filled).
4. Deploy.

Optional: set `VITE_YAHOO_PROXY` to your own CORS proxy/worker base URL to bypass the public proxies.

## Project layout

```
src/
  components/   UI (Header, SectorDetailPage, StockDetailPage, StockPriceChart, DisclaimerModal, RefreshButton…)
  data/         sectors.ts (universe), yahoo.ts, stockanalysis.ts, dataProvider.ts, proxyFetch.ts
  utils/        indicators.ts, stage.ts, search.ts, fmt.ts
docs/           PROJECT_CONTEXT, PRODUCT_REQUIREMENTS, UI_DESIGN_SYSTEM, DATA_MODEL, IMPLEMENTATION_PLAN
CLAUDE.md       persistent project context
```

## Disclaimer

For educational and illustrative purposes only. Not financial, investment, or trading advice;
not a recommendation or solicitation. Third-party data is provided "as is" and may be delayed
or inaccurate. Past performance does not indicate future results. Investing involves risk,
including loss of principal. Trademarks and tickers belong to their respective owners.
