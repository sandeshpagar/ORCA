"use client";

import { useState } from "react";

const languages = ["EN", "ଓଡ଼ିଆ", "தமிழ்", "বাংলা"];

export default function ChatPage() {
  const [currentLangIdx, setCurrentLangIdx] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>("");

  const cycleLanguage = () => {
    setCurrentLangIdx((prev) => (prev + 1) % languages.length);
  };

  return (
    <div className="flex-1 flex flex-col relative w-full bg-surface min-h-[calc(100dvh-4rem)]">
      {/* Operational Telemetry Bar & Context Ribbon */}
      <section className="px-margin-mobile md:px-margin-desktop pt-space-xs pb-space-sm bg-surface-container-low flex flex-col gap-space-xs shadow-sm border-b border-surface-container">
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-space-xs">
          <div className="flex items-center justify-between gap-space-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary" />
              </span>
              <span className="font-label-md text-label-md text-primary font-semibold truncate font-mono">
                Gopalpur Sector · Buoy BD-12
              </span>
            </div>

            {/* Multi-Language Switcher Pill */}
            <button
              onClick={cycleLanguage}
              className="flex items-center gap-1 bg-surface-container-highest px-space-xs py-1 rounded-full text-on-surface-variant text-label-sm font-label-sm shrink-0 hover:bg-surface-container transition-colors"
              id="lang-btn"
              title="Switch language"
            >
              <span className="material-symbols-outlined text-[15px] text-primary">translate</span>
              <span className="font-semibold text-primary">{languages[currentLangIdx]}</span>
              <span className="text-outline">|</span>
              <span className="text-[11px]">{languages[(currentLangIdx + 1) % languages.length]}</span>
              <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant font-mono">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-secondary">
                satellite_alt
              </span>
              <span className="truncate">NaVIC Stream · ISRO Oceansat-3 Sync</span>
            </div>
            <span className="text-label-sm font-label-sm text-secondary font-semibold bg-secondary-fixed/50 px-1.5 py-0.5 rounded">
              ONLINE
            </span>
          </div>
        </div>
      </section>

      {/* Main Conversational Stream */}
      <section className="flex-1 px-margin-mobile md:px-margin-desktop py-space-md flex flex-col gap-space-lg max-w-3xl mx-auto w-full pb-28">
        {/* User Query 1 Bubble */}
        <div className="flex flex-col items-end gap-1 pl-space-xl">
          <div className="flex items-center gap-1 text-label-sm font-label-sm text-on-surface-variant mb-0.5 font-mono">
            <span className="material-symbols-outlined text-[14px] text-secondary">mic</span>
            <span>Voice Input · 14:32 IST</span>
          </div>
          <div className="bg-primary text-on-primary px-space-md py-space-sm rounded-2xl rounded-tr-xs shadow-sm max-w-[92%]">
            <p className="font-body-md text-body-md leading-relaxed">
              Can mechanised trawlers venture 15 nautical miles off Gopalpur after 18:00 IST tonight?
            </p>
          </div>
          <span className="font-label-sm text-label-sm text-outline px-1 font-mono">
            NavIC Transcribed
          </span>
        </div>

        {/* Response 1: ORCA Intelligence Advisory */}
        <article className="flex flex-col gap-space-sm bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container">
          {/* AI Identity Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shrink-0">
                <span className="material-symbols-outlined text-[20px] text-secondary-fixed">
                  sailing
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="font-headline-sm text-headline-sm text-primary leading-tight truncate font-bold">
                  ORCA Intelligence Core
                </h2>
                <p className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  Synthesized at 14:32 IST · Model v4.2
                </p>
              </div>
            </div>
            <button
              aria-label="Audio read out"
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0 hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">volume_up</span>
            </button>
          </div>

          {/* Advisory Severity Banner (Amber L2) */}
          <div className="bg-amber-100/90 text-amber-950 p-space-sm rounded-lg flex items-start gap-space-xs border border-amber-200">
            <span className="material-symbols-outlined text-amber-700 text-[20px] shrink-0 mt-0.5">
              warning
            </span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md font-bold uppercase tracking-wider text-amber-900">
                Caution Advised · Level 2 Squall Alert
              </span>
              <p className="font-body-sm text-body-sm font-medium mt-0.5 text-amber-950 leading-relaxed">
                Deep-sea squalls expected off southern Odisha coast. All vessels must return to harbor or shelter moorings before 22:00 IST.
              </p>
            </div>
          </div>

          {/* Telemetry Snapshot Widget */}
          <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-space-xs border border-surface-container">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm font-semibold uppercase text-primary tracking-wider font-mono">
                Telemetry Snapshot (Buoy BD-12)
              </span>
              <span className="font-label-sm text-label-sm text-secondary font-medium font-mono">
                14:30 IST Ping
              </span>
            </div>
            <div className="grid grid-cols-3 gap-space-xs pt-1">
              <div className="bg-surface-container-lowest p-2 rounded-md flex flex-col border border-surface-container">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Swell Ht</span>
                <span className="font-data-metric text-data-metric text-primary font-mono">
                  2.8<span className="text-xs font-normal text-on-surface-variant">m</span>
                </span>
                <span className="font-label-sm text-label-sm text-tertiary font-semibold flex items-center font-mono">
                  <span className="material-symbols-outlined text-[12px]">trending_up</span> 3.4m @ 21:00
                </span>
              </div>
              <div className="bg-surface-container-lowest p-2 rounded-md flex flex-col border border-surface-container">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Wind SSW</span>
                <span className="font-data-metric text-data-metric text-primary font-mono">
                  22<span className="text-xs font-normal text-on-surface-variant">kts</span>
                </span>
                <span className="font-label-sm text-label-sm text-amber-800 font-semibold font-mono">
                  Gusts 30 kts
                </span>
              </div>
              <div className="bg-surface-container-lowest p-2 rounded-md flex flex-col border border-surface-container">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Current</span>
                <span className="font-data-metric text-data-metric text-primary font-mono">
                  1.4<span className="text-xs font-normal text-on-surface-variant">m/s</span>
                </span>
                <span className="font-label-sm text-label-sm text-secondary font-semibold font-mono">
                  East Drift
                </span>
              </div>
            </div>
          </div>

          {/* Plain Language Operational Guidance */}
          <div className="flex flex-col gap-2 pt-1">
            <h3 className="font-label-md text-label-md font-bold uppercase tracking-wider text-primary">
              Operational Field Guidance
            </h3>
            <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                  check_circle
                </span>
                <span>
                  <strong>Inshore (&lt; 5 NM):</strong> Motorized fiberglass crafts allowed until 20:00 IST with NavIC radio active.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-tertiary text-[18px] shrink-0 mt-0.5">
                  cancel
                </span>
                <span>
                  <strong>Offshore (10–20 NM):</strong> High danger for non-mechanised catamarans. Mechanised trawlers must travel in buddy pairs and dock by 22:00 IST.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                  anchor
                </span>
                <span>
                  <strong>Nearest Safe Mooring:</strong> Gopalpur Fishing Harbor Slipway or Paradip Outer Anchorage (Zone B, Coordinates: 19°18&apos;N, 84°58&apos;E).
                </span>
              </li>
            </ul>
          </div>

          {/* Grounded Citations (Perplexity style) */}
          <div className="bg-surface-container-high/60 rounded-lg p-space-sm flex flex-col gap-2 mt-1">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
              <span className="font-label-sm text-label-sm font-bold uppercase text-primary tracking-wider">
                Authoritative Data Grounding (3 Sources)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <div className="bg-surface-container-lowest text-primary px-2 py-1 rounded text-label-sm font-label-sm flex items-center gap-1 shadow-sm border border-surface-container">
                <span className="bg-primary-fixed text-primary font-bold px-1 rounded-xs">1</span>
                <span className="truncate max-w-[150px]">INCOIS Wave Model v4.2</span>
                <span className="text-outline text-[10px] font-mono">14:15 IST</span>
              </div>
              <div className="bg-surface-container-lowest text-primary px-2 py-1 rounded text-label-sm font-label-sm flex items-center gap-1 shadow-sm border border-surface-container">
                <span className="bg-primary-fixed text-primary font-bold px-1 rounded-xs">2</span>
                <span className="truncate max-w-[150px]">ISRO EOS-06 Scatterometer</span>
              </div>
              <div className="bg-surface-container-lowest text-primary px-2 py-1 rounded text-label-sm font-label-sm flex items-center gap-1 shadow-sm border border-surface-container">
                <span className="bg-primary-fixed text-primary font-bold px-1 rounded-xs">3</span>
                <span className="truncate max-w-[150px]">IMD Severe Bulletin #18</span>
              </div>
            </div>
          </div>

          {/* Quick Action Triggers */}
          <div className="grid grid-cols-2 gap-space-xs pt-space-xs">
            <button className="flex items-center justify-center gap-1.5 bg-secondary-container text-on-secondary-container h-10 px-space-xs rounded-lg font-label-md text-label-md font-semibold hover:opacity-90 active:scale-[0.98] transition-all">
              <span className="material-symbols-outlined text-[18px]">share</span>
              <span className="truncate">Share with Port Officer</span>
            </button>
            <button className="flex items-center justify-center gap-1.5 bg-surface-container-high text-primary h-10 px-space-xs rounded-lg font-label-md text-label-md font-semibold hover:bg-surface-container transition-all">
              <span className="material-symbols-outlined text-[18px]">cloud_download</span>
              <span className="truncate">Save Offline</span>
            </button>
          </div>
        </article>

        {/* Query 2 (User bubble) */}
        <div className="flex flex-col items-end gap-1 pl-space-xl">
          <div className="bg-primary text-on-primary px-space-md py-space-sm rounded-2xl rounded-tr-xs shadow-sm max-w-[92%]">
            <p className="font-body-md text-body-md leading-relaxed">
              What are the high tide timings and wave break risk for Gopalpur beach tomorrow morning?
            </p>
          </div>
          <span className="font-label-sm text-label-sm text-outline px-1 font-mono">
            14:35 IST · Text Query
          </span>
        </div>

        {/* Response 2 (ORCA Beach Hazard Advisory) */}
        <article className="flex flex-col gap-space-sm bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container">
          <div className="flex items-center gap-space-xs">
            <div className="w-6 h-6 rounded bg-primary-container flex items-center justify-center text-on-primary shrink-0">
              <span className="material-symbols-outlined text-[15px] text-secondary-fixed">
                waves
              </span>
            </div>
            <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wide">
              ORCA Beach Hazard Advisory
            </span>
            <span className="font-label-sm text-label-sm text-outline ml-auto font-mono">
              14:35 IST
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface leading-relaxed">
            High tide peak is predicted at <strong>06:14 IST (+1.8m surge)</strong>. Shore breaking wave heights will reach approximately <strong>2.2m</strong>. Low-lying beach landing and net hauling are strictly prohibited between <strong>05:00 and 08:30 IST</strong> due to rip currents.
          </p>
          <div className="flex items-center gap-1.5 pt-1">
            <div className="inline-flex items-center gap-1 bg-surface-container text-primary px-2 py-1 rounded text-label-sm font-label-sm">
              <span className="bg-primary text-on-primary font-bold px-1 rounded-xs text-[10px]">
                1
              </span>
              <span>Survey of India Tidal Predictions · Gopalpur Stn</span>
            </div>
          </div>
        </article>

        {/* Follow-up Suggestion Pills */}
        <div className="flex flex-col gap-1.5 pt-space-xs">
          <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant font-mono">
            Recommended Queries
          </span>
          <div className="flex gap-space-xs overflow-x-auto pb-1 -mx-margin-mobile px-margin-mobile scrollbar-none">
            {[
              "🌊 Swell forecast for next 48h",
              "⚓ Nearest shelter ports from Zone 4",
              "🐟 Potential Fishing Zone (PFZ) advisory",
              "🚨 Report rough sea incident",
            ].map((query, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(query.replace(/^[^\s]+\s/, ""))}
                className="bg-surface-container-high text-primary px-space-sm py-2 rounded-full font-label-sm text-label-sm font-medium whitespace-nowrap shrink-0 shadow-sm hover:bg-surface-container-highest transition-colors"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Sticky Bottom Interactive Query & Microphone Dock */}
      <div className="fixed md:sticky bottom-16 md:bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md px-margin-mobile md:px-margin-desktop py-space-xs flex flex-col gap-1.5 shadow-md border-t border-surface-container">
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-label-sm font-label-sm px-1 font-mono">
            <div className="flex items-center gap-1 text-secondary font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              <span>Satellite Direct-to-Cell Ready</span>
            </div>
            <span className="text-outline font-label-sm">Latency 1.2s via INSAT-4CR</span>
          </div>

          {/* Main Input Bar with Push-to-Talk Mic */}
          <div className="flex items-center gap-space-xs">
            <button
              onClick={() => setIsListening(!isListening)}
              aria-label="Hands-free voice advisory query"
              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all shrink-0 ${
                isListening
                  ? "bg-error text-on-error animate-pulse"
                  : "bg-primary text-on-primary hover:bg-primary-container"
              }`}
              title={isListening ? "Listening..." : "Hold/Click to speak"}
            >
              <span className="material-symbols-outlined text-[26px]">mic</span>
            </button>

            <div className="flex-1 min-w-0 bg-surface-container-lowest rounded-xl h-12 flex items-center px-space-sm shadow-sm border border-surface-container">
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full bg-transparent font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none"
                placeholder="Ask ORCA sea state, tides, cyclone warnings..."
                type="text"
              />
              <button
                aria-label="Send Query"
                className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0 ml-1 hover:bg-primary hover:text-on-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
              </button>
            </div>

            {/* Quick SOS Trigger */}
            <button
              aria-label="Emergency Coastal SOS"
              className="w-12 h-12 rounded-xl bg-error text-on-error flex flex-col items-center justify-center shrink-0 shadow-sm active:scale-95 transition-transform hover:bg-red-700"
              title="Coastal Emergency SOS"
            >
              <span className="material-symbols-outlined text-[20px]">sos</span>
              <span className="text-[9px] font-bold tracking-tighter uppercase -mt-0.5">SOS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
