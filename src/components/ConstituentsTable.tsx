import type { Constituent } from '../types';
import { constituentStageMeta } from '../utils/stage';

interface ConstituentsTableProps {
  constituents: Constituent[];
  onSelectStock?: (ticker: string) => void;
}

function signalColor(signal: Constituent['signal']): string {
  if (signal === 'Buy') return 'text-[#16A34A] bg-[#DCFCE7]';
  if (signal === 'Sell') return 'text-[#E11D48] bg-[#FFE4E6]';
  return 'text-[#64748B] bg-[#F1F5F9]';
}

function perfColor(val: number | null): string {
  if (val == null) return 'text-[#94A3B8]';
  if (val > 0) return 'text-[#16A34A]';
  if (val < 0) return 'text-[#E11D48]';
  return 'text-[#64748B]';
}

function fmt(val: number | null): string {
  if (val == null) return '—';
  if (val === 0) return '0.0%';
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
}

export default function ConstituentsTable({ constituents, onSelectStock }: ConstituentsTableProps) {
  const visible = constituents.filter(c => c.weight > 0);
  const isClickable = !!onSelectStock;

  return (
    <section aria-labelledby="constituents-heading" id="constituents">
      <div className="flex items-center gap-3 mb-3">
        <h3 id="constituents-heading" className="text-base font-semibold text-[#0F172A]">
          Sector Constituents
        </h3>
        <span className="text-[10px] font-mono text-[#64748B] bg-[#F1F5F9] rounded px-1.5 py-0.5">
          {visible.length}
        </span>
        {isClickable && (
          <span className="text-[11px] text-[#64748B] hidden sm:inline ml-auto">
            Click a stock to open its chart
          </span>
        )}
      </div>
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto table-scroll">
          <table className="min-w-full text-sm" role="table">
            <thead>
              <tr className="bg-[#F1F5F9] border-b border-[#E2E8F0]">
                {['Name', 'Ticker', 'Weight', '1D', '1W', '1M', 'Mkt Cap', 'Float', 'Inst %', 'Signal', 'Stage', ''].map((col, i) => (
                  <th
                    key={col || `action-${i}`}
                    scope="col"
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#64748B] whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => {
                const sm = constituentStageMeta(c);
                return (
                  <tr
                    key={c.ticker}
                    className={`border-b border-[#E2E8F0] last:border-0 hover:bg-[#F7F9FC] transition-colors ${isClickable ? 'cursor-pointer' : ''}`}
                    onClick={isClickable ? () => onSelectStock!(c.ticker) : undefined}
                  >
                    <td className="px-4 py-3 font-medium text-[#0F172A] whitespace-nowrap">{c.name}</td>
                    <td className="px-4 py-3 font-mono font-bold text-xs text-[#0284C7] whitespace-nowrap">{c.ticker}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#64748B] whitespace-nowrap">
                      {c.weight.toFixed(1)}%
                    </td>
                    <td className={`px-4 py-3 font-mono text-xs whitespace-nowrap font-semibold ${perfColor(c.perf1d)}`}>
                      {fmt(c.perf1d)}
                    </td>
                    <td className={`px-4 py-3 font-mono text-xs whitespace-nowrap font-semibold ${perfColor(c.perf1w)}`}>
                      {fmt(c.perf1w)}
                    </td>
                    <td className={`px-4 py-3 font-mono text-xs whitespace-nowrap font-semibold ${perfColor(c.perf1m)}`}>
                      {fmt(c.perf1m)}
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs whitespace-nowrap text-[#0F172A]"
                      title={c.fundamentals?.marketCap != null ? `$${c.fundamentals.marketCap.toLocaleString()}` : undefined}
                    >
                      {c.fundamentals === undefined ? '…' : (c.fundamentals?.marketCapFmt ?? '—')}
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs whitespace-nowrap text-[#64748B]"
                      title={c.fundamentals?.floatShares != null ? `${c.fundamentals.floatShares.toLocaleString()} shares` : undefined}
                    >
                      {c.fundamentals === undefined ? '…' : (c.fundamentals?.floatSharesFmt ?? '—')}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-[#64748B]">
                      {c.fundamentals === undefined
                        ? '…'
                        : (c.fundamentals?.institutionalPct != null
                            ? `${c.fundamentals.institutionalPct.toFixed(1)}%`
                            : '—')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${signalColor(c.signal)}`}>
                        {c.signal}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2 py-0.5"
                        style={{ backgroundColor: sm.bg, color: sm.color }}
                        title={sm.description}
                      >
                        <span className="font-mono">{sm.stage}</span>
                        <span>{sm.name}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isClickable && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectStock!(c.ticker); }}
                          className="text-[11px] font-semibold text-[#0284C7] hover:text-[#0369A1] bg-[#E0F2FE] hover:bg-[#BAE6FD] rounded px-2 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:ring-offset-1"
                          aria-label={`Open ${c.ticker} chart`}
                        >
                          Chart →
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
