import { useEffect, useMemo, useRef, useState } from 'react';
import type { Sector, Timeframe } from './types';
import { sectors as baseSectors, getSectorById as getBaseSectorById } from './data/sectors';
import {
  hydrateConstituents, hydrateFundamentals, hydrateConstituentsFromCache,
  recomputeSectorGrowth,
} from './data/dataProvider';
import { fmtPct, isMissing } from './utils/fmt';
import Header from './components/Header';
import Footer from './components/Footer';
import TimeframeSelector from './components/TimeframeSelector';
import StatCard from './components/StatCard';
import TopGrowthSectors from './components/TopGrowthSectors';
import SectorRankingsTable from './components/SectorRankingsTable';
import SectorDetailPage from './components/SectorDetailPage';
import StockDetailPage from './components/StockDetailPage';
import SearchBar from './components/SearchBar';

/**
 * Initial sectors state — wipe seed perfs to null, then immediately hydrate
 * with anything in the localStorage cache. This means a returning user sees
 * their last-known real values right away while a background refresh runs.
 *
 * Returns the seeded sectors + the count of "warm" sectors (constituents
 * that came from cache, not just blank).
 */
function initialSectorsFromCache(): { sectors: Sector[]; warmCount: number } {
  let warmCount = 0;
  const sectors = baseSectors.map<Sector>(s => {
    const blanked: Sector = {
      ...s,
      constituents: s.constituents.map(c => ({ ...c, perf1d: null, perf1w: null, perf1m: null })),
      metrics: {
        '1D': { ...s.metrics['1D'], growth: NaN },
        '1W': { ...s.metrics['1W'], growth: NaN },
        '1M': { ...s.metrics['1M'], growth: NaN },
        '1Y': { ...s.metrics['1Y'], growth: NaN },
      },
    };
    const { constituents, hits } = hydrateConstituentsFromCache(blanked.constituents);
    if (hits > 0) {
      warmCount++;
      return recomputeSectorGrowth(blanked, constituents);
    }
    return blanked;
  });
  return { sectors, warmCount };
}

export default function App() {
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [selectedStockTicker, setSelectedStockTicker] = useState<string | null>(null);
  const [scrollToConstituents, setScrollToConstituents] = useState(false);

  // Sectors live in state — seeded from the localStorage cache so the UI
  // shows last-known real values immediately. Stale entries refresh in the
  // background; entries already inside the TTL window are a cache hit and
  // require no network call.
  const initial = useMemo(() => initialSectorsFromCache(), []);
  const [sectors, setSectors] = useState<Sector[]>(initial.sectors);

  // Manual-refresh model: NO data is fetched automatically on load. The app
  // shows whatever is in the localStorage cache; the user must press Refresh
  // to pull fresh data from the network.
  const [refreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<number | null>(() => {
    const raw = localStorage.getItem('lastRefresh');
    return raw ? Number(raw) : null;
  });
  const refreshingRef = useRef(false);

  async function refreshAllSectors() {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    setRefreshProgress(0);
    try {
      let done = 0;
      for (const seed of baseSectors) {
        const { constituents } = await hydrateConstituents(seed.constituents);
        const sectorWithPerfs = recomputeSectorGrowth(seed, constituents);
        setSectors(prev => prev.map(s => (s.id === seed.id ? sectorWithPerfs : s)));
        done += 1;
        setRefreshProgress(done);
        // Stream fundamentals in afterwards — they update the same sector.
        hydrateFundamentals(constituents).then(withF => {
          setSectors(prev => prev.map(s =>
            s.id === seed.id ? recomputeSectorGrowth(seed, withF) : s
          ));
        });
      }
      const now = Date.now();
      localStorage.setItem('lastRefresh', String(now));
      setLastUpdated(now);
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }

  const selectedSector = selectedSectorId
    ? sectors.find(s => s.id === selectedSectorId) ?? getBaseSectorById(selectedSectorId) ?? null
    : null;
  const selectedStock = selectedSector && selectedStockTicker
    ? selectedSector.constituents.find(c => c.ticker === selectedStockTicker)
    : null;

  // Headline KPIs — derived from real data only (skip un-hydrated values).
  const { bullishCount, avgProb, topSector } = useMemo(() => {
    const hydrated = sectors.filter(s => !isMissing(s.metrics[timeframe].growth));
    const bull = hydrated.filter(s => s.metrics[timeframe].consensus === 'Bullish').length;
    const probSum = hydrated.reduce((a, s) => a + s.metrics[timeframe].prob10d, 0);
    const top = hydrated.length === 0
      ? null
      : hydrated.reduce((best, s) =>
          (s.metrics[timeframe].growth > best.metrics[timeframe].growth) ? s : best,
          hydrated[0]);
    return {
      bullishCount: bull,
      avgProb: hydrated.length === 0 ? null : Math.round(probSum / hydrated.length),
      topSector: top,
    };
  }, [sectors, timeframe]);

  useEffect(() => {
    if (selectedSector && !selectedStock && scrollToConstituents) {
      const el = document.getElementById('constituents');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setScrollToConstituents(false);
    }
  }, [selectedSector, selectedStock, scrollToConstituents]);

  function handleSelectSector(id: string) {
    setSelectedSectorId(id);
    setSelectedStockTicker(null);
    setScrollToConstituents(true);
  }
  function handleSelectSectorFromDetail(id: string) {
    setSelectedSectorId(id);
    setSelectedStockTicker(null);
    setScrollToConstituents(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function handleSelectStock(ticker: string) {
    setSelectedStockTicker(ticker);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function handleSearchSelectSector(id: string) {
    setSelectedSectorId(id);
    setSelectedStockTicker(null);
    setScrollToConstituents(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function handleSearchSelectStock(sectorId: string, ticker: string) {
    setSelectedSectorId(sectorId);
    setSelectedStockTicker(ticker);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function handleBackToHome() {
    setSelectedSectorId(null);
    setSelectedStockTicker(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function handleBackToSector() {
    setSelectedStockTicker(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const searchSlot = (
    <SearchBar
      sectors={sectors}
      onSelectSector={handleSearchSelectSector}
      onSelectStock={handleSearchSelectStock}
    />
  );

  // Compact global refresh control that lives in the sticky header (all pages).
  const refreshSlot = (
    <div className="flex items-center gap-2">
      {refreshing ? (
        <span className="hidden sm:inline text-[10px] font-mono text-[#64748B] whitespace-nowrap">
          {refreshProgress}/{sectors.length}
        </span>
      ) : lastUpdated ? (
        <span className="hidden md:inline text-[10px] text-[#64748B] whitespace-nowrap">
          Updated {new Date(lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
      ) : null}
      <button
        onClick={refreshAllSectors}
        disabled={refreshing}
        aria-label="Refresh market data"
        title="Refresh market data"
        className="inline-flex items-center gap-1.5 rounded-md px-2 sm:px-2.5 py-1.5 text-xs font-semibold bg-[#0284C7] text-white hover:bg-[#0369A1] disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:ring-offset-1"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className={refreshing ? 'animate-spin' : ''} aria-hidden="true">
          <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="hidden sm:inline">{refreshing ? 'Refreshing' : 'Refresh'}</span>
      </button>
    </div>
  );

  if (selectedSector && selectedStock) {
    return (
      <>
        <Header searchSlot={searchSlot} rightSlot={refreshSlot} />
        <StockDetailPage
          sector={selectedSector}
          stock={selectedStock}
          onBack={handleBackToSector}
        />
        <Footer />
      </>
    );
  }

  if (selectedSector) {
    return (
      <>
        <Header searchSlot={searchSlot} rightSlot={refreshSlot} />
        <SectorDetailPage
          sector={selectedSector}
          allSectors={sectors}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          onBack={handleBackToHome}
          onSelectSector={handleSelectSectorFromDetail}
          onSelectStock={handleSelectStock}
        />
        <Footer />
      </>
    );
  }

  const hydratedSectorCount = sectors.filter(s => !isMissing(s.metrics[timeframe].growth)).length;
  const hasAnyData = hydratedSectorCount > 0;
  const topSectorGrowth = topSector?.metrics[timeframe].growth;

  return (
    <>
      <Header searchSlot={searchSlot} rightSlot={refreshSlot} />
      <main className="min-h-screen bg-[#F7F9FC]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">Market Overview</h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                {!hasAnyData
                  ? 'No market data yet — press Refresh (top right) to load live prices.'
                  : 'Real-time sector intelligence and market signals'}
              </p>
            </div>
            <TimeframeSelector selected={timeframe} onChange={setTimeframe} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Top Growth Sector"
              value={topSector?.name ?? '—'}
              subtext={
                topSector && !isMissing(topSectorGrowth)
                  ? `${fmtPct(topSectorGrowth)} ${timeframe} growth`
                  : 'Awaiting live data'
              }
              accent
              valueColor="#0284C7"
            />
            <StatCard
              label="Bullish Sectors"
              value={hasAnyData ? bullishCount : '—'}
              subtext={`of ${sectors.length} sectors tracked`}
              valueColor="#16A34A"
            />
            <StatCard
              label="Avg Probability"
              value={avgProb == null ? '—' : `${avgProb}%`}
              subtext="10-day average across sectors"
            />
            <StatCard
              label="Sectors Tracked"
              value={sectors.length}
              subtext="Across all market verticals"
            />
          </div>

          <TopGrowthSectors
            sectors={sectors}
            timeframe={timeframe}
            onSelect={handleSelectSector}
          />

          <SectorRankingsTable
            sectors={sectors}
            timeframe={timeframe}
            onSelect={handleSelectSector}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
