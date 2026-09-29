"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log unexpected client exceptions
    console.error("Client runtime telemetry error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-on-surface">
      <div className="max-w-md w-full bg-surface-container-lowest border border-surface-container rounded-2xl p-8 shadow-xl flex flex-col items-center text-center">
        {/* Warning Beacon Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 flex items-center justify-center mb-6 shadow-sm">
          <span className="material-symbols-outlined text-[36px]">
            warning
          </span>
        </div>

        <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 mb-2">
          Telemetry Signal Disruption
        </span>

        <h1 className="text-headline-md font-headline-md text-primary font-bold mb-3">
          Advisory Stream Interrupted
        </h1>

        <p className="text-body-md text-on-surface-variant mb-6 leading-relaxed">
          The marine advisory interface encountered an unexpected interruption. Coastal data safety safeguards are active.
        </p>

        {error.digest && (
          <div className="mb-6 px-3 py-1.5 rounded-lg bg-surface-container font-mono text-[11px] text-outline">
            Incident Ref: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-label-md font-semibold text-xs transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>Reconnect Telemetry</span>
          </button>

          <Link
            href="/chat"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface-container-low hover:bg-surface-container border border-surface-container text-on-surface-variant font-label-md font-semibold text-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">anchor</span>
            <span>Safe Anchorage</span>
          </Link>
        </div>

        <div className="mt-8 pt-4 border-t border-surface-container/60 w-full text-[11px] font-mono text-outline">
          Emergency VHF Channel 16 Active Standby
        </div>
      </div>
    </main>
  );
}
