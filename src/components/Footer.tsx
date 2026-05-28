import { useState } from 'react';
import DisclaimerModal from './DisclaimerModal';

export default function Footer() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const timestamp = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return (
    <footer className="border-t border-[#E2E8F0] bg-white mt-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-semibold tracking-wide text-[#64748B]">
            sectorintelligence.ai
          </span>
          <span className="text-[#E2E8F0] hidden sm:inline">•</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 bg-[#FEF3C7] text-[#D97706]">
            Educational use only
          </span>
          <button
            onClick={() => setShowDisclaimer(true)}
            className="text-[11px] font-semibold text-[#0284C7] hover:text-[#0369A1] hover:underline transition-colors focus:outline-none focus:underline"
          >
            Disclaimer &amp; Terms
          </button>
        </div>
        <span className="text-[11px] font-mono text-[#64748B]">
          Not financial advice · Generated {timestamp}
        </span>
      </div>

      <DisclaimerModal open={showDisclaimer} onClose={() => setShowDisclaimer(false)} />
    </footer>
  );
}
