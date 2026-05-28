import type { Constituent, Stage } from '../types';

export interface StageMeta {
  stage: Stage;
  label: string;       // "Stage 2 — Advancing"
  shortLabel: string;  // "Stage 2"
  name: string;        // "Advancing"
  description: string;
  color: string;       // text color
  bg: string;          // soft background color
}

const STAGE_META: Record<Stage, Omit<StageMeta, 'stage'>> = {
  1: {
    label: 'Stage 1 — Basing',
    shortLabel: 'Stage 1',
    name: 'Basing',
    description: 'Sideways consolidation after a decline. Smart money is accumulating before the next advance.',
    color: '#D97706',
    bg: '#FEF3C7',
  },
  2: {
    label: 'Stage 2 — Advancing',
    shortLabel: 'Stage 2',
    name: 'Advancing',
    description: 'Clear uptrend above the 30-week moving average. This is the optimal "buy" zone.',
    color: '#16A34A',
    bg: '#DCFCE7',
  },
  3: {
    label: 'Stage 3 — Topping',
    shortLabel: 'Stage 3',
    name: 'Topping',
    description: 'Sideways consolidation after a rally. Distribution is occurring — momentum is fading.',
    color: '#D97706',
    bg: '#FEF3C7',
  },
  4: {
    label: 'Stage 4 — Declining',
    shortLabel: 'Stage 4',
    name: 'Declining',
    description: 'Clear downtrend below the 30-week moving average. Capital preservation is paramount.',
    color: '#E11D48',
    bg: '#FFE4E6',
  },
};

/**
 * Deterministic stage classification from a constituent's signal and
 * 1D / 1W / 1M momentum profile.
 *
 *   Stage 4 → decisive bearish: Sell signal, or steep monthly decline
 *   Stage 1 → flat near zero, signal is Hold, momentum stalled
 *   Stage 2 → bullish: Buy signal with positive monthly perf, or strong monthly run
 *   Stage 3 → topping: Hold signal but with a recent rally that's starting to flatten
 */
export function classifyStage(c: Constituent): Stage | null {
  const { signal, perf1d, perf1w, perf1m } = c;
  // Without real perfs we cannot classify — return null so the UI shows "—".
  if (perf1d == null || perf1w == null || perf1m == null) return null;

  // Stage 4 — Declining
  if (signal === 'Sell') return 4;
  if (perf1m <= -6) return 4;

  // Stage 2 — Advancing
  if (signal === 'Buy' && perf1m >= 8) return 2;
  if (perf1m >= 14) return 2;
  if (signal === 'Buy' && perf1w >= 4) return 2;

  // Stage 3 — Topping: was strong, now decelerating
  if (perf1m >= 5 && perf1d < 1.0 && signal !== 'Buy') return 3;
  if (signal === 'Hold' && perf1m >= 6 && perf1d <= 0.8) return 3;

  // Stage 1 — Basing: small/sideways moves, Hold
  return 1;
}

export function stageMeta(stage: Stage): StageMeta {
  return { stage, ...STAGE_META[stage] };
}

export interface UnknownStageMeta {
  stage: null;
  label: string;
  shortLabel: string;
  name: string;
  description: string;
  color: string;
  bg: string;
}

const UNKNOWN_STAGE: UnknownStageMeta = {
  stage: null,
  label: 'Stage — unknown',
  shortLabel: '—',
  name: 'No data',
  description: 'No real perf data yet (live fetch pending or symbol unavailable).',
  color: '#94A3B8',
  bg: '#F1F5F9',
};

export function constituentStageMeta(c: Constituent): StageMeta | UnknownStageMeta {
  const s = classifyStage(c);
  return s == null ? UNKNOWN_STAGE : stageMeta(s);
}
