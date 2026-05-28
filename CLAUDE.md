# CLAUDE.md

## Project Name

Sector Intelligence

## Product Summary

Sector Intelligence is a light-themed market sector analytics dashboard. It shows ranked sector performance, top growth sectors, probability signals, crash risk, risk scale, market regime, and detail pages for each sector. Covers **44 sectors / ~427 constituent stocks** spanning thematic tech themes and broad-market verticals (banks, healthcare, REITs, utilities, etc.).

The app is inspired by a dense finance-terminal dashboard, but the final UI must be light, clean, institutional, and SaaS-grade.

## Tech Stack

- React + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- `lightweight-charts` v5 (TradingView open-source charting library, used on the Stock Detail page)
- Bundled mock data by default; optional **Finnhub live data** via `VITE_FINNHUB_API_KEY` (free tier). See "Live vs. Mock" below.

## Data architecture — server-side cached snapshot (current model)

The client no longer calls the upstream market APIs. Instead:

- **`public/data/snapshot.json`** is a server-side cache: a per-ticker map of perfs + fundamentals (`src/data/snapshot.ts` defines the shape). The client **auto-loads it on every visit** and applies it to the sector universe (`applySnapshot` in `dataProvider.ts`). A copy is stashed in `localStorage` (`snapshot-cache`) for instant paint.
- **Refresh** (header button, sector-detail button) = **re-pull the snapshot** (cache-busted), NOT the upstream APIs. So normal use never hammers the public proxies.
- **`scripts/refresh.mjs`** is the only thing that hits upstream (Yahoo + stockanalysis, direct Node fetch). Run it where IPs aren't blocked — locally or CI, NOT a Vercel function:
  - `npm run refresh` → **complete** (every ticker)
  - `npm run refresh:delta` → **delta** (only tickers whose `updatedAt` is older than `--max-age-hours`, default 12)
  - It writes `public/data/snapshot.json`.
- **`.github/workflows/refresh-data.yml`** runs the script on a schedule (delta) + manual `workflow_dispatch` (choose complete/delta), commits the snapshot → Vercel auto-deploys → clients get the latest on next load.
- The committed seed snapshot covers the top ~160 tickers by market cap; the rest show "—" until a full `npm run refresh`. Stock-detail **chart OHLCV is still fetched client-side on demand** (candles aren't in the snapshot) and cached in localStorage.

## Responsive Sector Rankings table

`SectorRankingsTable` progressively reveals columns: mobile (<sm) shows only `# / Sector / Growth` (fits 375px, no cut; whole row is tappable); `sm` adds Consensus / Regime / Action; `md` adds Crash Risk; `lg` shows all 11. Plus a visible scrollbar, right-edge fade, and a "Swipe table →" hint (only when actually scrollable).

## (Legacy) Data policy — no mock at the display layer + manual refresh only

Real Yahoo Finance data only (via public CORS proxy chain, no API key). See `docs/PROJECT_CONTEXT.md` for the full table. Key rules:

- **No data is fetched automatically.** On load the app shows whatever is in the localStorage cache (seeded synchronously via `hydrateConstituentsFromCache` / `getCachedCandles` / `getCachedFundamentals`). The user must press **Refresh** to pull from the network. This is deliberate (avoids hammering free proxies on every page view).
  - Home: a "Refresh data" control refreshes all 44 sectors' perfs + fundamentals; shows progress + last-refreshed timestamp (persisted in `localStorage.lastRefresh`).
  - Sector Detail: its own Refresh button (subheader) re-hydrates that sector.
  - Stock Detail: its own Refresh button (subheader) fetches that stock's OHLCV + fundamentals.
  - Shared UI: `src/components/RefreshButton.tsx`.
- Disclaimer / educational-use terms live in `src/components/DisclaimerModal.tsx`, opened from the Footer ("Disclaimer & Terms"). The footer carries a persistent "Educational use only · Not financial advice" notice.
- (Legacy note) Earlier versions auto-hydrated at boot; that was removed in favor of the manual-refresh model above.
- Until a constituent hydrates, its perfs are **null** and the UI displays "—" (never seed values from `sectors.ts`).
- Sector growth is recomputed at runtime from the **real** constituent perfs (constituents that fail to hydrate are excluded, not faked).
- Stage classification (1–4 Weinstein) is **derived** from real perfs and shows "—" when data is missing.
- Tickers Yahoo can't serve (e.g. delisted ADRs) are dropped from the data file or swapped for working symbols — currently every ticker resolves except in transient network errors.
- The proprietary signal columns (consensus / probability / crash risk / risk scale / regime) are explicit model-derived stand-ins, documented as such; replacing them with real-candle-derived proxies is the next milestone.

`sectors.ts` ships with seed perf values purely to keep the TypeScript types happy and to support unit tests; those values are **wiped to null at app boot** (`blankSectors()` in `App.tsx`) so they can never be displayed.

### Fundamentals (market cap, free float, institutional ownership %)

Sourced from **stockanalysis.com** (`/api/symbol/s/{ticker}/statistics`) via `src/data/stockanalysis.ts`. No API key required, works through the same corsproxy.io path. 24-hour cache TTL.

- Hydrated lazily — only when a sector detail or stock detail page is opened, not at app boot
- Two-pass hydration on the sector page: perfs land first (warm from app-boot cache), then fundamentals stream in
- Three new columns in `ConstituentsTable`: Mkt Cap, Float, Inst %
- Three new stat cards on `StockDetailPage` below the price strip

## Non-Negotiable Requirements

- Brand name: "SECTOR INTELLIGENCE".
- Theme: light mode only unless the user explicitly asks for dark mode later.
- Build with React, TypeScript, and Tailwind CSS.
- Use mock data only unless backend/API work is explicitly requested.
- Keep all sector metrics centralized in `src/data/sectors.ts`.
- Keep the app componentized under `src/components/`.
- Preserve persistent project context in this file and the `docs/` folder.
- Before major changes, read:
  - `CLAUDE.md`
  - `docs/PROJECT_CONTEXT.md`
  - `docs/PRODUCT_REQUIREMENTS.md`
  - `docs/UI_DESIGN_SYSTEM.md`
  - `docs/DATA_MODEL.md`

## Project Structure

```
sector-intelligence/
├── src/
│   ├── components/        # All UI components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── TimeframeSelector.tsx
│   │   ├── StatCard.tsx
│   │   ├── TopGrowthSectors.tsx
│   │   ├── SectorRankingsTable.tsx
│   │   ├── ProgressMetric.tsx
│   │   ├── StatusDot.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── SectorDetailPage.tsx
│   │   ├── SignalCard.tsx
│   │   ├── RelatedSectors.tsx
│   │   ├── ConstituentsTable.tsx
│   │   ├── StockDetailPage.tsx
│   │   ├── StockPriceChart.tsx
│   │   └── SearchBar.tsx
│   ├── data/
│   │   ├── sectors.ts     # Central mock sector + constituent data
│   │   └── priceSeries.ts # Deterministic OHLCV generator (per ticker)
│   ├── utils/
│   │   ├── indicators.ts  # SMA, EMA, VWAP, ATR, Bollinger, RSI, MACD, Heikin-Ashi
│   │   └── search.ts      # Ranked sector + stock search
│   ├── types/
│   │   └── index.ts       # TypeScript interfaces
│   ├── App.tsx
│   └── main.tsx
├── docs/
│   ├── PROJECT_CONTEXT.md
│   ├── PRODUCT_REQUIREMENTS.md
│   ├── UI_DESIGN_SYSTEM.md
│   ├── DATA_MODEL.md
│   └── IMPLEMENTATION_PLAN.md
└── .claude/skills/
    ├── frontend-ui.md
    ├── data-modeling.md
    ├── design-review.md
    ├── refactor-and-quality.md
    └── accessibility-review.md
```

## Core Pages

### Home Dashboard

Shows:
- Header (sticky) with brand + global search box (⌘/Ctrl+K)
- Timeframe selector: 1D, 1W, 1M, 1Y
- KPI cards (4 hero cards)
- Top Growth Sectors (top 5)
- Sector Rankings table (all sectors)
- Footer

The header search is present on every page and lets the user jump directly to any sector or stock by name or ticker.

### Sector Detail Page

Shows:
- Back button (to Home)
- Selected sector name
- Detail KPI cards
- Sector performance overview
- Probability breakdown
- Risk and regime analysis
- Model signals (6 cards)
- Related sectors (4-6 cards)
- Sector constituents table — each row is clickable, opens the Stock Detail Page

### Stock Detail Page

Shows:
- Back button (to the parent Sector)
- Stock name, ticker, current price, change
- Stat strip (Open, High, Low, 52W Range, Volume, Avg Vol)
- **Chart toolbar**: Chart type switcher (Candles / Heikin-Ashi / Bars / Line / Area), Range (1M / 3M / 6M / YTD / 1Y / ALL), Log scale toggle, Fullscreen toggle
- **Indicator panel** (three groups):
  - Moving Averages: MA 9 / 21 / 50 / 200 (ON by default), EMA 9 / 21 (off, dashed)
  - Overlays: Bollinger Bands (20, 2σ), VWAP (dashed) — both off
  - Oscillators: RSI(14), MACD(12,26,9), ATR(14) — render in their own sub-panes
- Chart (`lightweight-charts` v5) with volume histogram + crosshair OHLC legend overlay
- Stock snapshot section

## Timeframe Logic

The timeframe selector controls all displayed metrics.

Supported timeframes: 1D | 1W | 1M | 1Y

Changing timeframe updates:
- Top growth sector KPI card
- All KPI cards
- Top growth sector cards and rankings
- Rankings table sort order
- Sector detail values

## Sectors

44 sectors total (`src/data/sectors.ts`). `count` on each sector must equal `constituents.length` — verify after edits.

**Thematic/tech:** QUANTUM, PHOTONICS, SEMIS, GLP-1, MEMORY, STORAGE, BIOTECH, ROBOTICS, SOLAR, CYBER, SPACE, AI INFRA, MAG7, ENERGY, CRYPTO, DATA CENTER, EV / AUTONOMY, STREAMING, GAMING, SOFTWARE, DEFENSE, FINTECH, DRONES, NUCLEAR, MATERIALS, METALS, CHINA, AI SOFTWARE

**Broad-market verticals (added later):** BANKS, HEALTHCARE, REITS, STAPLES, RETAIL, INDUSTRIALS, UTILITIES, AIRLINES, TELECOM, INSURANCE, GOLD MINERS, HOMEBUILDERS, RESTAURANTS, TRAVEL, E-COMMERCE, MEDIA

All constituents are real, Yahoo-servable US-listed tickers (a stock may appear in more than one thematic sector — that's intentional). When adding sectors, only use tickers that resolve on Yahoo's `v8/finance/chart` endpoint; ADRs with dots/dashes (e.g. BRK.B) and dead OTC ADRs (HXSCL, IIVI) are avoided.

## Visual Design

Light theme colors:
- Background: #F7F9FC
- Surface: #FFFFFF
- Secondary surface: #F1F5F9
- Border: #E2E8F0
- Text: #0F172A
- Muted text: #64748B
- Accent blue: #0284C7
- Cyan: #06B6D4
- Green: #16A34A
- Amber: #D97706
- Red: #E11D48

Style: Clean finance SaaS dashboard, institutional analytics, compact but readable, subtle shadows, thin borders, rounded cards.

## Code Standards

- Use TypeScript interfaces/types for all data.
- Keep mock data separate from components (`src/data/sectors.ts`).
- Avoid duplicated code; use reusable components.
- Keep tables horizontally scrollable on mobile.
- Use semantic HTML with accessible focus states.
- Run `npm run build` to typecheck before finalizing.

## Persistent Context Rule

At the start of each new Claude Code session:
1. Read this file.
2. Read the files in `docs/`.
3. Check current implementation before modifying.
4. Do not assume missing requirements.
5. If requirements change, update this file and the relevant docs.
