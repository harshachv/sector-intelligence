import type { Sector, Constituent } from '../types';

export type SearchKind = 'sector' | 'stock';

export interface SearchResult {
  kind: SearchKind;
  sectorId: string;
  sectorName: string;
  // Stock-only fields
  ticker?: string;
  stockName?: string;
  // Display + ranking
  label: string;       // primary text
  sublabel: string;    // secondary text
  score: number;       // higher = better match
}

const MAX_RESULTS = 8;

interface RankedItem<T> {
  item: T;
  score: number;
}

function rank(haystack: string, needle: string, boost = 1): number {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (!n) return 0;
  if (h === n) return 1000 * boost;
  if (h.startsWith(n)) return 700 * boost;
  const idx = h.indexOf(n);
  if (idx >= 0) return Math.max(50, 400 - idx * 10) * boost;
  // Acronym match: e.g. "DC" matches "Data Center"
  if (n.length <= 4 && n.length >= 2) {
    const initials = h.split(/[\s/\-]+/).map(w => w[0]).join('');
    if (initials.startsWith(n)) return 300 * boost;
  }
  return 0;
}

export function search(query: string, sectors: Sector[]): SearchResult[] {
  const q = query.trim();
  if (!q) return [];

  const sectorMatches: RankedItem<Sector>[] = [];
  const stockMatches: RankedItem<{ sector: Sector; stock: Constituent }>[] = [];

  for (const sector of sectors) {
    const sScore = Math.max(
      rank(sector.name, q, 1.2),
      rank(sector.id.replace('-', ' '), q, 0.9)
    );
    if (sScore > 0) sectorMatches.push({ item: sector, score: sScore });

    for (const stock of sector.constituents) {
      if (stock.weight <= 0) continue; // skip placeholder rows
      const score = Math.max(
        rank(stock.ticker, q, 1.5),       // ticker matches rank highest
        rank(stock.name, q, 1.0)
      );
      if (score > 0) stockMatches.push({ item: { sector, stock }, score });
    }
  }

  const results: SearchResult[] = [
    ...sectorMatches.map(({ item, score }) => ({
      kind: 'sector' as const,
      sectorId: item.id,
      sectorName: item.name,
      label: item.name,
      sublabel: `Sector · ${item.count} constituents`,
      score,
    })),
    ...stockMatches.map(({ item, score }) => ({
      kind: 'stock' as const,
      sectorId: item.sector.id,
      sectorName: item.sector.name,
      ticker: item.stock.ticker,
      stockName: item.stock.name,
      label: `${item.stock.name}`,
      sublabel: `${item.stock.ticker} · ${item.sector.name}`,
      score,
    })),
  ];

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, MAX_RESULTS);
}
