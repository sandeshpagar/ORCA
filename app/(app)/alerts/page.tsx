"use client";

import { useState } from "react";

export default function AlertsPage() {
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [broadcastCount, setBroadcastCount] = useState<number>(84);
  const [isProtocolDownloaded, setIsProtocolDownloaded] = useState<boolean>(false);

  const handleBroadcast = () => {
    setIsTransmitting(true);
    setTimeout(() => {
      setIsTransmitting(false);
      setBroadcastCount((prev) => prev + 1);
    }, 1200);
  };

  const handleDownloadProtocol = () => {
    setIsProtocolDownloaded(true);
    setTimeout(() => {
      setIsProtocolDownloaded(false);
    }, 2500);
  };

  return (
    <div className="flex-1 flex flex-col relative w-full bg-surface min-h-[calc(100dvh-4rem)]">
      <div className="flex flex-col w-full max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop pt-space-xs pb-space-2xl space-y-space-md">
        {/* Operational Satellite Bar */}
        <div className="flex flex-col bg-surface-container-low rounded-xl p-space-sm space-y-space-xs shadow-sm border border-surface-container">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-2xs min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-error animate-ping" />
              <span className="font-label-sm text-label-sm text-on-surface truncate font-mono">
                INSAT-3DR Rapid Scan · IMD CWD
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-error font-semibold bg-error-container/60 px-space-xs py-0.5 rounded font-mono">
              BULLETIN #07 (14:40 IST)
            </span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 min-w-0 text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-secondary">explore</span>
              <span className="font-body-sm text-body-sm font-semibold truncate text-on-surface">
                Bay of Bengal · Odisha & N. Andhra (Sector-4)
              </span>
            </div>
            <button
              aria-label="Change sector"
              className="flex items-center gap-0.5 bg-surface-container text-primary px-space-xs py-1 rounded text-label-sm font-label-sm active:scale-95 transition-transform hover:bg-surface-container-high"
            >
              <span>SWITCH</span>
              <span className="material-symbols-outlined text-[14px]">tune</span>
            </button>
          </div>
        </div>

        {/* Live Emergency Broadcast Alert Ticker */}
        <div className="bg-tertiary-container text-on-tertiary rounded-xl p-space-sm shadow-md flex items-start gap-space-sm relative overflow-hidden">
          <div className="p-2 bg-on-tertiary-container/30 rounded-lg shrink-0">
            <span className="material-symbols-outlined text-tertiary-fixed text-[24px]">
              campaign
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="inline-block px-1.5 py-0.5 rounded bg-error text-on-error font-label-sm text-label-sm font-bold tracking-wider uppercase font-mono">
                RED ALERT
              </span>
              <span className="font-label-sm text-label-sm text-tertiary-fixed-dim font-mono">
                SAT-PRIORITY #01
              </span>
            </div>
            <p className="font-body-md text-body-md font-semibold text-on-tertiary leading-snug">
              Severe Cyclonic Storm “VARUN” intensifying — Landfall expected near Gopalpur within 18h.
            </p>
            <div className="flex items-center gap-2 mt-2 font-label-sm text-label-sm text-tertiary-fixed">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed" />
                NaVIC Auto-Relay
              </span>
              <span>•</span>
              <span>IMD Specialized Warning</span>
            </div>
          </div>
        </div>

        {/* Cyclone Telemetry Hero Card */}
        <div className="bg-surface-container-lowest rounded-xl shadow-md overflow-hidden flex flex-col border border-surface-container">
          {/* Header banner with Severity indicator stripe */}
          <div className="flex items-center justify-between p-space-sm bg-surface-container-low border-b border-surface-container">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-3 h-8 rounded-full bg-error shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold font-mono">
                  Cyclone Warning Division · ISRO AI Telemetry
                </span>
                <h2 className="font-headline-md text-headline-md text-primary font-bold truncate">
                  Cyclone “VARUN”
                </h2>
              </div>
            </div>
            <div className="bg-error-container text-on-error-container px-space-xs py-1 rounded font-label-sm text-label-sm font-bold tracking-wider shrink-0 text-center font-mono">
              CAT-3 ESCALATION
            </div>
          </div>

          {/* Interactive Track Visualization / Radar Canvas */}
          <div className="relative w-full h-56 bg-primary overflow-hidden">
            <svg className="absolute inset-0 w-full h-full opacity-35" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient cx="65%" cy="45%" id="cycloneRadarGlow" r="60%">
                  <stop offset="0%" stopColor="#84f4fa" stopOpacity="0.6" />
                  <stop offset="60%" stopColor="#0b3d62" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#002743" stopOpacity="0.1" />
                </radialGradient>
              </defs>
              <rect fill="url(#cycloneRadarGlow)" height="100%" width="100%" />
              {/* Radar Grid Rings */}
              <circle
                cx="65%"
                cy="45%"
                fill="none"
                r="40"
                stroke="#84f4fa"
                strokeDasharray="2 2"
                strokeWidth="0.7"
              />
              <circle
                cx="65%"
                cy="45%"
                fill="none"
                r="80"
                stroke="#84f4fa"
                strokeDasharray="4 3"
                strokeWidth="0.7"
              />
              <circle
                cx="65%"
                cy="45%"
                fill="none"
                r="120"
                stroke="#84f4fa"
                strokeWidth="0.7"
              />
              {/* Crosshairs */}
              <line
                stroke="#84f4fa"
                strokeOpacity="0.4"
                strokeWidth="0.5"
                x1="0"
                x2="100%"
                y1="45%"
                y2="45%"
              />
              <line
                stroke="#84f4fa"
                strokeOpacity="0.4"
                strokeWidth="0.5"
                x1="65%"
                x2="65%"
                y1="0"
                y2="100%"
              />
              {/* Coastline Silhouette Vector */}
              <path
                d="M-10,20 Q40,60 70,110 T110,190 T140,240"
                fill="none"
                stroke="#dce9ff"
                strokeLinecap="round"
                strokeWidth="2.5"
              />
              {/* Projected Cone of Uncertainty */}
              <path d="M240,105 L115,140 L160,190 Z" fill="#ff7f62" fillOpacity="0.25" />
              {/* Track Trajectory */}
              <path
                d="M270,95 Q210,120 120,150"
                fill="none"
                stroke="#ffdad6"
                strokeDasharray="3 3"
                strokeWidth="2"
              />
            </svg>

            {/* Overlay Cyclone Vortex Marker */}
            <div className="absolute right-[30%] top-[40%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <span className="w-16 h-16 rounded-full bg-error/20 animate-ping absolute" />
              <span className="w-10 h-10 rounded-full bg-tertiary-container/60 animate-pulse absolute" />
              <div className="w-7 h-7 rounded-full bg-error text-on-error flex items-center justify-center shadow-lg z-10">
                <span className="material-symbols-outlined text-[16px] animate-spin">cyclone</span>
              </div>
            </div>

            {/* Landfall Point Marker */}
            <div className="absolute left-[30%] top-[60%] flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-secondary-fixed shadow-[0_0_8px_#84f4fa]" />
              <div className="bg-primary/90 text-on-primary text-label-sm font-label-sm px-1.5 py-0.5 rounded shadow mt-1 whitespace-nowrap font-mono">
                Gopalpur Harbor
              </div>
            </div>

            {/* Floating Radar Metadata Tag */}
            <div className="absolute top-2 left-2 bg-primary-container/85 text-on-primary-container px-2 py-1 rounded backdrop-blur-md flex items-center gap-1.5 font-label-sm text-label-sm shadow font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed animate-pulse" />
              <span>INSAT-3DR VIS-IR CONE OVERLAY</span>
            </div>

            {/* Landfall Timing Ribbon */}
            <div className="absolute bottom-2 inset-x-2 bg-surface-container-lowest/95 rounded-lg p-space-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-tertiary text-[18px]">alarm</span>
                <span className="font-body-sm text-body-sm font-semibold text-primary">
                  Landfall ETA Window
                </span>
              </div>
              <span className="font-data-metric text-label-md font-semibold text-error font-mono">
                Tomorrow 08:30 IST ± 2h
              </span>
            </div>
          </div>

          {/* Real-Time Satellite Telemetry Metrics (Linear Data Strip) */}
          <div className="p-space-sm grid grid-cols-2 gap-space-xs">
            <div className="bg-surface-container-low p-space-xs rounded-lg flex flex-col border border-surface-container">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="font-label-sm text-label-sm font-mono">MAX SUSTAINED WIND</span>
                <span className="material-symbols-outlined text-[16px] text-secondary">air</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-data-metric text-data-metric text-primary font-semibold font-mono">
                  110-120
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  km/h
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-error font-medium font-mono">
                Gusts up to 135 km/h
              </span>
            </div>

            <div className="bg-surface-container-low p-space-xs rounded-lg flex flex-col border border-surface-container">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="font-label-sm text-label-sm font-mono">STORM SURGE PEAK</span>
                <span className="material-symbols-outlined text-[16px] text-secondary">tsunami</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-data-metric text-data-metric text-primary font-semibold font-mono">
                  +3.5 to 4.2
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  m
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-error font-medium font-mono">
                Inundation tide risk
              </span>
            </div>

            <div className="bg-surface-container-low p-space-xs rounded-lg flex flex-col border border-surface-container">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="font-label-sm text-label-sm font-mono">CENTRAL PRESSURE</span>
                <span className="material-symbols-outlined text-[16px] text-secondary">speed</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-data-metric text-data-metric text-primary font-semibold font-mono">
                  982
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  hPa
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-tertiary-container font-medium font-mono">
                ↓ 4 hPa / 3 hrs (Deepening)
              </span>
            </div>

            <div className="bg-surface-container-low p-space-xs rounded-lg flex flex-col border border-surface-container">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="font-label-sm text-label-sm font-mono">VORTEX VECTOR & EYE</span>
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  navigation
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-data-metric text-data-metric text-primary font-semibold font-mono">
                  14 km/h
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  NNW
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface font-medium font-mono">
                145 km SE of Gopalpur
              </span>
            </div>
          </div>
        </div>

        {/* Official Port Danger Signal & Marine Warnings */}
        <div className="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm space-y-space-sm border border-surface-container">
          <div className="flex items-center gap-space-xs pb-1">
            <span className="material-symbols-outlined text-primary text-[20px]">flag</span>
            <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
              Official Maritime Directives
            </h3>
          </div>

          {/* Great Danger Signal Card */}
          <div className="bg-surface-container-high rounded-lg p-space-sm flex items-start gap-space-sm border border-surface-container">
            <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center font-data-metric text-data-metric font-bold shrink-0 font-mono">
              X
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-label-sm text-label-sm font-semibold uppercase text-error tracking-wide font-mono">
                Great Danger Signal No. 10 (Ten)
              </span>
              <p className="font-body-sm text-body-sm text-on-surface mt-0.5 font-medium">
                Hoisted at <strong className="text-primary">Paradip & Gopalpur Ports</strong>. Severe hurricane weather expected.
              </p>
              <div className="mt-1.5 bg-surface-container-lowest/80 rounded px-2 py-1 text-label-sm font-label-sm text-on-surface-variant font-mono">
                Dhamra Port: Signal No. VIII (Eight) Hoisted
              </div>
            </div>
          </div>

          {/* Fishermen Total Suspension Warning Box */}
          <div className="bg-error-container text-on-error-container p-space-sm rounded-lg flex items-start gap-space-sm border border-error/20">
            <span className="material-symbols-outlined text-error text-[24px] shrink-0 mt-0.5">
              arrow_left
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-error font-mono">
                  TOTAL BAN ON FISHING
                </span>
                <span className="material-symbols-outlined text-[16px] text-error">priority_high</span>
              </div>
              <p className="font-body-sm text-body-sm mt-1 leading-relaxed font-medium">
                Total suspension of all deep-sea and inshore fishing. Small crafts, trawlers, and beach catamarans must be hauled above the high-tide line immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Tri-Tier Coastal Sector Severity Matrix */}
        <div className="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm space-y-space-sm border border-surface-container">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">layers</span>
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
                Sector Impact Matrix
              </h3>
            </div>
            <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold font-mono">
              3 Coastal Zones
            </span>
          </div>

          <div className="space-y-space-xs">
            {/* Zone A */}
            <div className="bg-surface-container-low rounded-lg p-space-sm relative overflow-hidden border border-surface-container">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-error" />
              <div className="flex items-center justify-between mb-1 pl-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-label-sm text-label-sm font-bold text-primary font-mono">
                    ZONE A · DIRECT IMPACT
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                    (&lt; 20 km)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-error text-on-error font-semibold font-mono">
                  RED HAZARD
                </span>
              </div>
              <p className="font-body-sm text-body-sm font-semibold text-on-surface pl-1">
                Ganjam & Puri Coastal Belt
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 pl-1 leading-relaxed">
                Mandatory evacuation ordered for thatch & low-lying dwellings. 28 multi-purpose cyclone shelters active with generator backups.
              </p>
            </div>

            {/* Zone B */}
            <div className="bg-surface-container-low rounded-lg p-space-sm relative overflow-hidden border border-surface-container">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-tertiary-container" />
              <div className="flex items-center justify-between mb-1 pl-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-label-sm text-label-sm font-bold text-primary font-mono">
                    ZONE B · GALE WINDS & RAIN
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                    (20–80 km)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-tertiary-fixed text-on-tertiary-fixed font-semibold font-mono">
                  AMBER ADVISORY
                </span>
              </div>
              <p className="font-body-sm text-body-sm font-semibold text-on-surface pl-1">
                Jagatsinghpur, Khordha, Cuttack Outer
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 pl-1 leading-relaxed">
                Suspension of Chilika lake ferries. Standby power teams deployed; road clearances pre-staged along NH-16.
              </p>
            </div>

            {/* Zone C */}
            <div className="bg-surface-container-low rounded-lg p-space-sm relative overflow-hidden border border-surface-container">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-secondary" />
              <div className="flex items-center justify-between mb-1 pl-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-label-sm text-label-sm font-bold text-primary font-mono">
                    ZONE C · HIGH SWELL WATCH
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                    (&gt; 80 km)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-secondary-container text-on-secondary-container font-semibold font-mono">
                  YELLOW WATCH
                </span>
              </div>
              <p className="font-body-sm text-body-sm font-semibold text-on-surface pl-1">
                North Odisha, Balasore & Bhadrak
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 pl-1 leading-relaxed">
                Rough sea conditions. General public access to beaches and promenades strictly barred till bulletin clear.
              </p>
            </div>
          </div>
        </div>

        {/* Direct Institutional Relief & Safety Action Hub */}
        <div className="space-y-space-xs">
          {/* Action 1: Nearest Shelter */}
          <div className="w-full bg-primary text-on-primary rounded-xl p-space-sm flex items-center justify-between shadow-md cursor-pointer hover:bg-primary-container transition-colors">
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-lg bg-surface-container/20 flex items-center justify-center text-secondary-fixed">
                <span className="material-symbols-outlined text-[24px]">holiday_village</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="font-headline-sm text-headline-sm font-semibold text-on-primary">
                  Nearest Cyclone Shelter
                </span>
                <span className="font-label-sm text-label-sm text-secondary-fixed font-mono">
                  Gopalpur High School MCS · 0.8 km · 140 beds
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </div>

          {/* Action 2: Emergency Protocol Download */}
          <button
            onClick={handleDownloadProtocol}
            className="w-full bg-surface-container text-primary rounded-xl p-space-sm flex items-center justify-between shadow-sm hover:bg-surface-variant transition-colors"
            id="btn-protocol"
          >
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px] text-primary">
                  cloud_download
                </span>
              </div>
              <div className="flex flex-col text-left">
                <span className="font-body-md text-body-md font-semibold text-primary">
                  Emergency Audio/PDF Protocol
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Odia, Telugu & Hindi (Offline Ready)
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[20px] text-primary">
              {isProtocolDownloaded ? "check_circle" : "download"}
            </span>
          </button>

          {/* Action 3: Satellite NaVIC Push Broadcast */}
          <div className="bg-surface-container-low rounded-xl p-space-sm flex items-center justify-between shadow-sm border border-surface-container">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-[22px]">
                satellite_alt
              </span>
              <div className="flex flex-col">
                <span className="font-body-sm text-body-sm font-semibold text-on-surface">
                  Vessel NavIC Transponder Ping
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  Last pinged {broadcastCount} craft in 50km radius
                </span>
              </div>
            </div>
            <button
              onClick={handleBroadcast}
              disabled={isTransmitting}
              className="bg-secondary text-on-secondary px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-semibold active:opacity-90 shadow-sm hover:opacity-90 transition-opacity font-mono"
              id="btn-navic-ping"
            >
              {isTransmitting ? "TRANSMITTING..." : "BROADCAST"}
            </button>
          </div>
        </div>

        {/* Trust Seals & Institutional Provenance Footer */}
        <div className="pt-space-xs pb-space-sm flex flex-col items-center justify-center text-center space-y-1">
          <div className="flex items-center justify-center gap-space-md text-on-surface-variant opacity-80 font-mono">
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              ISRO
            </span>
            <span>•</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              IMD
            </span>
            <span>•</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              INCOIS
            </span>
            <span>•</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              NDMA
            </span>
          </div>
          <p className="font-label-sm text-label-sm text-on-surface-variant font-mono">
            NavIC Geospatial Marine Safety Grid v4.2 · Standard Disaster Advisory
          </p>
        </div>

        {/* Sticky Marine SOS Distress Trigger Pill */}
        <div className="fixed bottom-20 left-margin-mobile right-margin-mobile max-w-md mx-auto z-40">
          <div className="bg-error text-on-error rounded-full p-2 pl-4 pr-3 shadow-xl flex items-center justify-between border-none">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-white animate-ping" />
              <span className="font-headline-sm text-headline-sm font-bold tracking-tight">
                SOS · Coastal Coast Guard
              </span>
            </div>
            <a
              className="bg-white text-error font-headline-sm text-headline-sm px-4 py-1.5 rounded-full font-bold shadow active:scale-95 transition-transform flex items-center gap-1 hover:bg-gray-100"
              href="tel:1554"
            >
              <span className="material-symbols-outlined text-[18px]">call</span>
              <span>1554</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
