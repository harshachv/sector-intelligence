import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  BarSeries,
  HistogramSeries,
  PriceScaleMode,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts';
import type { Candle, ChartType, IndicatorState } from '../types';
import {
  sma, ema, vwap, atr, bollinger, rsi, macd,
  heikinAshi, type LinePoint,
} from '../utils/indicators';

interface StockPriceChartProps {
  /**
   * FULL candle history (e.g. 1Y of daily bars). The chart receives the
   * complete series so MA200 / EMA200 / Bollinger can compute correctly
   * even when the visible window is short. The visible window is
   * controlled separately by `visibleFromTime` / `visibleToTime`.
   */
  candles: Candle[];
  visibleFromTime?: string; // YYYY-MM-DD — left edge of visible chart
  visibleToTime?: string;   // YYYY-MM-DD — right edge
  indicators: IndicatorState;
  chartType: ChartType;
  logScale: boolean;
  fullscreen: boolean;
}

export const INDICATOR_COLORS = {
  ma9:   '#0284C7',
  ma21:  '#06B6D4',
  ma50:  '#D97706',
  ma200: '#9333EA',
  ema9:  '#16A34A',
  ema21: '#65A30D',
  bb:    '#94A3B8',
  vwap:  '#0F172A',
  atr:   '#E11D48',
  rsi:   '#7C3AED',
  macdLine:   '#0284C7',
  macdSignal: '#D97706',
  macdHist:   '#94A3B8',
} as const;

function toUtc(time: string): UTCTimestamp {
  return (Date.parse(time + 'T00:00:00Z') / 1000) as UTCTimestamp;
}

function mapOHLC(candles: Candle[]) {
  return candles.map(c => ({
    time: toUtc(c.time),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

function mapClose(candles: Candle[]) {
  return candles.map(c => ({ time: toUtc(c.time), value: c.close }));
}

function mapVolume(candles: Candle[]) {
  return candles.map(c => ({
    time: toUtc(c.time),
    value: c.volume,
    color: c.close >= c.open ? 'rgba(22, 163, 74, 0.35)' : 'rgba(225, 29, 72, 0.35)',
  }));
}

function mapLine(points: LinePoint[]) {
  return points.map(p => ({ time: toUtc(p.time), value: p.value }));
}

function mapHist(points: LinePoint[]) {
  return points.map(p => ({
    time: toUtc(p.time),
    value: p.value,
    color: p.value >= 0 ? 'rgba(22, 163, 74, 0.6)' : 'rgba(225, 29, 72, 0.6)',
  }));
}

interface LegendValues {
  date?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  change?: number;
  changePct?: number;
  volume?: number;
}

export default function StockPriceChart({
  candles, visibleFromTime, visibleToTime, indicators, chartType, logScale, fullscreen,
}: StockPriceChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<'Candlestick' | 'Bar' | 'Line' | 'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const indicatorSeriesRef = useRef<Record<string, ISeriesApi<'Line' | 'Histogram'> | undefined>>({});
  const [legend, setLegend] = useState<LegendValues>({});

  // The actual candle series fed to the main visual (Heikin-Ashi transform happens here)
  const visualCandles = useMemo(
    () => (chartType === 'heikinashi' ? heikinAshi(candles) : candles),
    [candles, chartType]
  );

  // Init chart once
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: '#FFFFFF' },
        textColor: '#64748B',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: 11,
        panes: { separatorColor: '#E2E8F0', separatorHoverColor: '#0284C7' },
      },
      grid: {
        vertLines: { color: '#F1F5F9' },
        horzLines: { color: '#F1F5F9' },
      },
      rightPriceScale: {
        borderColor: '#E2E8F0',
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor: '#E2E8F0',
        timeVisible: false,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: '#0284C7', width: 1, style: 2, labelBackgroundColor: '#0284C7' },
        horzLine: { color: '#0284C7', width: 1, style: 2, labelBackgroundColor: '#0284C7' },
      },
    });
    chartRef.current = chart;

    chart.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
      indicatorSeriesRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recreate main series whenever chart type changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (mainSeriesRef.current) {
      chart.removeSeries(mainSeriesRef.current);
      mainSeriesRef.current = null;
    }

    let main: ISeriesApi<'Candlestick' | 'Bar' | 'Line' | 'Area'>;
    if (chartType === 'candles' || chartType === 'heikinashi') {
      main = chart.addSeries(CandlestickSeries, {
        upColor: '#16A34A',
        downColor: '#E11D48',
        borderUpColor: '#16A34A',
        borderDownColor: '#E11D48',
        wickUpColor: '#16A34A',
        wickDownColor: '#E11D48',
      });
    } else if (chartType === 'bars') {
      main = chart.addSeries(BarSeries, {
        upColor: '#16A34A',
        downColor: '#E11D48',
        thinBars: false,
      });
    } else if (chartType === 'area') {
      main = chart.addSeries(AreaSeries, {
        lineColor: '#0284C7',
        topColor: 'rgba(2, 132, 199, 0.35)',
        bottomColor: 'rgba(2, 132, 199, 0.02)',
        lineWidth: 2,
      });
    } else {
      main = chart.addSeries(LineSeries, {
        color: '#0284C7',
        lineWidth: 2,
      });
    }
    mainSeriesRef.current = main;
  }, [chartType]);

  // Volume series init (once)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || volumeSeriesRef.current) return;
    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volumeSeriesRef.current = vol;
  }, []);

  // Push price + volume data on candle change. We always feed the FULL series
  // so indicators with long lookbacks (MA200, EMA200, Bollinger) have enough
  // history. The visible window is controlled separately, below.
  useEffect(() => {
    if (!chartRef.current || !mainSeriesRef.current) return;
    const main = mainSeriesRef.current;
    if (chartType === 'line' || chartType === 'area') {
      (main as ISeriesApi<'Line' | 'Area'>).setData(mapClose(visualCandles));
    } else {
      (main as ISeriesApi<'Candlestick' | 'Bar'>).setData(mapOHLC(visualCandles));
    }
    volumeSeriesRef.current?.setData(mapVolume(candles));
  }, [visualCandles, candles, chartType]);

  // Visible-range control. When no window is requested, fit content (show all).
  // Otherwise pin the chart to the requested [from, to] window — but indicators
  // still use the full series so MA200 etc. compute correctly.
  useEffect(() => {
    const ts = chartRef.current?.timeScale();
    if (!ts) return;
    if (visibleFromTime && visibleToTime) {
      try {
        ts.setVisibleRange({
          from: toUtc(visibleFromTime),
          to: toUtc(visibleToTime),
        });
      } catch {
        ts.fitContent();
      }
    } else {
      ts.fitContent();
    }
  }, [visibleFromTime, visibleToTime, candles]);

  // Log/Linear toggle
  useEffect(() => {
    chartRef.current?.priceScale('right').applyOptions({
      mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
    });
  }, [logScale]);

  // Re-fit chart when wrapper transitions in/out of fullscreen
  useEffect(() => {
    const id = window.setTimeout(() => {
      chartRef.current?.timeScale().fitContent();
    }, 220);
    return () => window.clearTimeout(id);
  }, [fullscreen]);

  // Manage indicator series
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const wanted: Record<string, {
      data: { time: UTCTimestamp; value: number; color?: string }[];
      color: string;
      width: 1 | 2;
      dashed?: boolean;
      paneIndex?: number;
      priceScaleId?: string;
      kind?: 'line' | 'histogram';
    }> = {};

    if (indicators.ma9)   wanted.ma9   = { data: mapLine(sma(candles, 9)),   color: INDICATOR_COLORS.ma9,   width: 1 };
    if (indicators.ma21)  wanted.ma21  = { data: mapLine(sma(candles, 21)),  color: INDICATOR_COLORS.ma21,  width: 1 };
    if (indicators.ma50)  wanted.ma50  = { data: mapLine(sma(candles, 50)),  color: INDICATOR_COLORS.ma50,  width: 2 };
    if (indicators.ma200) wanted.ma200 = { data: mapLine(sma(candles, 200)), color: INDICATOR_COLORS.ma200, width: 2 };
    if (indicators.ema9)  wanted.ema9  = { data: mapLine(ema(candles, 9)),   color: INDICATOR_COLORS.ema9,  width: 1, dashed: true };
    if (indicators.ema21) wanted.ema21 = { data: mapLine(ema(candles, 21)),  color: INDICATOR_COLORS.ema21, width: 1, dashed: true };
    if (indicators.vwap)  wanted.vwap  = { data: mapLine(vwap(candles)),     color: INDICATOR_COLORS.vwap,  width: 1, dashed: true };
    if (indicators.bb) {
      const b = bollinger(candles, 20, 2);
      wanted.bb_upper  = { data: mapLine(b.upper),  color: INDICATOR_COLORS.bb, width: 1 };
      wanted.bb_middle = { data: mapLine(b.middle), color: INDICATOR_COLORS.bb, width: 1, dashed: true };
      wanted.bb_lower  = { data: mapLine(b.lower),  color: INDICATOR_COLORS.bb, width: 1 };
    }

    let paneCursor = 1;
    if (indicators.rsi) {
      wanted.rsi = {
        data: mapLine(rsi(candles, 14)),
        color: INDICATOR_COLORS.rsi,
        width: 2,
        paneIndex: paneCursor++,
      };
    }
    if (indicators.macd) {
      const m = macd(candles, 12, 26, 9);
      const pane = paneCursor++;
      wanted.macd_line   = { data: mapLine(m.macd),    color: INDICATOR_COLORS.macdLine,   width: 2, paneIndex: pane };
      wanted.macd_signal = { data: mapLine(m.signal),  color: INDICATOR_COLORS.macdSignal, width: 1, paneIndex: pane };
      wanted.macd_hist   = { data: mapHist(m.histogram), color: INDICATOR_COLORS.macdHist, width: 1, paneIndex: pane, kind: 'histogram' };
    }
    if (indicators.atr) {
      wanted.atr = {
        data: mapLine(atr(candles, 14)),
        color: INDICATOR_COLORS.atr,
        width: 1,
        paneIndex: paneCursor++,
      };
    }

    // Remove series no longer wanted
    for (const key of Object.keys(indicatorSeriesRef.current)) {
      if (!wanted[key] && indicatorSeriesRef.current[key]) {
        try { chart.removeSeries(indicatorSeriesRef.current[key]!); } catch { /* ignore */ }
        indicatorSeriesRef.current[key] = undefined;
      }
    }

    // Ensure enough panes exist for the highest requested paneIndex
    const maxPane = Object.values(wanted).reduce(
      (max, cfg) => Math.max(max, cfg.paneIndex ?? 0),
      0
    );
    let existing = chart.panes().length;
    while (existing <= maxPane) {
      chart.addPane();
      existing++;
    }

    // Add or update wanted series
    for (const [key, cfg] of Object.entries(wanted)) {
      let s = indicatorSeriesRef.current[key];
      if (!s) {
        try {
          if (cfg.kind === 'histogram') {
            s = chart.addSeries(HistogramSeries, {
              color: cfg.color,
              priceLineVisible: false,
              lastValueVisible: false,
            }, cfg.paneIndex);
          } else {
            const opts: Record<string, unknown> = {
              color: cfg.color,
              lineWidth: cfg.width,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
            };
            if (cfg.dashed) opts.lineStyle = 2;
            if (cfg.priceScaleId) opts.priceScaleId = cfg.priceScaleId;
            s = chart.addSeries(LineSeries, opts, cfg.paneIndex);
          }
          indicatorSeriesRef.current[key] = s;
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to add indicator series "${key}":`, err);
          continue;
        }
      }
      try { s.setData(cfg.data as never); } catch { /* ignore stale series */ }
    }
  }, [candles, indicators]);

  function handleCrosshairMove(param: MouseEventParams<Time>) {
    if (!param.time || !mainSeriesRef.current) {
      setLegend({});
      return;
    }
    const main = mainSeriesRef.current;
    const data = param.seriesData.get(main);
    const volData = volumeSeriesRef.current ? param.seriesData.get(volumeSeriesRef.current) : undefined;

    let out: LegendValues = {};
    const timeStr = typeof param.time === 'number'
      ? new Date(param.time * 1000).toISOString().slice(0, 10)
      : String(param.time);
    out.date = timeStr;

    if (data && 'close' in data) {
      out.open = data.open as number;
      out.high = data.high as number;
      out.low = data.low as number;
      out.close = data.close as number;
      // Find previous close
      const all = candles;
      const idx = all.findIndex(c => c.time === timeStr);
      if (idx > 0) {
        const prev = all[idx - 1].close;
        out.change = out.close - prev;
        out.changePct = (out.change / prev) * 100;
      }
    } else if (data && 'value' in data) {
      out.close = data.value as number;
    }
    if (volData && 'value' in volData) {
      out.volume = volData.value as number;
    }
    setLegend(out);
  }

  // Last candle as default legend when not hovering
  const displayLegend = useMemo<LegendValues>(() => {
    if (legend.close !== undefined) return legend;
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    if (!last) return {};
    return {
      date: last.time,
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      change: prev ? last.close - prev.close : undefined,
      changePct: prev ? ((last.close - prev.close) / prev.close) * 100 : undefined,
      volume: last.volume,
    };
  }, [legend, candles]);

  return (
    <div
      ref={wrapperRef}
      className={`${fullscreen
        ? 'fixed inset-0 z-50 bg-white p-4'
        : 'relative w-full'}`}
    >
      <div
        ref={containerRef}
        className={`w-full ${fullscreen ? 'h-full' : 'h-[380px] sm:h-[460px] lg:h-[560px]'} rounded-lg border border-[#E2E8F0] overflow-hidden bg-white`}
        aria-label="Stock price chart"
      />
      <ChartLegend legend={displayLegend} />
    </div>
  );
}

function ChartLegend({ legend }: { legend: LegendValues }) {
  if (!legend.close) return null;
  const isPositive = (legend.change ?? 0) >= 0;
  return (
    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-white/90 backdrop-blur-sm border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-[10px] font-mono shadow-sm flex flex-wrap items-center gap-x-3 gap-y-0.5 pointer-events-none max-w-[calc(100%-1rem)]">
      {legend.date && <span className="text-[#64748B]">{legend.date}</span>}
      {legend.open !== undefined && <span><span className="text-[#64748B]">O</span> {legend.open.toFixed(2)}</span>}
      {legend.high !== undefined && <span><span className="text-[#64748B]">H</span> {legend.high.toFixed(2)}</span>}
      {legend.low !== undefined && <span><span className="text-[#64748B]">L</span> {legend.low.toFixed(2)}</span>}
      {legend.close !== undefined && <span><span className="text-[#64748B]">C</span> <span className="font-bold text-[#0F172A]">{legend.close.toFixed(2)}</span></span>}
      {legend.change !== undefined && legend.changePct !== undefined && (
        <span style={{ color: isPositive ? '#16A34A' : '#E11D48' }} className="font-semibold">
          {isPositive ? '+' : ''}{legend.change.toFixed(2)} ({isPositive ? '+' : ''}{legend.changePct.toFixed(2)}%)
        </span>
      )}
      {legend.volume !== undefined && (
        <span><span className="text-[#64748B]">Vol</span> {fmtVol(legend.volume)}</span>
      )}
    </div>
  );
}

function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
