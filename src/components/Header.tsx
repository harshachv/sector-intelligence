import type { ReactNode } from 'react';

interface HeaderProps {
  searchSlot?: ReactNode;
}

export default function Header({ searchSlot }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 rounded bg-[#0284C7] flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="7" cy="7" r="2" fill="white" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-widest text-[#0F172A] uppercase whitespace-nowrap">
            <span className="hidden sm:inline">Sector </span>Intelligence
          </span>
        </div>
        {searchSlot && (
          <div className="flex-1 max-w-md mx-auto">{searchSlot}</div>
        )}
        <nav className="hidden lg:flex items-center gap-1 text-[11px] font-medium text-[#64748B] flex-shrink-0">
          <span className="px-2 py-1 hover:text-[#0284C7] cursor-default transition-colors">Sector Index</span>
          <span className="text-[#E2E8F0]">•</span>
          <span className="px-2 py-1 hover:text-[#0284C7] cursor-default transition-colors">Market Dashboard</span>
          <span className="text-[#E2E8F0]">•</span>
          <span className="px-2 py-1 hover:text-[#0284C7] cursor-default transition-colors">Live Signals</span>
        </nav>
      </div>
    </header>
  );
}
