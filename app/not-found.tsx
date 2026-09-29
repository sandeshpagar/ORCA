import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-on-surface">
      <div className="max-w-md w-full bg-surface-container-lowest border border-surface-container rounded-2xl p-8 shadow-xl flex flex-col items-center text-center">
        {/* Radar / Compass Icon */}
        <div className="w-16 h-16 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center mb-6 shadow-md">
          <span className="material-symbols-outlined text-[36px] text-secondary-fixed">
            explore_off
          </span>
        </div>

        <span className="text-xs font-mono font-bold uppercase tracking-wider text-secondary mb-2">
          Chart Error 404
        </span>

        <h1 className="text-headline-md font-headline-md text-primary font-bold mb-3">
          Navigational Sector Not Found
        </h1>

        <p className="text-body-md text-on-surface-variant mb-6 leading-relaxed">
          The coastal coordinates or navigational sector you are attempting to chart could not be located in the ORCA marine intelligence grid.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/chat"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-label-md font-semibold text-xs transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">sailing</span>
            <span>Return to Radar</span>
          </Link>

          <Link
            href="/monitor"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface-container-low hover:bg-surface-container border border-surface-container text-on-surface-variant font-label-md font-semibold text-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">satellite_alt</span>
            <span>Ocean Monitor</span>
          </Link>
        </div>

        <div className="mt-8 pt-4 border-t border-surface-container/60 w-full flex items-center justify-between text-[11px] font-mono text-outline">
          <span>ORCA Marine Safety Grid</span>
          <span>Lat 0° / Lon 0°</span>
        </div>
      </div>
    </main>
  );
}
