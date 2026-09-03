"use client";

import Link from "next/link";
import { UserRole } from "@/contexts/AuthContext";

interface RoleWidgetPanelProps {
  role: UserRole;
}

export default function RoleWidgetPanel({ role }: RoleWidgetPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Role Title & Badge Header */}
      <div className="flex items-center justify-between pb-3 border-b border-surface-container">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[22px]">
            {role === "fisherman" && "sailing"}
            {role === "researcher" && "query_stats"}
            {role === "authority" && "shield"}
            {role === "tourist" && "beach_access"}
            {role === "operator" && "directions_boat"}
          </span>
          <div className="flex flex-col">
            <h2 className="font-headline-sm text-headline-sm text-primary font-bold capitalize">
              {role === "fisherman" && "Fisherman Telemetry"}
              {role === "researcher" && "Ocean Data Explorer"}
              {role === "authority" && "Disaster Ops Command"}
              {role === "tourist" && "Beach Safety Guide"}
              {role === "operator" && "Transit Route Monitor"}
            </h2>
            <span className="text-[11px] text-on-surface-variant font-mono">
              Live Mission Conditioning
            </span>
          </div>
        </div>
        <span className="font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-mono font-bold uppercase">
          {role}
        </span>
      </div>

      {/* 1. FISHERMAN PANEL */}
      {role === "fisherman" && (
        <div className="flex flex-col gap-3.5">
          {/* Safety Verdict Card */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm font-bold text-emerald-900 uppercase tracking-wider font-mono">
                SAIL ADVISORY: CAUTION
              </span>
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">
                verified
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-emerald-950 font-semibold mt-1">
              Inshore (&lt; 5 NM) operations allowed until 20:00 IST.
            </p>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              Deep sea trawlers must return before squall surge at 22:00.
            </p>
          </div>

          {/* Potential Fishing Zone (PFZ) Card */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono">
                Active PFZ Coordinate
              </span>
              <span className="material-symbols-outlined text-secondary text-[18px]">
                set_meal
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-primary font-bold mt-1">
              Sector 4B · Chlorophyll Boundary
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-surface-container font-mono text-[11px]">
              <div>
                <span className="text-on-surface-variant block">Target</span>
                <span className="font-semibold text-on-surface">Tuna & Mackerel</span>
              </div>
              <div>
                <span className="text-on-surface-variant block">Distance</span>
                <span className="font-semibold text-secondary">18 NM East</span>
              </div>
            </div>
          </div>

          {/* Pre-Departure Checklist */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono">
                Pre-Departure Checklist
              </span>
              <span className="material-symbols-outlined text-secondary text-[18px]">
                checklist
              </span>
            </div>
            <ul className="mt-2 space-y-1.5 text-[12px] text-on-surface">
              <li className="flex items-center gap-1.5 text-emerald-700">
                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                <span>NavIC Transponder Online</span>
              </li>
              <li className="flex items-center gap-1.5 text-emerald-700">
                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                <span>Distress Beacon Arming Verified</span>
              </li>
              <li className="flex items-center gap-1.5 text-amber-800">
                <span className="material-symbols-outlined text-[15px]">warning</span>
                <span>Harbor Return Mandate: 22:00 IST</span>
              </li>
            </ul>
          </div>

          {/* 3-Day Forecast Strip */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono block mb-2">
              3-Day Wave Outlook
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
              <div className="p-2 rounded-lg bg-surface-container-lowest border border-surface-container">
                <span className="text-[10px] text-on-surface-variant block">Today</span>
                <span className="text-[13px] font-bold text-primary block">2.8m</span>
                <span className="text-[10px] text-amber-700 font-semibold">Squall</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-container-lowest border border-surface-container">
                <span className="text-[10px] text-on-surface-variant block">Tomorrow</span>
                <span className="text-[13px] font-bold text-error block">4.2m</span>
                <span className="text-[10px] text-error font-semibold">Gale</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-container-lowest border border-surface-container">
                <span className="text-[10px] text-on-surface-variant block">Day +2</span>
                <span className="text-[13px] font-bold text-secondary block">1.9m</span>
                <span className="text-[10px] text-secondary font-semibold">Calming</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. RESEARCHER PANEL */}
      {role === "researcher" && (
        <div className="flex flex-col gap-3.5">
          {/* Dataset & Sensor Selector */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono">
                Satellite Sensor Feed
              </span>
              <span className="material-symbols-outlined text-secondary text-[18px]">
                satellite_alt
              </span>
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="p-2 rounded-lg bg-surface-container-lowest flex items-center justify-between border border-surface-container text-[12px]">
                <span className="font-semibold text-primary">EOS-06 Scatterometer</span>
                <span className="text-secondary font-mono">25km Grid · 4m ago</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-container-lowest flex items-center justify-between border border-surface-container text-[12px]">
                <span className="font-semibold text-primary">Oceansat-3 OCM-3</span>
                <span className="text-secondary font-mono">Chlorophyll-a</span>
              </div>
            </div>
          </div>

          {/* Time Series Trend Summary */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono">
                30-Day Oceanographic Trends
              </span>
              <span className="text-[11px] text-secondary font-mono">Bay of Bengal</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container">
                <span className="text-[11px] text-on-surface-variant block">Mean SST</span>
                <span className="font-data-metric text-[18px] text-primary font-mono block mt-0.5">
                  29.4°C
                </span>
                <span className="text-[10px] text-tertiary font-semibold flex items-center gap-0.5 font-mono">
                  +1.2°C anomaly
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container">
                <span className="text-[11px] text-on-surface-variant block">Mean Chl-a</span>
                <span className="font-data-metric text-[18px] text-secondary font-mono block mt-0.5">
                  0.48 mg/m³
                </span>
                <span className="text-[10px] text-secondary font-semibold font-mono">
                  Nutrient Bloom
                </span>
              </div>
            </div>

            {/* Micro Sparkline Preview */}
            <div className="mt-2.5 pt-2 border-t border-surface-container">
              <span className="text-[10px] text-on-surface-variant uppercase font-mono block mb-1">
                SST Anomaly Curve (0°N - 22°N)
              </span>
              <div className="h-9 w-full bg-surface-container-lowest rounded p-1 flex items-end">
                <svg className="w-full h-7 text-secondary" fill="none" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0,15 C20,12 35,18 50,6 C65,10 80,4 100,2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M0,15 C20,12 35,18 50,6 C65,10 80,4 100,2 L100,20 L0,20 Z" fill="currentColor" fillOpacity="0.1" />
                </svg>
              </div>
            </div>
          </div>

          {/* Export Action Card */}
          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container flex flex-col gap-2">
            <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono">
              Data Package Export
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-[12px] font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">table_chart</span>
                <span>CSV Stream</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-[12px] font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">public</span>
                <span>GeoJSON Layer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. COASTAL AUTHORITY PANEL */}
      {role === "authority" && (
        <div className="flex flex-col gap-3.5">
          {/* Active Disaster Overview */}
          <div className="p-3.5 rounded-xl bg-error-container/50 border border-error/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-error font-bold font-mono text-[12px]">
                <span className="w-2 h-2 rounded-full bg-error animate-ping" />
                <span>ACTIVE CRISIS DISPATCH</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-error text-on-error font-mono text-[10px] font-bold uppercase">
                RED ALERT
              </span>
            </div>
            <p className="font-body-sm text-body-sm font-bold text-on-error-container mt-1">
              Cyclone VARUN — CAT-3 Escalation
            </p>
            <p className="text-[11px] text-on-error-container mt-0.5">
              Landfall Gopalpur Sector in ~18h. Great Danger Signal 10 hoisted.
            </p>
          </div>

          {/* Population Exposure Matrix */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono block mb-2">
              Zone Exposure & Population
            </span>
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest border border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-error" />
                  <span className="font-semibold text-primary">Zone A (Direct Impact)</span>
                </div>
                <span className="font-mono font-bold text-error">184,000 res</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest border border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="font-semibold text-primary">Zone B (Squall Zone)</span>
                </div>
                <span className="font-mono font-bold text-amber-800">420,000 res</span>
              </div>
            </div>
          </div>

          {/* Emergency Shelter Readiness */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono">
                Cyclone Shelters Active
              </span>
              <span className="text-secondary font-mono font-bold text-[12px]">28 / 28 Ready</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
              <div className="h-full bg-secondary w-full" />
            </div>
            <p className="text-[11px] text-on-surface-variant mt-1.5">
              Diesel generators & satellite terminals pre-staged across Ganjam & Puri districts.
            </p>
          </div>

          {/* Situation Report Action */}
          <Link
            href="/alerts"
            className="w-full py-2.5 px-4 rounded-xl bg-primary text-on-primary font-semibold text-[13px] flex items-center justify-center gap-2 shadow-md hover:bg-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">summarize</span>
            <span>Generate Situation Report</span>
          </Link>
        </div>
      )}

      {/* 4. TOURIST PANEL */}
      {role === "tourist" && (
        <div className="flex flex-col gap-3.5">
          {/* Plain Language Safety Header */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold font-mono text-[12px]">
              <span className="material-symbols-outlined text-[18px] text-amber-700">info</span>
              <span>BEACH WEATHER ADVISORY</span>
            </div>
            <p className="font-body-sm text-body-sm font-bold text-amber-950 mt-1">
              Rough Surf Warning in southern coastal belt.
            </p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Water sports, beach swimming, and boat rides suspended after 14:00 IST.
            </p>
          </div>

          {/* Nearby Beaches List */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono block mb-2">
              Nearby Coastal Beaches
            </span>
            <div className="space-y-2">
              {/* Puri */}
              <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container flex items-center justify-between">
                <div>
                  <span className="font-semibold text-primary text-[13px] block">Puri Golden Beach</span>
                  <span className="text-[11px] text-on-surface-variant">Promenade open · No swimming</span>
                </div>
                <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-amber-100 text-amber-900">
                  CAUTION
                </span>
              </div>
              {/* Gopalpur */}
              <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container flex items-center justify-between">
                <div>
                  <span className="font-semibold text-primary text-[13px] block">Gopalpur Beach</span>
                  <span className="text-[11px] text-error font-medium">3.2m breakers · Coast barred</span>
                </div>
                <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-error text-on-error">
                  CLOSED
                </span>
              </div>
              {/* Chandrabhaga */}
              <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container flex items-center justify-between">
                <div>
                  <span className="font-semibold text-primary text-[13px] block">Chandrabhaga Beach</span>
                  <span className="text-[11px] text-on-surface-variant">Moderate swell · Lifeguards on duty</span>
                </div>
                <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-emerald-100 text-emerald-900">
                  SAFE WALK
                </span>
              </div>
            </div>
          </div>

          {/* Do's & Don'ts */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono block mb-1.5">
              Visitor Do&apos;s & Don&apos;ts
            </span>
            <ul className="space-y-1 text-[12px] text-on-surface">
              <li className="flex items-start gap-1.5">
                <span className="material-symbols-outlined text-emerald-600 text-[15px] shrink-0 mt-0.5">check</span>
                <span>Stay on paved promenades and heed coast guard siren warnings.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="material-symbols-outlined text-error text-[15px] shrink-0 mt-0.5">close</span>
                <span>Do not step into rip currents or onto wet breakwater boulders.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* 5. MARITIME OPERATOR PANEL */}
      {role === "operator" && (
        <div className="flex flex-col gap-3.5">
          {/* Route Safety Score */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono">
                Voyage Safety Score
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono text-[11px] font-bold">
                SCORE 68 / 100
              </span>
            </div>
            <p className="text-[13px] font-semibold text-primary">
              Route: Paradip Port ➔ Visakhapatnam Outer
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Transit Corridor #3 · Total Distance: 240 NM
            </p>
            <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden mt-2">
              <div className="h-full bg-amber-500 w-[68%]" />
            </div>
          </div>

          {/* Hazards Along Route */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono block mb-2">
              Waypoints & Hazard Intersections
            </span>
            <div className="space-y-2 text-[12px]">
              <div className="p-2 rounded-lg bg-surface-container-lowest border border-surface-container flex items-center justify-between">
                <div>
                  <span className="font-semibold text-primary block">WP-02 (Gopalpur Shoals)</span>
                  <span className="text-[11px] text-error">Cross-swell 3.2m · Squalls</span>
                </div>
                <span className="text-error font-mono font-bold">HIGH RISK</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-container-lowest border border-surface-container flex items-center justify-between">
                <div>
                  <span className="font-semibold text-primary block">WP-04 (Kalingapatnam Off)</span>
                  <span className="text-[11px] text-on-surface-variant">Swell 2.1m · Clear channel</span>
                </div>
                <span className="text-emerald-700 font-mono font-bold">CLEAR</span>
              </div>
            </div>
          </div>

          {/* Port Berthing Status */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono block mb-1.5">
              Port Directives
            </span>
            <div className="text-[12px] space-y-1">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Paradip Port:</span>
                <span className="font-bold text-error font-mono">Signal X Hoisted</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Berthing Queue Delay:</span>
                <span className="font-bold text-primary font-mono">+14 hrs ETA</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
