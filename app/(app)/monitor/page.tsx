"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import RoleWidgetPanel from "@/components/RoleWidgetPanel";

type LayerType = "swell" | "wind" | "sst" | "radar" | "bathy";

export default function MonitorPage() {
  const { role } = useAuth();
  const [activeLayer, setActiveLayer] = useState<LayerType>("swell");
  const [selectedDepth, setSelectedDepth] = useState<string>("0m");
  const [isSheetExpanded, setIsSheetExpanded] = useState<boolean>(true);
  const [isPlayingForecast, setIsPlayingForecast] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showAlertCard, setShowAlertCard] = useState<boolean>(true);
  const [showMobileRolePanel, setShowMobileRolePanel] = useState<boolean>(false);

  return (
    <div className="flex-1 flex flex-col md:flex-row relative w-full h-[calc(100dvh-4rem)] overflow-hidden bg-primary select-none">
      {/* Primary Interactive Ocean Map Viewport */}
      <div className="relative flex-1 h-full overflow-hidden bg-primary" id="mapViewport">
        {/* Basemap Canvas Image with Bathymetry & Current Flow Streamlines */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-500 ease-out origin-center"
          style={{
            backgroundImage: "url('/images/ocean-radar-bg.png')",
            transform: `scale(${zoomLevel})`,
          }}
        >
          {/* Safe Fishermen Navigation Corridor SVG Route Overlay */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            fill="none"
            viewBox="0 0 390 740"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Telemetry Grid Lines */}
            <line
              stroke="#84f4fa"
              strokeDasharray="3 3"
              strokeOpacity="0.12"
              x1="0"
              x2="390"
              y1="210"
              y2="210"
            />
            <line
              stroke="#84f4fa"
              strokeDasharray="3 3"
              strokeOpacity="0.12"
              x1="0"
              x2="390"
              y1="440"
              y2="440"
            />
            <line
              stroke="#84f4fa"
              strokeDasharray="3 3"
              strokeOpacity="0.08"
              x1="140"
              x2="140"
              y1="0"
              y2="740"
            />
            <line
              stroke="#84f4fa"
              strokeDasharray="3 3"
              strokeOpacity="0.08"
              x1="280"
              x2="280"
              y1="0"
              y2="740"
            />

            {/* Safe Corridor Path from deep water to Gopalpur */}
            <path
              d="M 110 580 C 125 490, 160 360, 205 240 C 220 200, 240 170, 260 148"
              opacity="0.85"
              stroke="#66d7dd"
              strokeDasharray="6 4"
              strokeLinecap="round"
              strokeWidth="2.5"
            />

            {/* Moving Safe Corridor Wave Pulse Marker */}
            <circle
              className="animate-ping"
              cx="205"
              cy="240"
              fill="#84f4fa"
              opacity="0.75"
              r="4"
            />
            <circle cx="205" cy="240" fill="#84f4fa" r="3" />

            {/* Additional Vessel Navigation Vector */}
            <path
              d="M 150 380 L 175 320"
              opacity="0.7"
              stroke="#84f4fa"
              strokeDasharray="2 2"
              strokeWidth="1.5"
            />
            <polygon fill="#84f4fa" opacity="0.9" points="175,316 179,325 171,325" />

            {/* Live Radar Sweep Arc */}
            <g className="animate-radar-sweep pointer-events-none opacity-40">
              <path
                d="M 290 180 L 370 120 A 100 100 0 0 0 290 80 Z"
                fill="url(#radarGlow)"
              />
            </g>

            <defs>
              <radialGradient
                cx="290"
                cy="180"
                gradientUnits="userSpaceOnUse"
                id="radarGlow"
                r="100"
              >
                <stop offset="0%" stopColor="#84f4fa" stopOpacity="0" />
                <stop offset="85%" stopColor="#84f4fa" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#84f4fa" stopOpacity="0.5" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        {/* Top Scientific Telemetry Bar & Map Search Overlay */}
        <div className="absolute top-3 inset-x-3 z-30 flex flex-col gap-2 max-w-xl mx-auto md:ml-4">
          {/* SatLink Telemetry Pill */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-full bg-primary/85 backdrop-blur-md shadow-md text-on-primary border border-white/10">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse" />
              <span className="font-label-sm text-label-sm tracking-wider uppercase text-secondary-fixed font-bold font-mono">
                EOS-06 / Oceansat-3
              </span>
              <span className="font-label-sm text-label-sm text-primary-fixed-dim truncate">
                · 19.31° N, 84.91° E
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-label-sm text-label-sm text-secondary-fixed-dim hidden sm:inline">
                Gopalpur Sector
              </span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container-high/20 text-inverse-on-surface font-label-sm text-label-sm font-semibold">
                NavIC LOCKED
              </span>
            </div>
          </div>

          {/* Quick Coastal Sector Search Bar */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-surface-container-lowest/90 backdrop-blur-lg shadow-lg border border-white/20">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-surface-container text-primary shrink-0">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              className="w-full bg-transparent font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none px-1"
              placeholder="Search sector, buoy ID, or landing center..."
              type="text"
              defaultValue="Gopalpur Harbourside (Zone 4)"
            />
            <button
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container text-secondary hover:bg-secondary-container transition-colors"
              title="Locate Vessel"
              onClick={() => setZoomLevel(1.2)}
            >
              <span className="material-symbols-outlined text-[18px]">my_location</span>
            </button>
            <button
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-container text-on-primary-container hover:bg-primary transition-colors"
              title="Switch View"
            >
              <span className="material-symbols-outlined text-[18px]">layers</span>
            </button>
          </div>
        </div>

        {/* Right-Aligned Floating Windy-Style Layer Switchers */}
        <div className="absolute right-3 top-28 z-30 flex flex-col gap-1.5 items-end">
          {/* Swell Layer */}
          <button
            onClick={() => setActiveLayer("swell")}
            className={`layer-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md backdrop-blur-md transition-all active:scale-95 ${
              activeLayer === "swell"
                ? "bg-secondary-container text-on-secondary-container font-semibold"
                : "bg-primary/80 hover:bg-primary text-inverse-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">tsunami</span>
            <span className="font-label-sm text-label-sm">Swell 2.8m</span>
          </button>

          {/* Wind Layer */}
          <button
            onClick={() => setActiveLayer("wind")}
            className={`layer-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md backdrop-blur-md transition-all active:scale-95 ${
              activeLayer === "wind"
                ? "bg-secondary-container text-on-secondary-container font-semibold"
                : "bg-primary/80 hover:bg-primary text-inverse-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-secondary-fixed">air</span>
            <span className="font-label-sm text-label-sm">Wind 18kts</span>
          </button>

          {/* Sea Surface Temperature (SST) Layer */}
          <button
            onClick={() => setActiveLayer("sst")}
            className={`layer-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md backdrop-blur-md transition-all active:scale-95 ${
              activeLayer === "sst"
                ? "bg-secondary-container text-on-secondary-container font-semibold"
                : "bg-primary/80 hover:bg-primary text-inverse-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim">
              thermostat
            </span>
            <span className="font-label-sm text-label-sm">SST 29.4°C</span>
          </button>

          {/* Doppler Radar */}
          <button
            onClick={() => setActiveLayer("radar")}
            className={`layer-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md backdrop-blur-md transition-all active:scale-95 ${
              activeLayer === "radar"
                ? "bg-secondary-container text-on-secondary-container font-semibold"
                : "bg-primary/80 hover:bg-primary text-inverse-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-primary-fixed-dim">
              radar
            </span>
            <span className="font-label-sm text-label-sm">Radar</span>
          </button>

          {/* Bathymetry Layer */}
          <button
            onClick={() => setActiveLayer("bathy")}
            className={`layer-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md backdrop-blur-md transition-all active:scale-95 ${
              activeLayer === "bathy"
                ? "bg-secondary-container text-on-secondary-container font-semibold"
                : "bg-primary/80 hover:bg-primary text-inverse-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-secondary-fixed-dim">
              water
            </span>
            <span className="font-label-sm text-label-sm">Bathymetry</span>
          </button>

          {/* Depth Selector Control Pill */}
          <div className="mt-1 flex flex-col items-center bg-primary/85 backdrop-blur-md rounded-xl p-1 shadow-md text-inverse-on-surface border border-white/10">
            <span className="font-label-sm text-label-sm text-secondary-fixed-dim px-1.5 py-0.5 text-[10px] font-mono font-bold">
              DEPTH
            </span>
            {["0m", "-10m", "-50m"].map((depth) => (
              <button
                key={depth}
                onClick={() => setSelectedDepth(depth)}
                className={`w-8 h-5 rounded font-label-sm text-[11px] font-semibold transition-colors ${
                  selectedDepth === depth
                    ? "bg-secondary text-on-secondary"
                    : "text-surface-variant hover:text-white"
                }`}
              >
                {depth}
              </button>
            ))}
          </div>
        </div>

        {/* Left-Aligned Interactive Zoom & Centering Controls */}
        <div className="absolute left-3 top-28 z-30 flex flex-col gap-2">
          <div className="flex flex-col rounded-xl bg-primary/85 backdrop-blur-md shadow-md border border-white/10 overflow-hidden text-inverse-on-surface">
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 2.0))}
              className="w-9 h-9 flex items-center justify-center hover:bg-white/10 active:bg-secondary active:text-on-secondary transition-colors"
              title="Zoom In"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
            <div className="h-[1px] bg-white/15 w-full" />
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.8))}
              className="w-9 h-9 flex items-center justify-center hover:bg-white/10 active:bg-secondary active:text-on-secondary transition-colors"
              title="Zoom Out"
            >
              <span className="material-symbols-outlined text-[20px]">remove</span>
            </button>
          </div>
          <button
            onClick={() => setZoomLevel(1)}
            className="w-9 h-9 rounded-xl bg-primary/85 backdrop-blur-md shadow-md border border-white/10 flex items-center justify-center text-secondary-fixed hover:bg-white/10 active:scale-95 transition-all"
            title="Reset North Orientation"
          >
            <span className="material-symbols-outlined text-[20px]">explore</span>
          </button>
        </div>

        {/* Map Markers: Crisis Severity Alert Marker (L3 Surge) */}
        <div
          className="absolute top-[170px] left-[225px] z-20 cursor-pointer group"
          id="alertMarker"
          onClick={() => setShowAlertCard(!showAlertCard)}
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute w-12 h-12 rounded-full bg-error/30 animate-ping" />
            <span className="absolute w-8 h-8 rounded-full bg-error/40" />
            <div className="relative w-6 h-6 rounded-full bg-error flex items-center justify-center shadow-lg text-on-error">
              <span className="material-symbols-outlined text-[16px]">priority_high</span>
            </div>
          </div>
          {showAlertCard && (
            <div className="absolute -top-20 -left-28 w-56 p-2 rounded-lg bg-surface-container-lowest/95 backdrop-blur-md shadow-xl text-on-surface pointer-events-auto border border-surface-container">
              <div className="flex items-center justify-between pb-1">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold uppercase">
                  Alert L3: Surge
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  INCOIS-ISRO
                </span>
              </div>
              <p className="font-body-sm text-body-sm leading-tight text-on-surface font-semibold truncate">
                Gopalpur Shoals · 3.2m Breakers
              </p>
              <span className="font-label-sm text-label-sm text-error">
                Extreme surf · Avoid catamarans
              </span>
            </div>
          )}
        </div>

        {/* Map Marker: Calm Active Buoy Marker (INCOIS Buoy BD-12) */}
        <div className="absolute top-[380px] left-[150px] z-20 cursor-pointer" id="buoyMarker">
          <div className="relative flex items-center justify-center">
            <span className="absolute w-8 h-8 rounded-full bg-secondary-fixed/40 animate-ping" />
            <span className="absolute w-6 h-6 rounded-full bg-secondary-fixed/40 animate-pulse" />
            <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center shadow-md border border-white">
              <span className="w-2 h-2 rounded-full bg-on-secondary" />
            </div>
          </div>
          <div className="mt-1 -ml-6 px-2 py-0.5 rounded-full bg-primary/85 backdrop-blur-sm text-inverse-on-surface font-label-sm text-label-sm shadow-md whitespace-nowrap flex items-center gap-1 border border-secondary-fixed/30 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed" />
            <span>Buoy BD-12 · 2.8m</span>
          </div>
        </div>

        {/* Map Marker: Paradip Safe Mooring */}
        <div className="absolute top-[135px] left-[105px] z-20 cursor-pointer">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-lowest/90 backdrop-blur-sm text-primary font-label-sm text-label-sm shadow border border-surface-container">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            <span>Paradip Mooring · Safe</span>
          </div>
        </div>

        {/* Safe Corridor Legend (Floating Left) */}
        <div
          className="absolute left-3 bottom-24 z-20 hidden sm:flex flex-col gap-1 p-2 rounded-lg bg-primary/80 backdrop-blur-md text-inverse-on-surface shadow-md border border-white/10"
          id="mapLegend"
        >
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-secondary-fixed rounded-full" />
            <span className="font-label-sm text-[11px] text-secondary-fixed font-mono">
              Fishermen Safe Corridor
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-error" />
            <span className="font-label-sm text-[11px] text-surface-variant font-mono">
              High Breaker Hazard
            </span>
          </div>
        </div>

        {/* Mobile Persona Telemetry Button */}
        <button
          onClick={() => setShowMobileRolePanel(true)}
          className="lg:hidden absolute left-3 bottom-14 sm:bottom-20 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/90 text-on-primary shadow-lg backdrop-blur-md border border-white/20 text-[11px] font-mono font-bold uppercase hover:bg-primary"
        >
          <span className="material-symbols-outlined text-[16px] text-secondary">
            dashboard_customize
          </span>
          <span>{role} Telemetry</span>
        </button>

        {/* Floating Pull-up / Collapsible Telemetry Drawer Sheet */}
        <div
          className="absolute inset-x-3 bottom-2 z-40 flex flex-col rounded-2xl bg-surface-container-lowest/95 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 ease-in-out border border-white/40 max-w-xl mx-auto md:ml-4"
          id="telemetrySheet"
        >
          {/* Drag Handle & Collapsible Header Toggle */}
          <div
            onClick={() => setIsSheetExpanded(!isSheetExpanded)}
            className="flex flex-col px-4 pt-2.5 pb-2 bg-surface-container-low/80 cursor-pointer hover:bg-surface-container-low transition-colors select-none active:bg-surface-container"
            id="sheetToggleHandle"
          >
            <div className="flex items-center justify-center gap-1 w-full py-0.5 mb-1.5">
              <div className="w-12 h-1.5 rounded-full bg-outline-variant/80 hover:bg-secondary transition-colors" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse shrink-0" />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-headline-sm text-headline-sm text-primary leading-snug truncate font-bold">
                      Buoy BD-12 Telemetry
                    </span>
                    {!isSheetExpanded && (
                      <span className="font-label-sm text-[11px] text-secondary font-semibold bg-secondary-container/50 px-1.5 py-0.2 rounded">
                        2.8m Swell · Optimal
                      </span>
                    )}
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                    Deep Bay of Bengal (Active Stream · 2m ago)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-secondary-container font-label-sm text-label-sm font-semibold tracking-wide uppercase shrink-0">
                  Safe
                </span>
                <button
                  className="w-8 h-8 rounded-full bg-surface-container hover:bg-secondary-container flex items-center justify-center text-primary transition-all ml-1"
                  type="button"
                >
                  <span
                    className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${
                      isSheetExpanded ? "rotate-0" : "rotate-180"
                    }`}
                  >
                    keyboard_arrow_down
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Expandable Body */}
          {isSheetExpanded && (
            <div className="flex flex-col transition-all duration-300 ease-in-out opacity-100 max-h-[500px] overflow-y-auto">
              {/* Linear Metrics Row */}
              <div className="grid grid-cols-4 gap-1 p-3 bg-surface-container-lowest">
                {/* Metric 1: Swell */}
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface-container-low text-center">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Swell
                  </span>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="font-data-metric text-data-metric text-primary font-mono">
                      2.8
                    </span>
                    <span className="font-label-sm text-label-sm text-primary">m</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold font-mono">
                    210° SSW
                  </span>
                </div>

                {/* Metric 2: Wind */}
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface-container-low text-center">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Wind
                  </span>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="font-data-metric text-data-metric text-primary font-mono">
                      18
                    </span>
                    <span className="font-label-sm text-label-sm text-primary">kts</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                    Gust 24
                  </span>
                </div>

                {/* Metric 3: SST */}
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface-container-low text-center">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Sea SST
                  </span>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="font-data-metric text-data-metric text-primary font-mono">
                      29.4
                    </span>
                    <span className="font-label-sm text-label-sm text-primary">°C</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold">
                    Optimal
                  </span>
                </div>

                {/* Metric 4: Tide */}
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface-container-low text-center">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Tide
                  </span>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="font-data-metric text-data-metric text-primary font-mono">
                      +0.4
                    </span>
                    <span className="font-label-sm text-label-sm text-primary">m</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold font-mono">
                    Rising ↗
                  </span>
                </div>
              </div>

              {/* Windy-Style 24h Ocean Scrubber Slider */}
              <div className="flex flex-col px-3 py-2 bg-surface-container-low/50 border-t border-surface-container/60">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsPlayingForecast(!isPlayingForecast)}
                      className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isPlayingForecast ? "pause" : "play_arrow"}
                      </span>
                    </button>
                    <span className="font-label-sm text-label-sm font-semibold text-primary">
                      24h Swell Prediction
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                    Now (14:30 IST)
                  </span>
                </div>
                <div className="relative w-full flex items-center h-5">
                  <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden relative">
                    <div
                      className={`h-full bg-secondary rounded-full transition-all duration-300 ${
                        isPlayingForecast ? "w-3/4" : "w-1/4"
                      }`}
                    />
                  </div>
                  <div
                    className={`absolute -ml-2 w-4 h-4 rounded-full bg-surface-container-lowest shadow-md flex items-center justify-center cursor-pointer transition-all duration-300 ${
                      isPlayingForecast ? "left-3/4" : "left-1/4"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                  </div>
                </div>
                <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mt-0.5 font-mono">
                  <span className="text-primary font-bold">Now</span>
                  <span>+6h</span>
                  <span>+12h</span>
                  <span>+18h</span>
                  <span>+24h (Tomorrow)</span>
                </div>
              </div>

              {/* Action Triggers: AI Advisory + SOS Broadcast */}
              <div className="flex items-center gap-2 p-3 bg-surface-container-lowest border-t border-surface-container/60">
                <Link
                  href="/chat"
                  className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-on-primary font-headline-sm text-headline-sm hover:bg-primary-container active:scale-[0.98] transition-all shadow-md"
                >
                  <span className="material-symbols-outlined text-[20px] text-secondary-fixed">
                    auto_awesome
                  </span>
                  <span className="font-body-md text-body-md font-semibold">
                    Ask ORCA Advisory
                  </span>
                </Link>
                <Link
                  href="/alerts"
                  className="flex items-center justify-center gap-1.5 px-4 h-11 rounded-xl bg-tertiary-container text-on-tertiary font-body-md text-body-md font-semibold hover:bg-tertiary active:scale-[0.98] transition-all shadow-md"
                  title="Broadcast Coast Guard Mayday"
                >
                  <span className="material-symbols-outlined text-[20px] animate-pulse">sos</span>
                  <span>SOS</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clear Layout Space on Desktop Alongside Map for Role-Aware Widgets */}
      <aside className="hidden lg:flex flex-col w-96 bg-surface-container-lowest border-l border-surface-container p-4 overflow-y-auto z-20">
        <RoleWidgetPanel role={role} />
      </aside>

      {/* Mobile Drawer for Role Telemetry */}
      {showMobileRolePanel && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-t-2xl max-h-[80vh] overflow-y-auto p-4 border-t border-surface-container shadow-2xl">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="font-label-sm text-label-sm text-primary font-mono font-bold uppercase">
                  {role} Telemetry Panel
                </span>
              </div>
              <button
                onClick={() => setShowMobileRolePanel(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <RoleWidgetPanel role={role} />
          </div>
        </div>
      )}
    </div>
  );
}
