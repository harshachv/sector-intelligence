# Data Model

## Source of Truth

All mock sector data lives in `src/data/sectors.ts`.
All TypeScript types live in `src/types/index.ts`.

---

## Types

### Timeframe

```ts
type Timeframe = '1D' | '1W' | '1M' | '1Y';
```

### TimeframeMetrics

Per-timeframe values for each sector:

```ts
interface TimeframeMetrics {
  growth: number;          // e.g. 18.4 (percentage, positive = growth)
  consensus: 'Bullish' | 'Bearish' | 'Neutral';
  prob3d: number;          // 0-100
  prob10d: number;         // 0-100
  prob20d: number;         // 0-100
  crashRisk: 'Low' | 'Medium' | 'High';
  riskScale: 'Constructive' | 'Cautious' | 'Defensive';
  regime: 'Risk-On' | 'Constructive' | 'Aggressive' | 'Defensive' | 'Max Defensive';
}
```

### Signal

```ts
interface Signal {
  name: string;
  score: number;           // 0-100
  direction: 'Bullish' | 'Bearish' | 'Neutral';
}
```

### Constituent

```ts
interface Constituent {
  name: string;
  ticker: string;
  weight: number;          // percentage
  perf1d: number;
  perf1w: number;
  perf1m: number;
  signal: 'Buy' | 'Hold' | 'Sell';
}
```

### Sector

```ts
interface Sector {
  id: string;              // kebab-case slug, e.g. "quantum"
  name: string;            // display name, e.g. "QUANTUM"
  count: number;           // constituent count
  metrics: Record<Timeframe, TimeframeMetrics>;
  signals: Signal[];       // 6 model signals
  relatedSectors: string[];// array of sector ids
  constituents: Constituent[];
}
```

---

## Derived Values

The following are computed from the data, not stored separately:

- **Top growth sector**: `max(sectors, s => s.metrics[timeframe].growth)`
- **Bullish count**: `sectors.filter(s => s.metrics[timeframe].consensus === 'Bullish').length`
- **Average probability**: `mean(sectors.map(s => s.metrics[timeframe].prob10d))`
- **Rankings**: `[...sectors].sort((a,b) => b.metrics[tf].growth - a.metrics[tf].growth)`

---

## Risk Scale Color Mapping

| Value | Color | Meaning |
|-------|-------|---------|
| Constructive | Green | Full risk-on |
| Cautious | Amber | Moderate caution |
| Defensive | Red | Protect capital |

## Regime Dot Color

| Value | Dot Color |
|-------|-----------|
| Risk-On / Constructive / Aggressive | Green |
| Defensive | Amber |
| Max Defensive | Red |

## Timeframe Label Mapping

| Timeframe | Label |
|-----------|-------|
| 1D | Daily |
| 1W | Weekly |
| 1M | Monthly |
| 1Y | Yearly |

---

## Candle (OHLCV) Type

For the Stock Detail page chart.

```ts
interface Candle {
  time: string;        // ISO date "YYYY-MM-DD"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

**Source**: `generateCandles(ticker, days = 260)` in `src/data/priceSeries.ts`.
Deterministic — same ticker always produces the same series. Weekends are filtered out (~186 trading-day candles).

## Technical Indicator Utilities

Located in `src/utils/indicators.ts`. All return `LinePoint[]` (`{ time, value }`).

| Function | Formula |
|----------|---------|
| `sma(candles, period)` | Simple moving average of `close` over `period` |
| `vwap(candles)` | Cumulative `Σ(typical × volume) / Σ(volume)` where typical = (H + L + C) / 3 |
| `atr(candles, period = 14)` | Wilder's smoothed average of True Range |

## Indicator State

```ts
type IndicatorKey =
  | 'ma9' | 'ma21' | 'ma50' | 'ma200'
  | 'ema9' | 'ema21'
  | 'bb' | 'vwap'
  | 'rsi' | 'macd' | 'atr';

interface IndicatorState {
  ma9: boolean;    // default true
  ma21: boolean;   // default true
  ma50: boolean;   // default true
  ma200: boolean;  // default true
  ema9: boolean;   // default false (dashed)
  ema21: boolean;  // default false (dashed)
  bb: boolean;     // default false — Bollinger Bands (20, 2σ)
  vwap: boolean;   // default false (dashed)
  rsi: boolean;    // default false — sub-pane
  macd: boolean;   // default false — sub-pane
  atr: boolean;    // default false — sub-pane
}
```

## Chart Type & Range

```ts
type ChartType = 'candles' | 'line' | 'area' | 'bars' | 'heikinashi';
type ChartRange = '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL';
```

## Extended Indicator Utilities

| Function | Description |
|----------|-------------|
| `ema(candles, period)` | Exponential moving average of close, seeded with SMA of first `period` |
| `bollinger(candles, period=20, dev=2)` | Returns `{ upper, middle, lower }` lines |
| `rsi(candles, period=14)` | Wilder-smoothed Relative Strength Index |
| `macd(candles, fast=12, slow=26, signal=9)` | Returns `{ macd, signal, histogram }` |
| `heikinAshi(candles)` | HA-transformed OHLCV (smoother trend candles) |

## Search

The search utility is in `src/utils/search.ts`. It returns up to 8 ranked results combining sectors and stocks.

```ts
interface SearchResult {
  kind: 'sector' | 'stock';
  sectorId: string;
  sectorName: string;
  ticker?: string;
  stockName?: string;
  label: string;
  sublabel: string;
  score: number;
}
```

Scoring boosts: ticker matches × 1.5; sector name matches × 1.2; sector id × 0.9.
Acronym matches (e.g. "DC" → "Data Center") supported for short queries.
