import { useEffect } from 'react';

interface DisclaimerModalProps {
  open: boolean;
  onClose: () => void;
}

const YEAR = new Date().getFullYear();

/**
 * Educational-use / not-financial-advice disclaimer. Rendered as an
 * accessible modal dialog so it's reachable from the footer on every page
 * without needing a router.
 */
export default function DisclaimerModal({ open, onClose }: DisclaimerModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center bg-[#0F172A]/50 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-[#E2E8F0] sticky top-0 bg-white rounded-t-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 bg-[#FEF3C7] text-[#D97706]">
                Educational Use Only
              </span>
            </div>
            <h2 id="disclaimer-title" className="text-lg font-bold text-[#0F172A] mt-2">
              Disclaimer &amp; Terms of Use
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close disclaimer"
            className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 py-5 space-y-4 text-sm text-[#334155] leading-relaxed">
          <p className="font-semibold text-[#0F172A]">
            Sector Intelligence is a personal, non-commercial demonstration project built for
            educational and illustrative purposes only.
          </p>

          <Section title="Not financial advice">
            Nothing in this application constitutes — and it must not be relied upon as — financial,
            investment, trading, legal, accounting, or tax advice. It is <strong>not a recommendation,
            offer, or solicitation</strong> to buy, sell, or hold any security, asset, or financial
            instrument. No fiduciary or advisory relationship is created by using this tool.
          </Section>

          <Section title="Illustrative signals">
            The proprietary indicators shown here — <em>Consensus, 3D/10D/20D Probability, Crash Risk,
            Risk Scale, Regime, and Stage</em> — are <strong>model-derived stand-ins generated for
            demonstration</strong>. They are not the output of any professional research process and
            should not be interpreted as predictive of any outcome.
          </Section>

          <Section title="Third-party data, provided “as is”">
            Market data (prices, OHLCV, fundamentals) is retrieved from public third-party endpoints
            including <strong>Yahoo Finance</strong> and <strong>stockanalysis.com</strong> via public
            CORS proxies. This data may be delayed, cached, incomplete, or inaccurate. It is provided
            “as is” and “as available,” without warranties of any kind, express or implied, including
            accuracy, completeness, timeliness, or fitness for a particular purpose.
          </Section>

          <Section title="Investing involves risk">
            Past performance is not indicative of future results. The value of investments can go down
            as well as up, and you may lose some or all of your invested capital. Always do your own
            research and consult a licensed financial professional before making any investment decision.
          </Section>

          <Section title="Limitation of liability">
            The author(s) accept no liability whatsoever for any loss or damage of any kind arising from,
            or in connection with, the use of this application or reliance on any information it presents.
            You use this tool entirely at your own risk.
          </Section>

          <Section title="Trademarks">
            All company names, ticker symbols, logos, and trademarks are the property of their respective
            owners. Their use here is purely for identification and educational illustration and does not
            imply any affiliation with, sponsorship by, or endorsement from those entities.
          </Section>

          <div className="pt-3 border-t border-[#E2E8F0] text-xs text-[#64748B]">
            © {YEAR} Sector Intelligence (demo). Not affiliated with any financial institution, exchange,
            or data provider. For educational use only.
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-[#E2E8F0] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#0284C7] text-white rounded-md px-4 py-2 text-sm font-semibold hover:bg-[#0369A1] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:ring-offset-1"
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">{title}</h3>
      <p>{children}</p>
    </div>
  );
}
