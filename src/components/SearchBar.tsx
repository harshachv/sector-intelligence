import { useEffect, useMemo, useRef, useState } from 'react';
import type { Sector } from '../types';
import { search, type SearchResult } from '../utils/search';

interface SearchBarProps {
  sectors: Sector[];
  onSelectSector: (id: string) => void;
  onSelectStock: (sectorId: string, ticker: string) => void;
}

export default function SearchBar({ sectors, onSelectSector, onSelectStock }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => search(query, sectors), [query, sectors]);

  // Cmd/Ctrl+K to focus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Click outside to close
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Reset highlight when results change
  useEffect(() => {
    setActiveIdx(0);
  }, [results.length, query]);

  function commitResult(r: SearchResult) {
    setOpen(false);
    setQuery('');
    if (r.kind === 'sector') onSelectSector(r.sectorId);
    else if (r.ticker) onSelectStock(r.sectorId, r.ticker);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[activeIdx];
      if (r) commitResult(r);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const showDropdown = open && query.trim().length > 0;
  const hasResults = results.length > 0;

  return (
    <div ref={containerRef} className="relative w-full sm:w-80">
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search sectors or stocks…"
          aria-label="Search sectors or stocks"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={showDropdown}
          aria-activedescendant={showDropdown && hasResults ? `search-result-${activeIdx}` : undefined}
          role="combobox"
          className="w-full bg-[#F1F5F9] border border-transparent hover:border-[#E2E8F0] focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/30 rounded-md text-xs pl-8 pr-14 py-2 text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-colors"
        />
        <span className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-0.5 text-[10px] font-mono text-[#94A3B8] pointer-events-none">
          <kbd className="px-1 py-0.5 rounded bg-white border border-[#E2E8F0]">⌘</kbd>
          <kbd className="px-1 py-0.5 rounded bg-white border border-[#E2E8F0]">K</kbd>
        </span>
      </div>

      {showDropdown && (
        <div
          id="search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-lg border border-[#E2E8F0] shadow-lg overflow-hidden z-50 max-h-[60vh] overflow-y-auto"
        >
          {!hasResults ? (
            <div className="px-4 py-6 text-center text-xs text-[#64748B]">
              No matches for "<span className="font-semibold text-[#0F172A]">{query}</span>"
            </div>
          ) : (
            <ul className="divide-y divide-[#F1F5F9]">
              {results.map((r, i) => {
                const isActive = i === activeIdx;
                const isSector = r.kind === 'sector';
                return (
                  <li
                    key={`${r.kind}-${r.sectorId}-${r.ticker ?? ''}`}
                    id={`search-result-${i}`}
                    role="option"
                    aria-selected={isActive}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => commitResult(r)}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${isActive ? 'bg-[#F1F5F9]' : 'bg-white hover:bg-[#F7F9FC]'}`}
                    >
                      <span
                        className={`flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold ${isSector ? 'bg-[#E0F2FE] text-[#0284C7]' : 'bg-[#FEF3C7] text-[#D97706]'}`}
                        aria-hidden="true"
                      >
                        {isSector ? 'S' : '$'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-[#0F172A] truncate flex items-center gap-2">
                          <Highlighted text={r.label} query={query} />
                          {!isSector && r.ticker && (
                            <span className="font-mono text-[10px] text-[#0284C7] bg-[#E0F2FE] rounded px-1.5 py-0.5">
                              <Highlighted text={r.ticker} query={query} />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#64748B] mt-0.5 truncate">{r.sublabel}</div>
                      </div>
                      <span className="text-[10px] text-[#94A3B8] flex-shrink-0">↵</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Highlighted({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent text-[#0284C7] font-bold">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}
