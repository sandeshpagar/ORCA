"use client";

import Link from "next/link";
import { UserRole, useAuth } from "@/contexts/AuthContext";

interface RoleWidgetPanelProps {
  role: UserRole;
}

export default function RoleWidgetPanel({ role }: RoleWidgetPanelProps) {
  const { touristActivities } = useAuth();

  return (
    <div className="flex flex-col gap-4">
      {/* Role Title & Badge Header */}
      <div className="flex items-center justify-between pb-3 border-b border-surface-container">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[22px]">
            {role === "tourist" && "beach_access"}
            {role === "fisher" && "sailing"}
            {role === "authority" && "shield"}
            {role === "researcher" && "query_stats"}
            {role === "disaster_management" && "emergency"}
            {role === "general" && "public"}
          </span>
          <div className="flex flex-col">
            <h2 className="font-headline-sm text-headline-sm text-primary font-bold capitalize">
              {role === "tourist" && "Beach Safety Guide"}
              {role === "fisher" && "Fisher Telemetry"}
              {role === "authority" && "Coastal Command"}
              {role === "researcher" && "Ocean Data Explorer"}
              {role === "disaster_management" && "Crisis Ops Grid"}
              {role === "general" && "Coastal Awareness"}
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

      {/* 1. TOURIST PANEL */}
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
              Water sports and swimming restricted to calm bays after 14:00 IST.
            </p>
          </div>

          {/* User's Selected Activities */}
          {touristActivities.length > 0 && (
            <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
              <span className="font-label-sm text-[11px] font-bold text-primary uppercase tracking-wider font-mono block mb-1.5">
                Your Preferred Activities
              </span>
              <div className="flex flex-wrap gap-1.5">
                {touristActivities.map((act) => (
                  <span
                    key={act}
                    className="px-2.5 py-1 rounded-lg bg-surface-container text-primary text-[11px] font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px] text-secondary">
                      {act === "beach_visit" && "beach_access"}
                      {act === "boating" && "directions_boat"}
                      {act === "sightseeing" && "photo_camera"}
                      {act === "water_recreation" && "surfing"}
                    </span>
                    <span className="capitalize">{act.replace("_", " ")}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Nearby Beaches List */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono block mb-2">
              Nearby Coastal Beaches
            </span>
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container flex items-center justify-between">
                <div>
                  <span className="font-semibold text-primary text-[13px] block">Puri Golden Beach</span>
                  <span className="text-[11px] text-on-surface-variant">Promenade open · No swimming</span>
                </div>
                <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-amber-100 text-amber-900">
                  CAUTION
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container flex items-center justify-between">
                <div>
                  <span className="font-semibold text-primary text-[13px] block">Gopalpur Beach</span>
                  <span className="text-[11px] text-error font-medium">3.2m breakers · Coast barred</span>
                </div>
                <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-error text-on-error">
                  CLOSED
                </span>
              </div>
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
              Visitor Do&apos;s &amp; Don&apos;ts
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

      {/* 2. FISHER PANEL */}
      {role === "fisher" && (
        <div className="flex flex-col gap-3.5">
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
                <span className="font-semibold text-on-surface">Tuna &amp; Mackerel</span>
              </div>
              <div>
                <span className="text-on-surface-variant block">Distance</span>
                <span className="font-semibold text-secondary">18 NM East</span>
              </div>
            </div>
          </div>

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

      {/* 3. COASTAL AUTHORITY PANEL */}
      {role === "authority" && (
        <div className="flex flex-col gap-3.5">
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono">
                Harbor Directives &amp; Signals
              </span>
              <span className="px-2 py-0.5 rounded-full bg-error text-on-error font-mono text-[10px] font-bold">
                SIGNAL 4 HOISTED
              </span>
            </div>
            <p className="text-[12px] text-on-surface">
              Paradip &amp; Gopalpur port authorities instructed to maintain squall alert flags.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono block mb-2">
              Surveillance Grid Telemetry
            </span>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between p-2 rounded-lg bg-surface-container-lowest border border-surface-container">
                <span className="text-on-surface-variant">NavIC Monitored Craft:</span>
                <span className="font-bold text-primary font-mono">142 vessels</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-surface-container-lowest border border-surface-container">
                <span className="text-on-surface-variant">Patrol Boat Interceptors:</span>
                <span className="font-bold text-secondary font-mono">4 active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. RESEARCHER PANEL */}
      {role === "researcher" && (
        <div className="flex flex-col gap-3.5">
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
          </div>
        </div>
      )}

      {/* 5. DISASTER MANAGEMENT PANEL */}
      {role === "disaster_management" && (
        <div className="flex flex-col gap-3.5">
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

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono block mb-2">
              Zone Exposure &amp; Population
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
          </div>

          <Link
            href="/alerts"
            className="w-full py-2.5 px-4 rounded-xl bg-primary text-on-primary font-semibold text-[13px] flex items-center justify-center gap-2 shadow-md hover:bg-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">summarize</span>
            <span>Generate Situation Report</span>
          </Link>
        </div>
      )}

      {/* 6. GENERAL PUBLIC PANEL */}
      {role === "general" && (
        <div className="flex flex-col gap-3.5">
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono">
                Coastal Weather Outlook
              </span>
              <span className="material-symbols-outlined text-secondary text-[18px]">wb_sunny</span>
            </div>
            <p className="text-[13px] text-on-surface font-semibold">
              Gopalpur Coastal Sector · Normal Tides
            </p>
            <p className="text-[12px] text-on-surface-variant mt-1">
              High tide expected at 16:45 IST (1.4m). Sunset at 18:12 IST.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider font-mono block mb-1.5">
              Marine Safety Tip
            </span>
            <p className="text-[12px] text-on-surface-variant">
              Always check local beach flags before swimming. Red flags signify dangerous rip currents.
            </p>
          </div>

          <Link
            href="/profile"
            className="w-full py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-semibold text-[12px] flex items-center justify-center gap-1.5 transition-colors border border-surface-container"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>Configure Operational Persona</span>
          </Link>
        </div>
      )}
    </div>
  );
}
