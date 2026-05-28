interface RefreshButtonProps {
  onClick: () => void;
  refreshing: boolean;
  label?: string;
}

/**
 * Shared Refresh control. Data is never fetched automatically — every page
 * pulls fresh data only when the user presses one of these.
 */
export default function RefreshButton({ onClick, refreshing, label = 'Refresh' }: RefreshButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={refreshing}
      aria-label="Refresh data"
      className="inline-flex items-center justify-center gap-1.5 bg-[#0284C7] text-white rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-[#0369A1] disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:ring-offset-1"
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className={refreshing ? 'animate-spin' : ''} aria-hidden="true">
        <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {refreshing ? 'Refreshing…' : label}
    </button>
  );
}
