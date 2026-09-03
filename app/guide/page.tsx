import Link from "next/link";
import Image from "next/image";

export default function GuidePage() {
  return (
    <div className="bg-surface font-body-md text-on-surface flex flex-col min-h-screen">
      {/* Dev Header with Return Link */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container">
        <div className="h-16 px-margin-mobile md:px-margin-desktop flex items-center justify-between max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-space-sm min-w-0">
            <Link href="/monitor" className="h-8 w-8 relative shrink-0">
              <Image
                src="/images/orca-logo.svg"
                alt="ORCA ISRO Marine AI Logo"
                fill
                className="object-contain"
              />
            </Link>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-space-xs">
                <span className="font-headline-sm text-headline-sm text-primary truncate leading-tight">
                  ORCA · Design System Spec
                </span>
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                  Guide
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">
                  ISRO NavIC Token Architecture v2.4.0
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-space-xs shrink-0">
            <Link
              href="/monitor"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-on-primary text-label-sm font-semibold hover:bg-primary-container transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span className="hidden sm:inline">Launch App</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Spec Content */}
      <main className="flex-1 flex flex-col relative w-full pt-16 pb-20 bg-surface">
        <div className="max-w-3xl mx-auto w-full px-margin-mobile pt-space-md pb-space-lg flex flex-col gap-space-lg">
          {/* Header / Agency Stamp */}
          <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm relative overflow-hidden border border-surface-container">
            <div className="flex items-center gap-space-xs mb-space-2xs">
              <span className="material-symbols-outlined text-secondary text-[18px]">
                satellite_alt
              </span>
              <span className="font-label-sm text-label-sm text-secondary tracking-wider uppercase font-semibold">
                ISRO Coastal Observation & Marine Hazards Division
              </span>
            </div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary tracking-tight">
              ORCA Design System & Style Guide
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-space-2xs leading-relaxed">
              Institutional visual foundations engineered for Indian coastal safety,
              automated fisherfolk advisories, and mission-critical satellite oceanographic intelligence.
            </p>
            <div className="flex flex-wrap items-center gap-space-sm mt-space-sm pt-space-xs">
              <div className="flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-surface-container">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span className="font-label-sm text-label-sm text-on-surface">
                  NavIC Link Active
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-surface-container">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Version 2.4.0 · Gov Public Spec
                </span>
              </div>
            </div>
          </div>

          {/* Visual Foundation / Mission Banner */}
          <div className="relative rounded-xl overflow-hidden shadow-sm h-40 bg-primary-container border border-white/10">
            <div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: "url('/images/ocean-radar-bg.png')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent flex flex-col justify-end p-space-sm">
              <span className="font-label-sm text-label-sm text-secondary-fixed uppercase tracking-wider">
                Operational Baseline
              </span>
              <span className="font-headline-sm text-headline-sm text-on-primary font-semibold">
                High-Legibility Marine Informatics
              </span>
            </div>
          </div>

          {/* Color Swatches Section */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  palette
                </span>
                <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
                  Core Color Tokens
                </h2>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                WCAG AAA / AA
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              High-contrast palette calibrated for anti-glare readability aboard trawlers and operational disaster control rooms.
            </p>

            <div className="grid grid-cols-1 gap-space-xs mt-space-2xs">
              {/* Primary Ocean Blue */}
              <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex items-center justify-between border border-surface-container">
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-primary-container shrink-0 flex items-center justify-center shadow-inner text-on-primary">
                    <span className="material-symbols-outlined text-[20px]">anchor</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">
                      Deep Ocean Blue
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Primary Brand Chrome & Headers
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-label-md text-label-md text-primary font-bold block">
                    #0B3D62
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    AAA (11.4:1)
                  </span>
                </div>
              </div>

              {/* Telemetry Teal / Aqua */}
              <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex items-center justify-between border border-surface-container">
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-secondary shrink-0 flex items-center justify-center shadow-inner text-on-secondary">
                    <span className="material-symbols-outlined text-[20px]">radar</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">
                      Telemetry Aqua
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Active Telemetry & AI States
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-label-md text-label-md text-secondary font-bold block">
                    #00696D
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    AA (4.8:1)
                  </span>
                </div>
              </div>

              {/* Coral Flare / Urgent Alert */}
              <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex items-center justify-between border border-surface-container">
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-on-tertiary-container shrink-0 flex items-center justify-center shadow-inner text-on-tertiary">
                    <span className="material-symbols-outlined text-[20px]">warning</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">
                      Coral Flare
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Urgent CTAs & Hazard Broadcasts
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-label-md text-label-md text-on-tertiary-container font-bold block">
                    #FF7F62
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    AA Large
                  </span>
                </div>
              </div>

              {/* Neutral Canvas Layer */}
              <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex items-center justify-between border border-surface-container">
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-surface-container shrink-0 flex items-center justify-center shadow-inner text-on-surface">
                    <span className="material-symbols-outlined text-[20px]">layers</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">
                      Calm Surfaces
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Surface Low / Background
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-label-md text-label-md text-on-surface font-bold block">
                    #F8F9FF
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Base Canvas
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Severity Hazard Scale Reference */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">
                crisis_alert
              </span>
              <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
                Crisis Response Severity Matrix
              </h2>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Harmonized with National Disaster Management Authority (NDMA) tri-tier emergency protocol.
            </p>
            <div className="grid grid-cols-3 gap-space-xs mt-space-2xs">
              {/* Normal Scale */}
              <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col items-center text-center shadow-sm border border-surface-container">
                <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center mb-space-2xs">
                  <span className="w-3 h-3 rounded-full bg-secondary" />
                </div>
                <span className="font-headline-sm text-headline-sm text-secondary font-bold">
                  L1
                </span>
                <span className="font-label-sm text-label-sm text-on-surface font-semibold mt-1">
                  Normal
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px] leading-tight mt-1">
                  Safe navigation & fishing
                </span>
              </div>
              {/* Advisory Scale */}
              <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col items-center text-center shadow-sm border border-surface-container">
                <div className="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center mb-space-2xs text-on-tertiary-fixed-variant">
                  <span className="material-symbols-outlined text-[18px]">priority_high</span>
                </div>
                <span className="font-headline-sm text-headline-sm text-on-tertiary-fixed-variant font-bold">
                  L2
                </span>
                <span className="font-label-sm text-label-sm text-on-surface font-semibold mt-1">
                  Advisory
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px] leading-tight mt-1">
                  Swell & wind turbulence
                </span>
              </div>
              {/* Severe Scale */}
              <div className="bg-error-container rounded-lg p-space-sm flex flex-col items-center text-center shadow-sm border border-error/20">
                <div className="w-8 h-8 rounded-full bg-error flex items-center justify-center mb-space-2xs text-on-error">
                  <span className="material-symbols-outlined text-[18px]">cyclone</span>
                </div>
                <span className="font-headline-sm text-headline-sm text-on-error-container font-bold">
                  L3
                </span>
                <span className="font-label-sm text-label-sm text-on-error-container font-semibold mt-1">
                  Severe
                </span>
                <span className="font-body-sm text-body-sm text-on-error-container text-[11px] leading-tight mt-1">
                  Cyclone / Harbor return
                </span>
              </div>
            </div>
          </div>

          {/* Live Severity Badges Component Samples */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">
                verified
              </span>
              <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
                Interactive Severity Badges
              </h2>
            </div>
            <div className="flex flex-col gap-space-xs">
              <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex items-center justify-between border border-surface-container">
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-secondary-container">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
                    <span className="font-label-sm text-label-sm text-on-secondary-container font-bold tracking-wider">
                      NORMAL
                    </span>
                  </div>
                  <span className="font-body-sm text-body-sm text-on-surface truncate">
                    Inshore fishing permitted
                  </span>
                </div>
                <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">
                  check_circle
                </span>
              </div>

              <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex items-center justify-between border border-surface-container">
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    <span className="font-label-sm text-label-sm font-bold tracking-wider">
                      ADVISORY
                    </span>
                  </div>
                  <span className="font-body-sm text-body-sm text-on-surface truncate">
                    High swell waves (2.5m – 3.2m)
                  </span>
                </div>
                <span className="material-symbols-outlined text-on-tertiary-fixed text-[20px] shrink-0">
                  info
                </span>
              </div>

              <div className="bg-error-container rounded-lg p-space-sm shadow-sm flex items-center justify-between border border-error/20">
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-error text-on-error">
                    <span className="w-2 h-2 rounded-full bg-on-error animate-ping" />
                    <span className="font-label-sm text-label-sm font-bold tracking-wider">
                      SEVERE ALERT
                    </span>
                  </div>
                  <span className="font-body-sm text-body-sm text-on-error-container font-semibold truncate">
                    Evacuation warning: Zone 4
                  </span>
                </div>
                <span className="material-symbols-outlined text-error text-[20px] shrink-0">
                  fmd_bad
                </span>
              </div>
            </div>
          </div>

          {/* Typography Token Samples */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">
                text_fields
              </span>
              <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
                Typography Standard
              </h2>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-md border border-surface-container">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-label-sm text-label-sm text-secondary font-semibold">
                    DISPLAY-MOBILE · 32PX BOLD
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Headline Hero
                  </span>
                </div>
                <p className="font-display-mobile text-display-mobile text-primary tracking-tight">
                  Cyclone Tracking
                </p>
              </div>
              <div className="pt-space-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-label-sm text-label-sm text-secondary font-semibold">
                    HEADLINE-MD · 20PX SEMIBOLD
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Section Lead
                  </span>
                </div>
                <p className="font-headline-md text-headline-md text-primary">
                  Coastal Hazard Index & Tides
                </p>
              </div>
              <div className="pt-space-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-label-sm text-label-sm text-secondary font-semibold">
                    BODY-MD · 14PX REGULAR
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Plain Gov Clarity
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  Sea state conditions near Rameswaram coast are expected to intensify over the next 6 hours.
                  Traditional non-motorized craft are strongly advised to dock immediately.
                </p>
              </div>
              <div className="pt-space-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-label-sm text-label-sm text-secondary font-semibold">
                    LABEL-MD · 12PX MONO
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Satellite Telemetry
                  </span>
                </div>
                <div className="p-space-xs bg-surface-container-low rounded-lg font-label-md text-label-md text-primary font-mono">
                  LAT 12.9716° N · SATELLITE EOS-06 · 4 MIN AGO
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Palette */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">
                smart_button
              </span>
              <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
                Interactive Action Triggers
              </h2>
            </div>
            <div className="flex flex-col gap-space-xs">
              <button className="w-full h-12 rounded-lg bg-primary-container text-on-primary flex items-center justify-center gap-space-xs shadow-sm hover:opacity-90 active:scale-[0.99] transition-all">
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                <span className="font-body-md text-body-md font-semibold">
                  Query Marine AI Assistant
                </span>
              </button>
              <button className="w-full h-12 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center gap-space-xs shadow-sm hover:opacity-90 active:scale-[0.99] transition-all">
                <span className="material-symbols-outlined text-[20px]">download_for_offline</span>
                <span className="font-body-md text-body-md font-semibold">
                  Download Regional Buoy Data
                </span>
              </button>
              <button className="w-full h-12 rounded-lg bg-tertiary-container text-on-tertiary flex items-center justify-center gap-space-xs shadow-md hover:opacity-90 active:scale-[0.99] transition-all relative overflow-hidden">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed animate-ping" />
                <span className="material-symbols-outlined text-[20px]">e911_emergency</span>
                <span className="font-body-md text-body-md font-semibold">
                  Report Coastal Incident
                </span>
              </button>
            </div>
          </div>

          {/* Telemetry Data Card (Linear/Stripe Component) */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  query_stats
                </span>
                <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
                  Linear Telemetry Card
                </h2>
              </div>
              <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold">
                Live Feed
              </span>
            </div>
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex relative border border-surface-container">
              <div className="w-1.5 bg-secondary shrink-0" />
              <div className="flex-1 p-space-md flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-label-sm text-label-sm text-secondary font-semibold uppercase">
                      INCOIS Moorings
                    </span>
                    <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
                      Bay of Bengal · Buoy BD-12
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                    <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                    <span className="font-label-sm text-label-sm font-semibold">+0.4m</span>
                  </div>
                </div>

                {/* Metrics Quad Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs pt-space-2xs">
                  <div className="p-space-xs rounded-lg bg-surface-container-low flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Surface Temp
                    </span>
                    <span className="font-data-metric text-data-metric text-primary mt-1 font-mono">
                      29.4°C
                    </span>
                    <span className="font-label-sm text-label-sm text-secondary mt-0.5">
                      Optimal Range
                    </span>
                  </div>
                  <div className="p-space-xs rounded-lg bg-surface-container-low flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Wave Height
                    </span>
                    <span className="font-data-metric text-data-metric text-primary mt-1 font-mono">
                      1.8 m
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                      Swell 210° SSW
                    </span>
                  </div>
                  <div className="p-space-xs rounded-lg bg-surface-container-low flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Wind Speed
                    </span>
                    <span className="font-data-metric text-data-metric text-primary mt-1 font-mono">
                      18 kts
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                      Gusts to 24 kts
                    </span>
                  </div>
                  <div className="p-space-xs rounded-lg bg-surface-container-low flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Water Quality
                    </span>
                    <span className="font-data-metric text-data-metric text-secondary mt-1 font-mono">
                      Good
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                      Salinity 34.2 PSU
                    </span>
                  </div>
                </div>

                {/* Micro Sparkline Wave Profiler */}
                <div className="pt-space-2xs flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      24-Hour Wave Profiler
                    </span>
                    <span className="font-label-sm text-label-sm text-primary font-semibold">
                      H-max: 2.1m
                    </span>
                  </div>
                  <div className="h-10 w-full bg-surface-container-low rounded-lg p-1 flex items-end">
                    <svg
                      className="w-full h-8 text-secondary"
                      fill="none"
                      preserveAspectRatio="none"
                      viewBox="0 0 100 24"
                    >
                      <path
                        d="M0,18 C15,10 25,22 40,14 C55,6 65,20 80,8 C90,14 96,10 100,12"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="2"
                      />
                      <path
                        d="M0,18 C15,10 25,22 40,14 C55,6 65,20 80,8 C90,14 96,10 100,12 L100,24 L0,24 Z"
                        fill="currentColor"
                        fillOpacity="0.15"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Perplexity-Style AI Chat Synthesizer Card */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">
                smart_toy
              </span>
              <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
                AI Synthesizer & Verified Citations
              </h2>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm border border-surface-container">
              {/* User Query */}
              <div className="bg-surface-container-low p-space-sm rounded-lg flex items-start gap-space-xs">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 text-on-primary">
                  <span className="material-symbols-outlined text-[15px]">person</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                    User Query
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface mt-0.5">
                    Is it safe for traditional catamarans to venture off Gopalpur coast tonight?
                  </p>
                </div>
              </div>

              {/* AI Synthesized Response */}
              <div className="flex flex-col gap-space-xs pt-space-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-on-secondary">
                      <span className="material-symbols-outlined text-[14px]">psychology</span>
                    </div>
                    <span className="font-label-sm text-label-sm text-primary font-bold">
                      ORCA Intelligence Core
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold">
                    NavIC Synthesized
                  </span>
                </div>
                <div className="p-space-sm bg-surface-container rounded-lg font-body-sm text-body-sm text-on-surface leading-relaxed flex flex-col gap-2">
                  <p>
                    <strong>Not Recommended.</strong> A sudden swell increase of 2.8 meters combined with south-easterly wind squalls up to 26 knots is forecast between 22:00 IST and 04:00 IST near Gopalpur. Inshore wooden and fiberglass catamarans face risk of capsize at wave break points.
                  </p>
                  <p className="text-on-surface-variant text-[12px]">
                    Deep-sea mechanized trawlers may operate beyond 15 nautical miles with caution.
                  </p>
                </div>

                {/* Citation Chips */}
                <div className="pt-space-xs flex flex-col gap-1.5">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                    Official Verified Telemetry Citations:
                  </span>
                  <div className="flex flex-wrap gap-space-2xs">
                    <div className="flex items-center gap-1 px-space-xs py-1 rounded-full bg-surface-container-high text-primary text-label-sm font-label-sm">
                      <span className="font-bold text-secondary">[1]</span>
                      <span className="text-on-surface">INCOIS Wave Model v4</span>
                      <span className="material-symbols-outlined text-[13px] text-on-surface-variant">
                        north_east
                      </span>
                    </div>
                    <div className="flex items-center gap-1 px-space-xs py-1 rounded-full bg-surface-container-high text-primary text-label-sm font-label-sm">
                      <span className="font-bold text-secondary">[2]</span>
                      <span className="text-on-surface">ISRO EOS-06 Scatterometer</span>
                      <span className="material-symbols-outlined text-[13px] text-on-surface-variant">
                        north_east
                      </span>
                    </div>
                    <div className="flex items-center gap-1 px-space-xs py-1 rounded-full bg-surface-container-high text-primary text-label-sm font-label-sm">
                      <span className="font-bold text-secondary">[3]</span>
                      <span className="text-on-surface">IMD Bulletin #14</span>
                      <span className="material-symbols-outlined text-[13px] text-on-surface-variant">
                        north_east
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Provenance Footer */}
          <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col items-center text-center gap-space-2xs mt-space-sm border border-surface-container">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-[18px]">
                verified_user
              </span>
              <span className="font-label-sm text-label-sm text-primary font-semibold">
                Government of India · Department of Space
              </span>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Space Applications Centre (SAC) & Indian National Centre for Ocean Information Services (INCOIS)
            </p>
            <div className="font-label-sm text-label-sm text-outline mt-space-2xs font-mono">
              ORCA Mobile Design Spec v2.4 · All visual tokens synchronized with ISRO Central CDN
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
