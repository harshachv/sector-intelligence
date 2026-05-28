# Product Requirements

## Application Name

SECTOR INTELLIGENCE

## Theme

Light mode. White/off-white backgrounds. Clean, institutional, finance-grade SaaS dashboard.

---

## Page 1: Home Dashboard

### Header (sticky)
- Left: "SECTOR INTELLIGENCE" brand text
- Right: nav text "Sector Index • Market Dashboard • Live Signals"
- White background, subtle bottom border

### Timeframe Selector
- Options: 1D | 1W | 1M | 1Y
- Default: 1D
- Active: blue/cyan styling
- Updates ALL displayed data on change

### Hero KPI Cards (4 cards)
1. Top Growth Sector — shows name + growth %
2. Bullish Sectors — count
3. Average Probability — percentage
4. Sectors Tracked — count

### Top Growth Sectors Section
- Title: "Top Growth Sectors"
- Top 5 sectors ranked by growth for selected timeframe
- Each item: rank, sector name, growth %, consensus status, mini progress bar
- Clicking opens sector detail page

### Sector Rankings Table
- Title: "Sector Rankings"
- Subtitle label: Daily / Weekly / Monthly / Yearly (based on timeframe)
- Default sort: growth descending
- Columns:
  - Rank
  - Sector (uppercase, with count badge)
  - Growth (green/red)
  - Consensus (green=bullish, red=bearish)
  - 3D Probability (mini progress bar)
  - 10D Probability (mini progress bar)
  - 20D Probability (mini progress bar)
  - Crash Risk (colored badge)
  - Risk Scale (green/amber/red)
  - Regime (colored status dot + label)
  - Action ("View Details →" button)

### Sector Navigation
- Clicking a sector row (or sector name) in the rankings table navigates to the Sector Detail page
- On arrival from the rankings table, the page auto-scrolls to the Sector Constituents section so the stocks list is immediately visible
- The "View Details →" button does the same but lands at the top of the detail page

### Footer
- Left: "sectorintelligence.ai"
- Right: generated timestamp
- Light border top, muted text

---

## Page 2: Sector Detail Page

### Layout
- Same header + timeframe selector
- "← All Sectors" back button
- Large sector name
- Subtitle: "Sector Index Intelligence • [timeframe] View"

### Detail KPI Cards (6 cards)
- Growth
- Consensus
- Probability score (10D)
- Crash Risk
- Risk Scale
- Current Regime

### Section 1: Sector Performance Overview
- Large growth value
- Selected timeframe label
- Comparison vs sector average
- Trend label: Accelerating / Stable / Weakening

### Section 2: Probability Breakdown
- 3D, 10D, 20D probabilities
- Large horizontal progress bars

### Section 3: Risk & Regime Analysis
- Crash risk badge
- Risk scale badge
- Regime status
- Short explanation text

### Section 4: Model Signals (6 cards)
- Momentum
- Volatility
- Relative Strength
- Liquidity
- Sentiment
- Trend Quality
- Each: signal name, score (0-100), direction (Bullish/Bearish/Neutral), status color

### Section 5: Related Sectors (4-6 cards)
- Sector name, growth, regime
- Clicking updates selected sector

### Section 6: Sector Constituents Table
- Columns: Name, Ticker, Weight, 1D, 1W, 1M, Signal, Chart action
- Each row is clickable — opens the Stock Detail page (Page 3) for that ticker
- "Chart →" button as explicit per-row action
- All constituents in the sector are listed (must match the sector's count badge)

---

## Page 3: Stock Detail Page

### Layout
- Same header
- Back button: "← [SECTOR] Sector"
- Stock title row: company name + ticker badge + current price + change ($ and %)
- Sub-line: "[SECTOR] · Sector weight X%"

### Stat Strip (6 cards)
- Open
- High (1D)
- Low (1D)
- 52W Range
- Volume
- Avg Volume (30D)

### Chart Toolbar
A row above the chart with the following control groups:

- **Chart type**: Candles, Heikin-Ashi, Bars, Line, Area (icon + label)
- **Range**: 1M, 3M, 6M (default), YTD, 1Y, ALL — slices candles before pushing to chart
- **Log** toggle: switches price scale between linear and logarithmic
- **Full** toggle: fullscreen chart (fixed inset-0 wrapper)

### Indicator Toggle Panel
Three grouped sections of switches (`role="switch"` + color swatch matching the chart line):

- **Moving Averages**: MA 9 / MA 21 / MA 50 / MA 200 (ON by default), EMA 9 / EMA 21 (OFF, dashed)
- **Overlays**: Bollinger Bands (20, 2σ), VWAP (dashed) — both OFF by default
- **Oscillators**: RSI (14), MACD (12, 26, 9), ATR (14) — all OFF by default; render in their own bottom sub-panes

Color mapping (defined in `StockPriceChart.INDICATOR_COLORS`):
- MA 9: `#0284C7`, MA 21: `#06B6D4`, MA 50: `#D97706`, MA 200: `#9333EA`
- EMA 9: `#16A34A`, EMA 21: `#65A30D`
- Bollinger: `#94A3B8`, VWAP: `#0F172A` (dashed)
- RSI: `#7C3AED`, MACD line/signal/hist: `#0284C7` / `#D97706` / `#94A3B8`, ATR: `#E11D48`

### Chart
- Multi-type price chart (Candles / Heikin-Ashi / Bars / Line / Area), powered by `lightweight-charts` v5
- Volume histogram on pane 0 (green for up days, red soft for down days)
- Overlay indicators (MAs, EMAs, Bollinger, VWAP) drawn on the main price pane
- Oscillators (RSI / MACD / ATR) each on their own auto-created sub-pane via `chart.addPane()`
- **OHLC legend** overlay (top-left of the chart) updates with the crosshair: Date · O · H · L · C · Δ · Δ% · Vol
- Crosshair labels, fit-content time scale on data/range change, log/linear price scale toggle, fullscreen mode

### Search (Header)
- Search box in the header (debounced, opens dropdown on focus, keyboard-navigable)
- Searches sectors by name AND stocks by ticker and name
- Ranking: exact > startsWith > substring; ticker matches get a 1.5× boost
- Keyboard: ⌘/Ctrl+K to focus, ↑/↓ to navigate, Enter to commit, Esc to close
- Match terms are highlighted in the result row
- Sector match → opens the Sector Detail page; stock match → opens the Stock Chart page

### Stock Snapshot Section
- Ticker, Company, Sector, Sector Weight
- 1D, 1W, 1M performance with color coding
- Current Signal (Buy/Hold/Sell)

### Mock Data
- OHLCV series generated deterministically from each ticker (seeded RNG) — same ticker always produces the same chart across reloads
- 260 calendar days, weekends filtered → ~186 trading-day candles

---

## Responsive Behavior

- Desktop: full dashboard layout
- Tablet: compressed cards, horizontally scrollable table
- Mobile: stacked cards, horizontally scrollable table
- Table must never break on mobile

## Accessibility

- Semantic HTML elements
- Accessible button elements
- Aria-labels on icon-only actions
- Visible focus rings
- Sufficient color contrast on light backgrounds
- Status colors supported by text labels
